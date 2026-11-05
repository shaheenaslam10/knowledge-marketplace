"use client";

import { useState } from "react";
import { X, PlusCircle, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { catalogApi } from "../api";
import type { KnowledgeProduct } from "../types";

interface PublishProductDrawerProps {
  onClose: () => void;
  onPublished: (product: KnowledgeProduct) => void;
}

const PRODUCT_TYPES = [
  { value: "study_guide", label: "📘 Study Guide" },
  { value: "code_template", label: "💻 Code Template" },
  { value: "recorded_masterclass", label: "🎬 Recorded Masterclass" },
  { value: "research_pack", label: "🔬 Research Pack" },
];

export function PublishProductDrawer({ onClose, onPublished }: PublishProductDrawerProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState("study_guide");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<KnowledgeProduct | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Parse price: accept "$25" or "25" or "25.00"
    const rawPrice = priceDisplay.replace(/[^0-9.]/g, "");
    const priceMinor = Math.round(parseFloat(rawPrice) * 100);
    if (!title.trim() || !summary.trim()) {
      setError("Title and summary are required.");
      return;
    }
    if (isNaN(priceMinor) || priceMinor < 100) {
      setError("Price must be at least $1.00.");
      return;
    }

    setLoading(true);
    try {
      const product = await catalogApi.publish({
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim(),
        product_type: productType,
        price_minor: priceMinor,
      });
      setPublished(product);
      onPublished(product);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to publish. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Publish new knowledge product"
        className="fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-background shadow-2xl flex flex-col overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <PlusCircle className="size-5 text-primary" />
            <span className="font-bold text-sm text-foreground">Publish Knowledge Product</span>
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
        <div className="flex-1 px-6 py-6">
          {published ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="size-8 text-success" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Product Published!</h2>
              <p className="text-sm text-muted">
                <span className="font-semibold text-foreground">{published.title}</span> is now
                live in the Knowledge Catalog.
              </p>
              <Button variant="secondary" className="mt-4" onClick={onClose}>
                Back to Studio
              </Button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="pub-title">Title *</Label>
                <Input
                  id="pub-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Python Pandas Mastery Guide"
                  maxLength={200}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pub-summary">Summary * <span className="text-muted font-normal">(shown in catalog grid)</span></Label>
                <Textarea
                  id="pub-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="A concise description of what students will learn…"
                  maxLength={500}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pub-description">Full Description <span className="text-muted font-normal">(optional)</span></Label>
                <Textarea
                  id="pub-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed curriculum, prerequisites, what's included…"
                  rows={4}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Product Type *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRODUCT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setProductType(t.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors text-left ${
                        productType === t.value
                          ? "bg-primary text-white border-primary"
                          : "bg-surface-1 text-muted border-border hover:text-foreground hover:border-primary/40"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pub-price">Price (USD) *</Label>
                <Input
                  id="pub-price"
                  value={priceDisplay}
                  onChange={(e) => setPriceDisplay(e.target.value)}
                  placeholder="e.g. 25.00"
                  required
                />
                <p className="text-[11px] text-muted">You keep 85% ({priceDisplay ? `~$${(Math.max(0, parseFloat(priceDisplay.replace(/[^0-9.]/g,"")) * 0.85)).toFixed(2)}` : "$0.00"})</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-danger/10 border border-danger/30 p-3">
                  <AlertCircle className="size-4 text-danger flex-shrink-0" />
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="glow"
                  size="lg"
                  className="w-full font-bold text-sm"
                  disabled={loading}
                >
                  {loading ? "Publishing…" : "Publish to Catalog →"}
                </Button>
                <p className="text-[11px] text-muted text-center mt-2">
                  Product goes live immediately • Editable afterwards
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

