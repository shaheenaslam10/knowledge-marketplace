# Centralized Agent State & Project Memory

> **STRICT RULE FOR ALL AI AGENTS:**
> Any AI agent interacting with this repository **MUST read this file first**, and **update it before completing its turn**. Never proceed with new tasks without inspecting current status, active decisions, and handoff instructions recorded here.

---

## 1. Project Overview & Architecture Target
- **Product:** Hybrid Expert Marketplace (Students, Experts, and Platform Operations).
- **Architecture:** Monorepo (`npm` workspaces) with isolated applications sharing a centralized design system:
  - `frontend/apps/web`: Dual-role consumer marketplace application (Marketing, Students, Experts).
  - `frontend/apps/admin`: Dedicated Platform Owner / Operations console (`(portal)` on port 3001).
  - `frontend/packages/ui`: Shared design system (`@hem/ui`) with Tailwind CSS, shadcn/ui components, Lucide icons, Framer Motion, and dual-native theme tokens.
- **Backend:** Modular Django application (REST API, WebSockets, Celery, PostgreSQL).
- **Design System Target:** Premium, dual-native Light/Dark mode, shadcn/ui foundation, Framer Motion micro-interactions, sophisticated academic/tech aesthetic (deep violet / electric indigo accent, clean slate/zinc dark surfaces, crisp off-white light surfaces).

---

## 2. Phase Tracker
- **Current Phase:** Phase 5: Final Production Polish, Responsive Audit & Handoff — **COMPLETE**
- **Overall Status:** **`PRODUCTION_READY`** (Dual-native Next.js 15 monorepo, 0 type errors, 143 frontend Vitest tests passing, 439 backend pytest tests passing, HTTP 200 on all routes).

### Completed Tasks
- [x] Backend functional verification & full test suite passing (439 pytest tests, business rules BR-01 through BR-25).
- [x] Initial design blueprint created (`docs/design/premium-product-ui-direction.md`).
- [x] Centralized AI Memory established (`docs/AGENT_STATE.md`).
- [x] Converted `frontend/` to npm workspace monorepo (`apps/*`, `packages/*`).
- [x] Created `frontend/packages/ui` (`@hem/ui`) with shared design system, Tailwind config, dual-native theme tokens (Light & Dark mode), and shadcn/ui component primitives.
- [x] Created `frontend/apps/web` (`@hem/web`) and ported `(marketing)`, `(auth)`, and `(app)` route groups.
- [x] Created `frontend/apps/admin` (`@hem/admin`) and ported `(portal)` route group with root redirection.
- [x] **Phase 2 Landing Page Overhaul:**
  - Redesigned `apps/web/src/app/(marketing)/page.tsx` with high-converting study/tech aesthetic.
  - Built interactive `HeroLauncher` widget with discipline selector, service model picker (Managed vs Open), urgency preview, and instant match projections.
  - Built interactive `ModelComparison` widget comparing Managed White-Glove placement vs. Open Bidding pool.
  - Built interactive `ExpertShowcase` with discipline filters, verified credentials, doctoral badges, ratings, and instant consultation requests.
  - Implemented 3-pillar Institutional Trust & Escrow section (Milestone Escrow, BR-10/14 Academic Integrity Honor Code, 48h Dispute Resolution).
- [x] **Phase 2 Polish & Remediation: Elite Auth Suite Overhaul:**
  - Split-screen storytelling layout (`AuthStorytelling.tsx`) with MIT/Oxford/Stanford doctoral reviews and platform statistics.
  - Sign-in page with 1-click demo role switcher and password visibility toggles.
  - Registration suite with role selector cards and 4-bar password complexity meter.
- [x] **Phase 3: Student & Expert Marketplace Workspaces (`(app)` redesign):**
  - Persistent Dual-Role Workspace Shell (`(app)/layout.tsx`) with instant role switcher (`[🎓 Student Mode]` vs. `[⚡ Expert Mode]`), `Cmd+K` global search, and dynamic role-aware navigation.
  - Student Learning Dashboard (`/requests`) with KPI metric cards, 3-step request wizard (`/requests/new`), and Studybay-style bid comparison matrix (`/requests/[id]`).
  - Active Order Workspace (`/orders`, `/orders/[id]`) with milestone stepper timeline and deliverable inspection panel.
  - Expert Opportunity Discovery Feed (`/opportunities`) with live Net Earnings breakdown calculator (15% platform commission) at `/opportunities/[id]`.
  - Managed Assignments Board (`/assignments`) with visual TTL urgency countdown indicators.
  - Specialist Cockpit (`/expert/profile`, `/expert/reviews`) and Unified Messaging (`/messages`).
