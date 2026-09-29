import type { Metadata } from "next";

import { LegalDocument, type LegalSection } from "@/features/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Academic Integrity Policy",
  description:
    "What this platform is for, what it will not do, and the penalties for misuse. Learning support — never ghostwritten graded coursework.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "The line we draw",
    body: [
      "This platform connects students with experts for learning support: tutoring, explanation, exam preparation, coaching, feedback and guided practice. Experts are teachers, not ghostwriters.",
      "Buying or selling work that a student then submits as their own graded coursework is prohibited. This is not a disclaimer we keep in a drawer — it is enforced in the product, and the rules below describe how.",
    ],
  },
  {
    heading: "What students agree to",
    body: [
      "Every request must be created under a permitted category, and every request requires an explicit attestation before it can be posted (BR-10):",
    ],
    bullets: [
      "\u201cThis request is for learning support. I will not submit an expert\u2019s work as my own graded coursework and I have read the Academic Integrity Policy.\u201d",
      "The attestation text version and the timestamp are stored on the request itself, so what you agreed to is recorded as it was worded at the time.",
      "Requests that describe completing graded assessments, sitting exams, or submitting work under a student's name will be removed.",
    ],
  },
  {
    heading: "What experts agree to",
    body: [
      "Experts are approved individually and carry the obligation to refuse work that crosses the line (BR-11).",
    ],
    bullets: [
      "Any expert may decline a request for integrity reasons, with no penalty to their standing.",
      "Any expert may report a request with one click. A report routes the request to the moderation queue and pauses it while it is reviewed.",
      "Deliverables should teach: explanation, worked reasoning, annotated feedback, structure and sources. Categories such as assignment guidance expect feedback and explanation in the delivery (BR-12).",
    ],
  },
  {
    heading: "Enforcement and penalties",
    body: [
      "Enforcement follows a documented ladder rather than ad-hoc decisions (BR-13). Every action is written to the platform audit log with the actor, the before/after state and the time (BR-42).",
    ],
    bullets: [
      "Warning.",
      "Removal of the request or delivery.",
      "Suspension of the account for 30 days.",
      "Permanent ban. Repeat integrity offences result in a permanent ban.",
    ],
  },
  {
    heading: "Reporting a concern",
    body: [
      "Students, experts and third parties can report integrity concerns. Reports are reviewed by the operations team, not automated away.",
      "Message threads are not proactively read. An administrator may view a thread only when an account is involved in an open dispute or a formal report, and that view is itself an audited action (BR-35).",
    ],
  },
  {
    heading: "Relationship to your institution",
    body: [
      "Your school, college or university sets its own rules, and those rules apply to you regardless of what this policy permits. Where they are stricter, they win.",
      "If you are unsure whether a request is acceptable, assume it is not and ask for explanation-based help instead.",
    ],
  },
];

export default function AcademicIntegrityPage() {
  return (
    <LegalDocument
      title="Academic Integrity Policy"
      summary="Learning support, not ghostwriting. This policy forms part of the Terms of Service and is accepted during onboarding by both students and experts (BR-14)."
      effective="On first production deployment"
      sections={SECTIONS}
    />
  );
}
