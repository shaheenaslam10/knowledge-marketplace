import { StatusCard } from "@/features/status/StatusCard";
import { fetchBackendHealth } from "@/lib/api/health";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic"; // status must be live, not cached

export default async function HomePage() {
  const health = await fetchBackendHealth();

  return (
    <div className="flex flex-col gap-10">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Learn faster with the right expert
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Post a request and choose from competing offers — or let the platform
          manage the match, the payment and the quality for you.
        </p>
      </section>

      <section className="flex flex-col items-center gap-3">
        <StatusCard health={health} />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Phase 1 foundation: Next.js + Django + PostgreSQL + database-backed worker.
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">Open Marketplace</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            You post the request, vetted experts bid, you pick the offer that
            fits your budget and timeline. The platform holds the payment until
            you approve the delivery.
          </p>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">Managed Service</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Tell the platform what you need. We review it, publish it to the
            right experts or assign one directly, and manage the order from
            payment to delivery.
          </p>
        </Card>
      </section>
    </div>
  );
}
