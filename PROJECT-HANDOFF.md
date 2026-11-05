# PROJECT HANDOFF — Authoritative Platform Blueprint (Sprints 1–7)

**Repository:** `knowledge-marketplace`  
**Working Branch:** `arena/01a0e69d-knowledge-marketplace`  
**Current Status:** Sprints 1–7 ✅ **100% Complete, Tested & Verified**  
**Architecture:** Django 5.2 LTS Modular Monolith + Django Channels WebRTC + Next.js 15 Monorepo  

---

## 1. Executive Summary & Monorepo Architecture

The `knowledge-marketplace` platform is a production-grade, two-sided hybrid academic and domain knowledge marketplace supporting both an **Open Marketplace** (student requests, specialist blind offers, counter-negotiations) and a **Managed Service** (platform triage, pool dispatch, concierge matching).

The codebase is organized into an import-linter-enforced Django backend and a modern NPM workspace monorepo:

```text
/
├── frontend/
│   ├── apps/web/       # @hem/web (Port 3000): Marketing, Student & Specialist Workspaces
│   ├── apps/admin/     # @hem/admin (Port 3001): Executive Operations Cockpit & Financial Ledger
│   ├── packages/ui/    # @hem/ui: Shared Radix + Tailwind design system components
│   └── scripts/        # verify_*.mjs: Real Google Chrome Playwright E2E verification suites
├── backend/            # Django 5.2 LTS + Channels WebRTC (Port 8000) modular monolith
│   ├── config/         # settings/{base,dev,test,prod}, routing (HTTP+WS), OpenAPI schema
│   ├── apps/core/      # shared kernel: health, error envelope, money, request-id, seeds
│   ├── apps/experts/   # directory, profiles, catalog products, live group cohorts
│   ├── apps/orders/    # unified state machine, deliverables v1..vN, WebRTC LiveSession
│   ├── apps/payments/  # double-entry ledger, escrow custody, payouts & settlement
│   └── apps/portal/    # executive operations API, dispute tribunal & ledger explorer
├── docs/               # Product, workflows, architecture, operations, process
├── PROJECT-HANDOFF.md  # Authoritative handover blueprint
├── .env.example        # every environment variable, documented
└── docker-compose.yml  # db + backend + worker + frontend (clean-checkout runnable)
```

---

## 2. Sprint-by-Sprint Technical Blueprint

### Sprint 1: Monorepo Consolidation & Architectural Hygiene
* **Monorepo Structure:** Consolidated legacy fragmented directories into clean NPM workspaces:
  * `@hem/web`: Consumer marketing, student dashboard, and specialist workspace.
  * `@hem/admin`: Operations console, financial ledger explorer, and dispute tribunal.
  * `@hem/ui`: Shared UI primitives built on Radix UI, Tailwind CSS, and Lucide React.
  * *Retired:* Safely removed obsolete `frontend/src` tree.
* **Cryptographic Hygiene:** Hardened secret key posture with 74-character high-entropy keys, automated fail-closed security posture checks (`manage.py check --tag production`), and strict cookie security (`SameSite=Lax`, `HttpOnly`, `Secure`).

### Sprint 2: Order Negotiations, Deliverables Revision History & Financial Ledger
* **Interactive `DeadlineProposal` Negotiation:** Two-sided counterparty negotiation banner allowing specialists to propose revised deadlines with structured rationale and students to accept or decline in real time.
* **Deliverable Revision Stepper:** Multi-version deliverable history (`v1`, `v2`, `Latest`) displaying author notes, timestamps, download triggers, and diff previews.
* **Admin Double-Entry Financial Ledger Explorer (`/portal/finance`):**
  * Real-time ledger entry inspection with T-Account debit/credit verification.
  * Enforces ledger identity: `charge + refund = commission + credit + fee`.
  * One-click CSV ledger export and emergency escrow freeze controls.

### Sprint 3: Self-Hosted WebRTC 1:1 Live Coaching Studio
* **`LiveSession` Model:** First-class model tied to `Order` with statuses (`scheduled`, `live`, `completed`, `cancelled`).
* **RFC 5545 Calendar Sync:** Dynamic `.ics` calendar invitation endpoint (`/api/v1/orders/<id>/live-session/ics/`) compatible with Google Calendar, Apple Calendar, and Outlook.
* **WebSocket Signaling & Presence:** Django Channels consumer at `ws/orders/<id>/live/` supporting WebRTC SDP offer/answer exchange, ICE candidates, and real-time mute/camera status.
* **Synchronized Code Scratchpad:** Real-time multi-cursor editor with syntax highlighting, language selection, and live sync indicator (`● Sync 14ms`).

### Sprint 4: Self-Serve Digital Knowledge Catalog & Full-Text Search
* **`KnowledgeProduct` Domain:** Supports self-serve digital assets (templates, datasets, guides) and scheduled live workshops.
* **Instant Checkout & Ledger Integration:** Atomic checkout workflow automatically generating orders and booking double-entry ledger entries (85% specialist credit, 15% platform commission).
* **Weighted PostgreSQL Search:** `SearchVector` and `SearchRank` weighting (`title` weight A, `description` weight B, `tags` weight C) with fallback trigram similarity.

