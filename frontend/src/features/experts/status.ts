import type { ApplicationStatus } from "./types";

/** Lifecycle copy for the applicant's own view (ADR-0011 state machine). */
export const APPLICATION_STATUS_COPY: Record<ApplicationStatus, { title: string; detail: string; tone: "neutral" | "info" | "success" | "danger" }> = {
  not_applied: {
    title: "Not applied",
    detail: "You haven't started an expert application.",
    tone: "neutral",
  },
  draft: {
    title: "Draft",
    detail: "Complete the form, upload at least one credential, then submit for review.",
    tone: "neutral",
  },
  submitted: {
    title: "Submitted",
    detail: "Your application is in the review queue — typically reviewed within 48 hours.",
    tone: "info",
  },
  under_review: {
    title: "Under review",
    detail: "A reviewer is looking at your application. The application is locked while under review.",
    tone: "info",
  },
  approved: {
    title: "Approved",
    detail: "You're a verified expert — your profile is live in the public directory.",
    tone: "success",
  },
  rejected: {
    title: "Not approved this time",
    detail: "You can update your application and resubmit whenever you're ready.",
    tone: "danger",
  },
  suspended: {
    title: "Suspended",
    detail: "Expert surfaces are paused and you're hidden from the directory. Your student account is unaffected.",
    tone: "danger",
  },
};
