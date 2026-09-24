# Reviews & Reputation

> Status: ✅ Phase 9 · Last updated: Phase 9 completion · Related: [expert-journey](expert-journey.md), [disputes](disputes.md), [moderation](../product/business-rules.md)

## Model (implemented — `apps/reviews`)

- `Review`: **1-1 with Order** (one review per completed order, ever); author = the order's **student**; expert FK snapshot; `rating` 1–5 int; sub-scores (`sub_quality`, `sub_communication`, `sub_timeliness`, 1–5, optional); `body` (≥20 chars, ≤5000); `status` (`published|hidden`); `expert_reply` + `replied_at` (one reply, immutable once posted — BR-37); `expert_rating_of_student` (1–5, private aggregate — never public); `edited_at`.

## Eligibility & lifecycle (implemented)

- Submit: `POST /api/v1/me/orders/{id}/review` — requester must be the order's student, order `completed`, no existing review (BR-37). Rating required; sub-scores optional; body required.
- Edit: author may edit rating/sub-scores/body **until the expert replies** (`review_already_answered` after); edits stamp `edited_at`.
- Reply: `POST /api/v1/reviews/{id}/reply` — only the reviewed expert, exactly **one** reply (`duplicate_reply` guard), includes optional private `rating_of_student`; immutable afterwards.
- Hide/unhide (moderation, BR-38 escalation): Django admin action via service (`hide_review`/`unhide_review`, audited); hidden reviews stop counting toward aggregates and disappear from public surfaces.

## Weighted public rating (BR-39, implemented)

- Aggregate over **published** reviews of the expert's completed orders:

  ```text
  weight_i = 0.5 ** (age_days_i / 365)        # one-year half-life — recent orders weigh more
  rating_avg = Σ(rating_i · weight_i) / Σ(weight_i)   # rounded to 2 decimals
  ```

- Recomputed on submit/edit/reply-free events/hide/unhide and written to `ExpertProfile.rating_avg` / `rating_count` (the same fields the directory and profile already read). Zero reviews → `rating_avg` null, `rating_count` 0. Suspended experts keep their aggregates (rows persist; directory excludes them). Recalculation is idempotent and cheap at MVP volumes (recompute-on-write, no cron).
- `expert_rating_of_student` is stored but **not exposed** in MVP (private aggregate per BR-37).

## Public surfaces (implemented)

- `GET /api/v1/experts/{slug}/reviews` — published reviews (newest first): rating, sub-scores, body, expert reply, edited flag, created_at. Suspended/hidden profiles → 404 as with the directory.
- Expert profile + public directory display the weighted `rating_avg` / `rating_count`; offer cards inherit the directory data.

## Integrity (BR-38)

Detection of self-reviews/coercion/trading is moderation tooling (Phase 10 queues). Phase 9 ships the enforcement primitives: one-review-per-order (schema-level), author/expert-only mutations, hidden status, and audit rows on hide/unhide.
