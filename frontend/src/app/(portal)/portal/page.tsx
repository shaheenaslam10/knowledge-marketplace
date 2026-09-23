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
          Operational screens arrive with the admin-operations phase. Day-to-day operations run in{" "}
          <a className="text-primary underline" href="/admin/">
            Django admin
          </a>
          . Server-side staff authorization is enforced by the API; this surface is scaffolding.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>
            Managed triage → <a className="text-primary underline" href="/admin/service_requests/servicerequest/">Service requests</a>{" "}
            (approve for pool), <a className="text-primary underline" href="/admin/assignments/directassignment/">direct assignments</a>,{" "}
            <a className="text-primary underline" href="/admin/assignments/poolinvitation/">pool invitations</a>
          </li>
          <li>Expert approvals → Django admin → Expert applications</li>
        </ul>
      </Card>
    </div>
  );
}
