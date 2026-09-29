/**
 * Experts + profiles domain types (Phase 3).
 * Contract source of truth: GET /api/schema/ — keep mirrors in sync.
 */

export interface TaxonomyTerm {
  id: number;
  kind: string;
  name: string;
  slug: string;
  description?: string;
}

export interface PublicExpert {
  slug: string;
  display_name: string;
  headline: string;
  bio: string;
  expertise_summary: string;
  experience_years: number;
  qualifications: string;
  languages: string;
  timezone: string;
  availability: "available" | "paused";
  subjects: TaxonomyTerm[];
  skills: TaxonomyTerm[];
  rating_avg: string | null;
  rating_count: number;
  completed_orders: number;
  approved_at: string | null;
}

/** Expert application lifecycle (ADR-0012) — `not_applied` = no application yet. */
export type ApplicationStatus =
  | "not_applied"
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "suspended";

export const APPLICATION_STATUS_ORDER: ApplicationStatus[] = [
  "not_applied",
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "suspended",
];

export interface ApplicationCredential {
  id: string;
  original_name: string;
  content_type: string;
  size: number;
}

export interface ExpertApplication {
  status: ApplicationStatus;
  display_name: string;
  headline: string;
  bio: string;
  expertise_summary: string;
  experience_years: number;
  qualifications: string;
  languages: string;
  timezone: string;
  availability_note: string;
  subjects: TaxonomyTerm[];
  skills: TaxonomyTerm[];
  credentials: ApplicationCredential[];
  certified_18_plus: boolean;
  integrity_acknowledged: boolean;
  rejection_reason?: string;
  review_note?: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  resubmission_count: number;
}

export interface StudentProfile {
  display_name: string;
  bio: string;
  interests: TaxonomyTerm[];
  created_at?: string;
  updated_at?: string;
}

export function isApplicationEditable(status: ApplicationStatus): boolean {
  // "not_applied" is editable: a first-time applicant must see the form (create flow).
  return status === "not_applied" || status === "draft" || status === "submitted" || status === "rejected";
}

export function canSubmitApplication(status: ApplicationStatus): boolean {
  return status === "draft" || status === "rejected";
}
