# Documentation — Hybrid Expert Marketplace

> **Working title:** Hybrid Expert Marketplace (repo: `knowledge-marketplace`)
> **Docs status:** Phase 0 — approved architecture baseline (v1.0, 2026-09-23)
> **Rule:** Documentation is a first-class deliverable. Every architectural or business-logic change must be reflected here in the same phase it is made. See [process/development-workflow.md](process/development-workflow.md).

This directory is the single source of truth for the product, workflows, architecture, operations and process of the platform. Another developer must be able to continue this project using only this repository.

---

## Reading order

| # | If you want to understand… | Read |
|---|---|---|
| 1 | What we are building and for whom | [product/overview.md](product/overview.md) |
| 2 | How the platform makes money | [product/business-model.md](product/business-model.md) |
| 3 | The rules the product must enforce (incl. academic integrity) | [product/business-rules.md](product/business-rules.md) |
| 4 | What is in / out of the MVP | [product/mvp-scope.md](product/mvp-scope.md) |
| 5 | Roles and the authorization matrix | [product/user-roles.md](product/user-roles.md) |
| 6 | End-to-end user journeys | [workflows/](workflows/) |
| 7 | How the system is built | [architecture/](architecture/) |
| 8 | Dashboards, search, profiles | [platform/dashboards.md](platform/dashboards.md) |
| 9 | What external services cost and why | [operations/costs.md](operations/costs.md), [operations/integrations.md](operations/integrations.md) |
| 10 | How we build: phases, ADRs, workflow | [process/](process/) |

---

## Index

### Product
- [product/overview.md](product/overview.md) — vision, problem, personas, success metrics, glossary
- [product/business-model.md](product/business-model.md) — monetization, commission model, unit economics
- [product/business-rules.md](product/business-rules.md) — canonical business rules (BR-xx) incl. academic integrity policy
- [product/mvp-scope.md](product/mvp-scope.md) — MVP scope, non-goals, post-MVP roadmap
- [product/user-roles.md](product/user-roles.md) — roles, permissions, authorization matrix

### Workflows (product behaviour)
- [workflows/student-journey.md](workflows/student-journey.md) — registration → request → selection → completion
- [workflows/expert-journey.md](workflows/expert-journey.md) — application → approval → bidding → delivery → payout
- [workflows/admin-journey.md](workflows/admin-journey.md) — review, approval, assignment, dispute & payout operations
- [workflows/open-marketplace.md](workflows/open-marketplace.md) — bidding workflow & state machine
- [workflows/managed-service.md](workflows/managed-service.md) — managed routing: pool publish & manual assignment
- [workflows/order-lifecycle.md](workflows/order-lifecycle.md) — order, delivery, revision, completion, cancellation
- [workflows/payments.md](workflows/payments.md) — payment, escrow, commission, payout, refund, chargeback, reconciliation
- [workflows/messaging.md](workflows/messaging.md) — chat, safety rules, moderation
- [workflows/notifications.md](workflows/notifications.md) — notification catalog, channels, preferences
- [workflows/files.md](workflows/files.md) — upload/download, secure access, quotas, validation
- [workflows/reviews.md](workflows/reviews.md) — ratings, replies, moderation
- [workflows/disputes.md](workflows/disputes.md) — dispute lifecycle, outcomes, SLAs

### Platform surfaces
- [platform/dashboards.md](platform/dashboards.md) — student / expert / admin dashboards, search, profiles, reporting

### Architecture
- [architecture/system-architecture.md](architecture/system-architecture.md) — high-level system, modular monolith principle
- [architecture/backend.md](architecture/backend.md) — Django app boundaries, responsibilities, dependency rules
- [architecture/frontend.md](architecture/frontend.md) — Next.js domain-oriented structure
- [architecture/database.md](architecture/database.md) — entity model, ERD, state enums, indexes, retention
- [architecture/api.md](architecture/api.md) — API conventions + full endpoint catalog
- [architecture/authentication.md](architecture/authentication.md) — authN/authZ design
- [architecture/security.md](architecture/security.md) — security requirements & checklist
- [architecture/realtime.md](architecture/realtime.md) — WebSockets/Channels with zero-extra-cost layering
- [architecture/background-jobs.md](architecture/background-jobs.md) — database-backed queue (no Redis)
- [architecture/files-storage.md](architecture/files-storage.md) — local dev storage → Cloudflare R2, signed access
- [architecture/observability.md](architecture/observability.md) — logging, error handling, audit logs, monitoring
- [architecture/testing.md](architecture/testing.md) — test strategy, coverage targets, CI gates
- [architecture/deployment.md](architecture/deployment.md) — $0-first deployment architecture
- [architecture/environments.md](architecture/environments.md) — settings strategy + all environment variables
- [architecture/backup-recovery.md](architecture/backup-recovery.md) — backups, restore runbook
- [architecture/scalability.md](architecture/scalability.md) — scale triggers and upgrade path
- [architecture/seo-ux.md](architecture/seo-ux.md) — SEO, responsive, accessibility, performance

### Operations
- [operations/costs.md](operations/costs.md) — cost of every service, free-tier alternatives, migration paths
- [operations/integrations.md](operations/integrations.md) — third-party integrations detail (Stripe, email, storage…)

### Process
- [process/roadmap-phases.md](process/roadmap-phases.md) — development phases, deliverables, acceptance criteria, dependencies
- [process/architecture-review.md](process/architecture-review.md) — Phase 0 review findings (consistency / security / feasibility / cost)
- [process/adrs.md](process/adrs.md) — Architecture Decision Records
- [process/development-workflow.md](process/development-workflow.md) — branching, commits, doc-sync rules

---

## Repository layout (target)

```text
/
├── frontend/          # Next.js + TypeScript + Tailwind (App Router)
├── backend/           # Django + DRF modular monolith
│   ├── config/        # project: settings, urls, asgi/wsgi
│   └── apps/          # domain modules (see architecture/backend.md)
├── docs/              # this documentation set
├── scripts/           # dev/bootstrap/seed helper scripts
├── .env.example
├── docker-compose.yml
├── Dockerfile.backend
└── README.md
```

## Status legend

- ✅ Implemented and tested
- 🚧 Partially implemented (see roadmap phase)
- 📐 Designed, not yet implemented
- Every doc carries the phase that owns it. Cross-check [process/roadmap-phases.md](process/roadmap-phases.md) for current status.
