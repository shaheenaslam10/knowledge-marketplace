"use client";

/** Request create/edit form (shared by /requests/new and /requests/[id]/edit). */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Coins,
  FileCheck,
  FileText,
  HelpCircle,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
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

  function setQuickDeadline(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    set({ deadline: d.toISOString().split("T")[0] });
  }

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
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Multi-Step Wizard Progress Bar */}
      <div className="rounded-2xl border border-border/80 bg-surface/90 p-4 shadow-sm backdrop-blur-md">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all text-left ${
              step === 1
                ? "bg-primary-soft text-primary font-bold shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground font-bold">
              1
            </span>
            <div className="hidden sm:block">
              <p className="leading-tight">Discipline & Scope</p>
              <p className="text-[10px] text-muted font-normal">Topic and details</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all text-left ${
              step === 2
                ? "bg-primary-soft text-primary font-bold shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground font-bold">
              2
            </span>
            <div className="hidden sm:block">
              <p className="leading-tight">Timeline & Budget</p>
              <p className="text-[10px] text-muted font-normal">Deadlines & escrow</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex items-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all text-left ${
              step === 3
                ? "bg-primary-soft text-primary font-bold shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground font-bold">
              3
            </span>
            <div className="hidden sm:block">
              <p className="leading-tight">Delivery Model</p>
              <p className="text-[10px] text-muted font-normal">Managed vs Bids</p>
            </div>
          </button>
        </div>
      </div>

      <Card className="p-6 sm:p-8 shadow-xl">
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* STEP 1: Discipline, Topic, Scope & Attachments */}
          {step === 1 && (
            <div className="space-y-5 animate-in">
              <div className="border-b border-border/70 pb-3">
                <h2 className="text-lg font-bold text-foreground">Step 1: Task Discipline & Details</h2>
                <p className="text-xs text-muted">
                  Provide clear context so verified specialists can evaluate feasibility immediately.
                </p>
              </div>

              <div>
                <Label htmlFor="title" className="text-xs font-semibold text-foreground">
                  Task Title
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  maxLength={120}
                  onChange={(e) => set({ title: e.target.value })}
                  placeholder="e.g. Distributed Consensus Raft Implementation Review"
                  required
                  className="mt-1 text-sm font-medium"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="category" className="text-xs font-semibold text-foreground">
                    Type of Assistance
                  </Label>
                  <select
                    id="category"
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-2/40 px-3 text-xs font-medium text-foreground transition-colors focus:border-primary focus:bg-surface focus:outline-none"
                    value={form.category}
                    onChange={(e) => set({ category: e.target.value })}
                  >
                    {REQUEST_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="subject" className="text-xs font-semibold text-foreground">
                    Subject Field
                  </Label>
                  <select
                    id="subject"
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-2/40 px-3 text-xs font-medium text-foreground transition-colors focus:border-primary focus:bg-surface focus:outline-none"
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
                <Label htmlFor="description" className="text-xs font-semibold text-foreground">
                  What do you want to achieve?
                </Label>
                <Textarea
                  id="description"
                  rows={5}
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                  placeholder="Describe your objectives, current code/mathematics blockers, and requirements. Experts will coach you conceptually (BR-14: experts coach and review, not ghostwrite)."
                  className="mt-1 text-xs leading-relaxed"
                />
              </div>

              {/* Skills Selector */}
              {skills.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    Required Tags / Technologies (Optional)
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {skills.map((skill) => {
                      const on = form.skill_ids.includes(skill.id);
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            set({
                              skill_ids: on
                                ? form.skill_ids.filter((id) => id !== skill.id)
                                : [...form.skill_ids, skill.id],
                            })
                          }
                          className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                            on
                              ? "border-primary bg-primary-soft text-primary font-semibold"
                              : "border-border/80 bg-surface-2/40 text-muted hover:bg-surface-2 hover:text-foreground"
                          }`}
                        >
                          {skill.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Attachments Dropzone */}
              <div>
                <Label htmlFor="attachments" className="text-xs font-semibold text-foreground">
                  Reference Files & Problem Sheets (PDF/PNG/JPG, ≤10MB)
                </Label>
                <div className="mt-1.5 rounded-2xl border border-dashed border-border/80 bg-surface-2/30 p-5 text-center">
                  <Upload className="mx-auto size-6 text-muted mb-2" />
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                    className="max-w-xs mx-auto text-xs"
                  />
                  {files.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {files.map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-md bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground border border-border">
                          <Paperclip className="size-3 text-muted" /> {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <Button type="button" onClick={() => setStep(2)} className="h-10 px-5 text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    Continue to Timeline & Budget <ArrowRight className="size-3.5" />
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Timeline & Budget */}
          {step === 2 && (
            <div className="space-y-5 animate-in">
              <div className="border-b border-border/70 pb-3">
                <h2 className="text-lg font-bold text-foreground">Step 2: Timeline & Budget Limits</h2>
                <p className="text-xs text-muted">
                  Funds remain protected in escrow and are only released upon your final milestone signoff.
                </p>
              </div>

              {/* Quick Deadline Selector */}
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Turnaround Window / Urgency
                </Label>
                <div className="mt-2 grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(1)}
                    className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-2/40 p-3 text-center transition-all hover:border-primary/50"
                  >
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-danger">
                      <Zap className="size-3" /> Rush (&lt; 24h)
                    </span>
                    <span className="text-[10px] text-muted mt-0.5">Priority routing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickDeadline(3)}
                    className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-2/40 p-3 text-center transition-all hover:border-primary/50"
                  >
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                      <Clock className="size-3" /> 3 Days
                    </span>
                    <span className="text-[10px] text-muted mt-0.5">Standard coaching</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickDeadline(7)}
                    className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-2/40 p-3 text-center transition-all hover:border-primary/50"
                  >
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500">
                      <ShieldCheck className="size-3" /> 7+ Days
                    </span>
                    <span className="text-[10px] text-muted mt-0.5">In-depth research</span>
                  </button>
                </div>

                <div className="mt-3">
                  <Label htmlFor="deadline" className="text-xs font-semibold text-foreground">
                    Custom Specific Deadline
                  </Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={form.deadline}
                    onChange={(e) => set({ deadline: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              {/* Pricing Structure & Budget */}
              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div>
                  <Label htmlFor="pricing" className="text-xs font-semibold text-foreground">
                    Pricing Model
                  </Label>
                  <select
                    id="pricing"
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-2/40 px-3 text-xs font-medium text-foreground transition-colors focus:border-primary focus:bg-surface focus:outline-none"
                    value={form.pricing_type}
                    onChange={(e) => set({ pricing_type: e.target.value as "fixed" | "hourly" })}
                  >
                    <option value="fixed">Fixed Milestone Price</option>
                    <option value="hourly">Hourly Rate</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="budget_min" className="text-xs font-semibold text-foreground">
                    Budget Min ($)
                  </Label>
                  <Input
                    id="budget_min"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 50"
                    value={form.budget_min}
                    onChange={(e) => set({ budget_min: e.target.value })}
                    className="mt-1 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="budget_max" className="text-xs font-semibold text-foreground">
                    Budget Max ($)
                  </Label>
                  <Input
                    id="budget_max"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 150"
                    value={form.budget_max}
                    onChange={(e) => set({ budget_max: e.target.value })}
                    className="mt-1 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <Button type="button" variant="ghost" onClick={() => setStep(1)} className="text-xs font-semibold">
                  <ArrowLeft className="size-3.5 mr-1" /> Back
                </Button>
                <Button type="button" onClick={() => setStep(3)} className="h-10 px-5 text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    Continue to Model Choice <ArrowRight className="size-3.5" />
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Model Choice: Open Bidding vs Managed Matching */}
          {step === 3 && (
            <div className="space-y-5 animate-in">
              <div className="border-b border-border/70 pb-3">
                <h2 className="text-lg font-bold text-foreground">Step 3: Choose Service Model</h2>
                <p className="text-xs text-muted">
                  Decide whether you want the platform to guarantee a matched specialist or browse competing bids.
                </p>
              </div>

              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="sr-only">How do you want to find your expert?</legend>

                {/* Option 1: Open Bidding */}
                <label
                  className={`cursor-pointer rounded-2xl border p-5 text-left transition-all ${
                    form.mode === "open"
                      ? "border-primary bg-primary-soft/30 shadow-md ring-2 ring-primary/20"
                      : "border-border/80 bg-surface-2/30 hover:bg-surface-2 hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    className="sr-only"
                    checked={form.mode === "open"}
                    onChange={() => set({ mode: "open" })}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-surface text-foreground border border-border">
                      <Users className="size-4 text-primary" />
                    </div>
                    {form.mode === "open" && <span className="size-2 rounded-full bg-primary" />}
                  </div>
                  <span className="mt-3 block text-sm font-bold text-foreground">Open Bidding Marketplace</span>
                  <span className="mt-1 block text-xs text-muted leading-relaxed">
                    Broadcast your request to all vetted specialists. Receive competitive blind bids, compare portfolios, and hire directly.
                  </span>
                </label>

                {/* Option 2: Managed Matching */}
                <label
                  className={`cursor-pointer rounded-2xl border p-5 text-left transition-all ${
                    form.mode === "managed"
                      ? "border-primary bg-primary-soft/30 shadow-md ring-2 ring-primary/20"
                      : "border-border/80 bg-surface-2/30 hover:bg-surface-2 hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    className="sr-only"
                    checked={form.mode === "managed"}
                    onChange={() => set({ mode: "managed" })}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                      <Sparkles className="size-4" />
                    </div>
                    {form.mode === "managed" && <span className="size-2 rounded-full bg-primary" />}
                  </div>
                  <span className="mt-3 block text-sm font-bold text-foreground">Managed White-Glove Match</span>
                  <span className="mt-1 block text-xs text-muted leading-relaxed">
                    Our academic coordinators review your scope and assign the top-rated doctoral expert with guaranteed milestone delivery.
                  </span>
                </label>
              </fieldset>

              {error && <p className="text-sm text-danger" role="alert">{error}</p>}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/70">
                <Button type="button" variant="ghost" onClick={() => setStep(2)} className="text-xs font-semibold">
                  <ArrowLeft className="size-3.5 mr-1" /> Back
                </Button>

                <div className="flex gap-2.5">
                  <Button type="button" variant="secondary" disabled={busy} onClick={() => submit(false)} className="text-xs">
                    Save Draft
                  </Button>
                  <Button type="button" disabled={busy} onClick={() => submit(true)} className="h-10 px-6 text-xs font-semibold shadow-md shadow-primary/25">
                    {busy ? "Publishing…" : form.mode === "managed" ? "Submit for Managed Review" : existing ? "Save & Publish" : "Publish Request"}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-surface-2/30 p-3 text-[11px] text-muted leading-relaxed">
                {form.mode === "managed"
                  ? "Managed review typically pairs an elite tutor within ~15-30 minutes. You will approve the locked price before escrow is funded."
                  : "By publishing, you agree to our Academic Integrity Policy: specialists coach and teach conceptual rigor, never completing graded work for you."}
              </div>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
