"use client";

/** /portal/users — users/experts operational overview (Phase 10): read-only
 * cross-object counts; edits/deletions stay in Django admin. */
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { portalApi, type UsersOverview } from "@/features/portal/api";
import { DataTable, FadeIn, OpsSelect } from "@/features/portal/components/ops-ui";

export default function UsersOverviewPage() {
  const [role, setRole] = useState("all");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<UsersOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await portalApi.users({ role, q: query }));
      setError(null);
    } catch {
      setError("Could not load users.");
    }
  }, [role, query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Users & experts</h1>
          <p className="text-muted text-xs">
            Operational visibility — profile edits, expert vetting and suspensions live in Django admin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OpsSelect
            label="Role"
            value={role}
            options={[
              ["all", "All"],
              ["expert", "Experts"],
              ["staff", "Staff"],
            ]}
            onChange={setRole}
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name / email"
            aria-label="Search users"
            className="w-48"
          />
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            Search
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}

      {!data ? (
        <p className="text-muted text-sm" aria-busy>
          Loading…
        </p>
      ) : data.results.length === 0 ? (
        <Card>
          <p className="text-muted text-sm">No users match.</p>
        </Card>
      ) : (
        <FadeIn>
          <DataTable
            headers={["User", "Verified", "Expert", "Orders", "Reviews", "Disputes", "Joined"]}
            testId="users-table"
          >
            {data.results.map((user) => (
              <tr key={user.id} className="hover:bg-surface-2/50">
                <td className="px-3 py-2 text-xs">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-muted">{user.email}</p>
                  {user.is_staff && <Badge tone="info">staff</Badge>}
                </td>
                <td className="px-3 py-2">
                  <Badge tone={user.email_verified ? "success" : "warning"}>
                    {user.email_verified ? "verified" : "unverified"}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-xs">
                  {user.expert ? (
                    <>
                      <p>{user.expert.slug}</p>
                      <p className="text-muted">
                        {user.expert.status ?? "—"} · ★ {user.expert.rating_avg ?? "—"} ({user.expert.rating_count})
                      </p>
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums">{user.orders_as_student}</td>
                <td className="px-3 py-2 tabular-nums">{user.reviews_written}</td>
                <td className="px-3 py-2 tabular-nums">{user.disputes_opened}</td>
                <td className="text-muted px-3 py-2 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </DataTable>
          <p className="text-muted mt-2 text-xs">{data.total} user(s)</p>
        </FadeIn>
      )}
    </div>
  );
}
