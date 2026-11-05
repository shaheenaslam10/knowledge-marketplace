"use client";

/**
 * Modern AI-Era Academic Request Wizard (shared by /requests/new and /requests/[id]/edit).
 * Features an AI Scope Copilot, Interactive Model Selection Cards,
 * Smart Academic Inputs, Turnaround & Escrow Review, and a Sticky Live Summary Panel.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Zap,
  AlertCircle,
  X,
  BookOpen,
  Code,
  HelpCircle,
  Info,
  Wand2,
  GraduationCap,
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
  const [isAiEnhancing, setIsAiEnhancing] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

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

  // Pre-fill from URL query parameters (e.g., from AI quick launchers or landing page calculators)
  useEffect(() => {
    if (typeof window === "undefined" || existing) return;
    try {
      const sp = new URLSearchParams(window.location.search);
      const titleParam = sp.get("title");
      const promptParam = sp.get("prompt");
      const categoryParam = sp.get("category");
      if (titleParam || promptParam || categoryParam) {
        setForm((prev) => ({
          ...prev,
          title: titleParam || prev.title,
          description: promptParam || prev.description,
          category: categoryParam || prev.category,
        }));
        if (titleParam || promptParam) {
          setStep(2);
        }
      }
    } catch {}
  }, [existing]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  function setQuickDeadline(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    set({ deadline: d.toISOString().split("T")[0] });
  }

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === form.subject_id),
    [subjects, form.subject_id],
  );

  const selectedCategory = useMemo(
    () => REQUEST_CATEGORIES.find((c) => c.value === form.category),
    [form.category],
  );

  const budgetMaxNum = Number(form.budget_max) || 0;
  const expertEstPayout = Math.round(budgetMaxNum * 0.85);
  const platformEstFee = Math.round(budgetMaxNum * 0.15);

  const handleAppendTemplate = (text: string) => {
    set({
      description: form.description ? `${form.description}\n\n${text}` : text,
    });
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // AI Scope Copilot / Smart Prompt Enhancer
  const handleAiEnhance = () => {
    setIsAiEnhancing(true);
    setAiSuccess(false);

    setTimeout(() => {
      const subjectName = selectedSubject?.name ?? "Academic";
      const topic = form.title.trim() || `${subjectName} Comprehensive Analysis`;
      const currentDesc = form.description.trim();

      const enhanced = `### 🎯 1. Project Objective & Academic Scope
Task Focus: ${topic}
${currentDesc ? `Student Notes: ${currentDesc}\n` : ""}We require doctoral-grade conceptual guidance and technical review adhering strictly to academic integrity honor codes (BR-10 & BR-14).

### 🔬 2. Core Blockers & Technical Constraints
- Specific Problem Statement: Clarify theoretical proofs and implementation bottlenecks.
- Architectural / Math Constraints: Adhere to standard notation, rigorous step-by-step derivations, and verifiable methodology.
- Code / Data Environment: Cleanly documented scripts with modular architecture and test assertions.

### 📦 3. Required Milestone Deliverables
1. Annotated technical walkthrough notes detailing foundational concepts.
2. Code/Proof review identifying edge cases, time/space complexity, and optimization vectors.
3. 1-on-1 Q&A discussion to verify conceptual mastery and independent execution.`;

      set({ description: enhanced });
      setIsAiEnhancing(false);
      setAiSuccess(true);
      setTimeout(() => setAiSuccess(false), 4000);
    }, 700);
  };

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
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please check your inputs and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* 1. Visual Stepper Header */}
      <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-sm backdrop-blur-md">
        <div className="grid grid-cols-3 gap-2">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-3 rounded-xl py-2 px-3 text-xs font-semibold transition-all text-left ${
              step === 1
                ? "bg-primary-soft/80 text-primary font-bold shadow-xs border border-primary/25"
                : "text-muted hover:text-foreground hover:bg-surface-2/60"
            }`}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step > 1
                  ? "bg-emerald-500 text-white"
                  : step === 1
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                  : "bg-surface-2 text-muted border border-border"
              }`}
            >
              {step > 1 ? <Check className="size-3.5" /> : "1"}
            </span>
            <div className="hidden sm:block min-w-0">
              <p className="truncate text-xs font-bold leading-tight">1. Model & Scope</p>
              <p className="truncate text-[10px] text-muted font-normal">Operating mode & track</p>
            </div>
          </button>

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center gap-3 rounded-xl py-2 px-3 text-xs font-semibold transition-all text-left ${
              step === 2
                ? "bg-primary-soft/80 text-primary font-bold shadow-xs border border-primary/25"
                : "text-muted hover:text-foreground hover:bg-surface-2/60"
            }`}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step > 2
                  ? "bg-emerald-500 text-white"
                  : step === 2
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                  : "bg-surface-2 text-muted border border-border"
              }`}
            >
              {step > 2 ? <Check className="size-3.5" /> : "2"}
            </span>
            <div className="hidden sm:block min-w-0">
              <p className="truncate text-xs font-bold leading-tight">2. Academic Specs</p>
              <p className="truncate text-[10px] text-muted font-normal">Brief, AI assist & files</p>
            </div>
          </button>

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex items-center gap-3 rounded-xl py-2 px-3 text-xs font-semibold transition-all text-left ${
              step === 3
                ? "bg-primary-soft/80 text-primary font-bold shadow-xs border border-primary/25"
                : "text-muted hover:text-foreground hover:bg-surface-2/60"
            }`}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step === 3
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                  : "bg-surface-2 text-muted border border-border"
              }`}
            >
              3
            </span>
            <div className="hidden sm:block min-w-0">
              <p className="truncate text-xs font-bold leading-tight">3. Turnaround & Escrow</p>
              <p className="truncate text-[10px] text-muted font-normal">Budget & custody hold</p>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Main Wizard Canvas: Form Area (Left) + Sticky Summary Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Column */}
        <div className="lg:col-span-8">
          <Card className="p-6 sm:p-8 shadow-xl border-border/80 bg-card">
            <form onSubmit={(e) => e.preventDefault()}>
              {/* ======================================================== */}
              {/* STEP 1: Model & Scope                                    */}
              {/* ======================================================== */}
              <div className={step === 1 ? "space-y-6 animate-in" : "hidden"}>
                <div className="border-b border-border/70 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary" />
                    <h2 className="text-lg font-bold text-foreground">Step 1: Choose Operating Model & Scope</h2>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Select how you want to discover specialists and define the high-level assistance category.
                  </p>
                </div>

                {/* Operating Model Selection Cards */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-bold text-foreground">
                    Operating Delivery Model <span className="text-danger">*</span>
                  </Label>
                  <fieldset className="grid gap-4 sm:grid-cols-2">
                    <legend className="sr-only">Choose your operating model</legend>

                    {/* Open Bidding Card */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => set({ mode: "open" })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          set({ mode: "open" });
                        }
                      }}
                      className={`relative cursor-pointer rounded-2xl border p-5 text-left transition-all ${
                        form.mode === "open"
                          ? "border-primary bg-primary-soft/40 shadow-md ring-2 ring-primary/20 scale-[1.01]"
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
                        <div className="flex size-10 items-center justify-center rounded-xl bg-surface text-primary border border-border/80 shadow-xs">
                          <Users className="size-5" />
                        </div>
                        {form.mode === "open" ? (
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-black">
                            <Check className="size-3" />
                          </span>
                        ) : (
                          <span className="size-4 rounded-full border border-border" />
                        )}
                      </div>
                      <span className="mt-3.5 block text-sm font-extrabold text-foreground">
                        ⚡ Open Bidding Marketplace
                      </span>
                      <p className="mt-1.5 text-xs text-muted leading-relaxed">
                        Verified specialists review your requirements and submit bids. You choose the best rate and credential match.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-border/50 text-[10px] font-semibold text-muted">
                        <span className="rounded-md bg-surface px-2 py-0.5 border border-border/60">
                          Blind Bidding
                        </span>
                        <span className="rounded-md bg-surface px-2 py-0.5 border border-border/60">
                          Direct Hire
                        </span>
                        <span className="rounded-md bg-surface px-2 py-0.5 border border-border/60">
                          Rate Comparison
                        </span>
                      </div>
                    </div>

                    {/* Managed White-Glove Card */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => set({ mode: "managed" })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          set({ mode: "managed" });
                        }
                      }}
                      className={`relative cursor-pointer rounded-2xl border p-5 text-left transition-all ${
                        form.mode === "managed"
                          ? "border-primary bg-primary-soft/40 shadow-md ring-2 ring-primary/20 scale-[1.01]"
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
                        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md shadow-primary/25">
                          <Sparkles className="size-5" />
                        </div>
                        {form.mode === "managed" ? (
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-black">
                            <Check className="size-3" />
                          </span>
                        ) : (
                          <span className="size-4 rounded-full border border-border" />
                        )}
                      </div>
                      <span className="mt-3.5 block text-sm font-extrabold text-foreground">
                        💎 Managed White-Glove Service
                      </span>
                      <p className="mt-1.5 text-xs text-muted leading-relaxed">
                        Platform coordinators analyze your task and algorithmically assign our top 3% rated specialist with SLA delivery guarantee.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-border/50 text-[10px] font-semibold text-muted">
                        <span className="rounded-md bg-surface px-2 py-0.5 border border-border/60 text-primary">
                          Top 3% Vetted
                        </span>
                        <span className="rounded-md bg-surface px-2 py-0.5 border border-border/60">
                          SLA Guarantee
                        </span>
                        <span className="rounded-md bg-surface px-2 py-0.5 border border-border/60">
                          Coordinator Assisted
                        </span>
                      </div>
                    </div>
                  </fieldset>
                </div>

                {/* Scope & Assistance Category */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-bold text-foreground">
                    Assistance Category <span className="text-danger">*</span>
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {REQUEST_CATEGORIES.map((c) => {
                      const isSelected = form.category === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => set({ category: c.value })}
                          className={`p-3 rounded-xl border text-left transition-all text-xs font-semibold ${
                            isSelected
                              ? "border-primary bg-primary-soft text-primary shadow-xs font-bold"
                              : "border-border/80 bg-surface-2/30 text-muted hover:text-foreground hover:bg-surface-2"
                          }`}
                        >
                          <span className="block">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border/70">
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    className="h-10 px-5 text-xs font-semibold bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  >
                    <span>Continue to Academic Specs</span>
                    <ArrowRight className="size-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>

              {/* ======================================================== */}
              {/* STEP 2: Academic Specs & Files                           */}
              {/* ======================================================== */}
              <div className={step === 2 ? "space-y-6 animate-in" : "hidden"}>
                <div className="border-b border-border/70 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary" />
                    <h2 className="text-lg font-bold text-foreground">Step 2: Academic Specs & Files</h2>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Define the task requirements with technical precision so specialists can review feasibility immediately.
                  </p>
                </div>

                {/* Task Title with Floating Icon */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="title" className="text-xs font-bold text-foreground">
                      Task Title <span className="text-danger">*</span>
                    </Label>
                    <span className="text-[11px] text-muted font-mono">{form.title.length}/120</span>
                  </div>
                  <div className="relative">
                    <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
                    <Input
                      id="title"
                      value={form.title}
                      maxLength={120}
                      onChange={(e) => set({ title: e.target.value })}
                      placeholder="e.g. Distributed Consensus Raft Algorithm & RPC Implementation Review"
                      required
                      className="pl-10 text-xs sm:text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Subject Taxonomy Dropdown & Category Field */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="subject" className="text-xs font-bold text-foreground">
                      Subject Taxonomy <span className="text-danger">*</span>
                    </Label>
                    <select
                      id="subject"
                      className="h-10 w-full rounded-xl border border-border bg-surface-2/50 px-3 text-xs font-medium text-foreground transition-colors focus:border-primary focus:bg-surface focus:outline-none"
                      value={form.subject_id}
                      onChange={(e) => set({ subject_id: e.target.value })}
                    >
                      <option value="">Select a subject…</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="category_select" className="text-xs font-bold text-foreground">
                      Assistance Track
                    </Label>
                    <select
                      id="category_select"
                      className="h-10 w-full rounded-xl border border-border bg-surface-2/50 px-3 text-xs font-medium text-foreground transition-colors focus:border-primary focus:bg-surface focus:outline-none"
                      value={form.category}
                      onChange={(e) => set({ category: e.target.value })}
                    >
                      {REQUEST_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Rich Task Description Textarea with AI Enhancer & Quick Chips */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Label htmlFor="description" className="text-xs font-bold text-foreground">
                      Detailed Task Brief & Blockers <span className="text-danger">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      {/* AI Scope Copilot Button */}
                      <button
                        type="button"
                        onClick={handleAiEnhance}
                        disabled={isAiEnhancing}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-violet-600/15 via-primary/15 to-indigo-600/15 border border-primary/30 text-xs font-bold text-primary hover:border-primary hover:bg-primary/20 transition-all shadow-xs"
                      >
                        <Wand2 className={`size-3.5 ${isAiEnhancing ? "animate-spin text-primary" : "text-primary"}`} />
                        <span>{isAiEnhancing ? "Enhancing Brief…" : "Enhance with AI ✨"}</span>
                      </button>
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-muted border border-border">
                        Markdown
                      </span>
                      <span className="text-[11px] text-muted font-mono">{form.description.length} chars</span>
                    </div>
                  </div>

                  {aiSuccess && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>AI Academic Copilot structured your brief with technical rubrics and milestone checkpoints!</span>
                    </div>
                  )}

                  {/* Formatting / Boilerplate Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-muted text-[10px] font-semibold">Quick inserts:</span>
                    <button
                      type="button"
                      onClick={() => handleAppendTemplate("### Problem Statement\nDescribe the exact problem or proof blocker here.")}
                      className="rounded-md border border-border bg-surface-2/40 px-2 py-0.5 text-[10px] font-medium text-muted hover:text-foreground hover:bg-surface-2"
                    >
                      + Problem Statement
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAppendTemplate("### Requirements & Constraints\n- Constraint 1:\n- Constraint 2:")}
                      className="rounded-md border border-border bg-surface-2/40 px-2 py-0.5 text-[10px] font-medium text-muted hover:text-foreground hover:bg-surface-2"
                    >
                      + Constraints
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAppendTemplate("### Expected Deliverables\nConceptual code review and walkthrough notes.")}
                      className="rounded-md border border-border bg-surface-2/40 px-2 py-0.5 text-[10px] font-medium text-muted hover:text-foreground hover:bg-surface-2"
                    >
                      + Expected Deliverables
                    </button>
                  </div>

                  <Textarea
                    id="description"
                    rows={6}
                    value={form.description}
                    onChange={(e) => set({ description: e.target.value })}
                    placeholder="Describe your objectives, current code/mathematics blockers, and requirements. Specialists coach you conceptually (BR-14: specialists guide and review, not ghostwrite)."
                    className="text-xs sm:text-sm leading-relaxed"
                  />
                </div>

                {/* Optional Skills Tags */}
                {skills.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">
                      Required Skills & Tools (Optional)
                    </Label>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl bg-surface-2/30 border border-border">
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
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                              on
                                ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                                : "border-border/80 bg-surface-2 text-muted hover:bg-surface-3 hover:text-foreground"
                            }`}
                          >
                            {skill.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Drag-and-Drop File Upload Zone */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="attachments" className="text-xs font-bold text-foreground">
                      Attachments & Problem Sheets
                    </Label>
                    <span className="text-[10px] text-muted">PDF, DOCX, ZIP, Jupyter (.ipynb), Python (.py), ≤10MB</span>
                  </div>
                  <div className="rounded-2xl border-2 border-dashed border-border/80 bg-surface-2/20 p-6 text-center hover:border-primary/50 transition-colors">
                    <Upload className="mx-auto size-7 text-muted mb-2" />
                    <p className="text-xs font-semibold text-foreground">
                      Drag files here or click to browse
                    </p>
                    <p className="text-[11px] text-muted mt-0.5">
                      Upload assignment briefs, dataset samples, or code specifications
                    </p>
                    <div className="mt-3 flex justify-center">
                      <Input
                        id="attachments"
                        type="file"
                        multiple
                        accept=".pdf,.docx,.zip,.ipynb,.py,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files ?? []);
                          setFiles((prev) => [...prev, ...newFiles]);
                        }}
                        className="max-w-xs text-xs"
                      />
                    </div>
                  </div>

                  {/* Attached Files List */}
                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {files.map((f, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium text-foreground border border-border shadow-xs"
                        >
                          <Paperclip className="size-3 text-primary" />
                          <span className="truncate max-w-[140px]">{f.name}</span>
                          <span className="text-[10px] text-muted font-mono">
                            ({Math.round(f.size / 1024)} KB)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(i)}
                            className="size-4 rounded-full hover:bg-danger-soft hover:text-danger flex items-center justify-center transition-colors"
                            aria-label={`Remove ${f.name}`}
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/70">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="text-xs font-semibold"
                  >
                    <ArrowLeft className="size-3.5 mr-1.5" /> Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    className="h-10 px-5 text-xs font-semibold bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  >
                    <span>Continue to Turnaround & Escrow</span>
                    <ArrowRight className="size-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>

              {/* ======================================================== */}
              {/* STEP 3: Turnaround & Escrow Review                       */}
              {/* ======================================================== */}
              <div className={step === 3 ? "space-y-6 animate-in" : "hidden"}>
                <div className="border-b border-border/70 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary" />
                    <h2 className="text-lg font-bold text-foreground">Step 3: Turnaround & Escrow Custody</h2>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Configure your delivery timeline, pricing structure, and inspect escrow custody protections.
                  </p>
                </div>

                {/* Timeline Buttons */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">
                    Target Turnaround Window <span className="text-danger">*</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setQuickDeadline(1)}
                      className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-2/40 p-3.5 text-center transition-all hover:border-danger/60 hover:bg-surface-2"
                    >
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-danger">
                        <Zap className="size-3.5" /> &lt; 24 Hours [Rush]
                      </span>
                      <span className="text-[10px] text-muted mt-1">Priority specialist routing</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuickDeadline(3)}
                      className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-2/40 p-3.5 text-center transition-all hover:border-primary/60 hover:bg-surface-2"
                    >
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                        <Clock className="size-3.5" /> 3 Days [Standard]
                      </span>
                      <span className="text-[10px] text-muted mt-1">Balanced milestone cadence</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuickDeadline(7)}
                      className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-2/40 p-3.5 text-center transition-all hover:border-emerald-500/60 hover:bg-surface-2"
                    >
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="size-3.5" /> 7+ Days [Deep Dive]
                      </span>
                      <span className="text-[10px] text-muted mt-1">Comprehensive research review</span>
                    </button>
                  </div>

                  <div className="mt-2.5">
                    <Label htmlFor="deadline" className="text-xs font-semibold text-muted">
                      Or select a specific calendar date:
                    </Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={form.deadline}
                      onChange={(e) => set({ deadline: e.target.value })}
                      className="mt-1 text-xs max-w-xs"
                    />
                  </div>
                </div>

                {/* Pricing Structure & Budget Limits */}
                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-bold text-foreground">
                    Pricing & Escrow Limits <span className="text-danger">*</span>
                  </Label>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="pricing" className="text-[11px] font-semibold text-muted">
                        Pricing Model
                      </Label>
                      <select
                        id="pricing"
                        className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-2/50 px-3 text-xs font-medium text-foreground transition-colors focus:border-primary focus:bg-surface focus:outline-none"
                        value={form.pricing_type}
                        onChange={(e) => set({ pricing_type: e.target.value as "fixed" | "hourly" })}
                      >
                        <option value="fixed">Fixed Milestone Price</option>
                        <option value="hourly">Hourly Rate</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="budget_min" className="text-[11px] font-semibold text-muted">
                        Budget Min ($ USD)
                      </Label>
                      <div className="relative mt-1">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
                        <Input
                          id="budget_min"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g. 50"
                          value={form.budget_min}
                          onChange={(e) => set({ budget_min: e.target.value })}
                          className="pl-8 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="budget_max" className="text-[11px] font-semibold text-muted">
                        Budget Max ($ USD)
                      </Label>
                      <div className="relative mt-1">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
                        <Input
                          id="budget_max"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g. 150"
                          value={form.budget_max}
                          onChange={(e) => set({ budget_max: e.target.value })}
                          className="pl-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Budget / Escrow Estimator Card */}
                <div className="rounded-2xl border border-border/80 bg-surface-2/40 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-emerald-500" />
                      <span>Custody & Escrow Breakdown</span>
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                      100% Escrow Protected
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted block text-[10px]">Maximum Deposit</span>
                      <span className="font-mono font-bold text-foreground text-sm">
                        ${budgetMaxNum > 0 ? budgetMaxNum.toFixed(2) : "0.00"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px]">Specialist Net (85%)</span>
                      <span className="font-mono font-bold text-primary text-sm">
                        ${budgetMaxNum > 0 ? expertEstPayout.toFixed(2) : "0.00"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px]">Platform Reserve (15%)</span>
                      <span className="font-mono font-bold text-muted text-sm">
                        ${budgetMaxNum > 0 ? platformEstFee.toFixed(2) : "0.00"}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted leading-relaxed pt-1">
                    Funds remain in platform custody and are never released to the specialist until you inspect the milestone submission and provide written approval.
                  </p>
                </div>

                {/* Academic Integrity Honor Code Callout */}
                <div className="rounded-xl border border-border/70 bg-surface-1 p-3 text-[11px] text-muted leading-relaxed flex items-start gap-2">
                  <Info className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>Academic Integrity Honor Code (BR-10 & BR-14):</strong> Vetted doctoral specialists coach and clarify conceptual principles, provide constructive feedback, and review logic. They never complete graded coursework or exams on your behalf.
                  </span>
                </div>

                {error && (
                  <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/70">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(2)}
                    className="text-xs font-semibold"
                  >
                    <ArrowLeft className="size-3.5 mr-1.5" /> Back
                  </Button>

                  <div className="flex items-center gap-2.5">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => submit(false)}
                      className="text-xs font-semibold"
                    >
                      Save Draft
                    </Button>
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() => submit(true)}
                      className="h-10 px-6 text-xs font-semibold bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-strong hover:to-indigo-700 text-primary-foreground shadow-lg shadow-primary/25"
                    >
                      {busy
                        ? "Submitting…"
                        : form.mode === "managed"
                        ? "Submit for Managed Review"
                        : existing
                        ? "Save & Publish"
                        : "Publish Task Brief"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Sticky Brief Summary Panel */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
          <Card className="p-5 border-border/80 bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted">
                Live Brief Preview
              </span>
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Operating Model Pill */}
            <div>
              <span className="text-[10px] uppercase font-bold text-muted block mb-1">
                Selected Model
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  form.mode === "managed"
                    ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25"
                    : "bg-primary/10 text-primary border-primary/25"
                }`}
              >
                {form.mode === "managed" ? (
                  <>
                    <Sparkles className="size-3" /> Managed White-Glove
                  </>
                ) : (
                  <>
                    <Users className="size-3" /> Open Bidding Pool
                  </>
                )}
              </span>
            </div>

            {/* Title & Subject */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted block">
                Academic Scope
              </span>
              <p className="text-xs font-bold text-foreground line-clamp-2">
                {form.title || "Untitled Task Brief"}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-2 text-foreground border border-border">
                  {selectedCategory?.label || "General"}
                </span>
                {selectedSubject && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary-soft text-primary border border-primary/20">
                    {selectedSubject.name}
                  </span>
                )}
              </div>
            </div>

            {/* Turnaround & Budget */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted block">
                  Budget Target
                </span>
                <span className="font-mono font-bold text-foreground">
                  {form.budget_max ? `$${form.budget_min || "0"} - $${form.budget_max}` : "Flexible"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted block">
                  Deadline
                </span>
                <span className="font-bold text-foreground">
                  {form.deadline || "Flexible"}
                </span>
              </div>
            </div>

            {/* Attachments Count */}
            <div className="pt-2 border-t border-border/60 text-xs flex items-center justify-between text-muted">
              <span>Attached Reference Files</span>
              <span className="font-bold text-foreground">{files.length} file{files.length === 1 ? "" : "s"}</span>
            </div>

            {/* Trust Badges */}
            <div className="space-y-2 pt-3 border-t border-border/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                <span>100% Milestone-Gated Escrow</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Zap className="size-4 text-amber-500 shrink-0" />
                <span>Average First Bid: &lt; 18 Minutes</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CheckCircle2 className="size-4 text-primary shrink-0" />
                <span>Top 3% Vetted Doctoral Specialists</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
