"use client";

import { useState } from "react";
import { X, CheckCircle, ShoppingCart, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { catalogApi } from "../api";
import type { KnowledgeProduct, KnowledgePurchase } from "../types";
import { PRODUCT_TYPE_ICON, PRODUCT_TYPE_LABEL } from "../types";

interface PurchaseDrawerProps {
  product: KnowledgeProduct | null;
  onClose: () => void;
  onPurchased: (purchase: KnowledgePurchase) => void;
  isAuthenticated: boolean;
  alreadyPurchased?: boolean;
}

export function PurchaseDrawer({
  product,
  onClose,
  onPurchased,
  isAuthenticated,
  alreadyPurchased,
}: PurchaseDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [purchase, setPurchase] = useState<KnowledgePurchase | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      window.location.href = `/login?next=/catalog`;
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await catalogApi.purchase(product.slug);
      setPurchase(result);
      onPurchased(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Purchase failed. Please try again.";
      setError(msg.includes("already") ? "You already own this product!" : msg);
    } finally {
      setLoading(false);
    }
  };

  const commission = Math.round(product.price_minor * 0.15);
  const expertNet = product.price_minor - commission;
  const fmtMinor = (v: number) => `$${(v / 100).toFixed(2)}`;
  const isFull =
    product.product_type === "live_cohort" &&
    (product.max_seats ?? 0) > 0 &&
    (product.enrolled_count ?? 0) >= (product.max_seats ?? 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Purchase: ${product.title}`}
        className="fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-background shadow-2xl flex flex-col overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{PRODUCT_TYPE_ICON[product.product_type]}</span>
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              {PRODUCT_TYPE_LABEL[product.product_type]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 space-y-6">
          {purchase ? (
            // Success state
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="size-8 text-success" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Unlocked!</h2>
                <p className="mt-1 text-sm text-muted">
                  You now have access to{" "}
                  <span className="font-semibold text-foreground">{product.title}</span>.
                </p>
              </div>
              <div className="w-full rounded-xl border border-border bg-surface-1 p-4 text-left space-y-2">
                <p className="text-xs text-muted font-semibold uppercase tracking-wider">Receipt</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Amount paid</span>
                  <span className="font-bold text-foreground">{product.price_display}</span>
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>Platform commission (15%)</span>
                  <span>{fmtMinor(commission)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>Expert net (85%)</span>
                  <span>{fmtMinor(expertNet)}</span>
                </div>
                <div className="border-t border-border/60 pt-2 flex justify-between text-xs text-muted">
                  <span>Reference</span>
                  <span className="font-mono text-[10px]">{purchase.id}</span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-1 p-4 w-full text-left">
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  {product.product_type === "live_cohort" ? "👥 Your Cohort Access" : "📚 Your Resource Vault"}
                </h4>
                <p className="text-sm text-foreground font-medium">{product.title}</p>
                <p className="text-xs text-muted mt-1">{product.summary}</p>
                {product.product_type === "live_cohort" && (
                  <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-1 text-xs">
                    <p className="font-bold text-primary">Live Workshop Credentials:</p>
                    <p className="text-foreground">
                      Room Access Code: <code className="font-mono font-bold bg-surface-2 px-1.5 py-0.5 rounded">{product.live_room_code || "COHORT-LIVE-ROOM"}</code>
                    </p>
                    {product.cohort_scheduled_at && (
                      <p className="text-muted">
                        Session starts: {new Date(product.cohort_scheduled_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-primary mt-3 font-semibold">
                  {product.product_type === "live_cohort"
                    ? "✓ Seat guaranteed — join details synced with your calendar"
                    : "✓ Access granted — download available in My Purchases"}
                </p>
              </div>
            </div>
          ) : alreadyPurchased ? (
            // Already owned
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="size-8 text-success" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Already Owned</h2>
              <p className="text-sm text-muted">You already have access to this resource.</p>
            </div>
          ) : (
            // Purchase CTA
            <>
              <div>
                <h2 className="text-xl font-bold text-foreground leading-snug">{product.title}</h2>
                <p className="mt-2 text-sm text-muted leading-relaxed">{product.summary}</p>
              </div>

              {product.description && (
                <div className="rounded-xl bg-surface-1 border border-border p-4">
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{product.description}</p>
                </div>
              )}

              {product.product_type === "live_cohort" && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      👥 Live Micro-Cohort
                    </span>
                    {(product.max_seats ?? 0) > 0 && (
                      <Badge tone={isFull ? "danger" : "info"} className="text-xs">
                        {isFull
                          ? "Fully Booked"
                          : `${product.enrolled_count ?? 0} / ${product.max_seats} Seats Taken`}
                      </Badge>
                    )}
                  </div>
                  {product.cohort_scheduled_at && (
                    <p className="text-xs text-foreground font-medium">
                      Scheduled Date:{" "}
                      <span className="font-bold">
                        {new Date(product.cohort_scheduled_at).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                  )}
                  <p className="text-[11px] text-muted">
                    Interactive small group workshop. Real-time Q&A, shared workspace, and post-session replay access.
                  </p>
                </div>
              )}

              {/* Pricing breakdown */}
              <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Pricing</p>
                <div className="flex justify-between text-base font-bold text-foreground">
                  <span>Total</span>
                  <span>{product.price_display}</span>
                </div>
                <p className="text-[11px] text-muted">
                  85% goes directly to <span className="font-semibold text-foreground">{product.expert_name}</span> •
                  Instant delivery • No subscription
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {product.subject_name && (
                  <Badge tone="neutral">{product.subject_name}</Badge>
                )}
                <Badge tone="info">{PRODUCT_TYPE_LABEL[product.product_type]}</Badge>
                <Badge tone="neutral">{product.sales_count} sales</Badge>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-danger/10 border border-danger/30 p-3">
                  <AlertCircle className="size-4 text-danger flex-shrink-0" />
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer CTA */}
        {!purchase && !alreadyPurchased && (
          <div className="border-t border-border px-6 py-4 space-y-3">
            <Button
              variant={isFull ? "secondary" : "glow"}
              size="lg"
              className="w-full font-bold text-sm gap-2"
              onClick={() => void handlePurchase()}
              disabled={loading || isFull}
            >
              <ShoppingCart className="size-4" />
              {loading
                ? "Processing…"
                : isFull
                ? "Workshop Fully Booked"
                : isAuthenticated
                ? product.product_type === "live_cohort"
                  ? `Reserve Seat & Access — ${product.price_display}`
                  : `Instant Purchase & Unlock — ${product.price_display}`
                : "Sign In to Purchase"}
            </Button>
            <p className="text-[11px] text-muted text-center">
              Secure instant delivery • Double-entry ledger receipt • 15% platform commission
            </p>
          </div>
        )}
        {(purchase || alreadyPurchased) && (
          <div className="border-t border-border px-6 py-4">
            <Button variant="secondary" className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

