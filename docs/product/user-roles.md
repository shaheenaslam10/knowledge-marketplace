# User Roles, Permissions & Authorization Matrix

> Status: ✅ Phase 2 foundation implemented · Last updated: Phase 2

## Role model

Roles are **not** separate user tables. One `User`, with role state (ADR: single identity keeps auth simple and allows a user to be both student and expert):

**As implemented (Phase 2):** `get_roles(user)` in `apps/accounts.services` derives the canonical role dict — `{student, verified, staff, support, admin, expert}` — where `student` is true for every active account (BR-01), `verified` mirrors `email_verified_at`, `support`/`admin` come from Django groups (+`is_staff`), and `expert` is a stable `False` slot until Phase 3 registers the `ExpertProfile` approval provider. DRF classes shipped: `IsAdmin`, `IsSupport`, `IsExpert`, `IsVerified` (+ global deny-by-default `IsAuthenticated`).

| Role | How acquired (ADR-0011) | Storage |
|---|---|---|
| **Guest** | unauthenticated | — |
| **Student** | **self-service**: register → verify email → onboarding (`/me/student-profile`) — **no approval gate** | `User.is_active` + verified email + `StudentProfile` |
| **Expert candidate** | separate application flow: `/expert/apply` (form + ≥1 credential + attestations) | `ExpertApplication.status = draft/submitted/under_review` |
| **Expert** | admin approves the application | `ExpertApplication.status = approved` + live `ExpertProfile` (public) |
| **Suspended expert** | admin suspension | `ExpertApplication.status = suspended` — student access kept (BR-04) |
| **Support/Moderator** | manual staff provisioning | `User.is_staff` + Django group `support` |
| **Admin/Owner** | **provisioned by an authorized admin/owner only** (Django admin / `createsuperuser` / seed) — **no public apply-as-admin flow exists** | `User.is_staff` + `is_superuser` (or group `admin`) |
| **System** | background jobs / webhooks | `actor = null` in audit log |

A user can simultaneously be a student and an approved expert; the UI switches context by role.

## Permission enforcement layers

1. **Route/API layer** — DRF permission classes (`IsStudent`, `IsExpert`, `IsOwner`, role groups).
2. **Object layer** — `get_queryset()` scoping + object checks in services (participants/owner/admin only). Object-level rules are never bypassable by id-guessing.
3. **Admin layer** — Django admin groups (`support`, `admin`) with per-model add/change/delete/view and field-level guards for money operations.
4. **Audit layer** — all staff actions on sensitive objects logged (BR-42).

## Authorization matrix (MVP)

Legend: ✅ allowed · ❌ forbidden · 🔒 owner/participant-only · 🛡 admin-with-audit

| Resource / Action | Guest | Student | Expert | Support | Admin |
|---|---|---|---|---|---|
| Register / login / reset password | ✅ | ✅ | ✅ | — | — |
| View public expert directory & profiles | ✅ | ✅ | ✅ | ✅ | ✅ |
| View open-marketplace request listing | ❌ | 🔒 own | ✅ open ones | ✅ | ✅ |
| Create / edit / cancel own request | ❌ | 🔒 | ❌ | ❌ | ✅ |
| View any request detail | ❌ | 🔒 own | ✅ (visible per mode rules) | ✅ | ✅ |
| Send / edit / withdraw offer | ❌ | ❌ | ✅ (approved experts only) | ❌ | ❌ |
| Accept / decline offers on own request | ❌ | 🔒 | ❌ | ❌ | ❌ |
| Respond to managed invitation / assignment | ❌ | ❌ | ✅ invited | ❌ | ✅ |
| Create managed request | ❌ | ✅ | ❌ | ❌ | ✅ |
| Triage managed requests (approve/reject/pool/assign) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve / reject expert applications | ❌ | ❌ | ❌ | ❌ | ✅ |
| View order detail | ❌ | 🔒 participant | 🔒 participant | ✅ | ✅ |
| Deliver work on order | ❌ | ❌ | 🔒 own orders | ❌ | ❌ |
| Approve delivery / request revision | ❌ | 🔒 own orders | ❌ | ❌ | 🛡 force-approve |
| Cancel order | ❌ | 🔒 per BR-26 | 🔒 per BR-26 | ❌ | ✅ (with refund rules) |
| Pay for order | ❌ | 🔒 own orders | ❌ | ❌ | ❌ (test-mode only) |
| Send/receive messages in a thread | ❌ | 🔒 participant | 🔒 participant | 🛡 dispute-linked | 🛡 dispute-linked |
| Report a message / user / request | ❌ | ✅ | ✅ | ✅ | ✅ |
| Moderate content (hide/unhide) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Open dispute on own order | ❌ | 🔒 | 🔒 | ❌ | ✅ on behalf |
| Resolve dispute (refund/split/release) | ❌ | ❌ | ❌ | ❌ | ✅ (support prepares) |
| Trigger refunds / payouts | ❌ | ❌ | ❌ | ❌ | ✅ |
| View ledger / payouts | ❌ | 🔒 own earnings | 🔒 own earnings | ❌ | ✅ |
| Edit reviews / hide review | ❌ | ❌ | ❌ | ✅ hide | ✅ |
| Reply to own review | ❌ | ❌ | 🔒 | ❌ | ❌ |
| View audit logs | ❌ | ❌ | ❌ | ❌ | ✅ |
| Edit PlatformConfig (rates, TTLs) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Upload files to own request/order/thread | ❌ | 🔒 participant | 🔒 participant | ❌ | ✅ |
| Download files | ❌ | 🔒 authorized | 🔒 authorized | 🛡 | 🛡 |

## Django groups

- `support`: view orders/users/disputes/requests; change `Review` (hide), `Dispute` (prepare). **No** payment model write, no PlatformConfig, no user deletion.
- `admin`: full staff.
- Expert/student capabilities are enforced in the API layer via role checks, not Django groups (public users are not staff).

## Deny-by-default principle

Any endpoint or object not explicitly granted above is forbidden. Object IDs are UUIDs (ADR-0008) to prevent enumeration; access checks always verify ownership/participation server-side.