- [x] **Phase 4: Admin Operations Cockpit Transformation (`@hem/admin` `/portal`):**
  - **Executive Operations Shell & Navigation (`apps/admin/src/app/(portal)/layout.tsx`):**
    - Platform brand with `OPERATIONS COCKPIT` environment badge and live status indicator.
    - Global Command Palette (`Cmd+K` / `Ctrl+K`) for instantaneous navigation across portal screens, user IDs, and tickets.
    - System Health Pill showing live Django API telemetry, database latency (12ms), and Escrow Custody reserve verification.
    - Dense sidebar categorized into *Operational Triage*, *Disputes & Governance*, and *Treasury & Audit*.
  - **Operations Overview & Triage Center (`/portal`):**
    - High-impact operational KPI ribbon: GMV, Platform Revenue, Active Escrow custody, Managed Queue Depth, and Open Triage Flags.
    - Priority Action Triage board with filters for Critical items, Disputes, and Content moderation flags.
    - Full telemetry trend graphs for daily orders and GMV volume.
  - **Managed Service Dispatch Board (`/portal/dispatch`):**
    - Filterable coordinator queue for student tasks opting for "Platform Match" with discipline, budget, and SLA countdowns.
    - One-Click Assignment & Matcher Drawer with candidate match ranking (98% match scores, doctoral credentials, workload metrics), and platform net margin previews.
    - Instant actions: *Direct Assign Specialist* and *Broadcast to Discipline Pool*.
  - **Dispute Resolution Tribunal (`/portal/disputes`):**
    - Interactive Split-View Arbitration Workspace: Student grievance statement, expert defense rebuttal, deliverable audit notes, and embedded chat transcript audit with flagged policy violations highlighted.
    - Binding Ruling Action Bar: [Issue 100% Student Refund], [Release 100% Escrow to Expert], [Execute 50/50 Split Settlement], and [Reassign Task].
  - **Expert Credential Verification Desk (`/portal/experts`):**
    - Vetting queue for doctoral applicants with alma mater verification, GPA/honors inspection, and verified document download checklist.
    - Binding action controls: *Approve as Verified Specialist*, *Request Further Documentation*, and *Reject Application*.
  - **Financial Ledger & Escrow Custody (`/portal/finance`):**
    - Live Escrow Monitor detailing active deposits by Order ID, student principal, specialist beneficiary, and hold status.
    - Emergency Freeze toggle on suspicious transactions and manual escrow release triggers.
    - Automated reconciliation checks verifying double-entry ledger invariants.
- [x] **Phase 5: Production Polish, Responsive Audit & Handoff:**
  - Complete mobile & responsive viewport audit across 390px, 768px, 1024px, and 1440px.
  - Responsive mobile drawer (`Sheet`) in `SiteHeader.tsx` with all authenticated links, role switchers, and ThemeToggle.
  - Dual-role workspace switcher in `(app)/layout.tsx` fully responsive on mobile viewports.
  - Operations console backdrop overlay and mobile drawer responsiveness in `(portal)/layout.tsx`.
  - Responsive flex stacking for offer/bid cards in `/requests/[id]`.
  - Typecheck: 0 errors across `@hem/ui`, `@hem/web`, and `@hem/admin` (`tsc --noEmit`).
  - Unit & Integration Tests: 143 Vitest tests passing (25 test suites).
  - All 12 critical web and admin routes returning HTTP 200 OK.
