import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Two ways to get help: the open marketplace with expert offers, or the managed service where the platform assigns an expert for you.",
};

const STEPS = [
  {
    title: "1 · Post your request",
    body: "Describe what you need — a tutoring session, exam prep, coaching or guided feedback. Choose open marketplace or managed service.",
  },
  {
    title: "2 · Get matched",
    body: "Open: eligible experts send offers; you compare price, ratings and timelines. Managed: the platform reviews your request and routes it to the right expert.",
  },
  {
    title: "3 · Pay securely",
    body: "Pay only when your order starts. Funds are held by the payment provider and released to the expert when you approve the delivery.",
  },
  {
    title: "4 · Review the delivery",
    body: "Chat with your expert, receive the work, request revisions within your plan, then approve. Your release triggers the expert's payout.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">How it works</h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
          One pipeline for both business models — matching differs, everything
          else (payment, delivery, revisions, reviews, disputes) is shared.
        </p>
      </header>
      <div className="grid gap-6 sm:grid-cols-2">
        {STEPS.map((step) => (
          <Card key={step.title}>
            <h2 className="text-lg font-semibold">{step.title}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{step.body}</p>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="text-lg font-semibold">Academic integrity</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          The platform supports <strong>learning</strong>: tutoring, coaching,
          feedback on your own drafts and exam preparation. Producing graded
          coursework to submit as your own is prohibited and enforced through
          attestations, expert reporting and moderation.
        </p>
      </Card>
    </div>
  );
}
