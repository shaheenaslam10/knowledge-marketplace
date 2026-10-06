"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  GraduationCap,
  HelpCircle,
  Lock,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { expertsApi, uploadFile } from "@/features/experts/api";
import { APPLICATION_STATUS_COPY } from "@/features/experts/status";
import {
  canSubmitApplication,
  isApplicationEditable,
  type ApplicationStatus,
  type TaxonomyTerm,
} from "@/features/experts/types";

/**
 * Modern AI-Era Specialist Application Experience.
 * Features strict role continuity, instant back navigation to Student Hub,
 * comprehensive discipline pickers, and transparent dual-role compatibility guidance.
 */
export default function ExpertApplyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatus>("not_applied");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [credentialIds, setCredentialIds] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([expertsApi.myApplication(), expertsApi.applyInfo()])
      .then(([application, info]) => {
        if (cancelled) return;
        setStatus(application.status);
        setRejectionReason(application.application?.rejection_reason ?? null);
        setCredentialIds(application.application?.credentials.map((c) => c.id) ?? []);
        setTerms(info.taxonomy);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load the application. Please refresh.");
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setSaving(true);
    const payload = {
      display_name: String(form.get("display_name") ?? "").trim(),
      headline: String(form.get("headline") ?? "").trim(),
      bio: String(form.get("bio") ?? "").trim(),
      expertise_summary: String(form.get("expertise_summary") ?? "").trim(),
      experience_years: Number(form.get("experience_years") ?? 0),
      qualifications: String(form.get("qualifications") ?? "").trim(),
      languages: String(form.get("languages") ?? "").trim(),
      availability_note: String(form.get("availability_note") ?? "").trim(),
      certified_18_plus: form.get("certified_18_plus") === "on",
      integrity_acknowledged: form.get("integrity_acknowledged") === "on",
      subject_ids: form.getAll("subjects").map(Number).filter(Boolean),
      skill_ids: form.getAll("skills").map(Number).filter(Boolean),
      credential_ids: credentialIds,
    };
    try {
      if (status === "not_applied") {
        await expertsApi.saveApplication(payload, "create");
      } else {
        await expertsApi.saveApplication(payload, "patch");
      }
      const result = await expertsApi.submitApplication();
      setStatus(result.status);
      router.push("/expert/application");
    } catch {
      setError("Could not submit the application — check the required fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function onFileChange(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      const ids: string[] = [];
      const names: string[] = [];
      for (const file of Array.from(files)) {
        const attachment = await uploadFile(file, "credential");
        ids.push(attachment.id);
        names.push(file.name);
      }
      setCredentialIds((current) => [...current, ...ids]);
      setFileNames((current) => [...current, ...names]);
    } catch {
      setError("Upload failed — allowed: PDF, PNG or JPG up to 10 MB.");
    } finally {
      setUploading(false);
    }
  }

  const editable = isApplicationEditable(status);
  const canSubmit = canSubmitApplication(status);
  const copy = APPLICATION_STATUS_COPY[status];

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Breadcrumb Back Link to Student Hub */}
      <div className="flex items-center justify-between">
        <Link
          href="/requests"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform text-primary" />
          <span>Back to Student Learning Workspace</span>
        </Link>
        <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
          Step 1 of 2: Application Dossier
        </span>
      </div>

      {/* 2. Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 size-80 rounded-full bg-gradient-to-br from-primary/15 via-violet-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft/60 px-3 py-0.5 text-xs font-bold text-primary">
              <Zap className="size-3.5" />
              <span>Specialist Accreditation</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <DollarSign className="size-3" />
              <span>85% Specialist Net Payout</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="size-3" />
              <span>100% Escrow Custody Gated</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
              <Clock className="size-3" />
              <span>Reviewed in &lt;48 Hours</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Apply as an Academic Specialist
          </h1>
          <p className="text-xs sm:text-sm text-muted max-w-2xl leading-relaxed">
            {loaded && status !== "not_applied"
              ? `${copy.title} — ${copy.detail}`
              : "Join our accredited peer network of verified doctoral specialists, postdocs, and senior practitioners. Provide high-impact academic coaching, code reviews, and proof critiques."}
          </p>
        </div>
      </div>

      {rejectionReason && status === "rejected" && (
        <Card className="border-danger/30 bg-danger-soft/60 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="size-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-danger">Reviewer note & revision request:</p>
              <p className="text-xs text-foreground mt-0.5">{rejectionReason}</p>
            </div>
          </div>
        </Card>
      )}

      {!editable && loaded && status !== "not_applied" && (
        <Card className="p-6 sm:p-8 border-amber-500/30 bg-amber-500/5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Clock className="size-3.5" />
                  <span>Application Under Review (&lt; 48h)</span>
                </span>
                <span className="text-xs font-medium text-muted">
                  Status: {status.replace("_", " ").toUpperCase()}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Your Specialist Accreditation Dossier is Being Audited
              </h2>
              <p className="text-xs sm:text-sm text-muted max-w-xl leading-relaxed">
                Platform operations and faculty coordinators are verifying your credentials and academic background. You will receive an email notification and status update once reviewed.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <Button asChild variant="secondary" size="sm">
                <Link href="/expert/application">View Dossier Details</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/requests">Return to Student Workspace</Link>
              </Button>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex flex-wrap items-center gap-6 text-xs text-muted">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>Dossier Submitted Successfully</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>Identity & Credentials Protected</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-3.5 text-warning" />
              <span>Target Review Turnaround: &lt; 48 Hours</span>
            </div>
          </div>
        </Card>
      )}

      {editable && (
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Main Application Form (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="p-6 sm:p-8 border-border/80 bg-card shadow-sm">
              <form onSubmit={onSubmit} className="space-y-8" data-testid="expert-apply-form">
                {/* Section 1: Professional Persona */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <User className="size-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">1. Professional Persona & Headline</h2>
                  </div>

                  <Field
                    label="Professional / display name"
                    name="display_name"
                    required
                    maxLength={150}
                    placeholder="e.g. Dr. Jennifer Hayes or Alex Mercer"
                  />

                  <div>
                    <label htmlFor="headline" className="block text-xs font-bold text-foreground mb-1">
                      Professional Headline <span className="text-danger">*</span>
                    </label>
                    <input
                      id="headline"
                      name="headline"
                      type="text"
                      required
                      maxLength={120}
                      placeholder="e.g. PhD in Distributed Systems — 6 years academic coaching"
                      className="w-full rounded-xl border border-border bg-surface-1 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-muted font-medium">Examples:</span>
                      {[
                        "Postdoc in Applied Mathematics & Proofs",
                        "Senior AI Researcher — PyTorch & Optimization",
                        "PhD Candidate in Econometrics & Time-Series",
                      ].map((hint) => (
                        <button
                          key={hint}
                          type="button"
                          onClick={() => {
                            const el = document.getElementById("headline") as HTMLInputElement;
                            if (el) el.value = hint;
                          }}
                          className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                        >
                          + {hint}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="bio" className="block text-xs font-bold text-foreground mb-1">
                      Coaching Bio & Teaching Philosophy <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={4}
                      required
                      maxLength={2000}
                      placeholder="Detail your academic background, research interests, and instructional philosophy. How do you help students debug complex problems without ghostwriting?"
                      className="w-full rounded-xl border border-border bg-surface-1 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="mt-1 text-[11px] text-muted">
                      You are an educator and mentor, not a ghostwriter. The marketplace strictly enforces our academic-integrity pledge (BR-10).
                    </p>
                  </div>
                </div>

                {/* Section 2: Domain Qualifications & Logistics */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Award className="size-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">2. Qualifications & Experience</h2>
                  </div>

                  <Field
                    label="Summary of Core Competencies"
                    name="expertise_summary"
                    required
                    maxLength={500}
                    placeholder="Briefly highlight your primary research toolchains, mathematical methods, or development frameworks."
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Years of academic/teaching experience"
                      name="experience_years"
                      type="number"
                      min={0}
                      max={60}
                      defaultValue={0}
                    />
                    <Field
                      label="Languages spoken"
                      name="languages"
                      maxLength={200}
                      placeholder="English, French, German"
                    />
                  </div>

                  <Field
                    label="Formal Qualifications & Degrees"
                    name="qualifications"
                    maxLength={1000}
                    placeholder="e.g. M.Sc. Computer Science (Stanford 2021), B.S. Mathematics (MIT 2019)"
                  />

                  <Field
                    label="Availability & Timezone Preferences"
                    name="availability_note"
                    maxLength={300}
                    placeholder="e.g. Weekday evenings and weekends (UTC-5 / EST)"
                  />
                </div>

                {/* Section 3: Disciplines & Skills */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <GraduationCap className="size-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">3. Academic Disciplines & Skills</h2>
                  </div>

                  <fieldset>
                    <legend className="text-xs font-bold text-foreground mb-2">
                      Primary Disciplines (Select all applicable)
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {terms
                        .filter((t) => t.kind === "subject" || t.kind === "category")
                        .map((term) => (
                          <Chip key={term.id} name="subjects" value={term.id} label={term.name} />
                        ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="text-xs font-bold text-foreground mb-2">
                      Specific Methodological Skills
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {terms
                        .filter((t) => t.kind === "skill")
                        .map((term) => (
                          <Chip key={term.id} name="skills" value={term.id} label={term.name} />
                        ))}
                    </div>
                  </fieldset>
                </div>

                {/* Section 4: Verified Credentials Upload */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <FileText className="size-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">4. Supporting Academic Credentials</h2>
                  </div>

                  <div className="rounded-2xl border-2 border-dashed border-border/80 bg-surface-1 p-5 text-center transition-colors hover:border-primary/50">
                    <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                      <Upload className="size-5" />
                    </div>
                    <label htmlFor="credentials" className="cursor-pointer">
                      <span className="text-xs font-bold text-primary hover:underline">
                        Upload Degree, Diploma, or Transcripts
                      </span>
                      <input
                        id="credentials"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        multiple
                        onChange={(e) => void onFileChange(e.target.files)}
                        className="sr-only"
                      />
                    </label>
                    <p className="mt-1 text-[11px] text-muted">
                      {uploading
                        ? "Uploading securely to encrypted bucket…"
                        : "Accepted: PDF, PNG, JPG up to 10 MB per file. Visible exclusively to compliance auditors."}
                    </p>

                    {fileNames.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        {fileNames.map((name, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                          >
                            <Paperclip className="size-3" />
                            <span>{name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 5: Honor Code & Legal Attestations */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <ShieldCheck className="size-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">5. Academic Honor Code & Legal Attestation</h2>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-surface-1 cursor-pointer hover:bg-surface-2 transition-colors">
                      <input
                        type="checkbox"
                        name="certified_18_plus"
                        required
                        className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <span className="text-xs text-foreground font-medium">
                        I certify that I am 18 years of age or older and legally eligible to provide educational mentorship services.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-colors">
                      <input
                        type="checkbox"
                        name="integrity_acknowledged"
                        required
                        className="mt-0.5 size-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500/20"
                      />
                      <span className="text-xs text-foreground font-medium leading-relaxed">
                        <strong className="text-amber-600 dark:text-amber-400 block mb-0.5">
                          Academic Integrity Honor Code (BR-10 & BR-14):
                        </strong>
                        I solemnly acknowledge that I will teach, coach, debug, and explain concepts alongside learners. I will never complete graded examinations, course assignments, or submit ghostwritten work on behalf of a student.
                      </span>
                    </label>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    data-testid="apply-error"
                    className="p-3.5 rounded-xl border border-danger/30 bg-danger-soft/60 text-xs text-danger font-medium"
                  >
                    {error}
                  </div>
                )}

                <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <Link
                    href="/requests"
                    className="text-xs font-semibold text-muted hover:text-foreground transition-colors"
                  >
                    ← Cancel and return to Student Workspace
                  </Link>

                  <Button
                    type="submit"
                    disabled={saving || uploading}
                    data-testid="apply-submit"
                    className="h-11 px-7 font-bold shadow-md shadow-primary/25 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-strong hover:to-indigo-700 text-white"
                  >
                    {saving ? "Submitting Application…" : "Submit Application for Review"}
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Specialist Economics & Dual-Role FAQs (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Specialist Economics Card */}
            <Card className="p-5 border-border/80 bg-card space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Specialist Economics</h3>
                  <p className="text-[10px] text-muted">Transparent earnings and milestone payout</p>
                </div>
              </div>
              <ul className="space-y-2.5 text-xs text-muted">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-foreground font-semibold">85% Specialist Split:</strong> Keep 85% of your quoted milestone fees.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-foreground font-semibold">Guaranteed Escrow:</strong> Client funds are locked before you write a single line of explanation.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-foreground font-semibold">Direct Payouts:</strong> Automated bank wire or Stripe disbursements upon milestone release.
                  </span>
                </li>
              </ul>
            </Card>

            {/* Dual-Role Compatibility Card */}
            <Card className="p-5 border-border/80 bg-card space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <GraduationCap className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Dual-Role Compatibility</h3>
                  <p className="text-[10px] text-muted">Learn and teach with one login</p>
                </div>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                <strong className="text-foreground">Can I still get help as a student?</strong> Yes! Every specialist retains full student rights. You can switch instantly between <span className="font-semibold text-foreground">[Specialist View ⚡]</span> and <span className="font-semibold text-foreground">[Student View 🎓]</span> from your header.
              </p>
              <div className="rounded-xl border border-primary/20 bg-primary-soft/30 p-3 text-[11px] text-muted space-y-1">
                <span className="font-bold text-primary block">Integrity Safeguard:</span>
                <span>
                  The marketplace algorithm mathematically prevents self-dealing: you will never see or bid on briefs you created as a student.
                </span>
              </div>
            </Card>

            {/* Application SLA */}
            <Card className="p-5 border-border/80 bg-card space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Clock className="size-4 text-warning" />
                <span>Verification SLA: &lt; 48 Hours</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Academic compliance officers audit every credential and sample publication. You will receive an email confirmation once approved.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  maxLength,
  placeholder,
  min,
  max,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  min?: number;
  max?: number;
  defaultValue?: number | string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-bold text-foreground mb-1">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        min={min}
        max={max}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-border bg-surface-1 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function Chip({ name, value, label }: { name: string; value: number; label: string }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} className="peer sr-only" />
      <span className="inline-flex items-center px-3 py-1.5 rounded-full border border-border bg-surface-1 text-xs font-medium text-muted transition-all peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:font-bold hover:bg-surface-2 hover:border-primary/40 shadow-2xs">
        {label}
      </span>
    </label>
  );
}
