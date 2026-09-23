# MVP Scope & Roadmap

> Status: 📐 Phase 0 · Last updated: 2026-09-23

## Guiding principle

Ship the **complete hybrid loop** (both business models, end to end, with real payments) at the smallest possible scope, with near-zero fixed infrastructure cost. A feature is MVP only if removing it breaks the money loop, trust/safety, or the local-dev experience.

## In MVP

| Area | Included |
|---|---|
| Auth | Email+password, email verification, password reset, JWT-in-httpOnly-cookie sessions |
| Roles | Student (default), Expert (application+approval), Admin (Django admin), Support (limited staff group) |
| Profiles | Student profile; public expert profile (SEO-ready), expert application & vetting workflow |
| Requests | Post/edit/cancel, categories incl. academic-integrity attestation, subjects/tags, budget & deadline, attachments |
| Open marketplace | Request visibility to eligible experts, offers (create/edit/withdraw/decline/accept) |
| Managed service | Admin triage queue, pool broadcast invitations, direct assignment with expert acceptance |
| Orders | Full lifecycle: acceptance, payment gate, delivery, revisions, approval/auto-approval, cancellation |
| Payments | Stripe Connect (separate charges & transfers), commission ledger, refunds, expert payouts, webhook idempotency; **manual-gateway fallback mode** for unsupported regions |
| Messaging | Order/request threads, realtime via WebSockets, read receipts, report button |
| Notifications | In-app + email (transactional), realtime toast, per-category preferences |
| Files | Uploads, purpose-scoped, permission-checked private access (presigned/streamed) |
| Reviews | Student→expert public review + reply, expert→student private rating, aggregates |
| Disputes | Open, evidence thread, admin resolution with refund/transfer execution |
| Admin | Django admin customized: vetting, triage actions, moderation, dispute resolution, refund/payout ops, audit log viewer, PlatformConfig |
| Analytics | Owner KPI dashboard (GMV, take rate, conversion, open queues) via admin dashboard views |
| Search | Postgres full-text + trigram search & filters for requests/experts (no external search service) |
| SEO | SSR public pages: home, expert directory/profiles, subject pages, how-it-works; sitemap; JSON-LD |
| Ops | Docker Compose local dev, seeds/demo data, CI (lint+test), staging-ready single-VM deploy, backups to object storage |

## Out of MVP (post-MVP roadmap)

| Feature | Phase candidate | Rationale for deferral |
|---|---|---|
| Google/social OAuth | P2 after launch | Email+password unblocks launch; OAuth is additive |
| Stripe OAuth/Express onboarding polish (full KYC automation) | launch+ | Manual review keeps quality high early |
| Multi-currency & FX | post-PMF | Single currency simplifies ledger |
| Expert subscriptions / featured listings | post-PMF | Needs supply density first |
| Live video sessions | never-MVP | Expensive infra; integrate (e.g. Jitsi) only with proven demand |
| Mobile apps (React Native) | post-PMF | Responsive web first |
| Automated content-intake detection (contact info, plagiarism heuristics) | post-MVP | Report-driven moderation suffices at small scale |
| Recommendations/ML matching | post-MVP | Needs order-history data |
| Blog/CMS for SEO content | post-MVP | Directory + subject pages first |
| Public API / partner integrations | far post | |
| Ticketing/support desk | post-MVP | Inbox + disputes cover it |

## Explicit non-goals (product)

- Custom escrow/custody of funds outside the payment provider
- Selling user data; ads inside the product
- Ghostwriting-grade "done-for-you" graded work (see BR-10..14)

## MVP acceptance definition (whole platform)

A stranger can: register → verify email → post an attested request → (open) receive/accept an offer **or** (managed) get triaged & assigned → pay via Stripe → chat with the expert → receive delivery → request a revision → approve → auto/completed payout lands in the expert's Stripe account → leave a review. An owner can: vet experts, triage managed requests, watch money in the ledger, resolve a dispute with a partial refund, and run the whole thing on ~$0 fixed cost. All of it runs locally with `docker compose up` and seeded demo data.
