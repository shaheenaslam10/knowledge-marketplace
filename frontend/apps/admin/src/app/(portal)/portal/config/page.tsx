"use client";

/** /portal/config — PlatformConfig editor (Phase 10): the ONLY mutable
 * platform settings, service-validated + audited server-side. Admin-only
 * (support sees values but the API rejects writes). Currency is immutable
 * (ledger contract) and never editable from here. */
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { portalApi, type ConfigPayload } from "@/features/portal/api";
import { ApiError } from "@/lib/api/client";

const FIELD_META: {
  key: keyof ConfigPayload;
  label: string;
  hint: string;
  kind: "rate" | "minor" | "days";
}[] = [
  {
    key: "open_commission_rate",
    label: "Open-marketplace commission",
    hint: "BR-17 rate snapped onto new open orders (0–0.5). Existing orders keep their snapshot.",
    kind: "rate",
  },
  {
    key: "managed_commission_rate",
    label: "Managed-service commission",
    hint: "Rate for managed pool/direct orders (0–0.5).",
    kind: "rate",
  },
  {
    key: "min_offer_minor",
    label: "Offer floor (minor units)",
    hint: "BR-18 binding floor, e.g. 500 = $5.00.",
    kind: "minor",
  },
  {
    key: "payout_min_minor",
    label: "Payout floor (minor units)",
    hint: "BR-30 roll-forward floor, e.g. 1000 = $10.00.",
    kind: "minor",
  },
  {
    key: "dispute_window_days",
    label: "Dispute window (days)",
    hint: "BR-40: days after completion a dispute can open (1–30).",
    kind: "days",
  },
];

export default function PlatformConfigPage() {
  const [config, setConfig] = useState<ConfigPayload | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const payload = await portalApi.config();
      setConfig(payload);
      setDraft({
        open_commission_rate: payload.open_commission_rate,
        managed_commission_rate: payload.managed_commission_rate,
        min_offer_minor: String(payload.min_offer_minor),
        payout_min_minor: String(payload.payout_min_minor),
        dispute_window_days: String(payload.dispute_window_days),
      });
    } catch {
      setError("Could not load configuration.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!config) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await portalApi.updateConfig({
        open_commission_rate: draft.open_commission_rate,
        managed_commission_rate: draft.managed_commission_rate,
        min_offer_minor: draft.min_offer_minor,
        payout_min_minor: draft.payout_min_minor,
        dispute_window_days: draft.dispute_window_days,
      });
      setConfig(updated);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : "Could not save configuration.");
    } finally {
      setBusy(false);
    }
  };

  if (!config) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold tracking-tight">Platform configuration</h1>
        {error ? (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        ) : (
          <p className="text-muted text-sm" aria-busy>
            Loading…
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Platform configuration</h1>
        <p className="text-muted text-xs">
          Service-validated, audited before/after. Admin-only — support gets 403 on write.
        </p>
      </div>

      <Card className="max-w-2xl">
        <div className="space-y-4">
          {FIELD_META.map((field) => (
            <div key={field.key} className="space-y-1">
              <label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </label>
              <Input
                id={field.key}
                value={draft[field.key] ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                className="max-w-[220px]"
              />
              <p className="text-muted text-[11px]">{field.hint}</p>
            </div>
          ))}

          <div className="border-border border-t pt-3">
            <p className="text-sm">
              <span className="text-muted">Default currency: </span>
              <Badge tone="neutral">{config.default_currency}</Badge>{" "}
              <span className="text-muted text-xs">(immutable — ledger currency contract)</span>
            </p>
            <p className="text-muted mt-1 text-[11px]">Last updated {new Date(config.updated_at).toLocaleString()}</p>
          </div>

          {error && (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="text-success text-sm" data-testid="config-saved">
              Saved — change recorded in the audit log.
            </p>
          )}

          <Button onClick={() => void save()} disabled={busy}>
            {busy ? "Saving…" : "Save configuration"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
