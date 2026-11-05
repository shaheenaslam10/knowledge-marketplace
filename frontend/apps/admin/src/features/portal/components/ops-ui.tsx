"use client";

/** Portal primitives — dense + precise + operational (admin-journey.md).
 * Deliberately minimal Motion (fade-in only); no ambient animation here. */
import { motion } from "motion/react";
import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DURATIONS, EASING } from "@/lib/motion";

export function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
}) {
  return (
    <div className="border-border bg-surface rounded-lg border p-3" data-testid={`kpi-${label}`}>
      <p className="text-muted text-[11px] font-medium uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-muted mt-0.5 text-[11px]">{hint}</p>}
      {tone !== "neutral" && <Badge tone={tone}>{tone}</Badge>}
    </div>
  );
}

/** Dependency-free SVG trend bars (bundle-budget decision, admin-journey.md). */
export function TrendBars({ series, label }: { series: Record<string, number>; label: string }) {
  const entries = Object.entries(series).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
  if (entries.length === 0) {
    return <p className="text-muted text-xs">No {label} in this range.</p>;
  }
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div data-testid={`trend-${label}`}>
      <div className="flex h-16 items-end gap-1" role="img" aria-label={`${label} per day (last ${entries.length} days)`}>
        {entries.map(([day, value]) => (
          <div key={day} className="flex flex-1 flex-col items-center gap-0.5" title={`${day}: ${value}`}>
            <div
              className="bg-primary/70 w-full rounded-sm"
              style={{ height: `${Math.max(3, (value / max) * 60)}px` }}
            />
          </div>
        ))}
      </div>
      <p className="text-muted mt-1 text-[10px]">
        {entries[0][0]} → {entries[entries.length - 1][0]} · max {max}
      </p>
    </div>
  );
}

export function RangeControl({
  value,
  onChange,
  onCustom,
  busy = false,
}: {
  value: "today" | "7d" | "30d" | "custom";
  onChange: (range: "today" | "7d" | "30d") => void;
  onCustom: (from: string, to: string) => void;
  busy?: boolean;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const options = [
    ["today", "Today"],
    ["7d", "Last 7 days"],
    ["30d", "Last 30 days"],
  ] as const;
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="range-control">
      {options.map(([key, labelText]) => (
        <Button
          key={key}
          size="sm"
          variant={value === key ? "primary" : "secondary"}
          disabled={busy}
          onClick={() => onChange(key)}
        >
          {labelText}
        </Button>
      ))}
      <span className="text-muted text-xs">UTC ranges; custom = [from, to]</span>
      <input
        type="date"
        aria-label="Custom range from"
        value={from}
        onChange={(event) => setFrom(event.target.value)}
        className="border-border bg-surface rounded-md border px-2 py-1 text-xs"
      />
      <input
        type="date"
        aria-label="Custom range to"
        value={to}
        onChange={(event) => setTo(event.target.value)}
        className="border-border bg-surface rounded-md border px-2 py-1 text-xs"
      />
      <Button
        size="sm"
        variant="secondary"
        disabled={busy || !from || !to}
        data-testid="apply-custom-range"
        onClick={() => {
          if (from && to) onCustom(from, to);
        }}
      >
        Apply custom
      </Button>
    </div>
  );
}

/** Dense operational table: horizontal scroll containment on small screens
 * (web-experiences.md §Responsive — never desktop-first-shrunk). */
export function DataTable({
  headers,
  children,
  testId,
}: {
  headers: string[];
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div className="border-border overflow-x-auto rounded-lg border" data-testid={testId}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="bg-surface-2 border-border border-b">
            {headers.map((header) => (
              <th key={header} scope="col" className="text-muted px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-border divide-y">{children}</tbody>
      </table>
    </div>
  );
}

export function FadeIn({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATIONS.fast, ease: EASING }}
      data-testid={testId}
    >
      {children}
    </motion.div>
  );
}

export function OpsSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-border bg-surface rounded-md border px-2 py-1"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
