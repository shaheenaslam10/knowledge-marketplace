"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { expertsApi, uploadFile } from "@/features/experts/api";
import { APPLICATION_STATUS_COPY } from "@/features/experts/status";
import { canSubmitApplication, isApplicationEditable, type ApplicationStatus, type TaxonomyTerm } from "@/features/experts/types";

/**
 * Expert application (ADR-0012) — a SEPARATE, role-specific flow: students
 * never see this, and approval is required before expert status. Steps:
 * complete form → upload credential(s) → attestations → submit for review.
 */
export default function ExpertApplyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatus>("not_applied");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [credentialIds, setCredentialIds] = useState<string[]>([]);
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
      for (const file of Array.from(files)) {
        const attachment = await uploadFile(file, "credential");
        ids.push(attachment.id);
      }
      setCredentialIds((current) => [...current, ...ids]);
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
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Apply as an expert</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {loaded && status !== "not_applied" ? `${copy.title} — ${copy.detail}` : "Become a tutor on the marketplace."}
      </p>
      {rejectionReason && status === "rejected" && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
          Reviewer note: {rejectionReason}
        </p>
      )}
      {!editable && loaded && status !== "not_applied" && (
        <Card className="mt-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This application is locked in its current state.{" "}
            <Link href="/expert/application" className="underline">
              View status
            </Link>
          </p>
        </Card>
      )}

      {editable && (
        <Card className="mt-6">
          <form onSubmit={onSubmit} className="space-y-4" data-testid="expert-apply-form">
            <Field label="Professional / display name" name="display_name" required maxLength={150} />
            <Field label="Headline" name="headline" required maxLength={120} placeholder="e.g. Python & statistics tutor — 6 years" />
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Bio / expertise description
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                required
                maxLength={2000}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Describe how you coach. You are a teacher, not a ghostwriter — the platform enforces academic-integrity
                rules.
              </p>
            </div>
            <Field label="Expertise summary" name="expertise_summary" required maxLength={500} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Years of experience" name="experience_years" type="number" min={0} max={60} defaultValue={0} />
              <Field label="Languages" name="languages" maxLength={200} placeholder="English, Urdu" />
            </div>
            <Field label="Qualifications" name="qualifications" maxLength={1000} placeholder="Degrees, certificates…" />
            <Field label="Availability" name="availability_note" maxLength={300} placeholder="e.g. Weekday evenings (UTC+5)" />

            <fieldset>
              <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">Subjects</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {terms
                  .filter((t) => t.kind === "subject" || t.kind === "category")
                  .map((term) => (
                    <Chip key={term.id} name="subjects" value={term.id} label={term.name} />
                  ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">Skills</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {terms
                  .filter((t) => t.kind === "skill")
                  .map((term) => (
                    <Chip key={term.id} name="skills" value={term.id} label={term.name} />
                  ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="credentials" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Supporting credentials (required)
              </label>
              <input
                id="credentials"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                onChange={(e) => void onFileChange(e.target.files)}
                className="mt-1 block w-full text-sm text-slate-600 dark:text-slate-300"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {uploading ? "Uploading…" : "PDF, PNG or JPG · max 10 MB · private — visible only to reviewers."}
                {credentialIds.length > 0 && ` ${credentialIds.length} file(s) attached.`}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <label className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <input type="checkbox" name="certified_18_plus" required className="mt-0.5" />
                I confirm I am 18 or older.
              </label>
              <label className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <input type="checkbox" name="integrity_acknowledged" required className="mt-0.5" />
                I acknowledge the tutor guidelines and academic-integrity policy: I will teach and coach — never
                complete graded work for a student.
              </label>
            </div>

            {error && (
              <p role="alert" data-testid="apply-error" className="text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            )}

            <Button type="submit" disabled={saving || uploading} data-testid="apply-submit">
              {saving ? "Submitting…" : canSubmit ? "Submit application" : "Submit application"}
            </Button>
          </form>
        </Card>
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
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="text-red-600"> *</span>}
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
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
      />
    </div>
  );
}

function Chip({ name, value, label }: { name: string; value: number; label: string }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} className="peer sr-only" />
      <span className="inline-block rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 peer-checked:border-slate-900 peer-checked:bg-slate-900 peer-checked:text-white dark:border-slate-700 dark:text-slate-300 dark:peer-checked:bg-white dark:peer-checked:text-slate-900">
        {label}
      </span>
    </label>
  );
}