- [x] **Remediation Phase: Role-Based Routing, Contrast Overhaul & Next-Gen Dashboard Elevation:**
  - **Role-Based Routing & Redirection:**
    - Upgraded login submission (`apps/web/src/app/(auth)/login/page.tsx` & `frontend/src/app/(auth)/login/page.tsx`): Expert logins redirect immediately to `/opportunities` (Expert Workspace); Student logins redirect immediately to `/requests` (Student Workspace); query `?next=` is honored when explicitly provided.
    - Tied active role mode to persistent state (`localStorage` key `hem_role_mode` + cookie `hem_role_mode`).
    - Fixed workspace switcher in shell header (`(app)/layout.tsx`): Instant state persistence and route transition (`/requests` vs `/opportunities`).
    - Handled single-role users gracefully: If user lacks expert privileges, the toggle displays an "Upgrade to Expert Specialist" callout linking to `/expert/apply` instead of a broken toggle.
    - Added interactive Workspace Mode Switcher & Upgrade card to `/account` (`apps/web/src/app/(app)/account/page.tsx`).
  - **Light/Dark Mode Contrast Elimination:**
    - Mapped semantic theme tokens (`--color-card`, `--color-card-foreground`, `--color-muted-foreground`, `--color-border`) into `@theme inline` across all web, admin, and UI stylesheets.
    - Updated `Card.tsx` in all packages to consume `border-border bg-card text-card-foreground`.
    - Eliminated hardcoded `text-slate-900 dark:text-slate-100` and `text-slate-500 dark:text-slate-400` across 30+ application files, replacing them with crisp semantic `text-foreground` and `text-muted`.
    - Confirmed 100% typography legibility in both Light and Dark themes.
  - **Next-Gen Student Workspace Dashboard (`/requests`):**
    - Executive top hero strip with personalized greeting, active discipline pill, escrow protection badge, and animated glowing "Start New Task Brief" CTA.
    - 4-card telemetry ribbon: Active Briefs, Proposals Received, Secure Escrow Protection (100%), and Match SLA (< 18m).
    - Dynamic Project Radar with visual filter tabs ("All Briefs", "Awaiting Bids", "In Progress", "Archives") and live search filter.
    - Rich task cards featuring gross budget ranges, SLA deadlines, proposal status badges, and empty states with guided prompts.
  - **Next-Gen Expert Cockpit (`/opportunities`):**
    - High-frequency Wall Street / Terminal-caliber header with Live Stream indicator.
    - Live Market Intelligence Ribbon: Available Bounty Pool ($), Live Open Briefs, 85% Specialist Net Payout, and Urgent (<24h) opportunities.
    - Search bar, category filters, and quick filter pills (`[All]`, `[💎 High Budget]`, `[🤝 Managed Tasks]`, `[Unbid Briefs]`).
    - Terminal-caliber opportunity cards with automated Net Take-Home calculator (e.g. $200 -> $170 Net), attached document badges, and "Calculate & Bid" action.

---

## 3. Production Verification & Test Results
- **TypeScript Typecheck (`npm --prefix frontend run typecheck`):**
  - `@hem/admin`: **0 errors**.
  - `@hem/web`: **0 errors**.
  - `@hem/ui`: **0 errors**.
- **Frontend Test Suite (`npm --prefix frontend test -- --run`):**
  - **25 / 25 test files passed** (100%).
  - **143 / 143 tests passed** (100%).
- **Backend Test Suite (`pytest backend`):**
  - **439 / 439 tests passed** (100%).
  - All business rules (BR-01 through BR-25) verified.
- **HTTP Route Verification (all HTTP 200 OK):**
  - `http://localhost:3000/` -> 200 OK
  - `http://localhost:3000/login` -> 200 OK
  - `http://localhost:3000/register` -> 200 OK
  - `http://localhost:3000/requests` -> 200 OK (Next-Gen Student Dashboard)
  - `http://localhost:3000/opportunities` -> 200 OK (Next-Gen Expert Cockpit)
  - `http://localhost:3000/orders` -> 200 OK
  - `http://localhost:3000/messages` -> 200 OK
  - `http://localhost:3001/portal` -> 200 OK
  - `http://localhost:3001/portal/dispatch` -> 200 OK
  - `http://localhost:3001/portal/disputes` -> 200 OK
  - `http://localhost:3001/portal/experts` -> 200 OK
  - `http://localhost:3001/portal/finance` -> 200 OK

---

## 4. Environment, Service Registry & Demo Credentials
- **Backend API:** `http://localhost:8000` (Django 5.x)
- **Web App (Consumer Marketplace):** `http://localhost:3000` (`frontend/apps/web`)
  - Start command: `npm --workspace=@hem/web run dev` or `npm --prefix frontend run dev:web`
- **Admin App (Operations Console):** `http://localhost:3001` (`frontend/apps/admin`)
  - Start command: `npm --workspace=@hem/admin run dev` or `npm --prefix frontend run dev:admin`
- **Shared UI Package:** `@hem/ui` (`frontend/packages/ui`)

### Seed / Demo Accounts:
- **Student Account:** `student@example.com` / `password123`
- **Specialist / Expert Account:** `expert@example.com` / `password123`
- **Platform Operations / Owner Account:** `admin@example.com` / `password123` (Access to `http://localhost:3001/portal`)

