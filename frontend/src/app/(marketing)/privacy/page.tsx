import type { Metadata } from "next";

import { LegalDocument, type LegalSection } from "@/features/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What data the platform collects, why it is held, who can see it, how long it is kept and how to exercise your rights.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "What we collect",
    body: [
      "The platform collects only what it needs to run a marketplace with money and disputes in it. There is no advertising network, no data sale and no third-party behavioural tracking.",
    ],
    bullets: [
      "Account data: email address, password hash (Argon2id — the password itself is never stored), role, and verification state.",
      "Profile data: the details you choose to publish, plus the credentials experts submit for approval.",
      "Marketplace data: requests, offers, assignments, orders, deliveries, revisions and reviews.",
      "Messages and attachments exchanged about a request or order.",
      "Financial records: payments, refunds, payouts and ledger entries. These are records of transactions, not card numbers — the platform does not store card data.",
      "Operational logs: request identifiers, timestamps, IP address and user agent, used for debugging, abuse handling and the audit trail.",
    ],
  },
  {
    heading: "Why we hold it",
    body: [
      "Each category has a purpose, and data is not repurposed silently.",
    ],
    bullets: [
      "To operate your account and match you with the other side of the marketplace.",
      "To take payment, apply commission and settle payouts.",
      "To resolve disputes and investigate reports — which requires that the record of what happened survives the disagreement.",
      "To meet legal, tax and accounting obligations.",
      "To keep the service secure: rate limiting, abuse detection and incident investigation.",
    ],
  },
  {
    heading: "Who can see your data",
    body: [
      "Visibility is enforced in the API, not merely by hiding buttons in the interface.",
    ],
    bullets: [
      "The other party to your order sees what the order requires: your brief, the delivery, and the messages in that thread.",
      "Public expert profiles show what the expert chose to publish, plus aggregate ratings. Private feedback about a student is never shown to the student.",
      "Administrators can access account and order records to operate the platform. Viewing a message thread requires an open dispute or a formal report, and that view is itself recorded in the audit log (BR-35, BR-42).",
      "Uploaded files are private by default. Downloads are served through short-lived links issued only after a permission check, and cross-account access attempts are denied and logged.",
    ],
  },
  {
    heading: "Processors we rely on",
    body: [
      "The platform runs on a small number of infrastructure providers. They process data on the platform's instructions and for no other purpose.",
    ],
    bullets: [
      "Hosting and database: the deployment host and the PostgreSQL instance described in the deployment documentation.",
      "Object storage: the private bucket holding uploads and deliveries.",
      "Email delivery: the transactional email provider that sends verification, notification and unsubscribe messages.",
      "Payment provider: when a card provider is activated, payment details are handled by that provider directly and never traverse platform storage.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      "Retention is bounded, with one deliberate exception: records required for money and disputes.",
    ],
    bullets: [
      "Files attached to requests that were cancelled without payment are deleted automatically after 30 days.",
      "Notification records are pruned on a schedule.",
      "Financial and audit records are append-only and retained for the period required by law — they are the evidence base for disputes and accounting.",
      "Material under legal hold is exempt from automatic deletion until the hold is lifted.",
    ],
  },
  {
    heading: "Your choices and rights",
    body: [
      "You can control most of this from your account, and the rest by asking.",
    ],
    bullets: [
      "Notification preferences are per-category. Account and security messages cannot be switched off — they are how you find out something important happened to your account.",
      "Every notification email carries a one-click unsubscribe link that works without logging in.",
      "You can request a copy of your data, correction of inaccurate data, or deletion of your account. Deletion does not remove financial and audit records the platform must retain.",
      "Where the law gives you a right to object or to lodge a complaint with a supervisory authority, that right applies.",
    ],
  },
  {
    heading: "Security",
    body: [
      "Sessions use httpOnly cookies with rotation and reuse detection, so a stolen token cannot be quietly replayed. Traffic is served over HTTPS with HSTS, and the browser is constrained by a strict Content-Security-Policy.",
      "Administrative actions on money, accounts, orders and disputes are written to an append-only audit log. No mechanism exists — including the admin interface — to edit financial history in place.",
    ],
  },
  {
    heading: "Cookies",
    body: [
      "The platform sets the cookies it needs to keep you signed in and to protect forms against cross-site request forgery. There are no advertising or analytics cookies.",
    ],
  },
  {
    heading: "Changes to this policy",
    body: [
      "Material changes are announced before they take effect, with the effective date updated at the top of this page.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      summary="What the platform collects, why, who can see it and how long it is kept. Written against how the system actually behaves — private-by-default files, permission-checked downloads, append-only audit records."
      effective="On first production deployment"
      sections={SECTIONS}
    />
  );
}
