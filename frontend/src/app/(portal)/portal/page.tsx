import { Card } from "@/components/ui/Card";

/**
 * Portal scaffold (Phase 4 — structure only, per web-experiences.md:
 * Django admin remains the ops tool until the admin-operations phase).
 */
export default function PortalHome() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <h1 className="text-lg font-semibold">Operations portal — scaffold</h1>
        <p className="mt-2 text-sm text-muted">
          Operational screens (expert approvals, orders, finance, moderation) arrive with the
          admin-operations phase. Until then, day-to-day operations run in{" "}
          <a className="text-primary underline" href="/admin/">
            Django admin
          </a>
          . Server-side staff authorization is enforced by the API; this surface is scaffolding.
        </p>
      </Card>
    </div>
  );
}
