"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Clock, ShieldCheck, Zap, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useSession } from "@/features/auth/SessionProvider";
import { expertsApi } from "@/features/experts/api";
import type { PublicExpert } from "@/features/experts/types";

export function SpeedBookingCard({ expert }: { expert: PublicExpert }) {
  const router = useRouter();
  const { user } = useSession();

  const price30 = expert.session_30m_price ? expert.session_30m_price / 100 : 45;
  const price60 = expert.session_60m_price ? expert.session_60m_price / 100 : 80;

  const [duration, setDuration] = useState<30 | 60>(30);
  const [topic, setTopic] = useState("1:1 Architecture & Code Mentorship");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPrice = duration === 30 ? price30 : price60;

  const handleBook = async () => {
    if (!user) {
      router.push(`/login?redirect=/experts/${expert.slug}`);
      return;
    }

    if (!topic.trim()) {
      setError("Please specify a topic or focus area for your session.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await expertsApi.bookSession(expert.slug, {
        duration_minutes: duration,
        topic_title: topic.trim(),
        notes: notes.trim() || undefined,
        scheduled_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      });

      // Successful instant booking with escrow funding!
      // Redirect to the newly generated order workspace
      router.push(`/orders/${res.order_id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to book session. Please try again.");
      } else {
        setError("Failed to book session. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <Card
      className="border-primary/30 shadow-xl shadow-primary/5 ring-1 ring-primary/20 bg-gradient-to-b from-card via-card to-primary/[0.02]"
      data-testid="speed-booking-card"
    >
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Zap className="size-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Speed-Book 1:1 Live Session</h3>
            <p className="text-[11px] text-muted">Direct WebRTC coaching room + shared scratchpad</p>
          </div>
        </div>
        <Badge tone="success" className="text-[10px] font-bold">
          Instant Confirmation
        </Badge>
      </div>

      <div className="mt-4 space-y-4">
        {/* Duration Selector */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-2">
            Select Consultation Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDuration(30)}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                duration === 30
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                  : "border-border bg-surface-1 hover:bg-surface-2"
              }`}
              data-testid="duration-30-btn"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Clock className="size-3.5 text-primary" />
                <span>30-Min Strategy Call</span>
              </div>
              <span className="text-[11px] text-muted mt-0.5">Rapid code review & triage</span>
              <span className="mt-2 text-base font-extrabold text-primary">${price30}</span>
            </button>

            <button
              type="button"
              onClick={() => setDuration(60)}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                duration === 60
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                  : "border-border bg-surface-1 hover:bg-surface-2"
              }`}
              data-testid="duration-60-btn"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Video className="size-3.5 text-primary" />
                <span>60-Min Deep Coaching</span>
              </div>
              <span className="text-[11px] text-muted mt-0.5">Full hands-on debugging</span>
              <span className="mt-2 text-base font-extrabold text-primary">${price60}</span>
            </button>
          </div>
        </div>

        {/* Topic Input */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Session Goal or Problem Statement
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Debugging FastAPI async engine & memory leak"
            className="w-full rounded-xl border border-border bg-surface-1 px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="session-topic-input"
          />
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Notes / Code Repo link (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Relevant links, background info, or specific files"
            className="w-full rounded-xl border border-border bg-surface-1 px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="session-notes-input"
          />
        </div>

        {/* Trust & Escrow Reassurance */}
        <div className="rounded-xl border border-border/80 bg-surface-1/60 p-3 space-y-1.5 text-[11px] text-muted">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span>Escrow Protected & Satisfaction Guaranteed</span>
          </div>
          <p className="pl-6">
            Your ${selectedPrice} payment is locked in platform escrow. {expert.display_name} is only paid
            after your consultation wraps up successfully.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-danger/10 border border-danger/30 p-3 text-xs text-danger">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Instant Booking Trigger Button */}
        <Button
          type="button"
          variant="glow"
          size="lg"
          onClick={() => void handleBook()}
          disabled={loading}
          className="w-full font-bold shadow-lg shadow-primary/25 text-xs py-3.5 h-auto"
          data-testid="instant-book-btn"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Securing Escrow & Initializing Studio...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Zap className="size-4 fill-current" />
              <span>Instant Book & Fund Escrow — ${selectedPrice}.00</span>
            </span>
          )}
        </Button>
      </div>
    </Card>
  );
}
