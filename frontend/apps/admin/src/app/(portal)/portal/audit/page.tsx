"use client";

/** /portal/audit — audit viewer (Phase 10, BR-42): read-only, filterable,
 * append-only. No write methods exist anywhere on this surface. */
import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { portalApi, type AuditRow } from "@/features/portal/api";
import { DataTable, FadeIn, OpsSelect } from "@/features/portal/components/ops-ui";

const OBJECT_TYPE_OPTIONS: [string, string][] = [
  ["", "All objects"],
  ["messagereport", "Message reports"],
  ["dispute", "Disputes"],
  ["payment", "Payments"],
  ["payout", "Payouts"],
  ["platformconfig", "Platform config"],
  ["message", "Messages"],
  ["thread", "Threads"],
];

export default function AuditViewerPage() {
  const [action, setAction] = useState("");
  const [objectType, setObjectType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const body = await portalApi.audit({
        action: action || undefined,
        object_type: objectType || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRows(body.results);
      setTotal(body.total);
      setError(null);
    } catch {
      setError("Could not load audit events.");
    }
  }, [action, objectType, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Audit viewer</h1>
        <p className="text-muted text-xs">
          Append-only (BR-42) — read-only everywhere, including here.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">
          <span className="text-muted block">Action contains</span>
          <Input
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="e.g. moderation, refund, config"
            className="mt-1 w-52"
          />
        </label>
        <OpsSelect label="Object" value={objectType} options={OBJECT_TYPE_OPTIONS} onChange={setObjectType} />
        <label className="text-xs">
          <span className="text-muted block">From</span>
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="mt-1 w-36"
          />
        </label>
        <label className="text-xs">
          <span className="text-muted block">To</span>
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-36" />
        </label>
        <Button size="sm" variant="secondary" onClick={() => void load()}>
          Apply
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setAction("");
            setObjectType("");
            setFrom("");
            setTo("");
          }}
        >
          Clear
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}

      {rows === null ? (
        <p className="text-muted text-sm" aria-busy>
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <Card>
          <p className="text-muted text-sm">No audit events match these filters.</p>
        </Card>
      ) : (
        <FadeIn>
          <DataTable headers={["Time", "Actor", "Action", "Object", "Detail"]} testId="audit-table">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-surface-2/50">
                <td className="text-muted px-3 py-2 text-xs">{new Date(row.created_at).toLocaleString()}</td>
                <td className="px-3 py-2 text-xs">{row.actor_name ?? "system"}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.action}</td>
                <td className="px-3 py-2 text-xs">
                  {row.object_type}
                  <span className="text-muted"> · {row.object_id.slice(0, 12)}…</span>
                </td>
                <td className="max-w-[280px] truncate px-3 py-2 font-mono text-[11px] text-muted">
                  {JSON.stringify(row.detail)}
                </td>
              </tr>
            ))}
          </DataTable>
          <p className="text-muted mt-2 text-xs">{total} event(s)</p>
        </FadeIn>
      )}
    </div>
  );
}
