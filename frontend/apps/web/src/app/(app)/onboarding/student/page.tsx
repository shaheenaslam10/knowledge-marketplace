"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { profilesApi } from "@/features/experts/api";
import type { TaxonomyTerm } from "@/features/experts/types";

/**
 * Student onboarding (ADR-0012): self-service profile setup — no approval gate.
 * Collects only marketplace-useful, non-sensitive preferences.
 */
export default function StudentOnboardingPage() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [interests, setInterests] = useState<number[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "saved">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([profilesApi.studentProfile(), profilesApi.taxonomy()])
      .then(([profileResponse, taxonomyResponse]) => {
        if (cancelled) return;
        if (profileResponse.profile) {
          setDisplayName(profileResponse.profile.display_name);
          setBio(profileResponse.profile.bio);
          setInterests(profileResponse.profile.interests.map((t) => t.id));
        }
        setTerms(taxonomyResponse.terms.filter((t) => t.kind === "subject" || t.kind === "skill"));
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load your profile. Please refresh.");
          setState("ready");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setState("saving");
    try {
      await profilesApi.saveStudentProfile({ display_name: displayName, bio, interest_ids: interests });
      setState("saved");
    } catch {
      setError("Could not save your profile. Please try again.");
      setState("ready");
    }
  }

  function toggleInterest(id: number) {
    setInterests((current) => (current.includes(id) ? current.filter((i) => i !== id) : [...current, id]));
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Set up your student profile</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Optional preferences that help experts understand what you&apos;re learning. You can change this anytime.
      </p>

      <Card className="mt-6">
        {state === "loading" ? (
          <div className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60" data-testid="onboarding-loading" />
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Display name
              </label>
              <input
                id="display_name"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={150}
              />
            </div>
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                What are you working on?
              </label>
              <textarea
                id="bio"
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={1000}
              />
            </div>
            <div>
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Interests</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {terms.map((term) => (
                  <button
                    key={term.id}
                    type="button"
                    onClick={() => toggleInterest(term.id)}
                    aria-pressed={interests.includes(term.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      interests.includes(term.id)
                        ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                        : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {term.name}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            )}
            {state === "saved" && (
              <p role="status" data-testid="onboarding-saved" className="text-sm text-emerald-700 dark:text-emerald-400">
                Profile saved.
              </p>
            )}

            <Button type="submit" disabled={state === "saving"} data-testid="onboarding-submit">
              {state === "saving" ? "Saving…" : "Save profile"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
