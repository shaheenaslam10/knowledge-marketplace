# Development Workflow

> Status: 📐 Phase 0 · Last updated: 2026-09-23

## The mandated loop

**Inspect → Plan → Document → Architecture Review → Phase Definition → Implement → Test → Document → Commit → Push**

Per phase:
1. Docs for the phase's features are updated/extended **before or with** the code (same commit set, never later).
2. Implementation follows [roadmap-phases.md](roadmap-phases.md) acceptance criteria.
3. Tests green locally + CI.
4. `docker compose up` proof — "runs locally after each major phase" is a hard gate.
5. Logical commits (feat/fix/docs/test/chore prefixes, e.g. `feat(orders): delivery + revision flow (Phase 7)`) pushed to the working branch; phase completion = a coherent, pullable state with an implementation summary.

## Branching

- Work happens on the assigned working branch (`arena/01a0cd90-knowledge-marketplace` for this engagement); mergeable to `main` per owner.
- No long-lived feature branches needed for solo-agent flow; commits are the unit of review.

## Doc-sync rules (enforced)

| Change | Requires (same phase) |
|---|---|
| New/changed env var | environments.md + `.env.example` (+ CI name-check script) |
| New external service | costs.md entry + integrations.md + ADR |
| Business rule change | business-rules.md BR entry + tests |
| State/enum change | database.md + workflow doc + migration |
| New endpoint | api.md catalog + OpenAPI schema |
| Deviation from an ADR | new ADR superseding it + system docs touch-up |
| New infra constraint | system-architecture.md + deployment.md |

PR/commit template reminder: "Docs updated? Which BR/ADR/phase?"

## Definition of Done (any feature)

Code + tests + docs + seed/demo affordance + local-run proof + committed/pushed. "Important files exist only in Arena" = not done.

## Quality gates (CI)

ruff + import-linter + `makemigrations --check` + pytest (coverage gates) + frontend lint/typecheck/build + OpenAPI snapshot diff + Playwright E2E on app-code PRs + dependency audits. See [testing](../architecture/testing.md).
