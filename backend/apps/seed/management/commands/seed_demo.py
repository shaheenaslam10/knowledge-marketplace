"""Seed/demo data (idempotent) — accounts + taxonomy + expert personas.

Role onboarding demo coverage (ADR-0012):
- admin/owner      provisioned account (never via public signup, BR-05)
- student          self-service account + completed student profile
- expert personas  one per application state: approved (directory-visible),
                   submitted (awaiting review), under_review, rejected
                   (with reason), suspended, plus a fresh draft-less user

NEVER use real credentials here. Passwords come from env with demo-only
defaults and are refused outside dev/test unless --force is passed
(disposable local environments only). Safe to run repeatedly.
"""

from __future__ import annotations

import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

DEMO_PASSWORD_ENV = "DJANGO_SEED_DEMO_PASSWORD"
DEFAULT_DEMO_PASSWORD = "demo-password-1234"

# A 1x1 valid PNG (magic-byte sniffing must pass) for demo avatars/credentials.
TINY_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000d4944415478da63fcffff3f030005fe02fea72d1f240000000049454e44ae426082"
)


class Command(BaseCommand):
    help = "Seed demo/operational baseline data (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="Allow outside dev/test settings.")

    def handle(self, *args, **options):
        if (
            "dev" not in settings.SETTINGS_MODULE
            and "test" not in settings.SETTINGS_MODULE
            and not options["force"]
        ):
            raise SystemExit(
                "Refusing to seed: not dev/test settings. Use --force on disposable environments."
            )

        from apps.accounts.models import StudentProfile
        from apps.accounts.services import ensure_staff_groups
        from apps.experts import services as expert_services
        from apps.experts.models import ExpertApplication
        from apps.files import services as file_services
        from apps.files.models import Attachment
        from apps.taxonomy import services as taxonomy_services

        ensure_staff_groups()
        User = get_user_model()
        admin_password = os.environ.get("DJANGO_SEED_ADMIN_PASSWORD", "admin-demo-1234")
        demo_password = os.environ.get(DEMO_PASSWORD_ENV, DEFAULT_DEMO_PASSWORD)

        def make_user(email: str, name: str, password: str, *, verified: bool = True):
            user, created = User.objects.get_or_create(email=email, defaults={"name": name})
            if created or not user.has_usable_password():
                user.set_password(password)
                user.save()
            if verified and not user.is_verified:
                user.mark_email_verified()
            return user

        # --- accounts -----------------------------------------------------
        admin = make_user("admin@demo.local", "Platform Admin", admin_password)
        if not (admin.is_staff and admin.is_superuser):
            admin.is_staff = admin.is_superuser = True
            admin.save(update_fields=["is_staff", "is_superuser", "updated_at"])

        student = make_user("student@demo.local", "Demo Student", demo_password)
        profile, created = StudentProfile.objects.get_or_create(user=student)
        if created and not profile.display_name:
            profile.display_name = "Demo Student"
            profile.bio = "Learning Python and statistics; looking for structured guidance."
            profile.save()
            math, _ = taxonomy_services.ensure_term(kind="subject", name="Mathematics")
            profile.interests.add(math)

        # --- taxonomy -------------------------------------------------------
        cat_dev, _ = taxonomy_services.ensure_term(
            kind="category", name="Programming & Development"
        )
        subj_python, _ = taxonomy_services.ensure_term(
            kind="subject",
            name="Python",
            parent=cat_dev,
            description="Language fundamentals, scripting, debugging help.",
        )
        subj_web, _ = taxonomy_services.ensure_term(
            kind="subject", name="Web Development", parent=cat_dev
        )
        cat_math, _ = taxonomy_services.ensure_term(
            kind="category", name="Mathematics & Statistics"
        )
        subj_stats, _ = taxonomy_services.ensure_term(
            kind="subject", name="Statistics", parent=cat_math
        )
        subj_calc, _ = taxonomy_services.ensure_term(
            kind="subject", name="Calculus", parent=cat_math
        )
        cat_lang, _ = taxonomy_services.ensure_term(kind="category", name="Languages & Writing")
        subj_en, _ = taxonomy_services.ensure_term(
            kind="subject", name="Academic English", parent=cat_lang
        )
        skill_pandas, _ = taxonomy_services.ensure_term(kind="skill", name="pandas")
        skill_sql, _ = taxonomy_services.ensure_term(kind="skill", name="SQL")
        skill_editing, _ = taxonomy_services.ensure_term(kind="skill", name="proofreading")

        def demo_credential(user, filename: str) -> Attachment:
            """Valid tiny PNG so the sniffing allowlist accepts it (demo only)."""
            existing = Attachment.objects.filter(uploader=user, purpose="credential").first()
            if existing:
                return existing
            attachment, _ = file_services.store_upload(
                user,
                purpose="credential",
                uploaded_file=ContentFile(TINY_PNG, name=filename),
            )
            return attachment

        def apply_as(user, data: dict, filename: str, *, submit: bool = True) -> ExpertApplication:
            subjects = data.pop("_subjects", [])
            skills = data.pop("_skills", [])
            application = expert_services.get_application_for(user)
            if application is None:
                application = expert_services.apply(
                    user,
                    data=data,
                    credential_attachments=[demo_credential(user, filename)],
                )
                application.subjects.set(subjects)
                application.skills.set(skills)
            if submit and application.status in ("draft", "rejected"):
                for key, value in data.items():
                    setattr(application, key, value)
                application.certified_18_plus = True
                application.integrity_acknowledged = True
                application.save()
                application = expert_services.submit_application(user)
            return application

        # --- expert personas (one per lifecycle state) ---------------------
        # approved + directory-visible
        ayra = make_user("expert@demo.local", "Ayra K.", demo_password)
        ayra_application = apply_as(
            ayra,
            {
                "display_name": "Ayra K.",
                "headline": "Python & statistics tutor — 6 years",
                "bio": "I coach students through Python, pandas and applied statistics with "
                "exercises, code reviews and explanations — you do the work, I guide it.",
                "expertise_summary": "Python, data analysis, statistics tutoring",
                "experience_years": 6,
                "qualifications": "MSc Applied Statistics; 6 years tutoring",
                "languages": "English, Urdu",
                "availability_note": "Weekday evenings (UTC+5)",
                "_subjects": [subj_python, subj_stats],
                "_skills": [skill_pandas, skill_sql],
            },
            "ayra-certificate.png",
        )
        if ayra_application.status == ExpertApplication.Status.SUBMITTED:
            expert_services.start_review(ayra_application.pk, reviewer=admin)
            ayra_application = expert_services.approve(
                ayra_application.pk, reviewer=admin, note="Strong credentials."
            )

        # submitted (awaiting review)
        bilal = make_user("expert.applicant@demo.local", "Bilal R.", demo_password)
        apply_as(
            bilal,
            {
                "display_name": "Bilal R.",
                "headline": "Academic English & proofreading coach",
                "bio": "I help students structure and edit their own writing — never write it for them.",
                "expertise_summary": "Academic writing coaching, editing",
                "experience_years": 3,
                "qualifications": "MA Linguistics",
                "languages": "English",
                "availability_note": "Flexible",
                "_subjects": [subj_en],
                "_skills": [skill_editing],
            },
            "bilal-certificate.png",
        )

        # under review
        sara = make_user("expert.review@demo.local", "Sara M.", demo_password)
        sara_application = apply_as(
            sara,
            {
                "display_name": "Sara M.",
                "headline": "Calculus coach",
                "bio": "Step-by-step problem-solving sessions; you solve, I guide.",
                "expertise_summary": "Calculus I-III",
                "experience_years": 4,
                "qualifications": "BSc Mathematics",
                "languages": "English, Urdu",
                "availability_note": "Weekends",
                "_subjects": [subj_calc],
                "_skills": [],
            },
            "sara-certificate.png",
        )
        if sara_application.status == ExpertApplication.Status.SUBMITTED:
            sara_application = expert_services.start_review(sara_application.pk, reviewer=admin)

        # rejected (with reason; resubmittable)
        hamza = make_user("expert.rejected@demo.local", "Hamza T.", demo_password)
        hamza_application = apply_as(
            hamza,
            {
                "display_name": "Hamza T.",
                "headline": "Web dev mentor",
                "bio": "Guided projects and code review for web fundamentals.",
                "expertise_summary": "HTML/CSS/JS mentoring",
                "experience_years": 2,
                "qualifications": "Self-taught, portfolio available",
                "languages": "English",
                "availability_note": "Evenings",
                "_subjects": [subj_web],
                "_skills": [],
            },
            "hamza-certificate.png",
        )
        if hamza_application.status == ExpertApplication.Status.SUBMITTED:
            hamza_application = expert_services.start_review(hamza_application.pk, reviewer=admin)
            hamza_application = expert_services.reject(
                hamza_application.pk,
                reviewer=admin,
                reason="Please attach a verifiable qualification document and resubmit.",
            )

        # suspended (was approved; hidden from directory, student access kept)
        zoya = make_user("expert.suspended@demo.local", "Zoya A.", demo_password)
        zoya_application = apply_as(
            zoya,
            {
                "display_name": "Zoya A.",
                "headline": "SQL & databases mentor",
                "bio": "Query practice with guided feedback.",
                "expertise_summary": "Databases, SQL",
                "experience_years": 5,
                "qualifications": "BSCS",
                "languages": "English, Urdu",
                "availability_note": "Weeknights",
                "_subjects": [],
                "_skills": [skill_sql],
            },
            "zoya-certificate.png",
        )
        if zoya_application.status == ExpertApplication.Status.SUBMITTED:
            expert_services.start_review(zoya_application.pk, reviewer=admin)
            zoya_application = expert_services.approve(
                zoya_application.pk, reviewer=admin, note="Solid background."
            )
        if zoya_application.status == ExpertApplication.Status.APPROVED:
            expert_services.suspend(
                zoya_application.pk, reviewer=admin, reason="Demo suspension (policy review)."
            )

        # a plain user who never applied (lifecycle: not_applied)
        make_user("noapply@demo.local", "Not Applied User", demo_password)

        # --- marketplace demo (Phase 4): requests + offers -----------------
        # a second approved expert kept OUT of the directory (is_public=False)
        hina = make_user("expert.market@demo.local", "Hina S.", demo_password)
        hina_application = apply_as(
            hina,
            {
                "display_name": "Hina S.",
                "headline": "Linear algebra & calculus coach",
                "bio": "Step-by-step coaching so students solve problems themselves.",
                "expertise_summary": "Mathematics tutoring",
                "experience_years": 4,
                "qualifications": "MSc Mathematics",
                "languages": "English, Urdu",
                "availability_note": "Weekends",
                "_subjects": [subj_stats],
                "_skills": [skill_pandas],
            },
            "ayra-certificate.png",
        )
        if hina_application.status == ExpertApplication.Status.SUBMITTED:
            expert_services.start_review(hina_application.pk, reviewer=admin)
            hina_application = expert_services.approve(
                hina_application.pk, reviewer=admin, note="OK."
            )
        from apps.experts.models import ExpertProfile

        ExpertProfile.objects.filter(pk=hina.pk).update(is_public=False)  # feed-only expert

        from apps.bidding import services as bidding_services
        from apps.service_requests import services as request_services
        from apps.service_requests.models import ServiceRequest

        student_user = User.objects.get(email="student@demo.local")
        subject = subj_python or subj_stats
        if not ServiceRequest.objects.filter(
            student=student_user, title__startswith="Coach me through"
        ).exists():
            open_req = request_services.create_request(
                student_user,
                payload={
                    "category": "concept_coaching",
                    "title": "Coach me through pandas groupby assignments",
                    "description": "I want to actually understand groupby/agg myself - guided practice, "
                    "not solutions. Two sessions per week would be ideal.",
                    "subject": subject,
                    "budget_min": 3000,
                    "budget_max": 9000,
                    "pricing_type": "fixed",
                },
            )
            open_req = request_services.publish(student_user, open_req, attested=True)
            if ayra_application.status == ExpertApplication.Status.APPROVED:
                bidding_services.submit(
                    ayra,
                    open_req,
                    payload={
                        "amount": 7000,
                        "currency": "USD",
                        "timeline_text": "Start this week, 2 sessions/week",
                        "message": "Happy to coach - we work through exercises together.",
                    },
                )
            if hina_application.status == ExpertApplication.Status.APPROVED:
                bidding_services.submit(
                    hina,
                    open_req,
                    payload={
                        "amount": 5500,
                        "currency": "USD",
                        "timeline_text": "Weekends",
                        "message": "Weekend deep-dives with practice sets.",
                    },
                )
            draft_req = request_services.create_request(
                student_user,
                payload={
                    "category": "exam_prep",
                    "title": "Statistics final exam prep (draft)",
                    "description": "Planning a 3-week revision plan - still drafting the details.",
                    "subject": subj_stats or subject,
                    "budget_max": 12000,
                },
            )
            del draft_req  # stays a draft on purpose (demo of the editable state)

        # --- managed-service demo (Phase 5) --------------------------------
        from apps.assignments import services as assignment_services

        if not ServiceRequest.objects.filter(title__startswith="Managed:").exists():
            managed_open = request_services.create_request(
                student_user,
                payload={
                    "category": "mentorship",
                    "title": "Managed: find me a Python mentor",
                    "description": "I would like the platform to pick the right mentor for a "
                    "10-week guided plan; budget is flexible within the range.",
                    "subject": subject,
                    "budget_min": 4000,
                    "budget_max": 14000,
                },
            )
            managed_open.mode = managed_open.Mode.MANAGED
            managed_open.save(update_fields=["mode"])
            request_services.publish(
                student_user, managed_open, attested=True
            )  # -> in_review (triage demo)

            pooled = request_services.create_request(
                student_user,
                payload={
                    "category": "problem_walkthrough",
                    "title": "Managed: weekly problem walkthroughs",
                    "description": "Platform-routed help with weekly exercises; owner-approved quote.",
                    "subject": subj_stats or subject,
                    "budget_min": 5000,
                    "budget_max": 12000,
                },
            )
            pooled.mode = pooled.Mode.MANAGED
            pooled.save(update_fields=["mode"])
            request_services.publish(student_user, pooled, attested=True)
            if ayra_application.status == ExpertApplication.Status.APPROVED:
                assignment_services.approve_pool(
                    admin,
                    pooled,
                    expert_ids=[ayra.pk],
                    quote_amount=8500,
                )  # Ayra receives a pending pool invitation (accept/decline demo)

        # expert @demo.local keeps the expert role even though "student@" etc.
        # exist — sanity: directory should contain Ayra only (Zoya suspended).

        # --- Phase 10: portal operations funnel (orders→money→reviews→
        # disputes→reports). Idempotent: every step goes through domain
        # services and is skipped once its unique state exists.
        self._seed_portal_funnel(student, ayra, admin)
        from apps.experts.services import directory_queryset

        visible = directory_queryset().count()
        self.stdout.write(self.style.SUCCESS("Seed complete:"))
        self.stdout.write(
            "  Admin console : http://localhost:8000/admin/  (admin@demo.local / DJANGO_SEED_ADMIN_PASSWORD)"
        )
        self.stdout.write("  Student demo  : student@demo.local / (DJANGO_SEED_DEMO_PASSWORD)")
        self.stdout.write(
            "  Expert demo   : expert@demo.local / (DJANGO_SEED_DEMO_PASSWORD) — approved"
        )
        self.stdout.write(
            "  Personas      : expert.applicant@ (submitted), expert.review@ (under review),"
            " expert.rejected@ (rejected), expert.suspended@ (suspended), noapply@ (not applied)"
        )
        self.stdout.write(f"  Directory     : {visible} expert(s) publicly visible")
        self.stdout.write(
            f"  Demo password default: {DEFAULT_DEMO_PASSWORD} (demo-only — never production credentials)"
        )

    def _seed_portal_funnel(self, student, expert_user, admin) -> None:
        """Portal demo data (Phase 10): a completed order with payout, a
        review + expert reply, an open dispute, a resolved dispute with full
        refund, and a moderation report. Idempotent — every step rides its
        domain service and unique-state guards."""
        from apps.core.exceptions import DomainError
        from apps.disputes import services as disputes
        from apps.disputes.models import Dispute
        from apps.messaging import services as messaging
        from apps.messaging.models import MessageReport
        from apps.orders import services as order_services
        from apps.orders.models import Order
        from apps.payments.services import confirm_order_payment, schedule_payout, start_payment
        from apps.reviews import services as reviews
        from apps.service_requests import services as request_services
        from apps.taxonomy.services import ensure_term

        subject = ensure_term(kind="subject", name="Portal Demo Subject")[0]

        def run_funnel(title):
            request = request_services.create_request(
                student,
                payload={
                    "category": "tutoring",
                    "title": title,
                    "description": "Portal demo request — guided problem walkthrough for the final exam.",
                    "subject": subject,
                    "budget_max": 12000,
                },
            )
            request = request_services.publish(student, request, attested=True)
            request_services.mark_matched(request)
            order = order_services.create_order_for_request(
                request,
                expert=expert_user,
                amount=9000,
                currency="USD",
                source=order_services.Order.Source.OPEN_BID,
            )
            order = Order.objects.get(pk=order.pk)
            start_payment(order, actor=student)
            confirm_order_payment(Order.objects.get(pk=order.pk), actor=admin)
            return Order.objects.get(pk=order.pk)

        try:
            if not Order.objects.filter(request__student=student, status="completed").exists():
                order = run_funnel("Portal demo — completed")
                order_services.submit_delivery(
                    order,
                    expert=expert_user,
                    summary="Full walkthrough delivered with practice set and notes.",
                )
                order_services.approve_delivery(order, actor=student)
                schedule_payout(Order.objects.get(pk=order.pk))
                try:
                    review = reviews.submit_review(
                        Order.objects.get(pk=order.pk),
                        actor=student,
                        rating=5,
                        body="Excellent walkthrough — clear structure and patient explanations throughout.",
                        sub_quality=5,
                        sub_communication=5,
                    )
                    reviews.reply_to_review(
                        review,
                        actor=expert_user,
                        reply="Thank you! Great questions during the session.",
                        rating_of_student=5,
                    )
                except DomainError:
                    pass

            if not Dispute.objects.filter(order__request__student=student).exists():
                active = run_funnel("Portal demo — disputed")
                disputes.open_dispute(
                    active,
                    actor=student,
                    reason="quality_below_expectations",
                    description="Half of the agreed practice set is missing from the delivered materials.",
                )

            if not Order.objects.filter(request__student=student, status="cancelled").exists():
                refunded = run_funnel("Portal demo — refunded dispute")
                order_services.submit_delivery(
                    refunded, expert=expert_user, summary="Delivery for the dispute demo order."
                )
                order_services.approve_delivery(refunded, actor=student)
                refunded = Order.objects.get(pk=refunded.pk)
                dispute = disputes.open_dispute(
                    refunded,
                    actor=student,
                    reason="quality_below_expectations",
                    description="The delivered summary does not cover the agreed syllabus sections at all.",
                )
                disputes.take_case(dispute, actor=admin)
                disputes.resolve(
                    dispute,
                    actor=admin,
                    outcome="refund_student_full",
                    resolution_notes="Full refund — delivered material missed the agreed scope.",
                )

            if (
                not MessageReport.objects.exists()
                and Order.objects.filter(request__student=student).exists()
            ):
                thread = messaging.get_or_create_thread(
                    context_type="order",
                    context=Order.objects.filter(request__student=student).first(),
                    actor=student,
                )
                message = messaging.send_message(
                    thread,
                    sender=expert_user,
                    body="We could continue over email and settle payment there directly.",
                )
                messaging.report_message(message, actor=student, reason="off_platform")
        except DomainError as exc:  # reseed safety — never abort the whole seed
            self.stdout.write(self.style.WARNING(f"  Portal funnel skipped: {exc}"))
