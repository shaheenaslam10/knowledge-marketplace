import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

/**
 * Phase 1 integration proof: shows live backend health on the home page.
 * Pure component (status passed in) so it is trivially testable; the fetch
 * lives in features/status (server side) via lib/api/health.
 */
export function StatusCard({ health }: { health: { status: string; database: boolean } | null }) {
  const live = health?.status === "ok" && health.database;
  return (
    <Card className="w-full max-w-md">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Backend API</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {live ? "Connected to the Django service" : "Backend not reachable right now"}
          </p>
        </div>
        <span data-testid="api-status">
          {live ? (
            <Badge tone="success">LIVE</Badge>
          ) : (
            <Badge tone="danger">UNREACHABLE</Badge>
          )}
        </span>
      </div>
    </Card>
  );
}
