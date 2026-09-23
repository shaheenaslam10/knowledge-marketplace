# Authentication & Authorization

> Status: 📐 Phase 0 · Last updated: 2026-09-23 · Related: [security](security.md), [user-roles](../product/user-roles.md)

## Authentication design (ADR-0004)

- **Method:** email + password (Argon2id). JWT pair via **SimpleJWT** — short-lived access (15 min) + rotating refresh (7 days), **delivered as httpOnly, Secure, SameSite=Lax cookies** (`hm_access`, `hm_refresh`). JS never sees tokens (XSS cannot exfiltrate a session).
- Same registrable domain for frontend and API in prod (`app.example.com` / `api.example.com`) so Lax cookies flow on XHR and cross-site CSRF is structurally blocked; CORS allowlist pins exact origins.
- **Refresh rotation + blacklisting**: every refresh invalidates the used token; reuse detection kills the whole session family (stolen-token signal). Logout blacklists refresh. Password change/reset blacklists all user tokens.
- Email verification gate: verified email required for posting/offers/messaging (BR-01); tokens single-use, 24h expiry.
- Password reset: single-use token, all sessions invalidated on success.
- Social OAuth (Google): designed-for (auth backend swap behind `accounts.services`), deliberately deferred (post-MVP).
- Admin/staff: same JWT flow + `is_staff`; Django admin additionally protected by its own session + optional IP allowlist env.

## API authorization model

Three stacked checks (deny-by-default):

1. **IsAuthenticated** unless endpoint is explicitly public.
2. **Role permissions** — DRF permission classes: `IsStudent`, `IsExpert` (approved), `IsAdminStaff`, composed (`IsStudent & IsRequestOwner`).
3. **Object-level scoping** — every queryset starts from `request.user` reachability (`selectors.py`): a student's `/orders/{id}` 404s unless participant/admin (404 not 403 — no existence leak).

Frontend route guards are UX only; the API is the security boundary.

## Admin/staff authorization

- Django groups `support` / `admin` per the matrix in [user-roles](../product/user-roles.md); model-level permissions + guarded admin actions.
- Sensitive admin actions (refund, payout run, force-complete, user ban) are separate **admin action functions** requiring confirmation interstitial and writing audit entries with before/after.

## Machine-to-machine

- Stripe webhooks: signature verification (STRIPE_WEBHOOK_SECRET), no session.
- Health endpoints: public, minimal info.

## Rate limiting & lockouts

- DRF throttles per scope (anon/auth/auth-token/login: 10/min/IP).
- Login: exponential backoff per account+IP (cache-backed counters) + generic error messages (no user enumeration).
- Registration: email verify within 72h else cleanup job removes unverified accounts.

## Session lifecycle summary

| Event | Access | Refresh | Other sessions |
|---|---|---|---|
| Login | set | set (rotation family) | unaffected |
| Access expiry (15 min) | client auto-refreshes once | rotated | |
| Refresh reuse detected | killed | family revoked | all revoked |
| Logout | cleared | blacklisted | unaffected |
| Password reset/change | cleared | all user tokens blacklisted | logged out |
