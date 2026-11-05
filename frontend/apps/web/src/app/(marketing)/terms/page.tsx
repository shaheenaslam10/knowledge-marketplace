import type { Metadata } from "next";

import { LegalDocument, type LegalSection } from "@/features/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The agreement between you and the platform: accounts, orders, payments and commission, delivery and revisions, disputes, conduct and termination.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Who this agreement is between",
    body: [
      "These terms govern your use of the platform as a student or as an expert. The platform operates the marketplace, holds and settles payments, and resolves disputes; it is not a party to the teaching relationship itself and does not employ experts.",
      "By creating an account you accept these terms and the Academic Integrity Policy, which forms part of this agreement (BR-14).",
    ],
  },
  {
    heading: "Accounts and eligibility",
    body: [
      "Accounts are personal. You are responsible for what happens under your login and for keeping your credentials safe.",
    ],
    bullets: [
      "Email verification is required before an account becomes usable.",
      "Expert access requires an application and explicit approval by the platform. Approval can be withdrawn.",
      "Suspended accounts are excluded from matching and from receiving new work.",
    ],
  },
  {
    heading: "How work is matched",
    body: [
      "There are two routes to the same outcome. In the open marketplace, you post a request and eligible experts submit offers, which you compare and select. In the managed service, the platform reviews your request and routes it to a suitable expert — either by inviting a pool or by assigning directly.",
      "Both routes converge on the same order, the same payment pipeline and the same protections. Nothing below depends on which route you used.",
    ],
  },
  {
    heading: "Payments, commission and refunds",
    body: [
      "An order becomes active once payment is confirmed. Funds are held and released against delivery approval rather than paid directly between users.",
      "The platform's commission is fixed at the moment of booking and recorded on the order. It does not change afterwards, even if rates change later (BR-17, BR-22).",
    ],
    bullets: [
      "Commission is 15% on open-marketplace orders and 20% on managed-service orders.",
      "All amounts are recorded in integer minor units against a single order currency — no rounding drift.",
      "Financial records are append-only. Corrections are made by posting a new entry, never by editing history (BR-32, BR-33).",
      "Refunds, in full or in part, are issued through the same audited services that created the original charge.",
    ],
  },
  {
    heading: "Delivery, revisions and approval",
    body: [
      "Experts deliver through the platform. You may request revisions within the allowance attached to your order: two on open-marketplace orders, three on managed-service orders.",
      "If you neither approve nor raise a concern, delivery is automatically approved 72 hours after it is submitted, and the expert's payout is scheduled. Automatic approval exists so work is not held indefinitely; it does not remove your right to open a dispute.",
    ],
  },
  {
    heading: "Disputes",
    body: [
      "Either party may open a dispute while an order is active, delivered or in revision, or within 7 days of completion (BR-40).",
      "Opening a dispute freezes the payout for that order until it is resolved. Resolutions can include full or partial refunds, and are carried out through the audited money services — never by direct edits to balances.",
    ],
  },
  {
    heading: "Conduct and communication",
    body: [
      "All communication about a request or order stays on the platform while it is active. Moving payment off-platform is prohibited and is grounds for banning both parties (BR-34).",
      "Harassment, discrimination and doxxing result in immediate suspension. Moderation is report-driven: the platform does not proactively read message content (BR-35).",
    ],
  },
  {
    heading: "Intellectual property",
    body: [
      "Experts retain authorship of the material they produce and grant you a licence to use it for your own learning. You retain ownership of the material you upload.",
      "You may not resell or redistribute delivered material as your own product.",
    ],
  },
  {
    heading: "Suspension and termination",
    body: [
      "The platform may suspend or terminate an account for breach of these terms, the Academic Integrity Policy, or applicable law. The penalty ladder in the integrity policy applies to integrity breaches.",
      "You may close your account at any time. Closure does not cancel obligations on orders already in flight, and does not erase financial or audit records the platform is required to retain.",
    ],
  },
  {
    heading: "Liability",
    body: [
      "The platform provides the marketplace, the payment pipeline and dispute resolution. It does not guarantee academic outcomes, grades or admission results.",
      "Nothing in these terms limits liability where the law does not permit it to be limited.",
    ],
  },
  {
    heading: "Changes to these terms",
    body: [
      "Material changes are announced before they take effect. Continuing to use the platform after that date means you accept the updated terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      summary="The rules that govern accounts, orders, money and conduct on this platform. They restate what the system actually enforces — commission snapshots, revision limits, auto-approval, dispute windows and audit trails are all implemented, not aspirational."
      effective="On first production deployment"
      sections={SECTIONS}
    />
  );
}
