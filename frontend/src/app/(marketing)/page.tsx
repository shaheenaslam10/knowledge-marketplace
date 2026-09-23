import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spotlight } from "@/components/patterns/marketing/spotlight";
import { TextReveal } from "@/components/patterns/marketing/text-reveal";
import { Reveal, Stagger, StaggerItem } from "@/components/patterns/reveal";
import { StatusCard } from "@/features/status/StatusCard";
import { fetchBackendHealth } from "@/lib/api/health";

export const dynamic = "force-dynamic"; // status must be live, not cached

const STEPS = [
  { title: "Describe the help you need", body: "Post a request: subject, goals, budget, deadline. Private — only vetted experts see it." },
  { title: "Experts compete to help", body: "Approved experts send binding offers with price and plan. You compare side by side." },
  { title: "Pick your expert", body: "Select the best fit; the platform holds payment until you approve the delivery." },
];

export default async function HomePage() {
  const health = await fetchBackendHealth();

  return (
    <div className="flex flex-col gap-16">
      <section className="relative -mx-4 overflow-hidden rounded-xl bg-[#0c0d10] px-4 py-20 text-center text-[#e7e8ea] sm:mx-0 sm:px-8 sm:py-24">
        <Spotlight />
        <div className="relative">
          <TextReveal
            as="h1"
            text="Learn faster with the right expert"
            className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl sm:leading-[1.1]"
          />
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[#9d9fa7]">
            Post a request and choose from competing offers — or let the platform
            manage the match, the payment and the quality for you.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/register">Post a request <ArrowRight className="size-4" /></Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="border-white/20 bg-white/5 text-[#e7e8ea] hover:bg-white/10"
              asChild
            >
              <Link href="/experts">Browse experts</Link>
            </Button>
          </div>
        </div>
      </section>

      <Reveal as="section" className="flex flex-col items-center gap-3">
        <StatusCard health={health} />
        <p className="text-xs text-muted">Live platform status — Next.js + Django + PostgreSQL + database-backed worker.</p>
      </Reveal>

      <Stagger className="grid gap-6 sm:grid-cols-3">
        {STEPS.map((step) => (
          <StaggerItem key={step.title}>
            <Card className="h-full">
              <h2 className="text-base font-semibold tracking-tight">{step.title}</h2>
              <p className="mt-2 text-sm text-muted">{step.body}</p>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal as="section" className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">Open Marketplace</h2>
          <p className="mt-2 text-sm text-muted">
            You post the request, vetted experts bid, you pick the offer that fits your budget
            and timeline. The platform holds the payment until you approve the delivery.
          </p>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">Managed Service</h2>
          <p className="mt-2 text-sm text-muted">
            Tell the platform what you need. We review it, publish it to the right experts or
            assign one directly, and manage the order from payment to delivery.
          </p>
        </Card>
      </Reveal>
    </div>
  );
}
