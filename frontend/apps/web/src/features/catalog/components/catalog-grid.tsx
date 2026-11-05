"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { catalogApi } from "../api";
import type { KnowledgeProduct } from "../types";
import { CatalogCard } from "./catalog-card";

interface CatalogGridProps {
  onSelect: (product: KnowledgeProduct) => void;
  purchasedIds?: Set<number>;
}

const PRODUCT_TYPES = [
  { value: "", label: "All Types" },
  { value: "live_cohort", label: "👥 Live Cohorts & Workshops" },
  { value: "study_guide", label: "📘 Study Guides" },
  { value: "code_template", label: "💻 Code Templates" },
  { value: "recorded_masterclass", label: "🎬 Masterclasses" },
  { value: "research_pack", label: "🔬 Research Packs" },
];

export function CatalogGrid({ onSelect, purchasedIds }: CatalogGridProps) {
  const [products, setProducts] = useState<KnowledgeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProducts = useCallback(async (q: string, type: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await catalogApi.list({ q: q || undefined, type: type || undefined });
      setProducts(res.results ?? []);
    } catch {
      setError("Failed to load catalog. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchProducts(query, activeType);
    }, query.length > 0 ? 350 : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, activeType, fetchProducts]);

  return (
    <div className="space-y-6">
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <input
            type="search"
            placeholder="Search guides, templates, masterclasses…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-surface-1 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            aria-label="Search catalog"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <SlidersHorizontal className="size-4 text-muted" />
          {PRODUCT_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveType(t.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors border ${
                activeType === t.value
                  ? "bg-primary text-white border-primary"
                  : "bg-surface-1 text-muted border-border hover:text-foreground hover:border-primary/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 text-muted">
          <p className="text-sm">{error}</p>
          <Button variant="secondary" size="sm" className="mt-3"
            onClick={() => void fetchProducts(query, activeType)}>
            Retry
          </Button>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-sm font-medium">No products found.</p>
          {query && (
            <p className="text-xs mt-1">
              Try a broader search or clear the filter.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <CatalogCard
              key={p.id}
              product={p}
              onSelect={onSelect}
              purchased={purchasedIds?.has(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

