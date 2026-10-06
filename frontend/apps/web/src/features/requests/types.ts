/** Request domain types + lifecycle helpers (docs/workflows/open-marketplace.md). */

export type RequestStatus =
  | "draft"
  | "open"
  | "matched"
  | "in_progress"
  | "completed"
  | "rejected"
  | "in_review"
  | "pooled"
  | "cancelled"
  | "expired";

export interface TaxonomyRef {
  id: string;
  name: string;
  slug: string;
}

export interface AttachmentMeta {
  id: string;
  original_name: string;
  size: number;
  content_type: string;
}

export interface ServiceRequest {
  id: string;
  mode: "open" | "managed";
  category: string;
  title: string;
  description: string;
  subject: TaxonomyRef | null;
  skills: TaxonomyRef[];
  pricing_type: "fixed" | "hourly";
  budget_min: number | null;
  budget_max: number | null;
  budget_min_display: number | null;
  budget_max_display: number | null;
  currency: string;
  deadline: string | null;
  status: RequestStatus;
  offer_count: number;
  expires_at: string | null;
  attachments: AttachmentMeta[];
  created_at: string;
  student_view: boolean;
  bidding: { offers?: number; offer_count?: number; my_offer_status?: string | null } | null;
}

export interface RequestWritePayload {
  mode?: "open" | "managed";
  category: string;
  title: string;
  description: string;
  subject_id: string | null;
  skill_ids: string[];
  pricing_type: "fixed" | "hourly";
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  attachment_ids?: string[];
  attested?: boolean;
}

export const REQUEST_STATUS_TONE: Record<RequestStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  draft: "neutral",
  open: "info",
  matched: "success",
  in_progress: "info",
  completed: "success",
  rejected: "danger",
  in_review: "warning",
  pooled: "warning",
  cancelled: "neutral",
  expired: "warning",
};

export const REQUEST_STATUS_COPY: Record<RequestStatus, string> = {
  draft: "Draft",
  open: "Receiving offers",
  matched: "Expert selected",
  in_progress: "In progress",
  completed: "Completed",
  rejected: "Rejected",
  in_review: "In review",
  pooled: "With expert pool",
  cancelled: "Cancelled",
  expired: "Expired",
};

export const REQUEST_CATEGORIES = [
  { value: "tutoring", label: "1:1 tutoring sessions" },
  { value: "concept_coaching", label: "Concept coaching" },
  { value: "problem_walkthrough", label: "Guided problem walkthrough" },
  { value: "writing_feedback", label: "Writing feedback & coaching" },
  { value: "code_review", label: "Code review & mentoring" },
  { value: "exam_prep", label: "Exam preparation" },
  { value: "mentorship", label: "Ongoing mentorship" },
  { value: "other", label: "Other legitimate help" },
] as const;

export function isDraftEditable(status: RequestStatus): boolean {
  return status === "draft";
}

export function canAcceptOffers(status: RequestStatus): boolean {
  return status === "open";
}
