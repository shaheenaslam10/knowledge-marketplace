"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { expertsApi } from "@/features/experts/api";
import type { PublicExpert } from "@/features/experts/types";

/** Expert profile editing — post-approval only (server-enforced). */
export default function ExpertProfilePage() {
  const [profile, setProfile] = useState<PublicExpert | null>(null);
  const [availability, setAvailability] = useState<"available" | "paused">("available");
  const [isPublic, setIsPublic] = useState(true);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "saved" | "none">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    expertsApi
      .myExpertProfile()
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setAvailability(data.availability);
        setIsPublic(true);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("none"); // not approved yet (404 no_profile)
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setState("saving");
    try {
      const updated = await expertsApi.updateExpertProfile({
        display_name: String(form.get("display_name") ?? "").trim(),
        headline: String(form.get("headline") ?? "").trim(),
        bio: String(form.get("bio") ?? "").trim(),
        qualifications: String(form.get("qualifications") ?? "").trim(),
        languages: String(form.get("languages") ?? "").trim(),
        availability,
        is_public: isPublic,
      });
      setProfile(updated);
      setState("saved");
    } catch {
      setError("Could not save changes. Please try again.");
      setState("ready");
    }
  }

  if (state === "loading") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60" data-testid="expert-profile-loading" />
      </div>
    );
  }

  if (state === "none") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <Card>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Your expert profile appears here after your application is approved.{" "}
            <Link href="/expert/application" className="underline">
              Check your application status
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Your expert profile</h1>
      {profile && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Public page: <Link href={`/experts/${profile.slug}`} className="underline">/experts/{profile.slug}</Link>
        </p>
      )}

      <Card className="mt-6">
        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label htmlFor="display_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Display name
            </label>
            <input
              id="display_name"
              name="display_name"
              defaultValue={profile?.display_name}
              maxLength={150}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label htmlFor="headline" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Headline
            </label>
            <input
              id="headline"
              name="headline"
              defaultValue={profile?.headline}
              maxLength={120}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              defaultValue={profile?.bio}
              maxLength={2000}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label htmlFor="qualifications" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Qualifications
            </label>
            <input
              id="qualifications"
              name="qualifications"
              defaultValue={profile?.qualifications}
              maxLength={1000}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label htmlFor="languages" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Languages
            </label>
            <input
              id="languages"
              name="languages"
              defaultValue={profile?.languages}
              maxLength={200}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="availability"
                checked={availability === "available"}
                onChange={() => setAvailability("available")}
              />
              Available for work
            </label>
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="availability"
                checked={availability === "paused"}
                onChange={() => setAvailability("paused")}
              />
              Paused (hidden badge, stays listed)
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Listed in the public directory
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          {state === "saved" && (
            <p role="status" data-testid="expert-profile-saved" className="text-sm text-emerald-700 dark:text-emerald-400">
              Profile saved.
            </p>
          )}

          <Button type="submit" disabled={state === "saving"} data-testid="expert-profile-submit">
            {state === "saving" ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
