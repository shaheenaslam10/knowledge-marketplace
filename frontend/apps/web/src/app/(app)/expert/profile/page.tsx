"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  UserCheck,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Star,
  Clock,
  AlertCircle,
  Save,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" data-testid="expert-profile-loading" />
      </div>
    );
  }

  if (state === "none") {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center space-y-4">
          <GraduationCap className="size-12 mx-auto text-primary" />
          <h2 className="text-xl font-bold text-foreground">Specialist Profile Pending Approval</h2>
          <p className="text-sm text-muted max-w-md mx-auto">
            Your public specialist profile and bidding eligibility appear here after your credentials and background are verified by our academic review team.
          </p>
          <Button asChild variant="secondary" className="text-xs">
            <Link href="/expert/application">Check Application Review Status</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Specialist Profile Cockpit
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" /> Vetted Specialist
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Manage your credentials, bio, availability mode, and public marketplace presence.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {profile && (
            <Button asChild variant="secondary" size="sm" className="text-xs gap-1.5 shadow-sm">
              <Link href={`/experts/${profile.slug}`} target="_blank">
                <span>View Public Profile</span>
                <ExternalLink className="size-3" />
              </Link>
            </Button>
          )}
          <Button asChild variant="secondary" size="sm" className="text-xs gap-1.5">
            <Link href="/expert/reviews">
              <Star className="size-3 text-amber-500 fill-amber-500" />
              <span>Reviews & Ratings</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Main Profile Form */}
      <Card className="p-6 sm:p-8 border-border/80 shadow-sm">
        <form onSubmit={onSave} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="display_name" className="text-xs font-semibold text-foreground">
                Public Display Name
              </Label>
              <Input
                id="display_name"
                name="display_name"
                defaultValue={profile?.display_name}
                maxLength={150}
                placeholder="Dr. Eleanor Vance"
                className="bg-background"
                required
              />
              <span className="text-[11px] text-muted block">The name shown on quotes, orders, and public listings.</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="headline" className="text-xs font-semibold text-foreground">
                Professional Academic Headline
              </Label>
              <Input
                id="headline"
                name="headline"
                defaultValue={profile?.headline}
                maxLength={120}
                placeholder="Ph.D. in Applied Mathematics | MIT Fellow"
                className="bg-background"
                required
              />
              <span className="text-[11px] text-muted block">A punchy one-line summary of your academic credentials.</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-xs font-semibold text-foreground">
              Academic Background & Coaching Philosophy
            </Label>
            <Textarea
              id="bio"
              name="bio"
              rows={5}
              defaultValue={profile?.bio}
              maxLength={2000}
              placeholder="Detail your research history, teaching experience, and tutoring methodology..."
              className="bg-background text-sm"
              required
            />
            <span className="text-[11px] text-muted block">Max 2,000 characters. Displayed on your public profile card.</span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="qualifications" className="text-xs font-semibold text-foreground">
                Degrees, Honors & Certifications
              </Label>
              <Input
                id="qualifications"
                name="qualifications"
                defaultValue={profile?.qualifications}
                maxLength={1000}
                placeholder="Ph.D. Columbia University, B.S. Stanford University"
                className="bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="languages" className="text-xs font-semibold text-foreground">
                Languages (comma separated)
              </Label>
              <Input
                id="languages"
                name="languages"
                defaultValue={profile?.languages}
                maxLength={200}
                placeholder="English (Native), French (Fluent), German"
                className="bg-background"
              />
            </div>
          </div>

          {/* Availability & Listing Settings */}
          <div className="rounded-xl border border-border/70 bg-surface-1 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              Marketplace Availability & Discovery
            </h3>

            <div className="flex flex-wrap gap-6 text-sm">
              <label className="flex items-center gap-2 text-foreground font-medium cursor-pointer">
                <input
                  type="radio"
                  name="availability"
                  checked={availability === "available"}
                  onChange={() => setAvailability("available")}
                  className="accent-primary size-4"
                />
                <span>Available for new requests & invitations</span>
              </label>
              <label className="flex items-center gap-2 text-muted font-medium cursor-pointer">
                <input
                  type="radio"
                  name="availability"
                  checked={availability === "paused"}
                  onChange={() => setAvailability("paused")}
                  className="accent-primary size-4"
                />
                <span>Paused (not accepting new assignments)</span>
              </label>
            </div>

            <label className="flex items-center gap-2 text-xs text-foreground font-medium cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="accent-primary size-4 rounded"
              />
              <span>Listed in the public marketplace specialist directory</span>
            </label>
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs text-danger font-medium flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {state === "saved" && (
            <div role="status" data-testid="expert-profile-saved" className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Profile saved successfully.</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={state === "saving"}
              data-testid="expert-profile-submit"
              className="gap-2 font-semibold text-xs px-6 h-10 shadow-sm"
            >
              <Save className="size-3.5" />
              {state === "saving" ? "Saving Profile…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
