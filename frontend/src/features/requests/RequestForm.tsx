"use client";

/** Request create/edit form (shared by /requests/new and /requests/[id]/edit). */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadFile } from "@/features/experts/api";
import { ApiError } from "@/lib/api/client";

import { requestsApi, taxonomyApi } from "./api";
import { REQUEST_CATEGORIES, type ServiceRequest, type TaxonomyRef } from "./types";

interface FormState {
  mode: "open" | "managed";
  category: string;
  title: string;
  description: string;
  subject_id: string;
  skill_ids: string[];
  pricing_type: "fixed" | "hourly";
  budget_min: string;
  budget_max: string;
  deadline: string;
}

export function RequestForm({ existing }: { existing?: ServiceRequest }) {
  const router = useRouter();
  const [subjects, setSubjects] = useState<TaxonomyRef[]>([]);
  const [skills, setSkills] = useState<TaxonomyRef[]>([]);
  const [form, setForm] = useState<FormState>({
    mode: existing?.mode ?? "open",
    category: existing?.category ?? "tutoring",
    title: existing?.title ?? "",
    description: existing?.description ?? "",
    subject_id: existing?.subject?.id ?? "",
    skill_ids: existing?.skills.map((s) => s.id) ?? [],
    pricing_type: existing?.pricing_type ?? "fixed",
    budget_min: existing?.budget_min ? String(existing.budget_min / 100) : "",
    budget_max: existing?.budget_max ? String(existing.budget_max / 100) : "",
    deadline: existing?.deadline ?? "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    taxonomyApi
      .terms("subject")
      .then((r) => setSubjects(Array.isArray(r.terms) ? r.terms : []))
      .catch(() => setSubjects([]));
    taxonomyApi
      .terms("skill")
      .then((r) => setSkills(Array.isArray(r.terms) ? r.terms : []))
      .catch(() => setSkills([]));
  }, []);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(publish: boolean) {
    setError(null);
    setBusy(true);
    try {
      const attachmentIds = [];
      for (const file of files) {
        const uploaded = await uploadFile(file, "request_brief");
        attachmentIds.push(uploaded.id);
      }
      const payload = {
        mode: form.mode,
        category: form.category,
        title: form.title,
        description: form.description,
        subject_id: form.subject_id || null,
        skill_ids: form.skill_ids,
        pricing_type: form.pricing_type,
        budget_min: form.budget_min ? Math.round(Number(form.budget_min) * 100) : null,
        budget_max: form.budget_max ? Math.round(Number(form.budget_max) * 100) : null,
        deadline: form.deadline || null,
        attachment_ids: attachmentIds.length ? attachmentIds : undefined,
      };
      const saved = existing
        ? await requestsApi.update(existing.id, payload)
        : await requestsApi.create(payload);
      if (publish && saved.status === "draft") {
        await requestsApi.publish(saved.id, true);
      }
      router.push(`/requests/${saved.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-1.5 text-sm font-medium">How do you want to find your expert?</legend>
          {([
            { value: "open", title: "Open marketplace", body: "Approved experts browse your request and send competing offers. You pick the winner." },
            { value: "managed", title: "Managed service", body: "Our team reviews your request, sets a fair quote and assigns the right expert for you." },
          ] as const).map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-lg border p-4 text-left transition-colors ${form.mode === option.value ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2"}`}
            >
              <input
                type="radio"
                name="mode"
                className="sr-only"
                checked={form.mode === option.value}
                onChange={() => set({ mode: option.value })}
              />
              <span className="block text-sm font-semibold">{option.title}</span>
              <span className="mt-1 block text-xs text-muted">{option.body}</span>
            </label>
          ))}
        </fieldset>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={form.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} placeholder="Weekly calculus coaching" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="category">Type of help</Label>
            <select
              id="category"
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
              value={form.category}
              onChange={(e) => set({ category: e.target.value })}
            >
              {REQUEST_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <select
              id="subject"
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
              value={form.subject_id}
              onChange={(e) => set({ subject_id: e.target.value })}
            >
              <option value="">Select a subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="description">What do you want to achieve?</Label>
          <Textarea id="description" rows={5} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Describe your goals and current level — experts will coach you through it (BR-14: experts teach, they never do the work for you)." />
        </div>
        <div>
          <Label>Skills (optional)</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {skills.map((skill) => {
              const on = form.skill_ids.includes(skill.id);
              return (
                <button
                  key={skill.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    set({
                      skill_ids: on ? form.skill_ids.filter((id) => id !== skill.id) : [...form.skill_ids, skill.id],
                    })
                  }
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-primary bg-primary-soft text-primary" : "border-border text-muted hover:bg-surface-2"}`}
                >
                  {skill.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="pricing">Pricing</Label>
            <select
              id="pricing"
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
              value={form.pricing_type}
              onChange={(e) => set({ pricing_type: e.target.value as "fixed" | "hourly" })}
            >
              <option value="fixed">Fixed price</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>
          <div>
            <Label htmlFor="budget_min">Budget min</Label>
            <Input id="budget_min" type="number" min="0" step="0.01" value={form.budget_min} onChange={(e) => set({ budget_min: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="budget_max">Budget max</Label>
            <Input id="budget_max" type="number" min="0" step="0.01" value={form.budget_max} onChange={(e) => set({ budget_max: e.target.value })} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="deadline">Deadline (optional)</Label>
            <Input id="deadline" type="date" value={form.deadline} onChange={(e) => set({ deadline: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="attachments">Attachments (pdf/images, ≤10MB)</Label>
            <Input id="attachments" type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          </div>
        </div>

        {error && <p className="text-sm text-danger" role="alert">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => submit(true)}>
            {busy ? "Saving…" : form.mode === "managed" ? "Submit for review" : existing ? "Save & publish" : "Publish request"}
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => submit(false)}>
            Save as draft
          </Button>
        </div>
        <p className="text-xs text-muted">
          {form.mode === "managed"
            ? "Our team typically triages managed requests within 24 hours. You will see the agreed price on the request page before anything is charged."
            : "Publishing requires agreeing to the academic-integrity policy: experts coach and give feedback — they never complete graded work for you."}
        </p>
      </form>
    </Card>
  );
}