### Sprint 5: Speed-Booking, Student Vault, Specialist Payouts & Admin Settlement
* **Global `Cmd+K` Federated Omnibox:** Instantaneous palette providing hotkey-driven fuzzy navigation across orders, specialists, products, and quick platform actions.
* **Direct 1:1 Profile Speed-Booking:** 1-click booking modal directly on specialist profiles (`/experts/[slug]`) generating pre-funded live coaching sessions.
* **Permanent Student Knowledge Vault (`/vault`):** Unified asset repository with printable official tax invoices and permanent download access.
* **Specialist Earnings & Payout Center (`/expert/earnings`):** Real-time financial dashboard displaying earned revenue, pending escrow, and instant withdrawal modal.
* **Admin 1-Click Payout Settlement:** Operations endpoint enabling admins to approve, execute, or decline specialist payout requests with atomic ledger updates.

### Sprint 6: Live Group Micro-Cohorts & 4-Quadrant Dispute Evidence Workbench
* **Multi-Seat Live Workshops (`/cohorts`):** Scheduled cohorts with strict seat capacity enforcement (`max_seats`, `enrolled_count`), scarcity progress indicators, and instant seat reservation.
* **Dispute Resolution Tribunal (`/portal/disputes`):** 4-quadrant evidence workbench presenting student claims, specialist deliverable versions, live scratchpad snapshots, and chat transcripts side by side.
* **Interactive 0%–100% Split Slider:** Real-time escrow split workbench dynamically computing student refund, specialist payout, and platform fee adjustments before executing atomic settlement.
* **30-Route Real Chrome Audit:** Automated Playwright audit traversing 30 platform routes across desktop/mobile viewports and light/dark themes.

### Sprint 7: Animated Marketing Craft & WCAG AAA High-Contrast Dashboards
* **Animated Marketing Hero (`/`):**
  * Hardware-accelerated CSS keyframe gradient blobs (`Electric Indigo #6366f1`, `Vibrant Cyan #06b6d4`, `Warm Violet/Amber #8b5cf6`/`#f59e0b`).
  * Floating 3-layer visual centerpiece featuring simulated WebRTC studio, 98% AI Match card, and Double-Entry Escrow Shield.
  * Infinite continuous marquee ticker and 4-pillar interactive Bento grid.
  * Interactive persona role switcher (`Students & Teams` vs `Domain Specialists`).
* **WCAG AAA Design System:**
  * Elevated light mode `--muted` token to `#475569` (Slate-600) for high-contrast scannability.
  * Royal Indigo persona accent strip for Student Mode; Vibrant Emerald accent strip for Specialist Mode.
  * `DashboardOrientationBanner`: 4-card interactive workflow ribbon embedded at top of workspaces.
  * Operations Cockpit (`/portal`): Color-coded Executive KPI Ribbon (Emerald GMV, Indigo Revenue, Cyan Escrow, Amber Dispatch, Rose Triage) with tabular monospace figures.

---

## 3. Verified Quality Gates & Telemetry

| Quality Gate | Tool / Command | Result |
| :--- | :--- | :--- |
| **Backend Test Suite** | `pytest -c backend/pyproject.toml backend -q` | **453 passed (100%)** |
| **Frontend Test Suite** | `npm --prefix frontend test -- --run` | **184 passed across 37 files (100%)** |
| **TypeScript Static Check** | `npm --prefix frontend run typecheck` | **0 errors** (`@hem/web` & `@hem/admin`) |
| **ESLint Quality Check** | `npm --prefix frontend run lint` | **0 errors, 0 warnings** |
| **Backend Code Linter** | `ruff check backend` | **All checks passed** |
| **Layer Boundary Enforcement** | `python -m importlinter.cli --config backend/pyproject.toml` | **Contracts kept, 0 violations** |
| **OpenAPI 3.0 Schema** | `python backend/manage.py spectacular --validate` | **Validation passed (code 0)** |
| **Database Migrations** | `python backend/manage.py makemigrations --check --dry-run` | **No changes detected (in sync)** |
| **Real Chrome E2E Suite** | `node frontend/scripts/verify_sprint7_visual_overhaul.mjs` | **0 console errors, 0 crashes** |

---

## 4. Local Development & Operational Runbook

### Service Ports
* **Consumer Web (`@hem/web`):** `http://localhost:3000`
* **Admin Operations (`@hem/admin`):** `http://localhost:3001`
* **Backend API & WebSockets (Daphne/Channels):** `http://127.0.0.1:8000`

### Seed Demo Accounts
Run `python backend/manage.py seed_demo` to seed test users:
* **Platform Superuser:** `admin@demo.local` / `admin-demo-1234`
* **Verified Student:** `student@demo.local` / `demo-password-1234`
* **Approved Specialist:** `expert@demo.local` / `demo-password-1234`

### Running Test Suites
```bash
# Backend unit & integration tests
pytest -c backend/pyproject.toml backend -q

# Frontend Vitest suite
npm --prefix frontend test -- --run

# TypeScript typecheck
npm --prefix frontend run typecheck

# Code linters
npm --prefix frontend run lint
ruff check backend
```

