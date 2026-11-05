"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { KnowledgeProduct } from "../types";
import { PRODUCT_TYPE_ICON, PRODUCT_TYPE_LABEL } from "../types";

interface CatalogCardProps {
  product: KnowledgeProduct;
  onSelect: (product: KnowledgeProduct) => void;
  purchased?: boolean;
}

export function CatalogCard({ product, onSelect, purchased }: CatalogCardProps) {
  return (
    <Card className="flex flex-col gap-3 p-5 hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => onSelect(product)}>
      {/* Type badge + price */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
          <span>{PRODUCT_TYPE_ICON[product.product_type]}</span>
          {PRODUCT_TYPE_LABEL[product.product_type]}
        </span>
        <span className="font-bold text-sm text-foreground">{product.price_display}</span>
      </div>

      {/* Title */}
      <h3 className="font-bold text-sm text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
        {product.title}
      </h3>

      {/* Summary */}
      <p className="text-xs text-muted leading-relaxed line-clamp-3 flex-1">
        {product.summary}
      </p>

      {/* Live Cohort Seats & Schedule Telemetry */}
      {product.product_type === "live_cohort" && (product.max_seats ?? 0) > 0 && (
        <div className="space-y-1.5 py-1.5 px-2.5 rounded-lg bg-surface-2/60 border border-border/50 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted font-medium">Cohort Seats</span>
            <span className="font-bold text-foreground">
              {product.enrolled_count ?? 0} / {product.max_seats} booked
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                (product.enrolled_count ?? 0) >= (product.max_seats ?? 1)
                  ? "bg-danger"
                  : (product.enrolled_count ?? 0) / (product.max_seats ?? 1) > 0.8
                  ? "bg-amber-500"
                  : "bg-primary"
              }`}
              style={{
                width: `${Math.min(100, Math.round(((product.enrolled_count ?? 0) / (product.max_seats ?? 1)) * 100))}%`
              }}
            />
          </div>
          {product.cohort_scheduled_at && (
            <p className="text-[10px] text-muted flex items-center justify-between pt-0.5">
              <span>Scheduled Live:</span>
              <span className="font-semibold text-foreground">
                {new Date(product.cohort_scheduled_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border/60 mt-auto">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">by <span className="font-semibold text-foreground">{product.expert_name}</span></span>
          {product.subject_name && (
            <Badge tone="neutral" className="text-[10px] px-1.5 py-0.5">{product.subject_name}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {purchased ? (
            <Badge tone="success" className="text-[10px] px-2 py-0.5">
              {product.product_type === "live_cohort" ? "✓ Enrolled" : "✓ Owned"}
            </Badge>
          ) : (
            <Button
              size="sm"
              variant={product.product_type === "live_cohort" ? "glow" : "primary"}
              className="text-[11px] h-7 px-2.5 font-bold"
              onClick={(e) => { e.stopPropagation(); onSelect(product); }}
            >
              {product.product_type === "live_cohort" ? "Reserve Seat" : "Unlock"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

