/** Reviews API client (browser) — Phase 9 (docs/workflows/reviews.md). */
import { apiFetch } from "@/lib/api/client";

import type { PublicReviewsFeed, Review } from "./types";

export interface ReviewInput {
  rating: number;
  body: string;
  sub_quality?: number | null;
  sub_communication?: number | null;
  sub_timeliness?: number | null;
}

export const reviewsApi = {
  /** The order's review for participants — 404 when none exists yet. */
  forOrder: (orderId: string) =>
    apiFetch<Review>({ path: `/api/v1/me/orders/${orderId}/review` }),

  submit: (orderId: string, input: ReviewInput) =>
    apiFetch<Review>({
      path: `/api/v1/me/orders/${orderId}/review`,
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    }),

  edit: (reviewId: string, input: Partial<ReviewInput>) =>
    apiFetch<Review>({
      path: `/api/v1/me/reviews/${reviewId}`,
      method: "PATCH",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    }),

  /** Expert answers once — optional private rating of the student (BR-37). */
  reply: (reviewId: string, reply: string, ratingOfStudent?: number | null) =>
    apiFetch<Review>({
      path: `/api/v1/reviews/${reviewId}/reply`,
      method: "POST",
      body: JSON.stringify({ reply, rating_of_student: ratingOfStudent ?? null }),
      headers: { "Content-Type": "application/json" },
    }),

  /** The signed-in expert's published reviews (expert-side panel). */
  received: () => apiFetch<{ results: Review[] }>({ path: "/api/v1/me/reviews" }),

  /** Public feed for an expert profile (weighted aggregate included). */
  public: (slug: string, baseUrl?: string) =>
    apiFetch<PublicReviewsFeed>({
      path: `/api/v1/experts/${encodeURIComponent(slug)}/reviews`,
      baseUrl,
    }),
};
