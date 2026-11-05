/**
 * Reviews domain types (Phase 9) — mirror apps/reviews/api/serializers.py
 * and the public/aggregate payloads of apps/reviews/api/views.py.
 */

export type ReviewStatus = "published" | "hidden";

export interface Review {
  id: string;
  order_id: string;
  order_number: string;
  rating: number;
  sub_quality: number | null;
  sub_communication: number | null;
  sub_timeliness: number | null;
  body: string;
  status: ReviewStatus;
  expert_reply: string;
  replied_at: string | null;
  edited: boolean;
  created_at: string;
}

export interface PublicReviewsFeed {
  rating_avg: number | null;
  rating_count: number;
  results: Review[];
}

export const SUB_SCORES = [
  { key: "sub_quality", label: "Quality" },
  { key: "sub_communication", label: "Communication" },
  { key: "sub_timeliness", label: "Timeliness" },
] as const;

export type SubScoreKey = (typeof SUB_SCORES)[number]["key"];

export const MIN_BODY_CHARS = 20;
export const MAX_BODY_CHARS = 5000;
export const MAX_RATING = 5;

/** BR-37: the student may edit until the expert replies. */
export function canEditReview(review: Review, viewerIsAuthor: boolean): boolean {
  return viewerIsAuthor && review.expert_reply === "" && review.status === "published";
}

/** BR-37: exactly one expert reply, immutable once posted. */
export function canReplyToReview(review: Review, viewerIsExpert: boolean): boolean {
  return viewerIsExpert && review.expert_reply === "" && review.status === "published";
}
