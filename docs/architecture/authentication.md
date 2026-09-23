# Authentication & Authorization

> Status: ✅ **Phase 2 implemented** · Last updated: 2026-09-23 · Related: [security](security.md), [user-roles](../product/user-roles.md), [api](api.md)

## User model (ADR-0001, implemented Phase 2)

`apps.accounts.User` (`AUTH_USER_MODEL = "accounts.User"`) — created **before** any dependent domain migration:

| Field | Notes |
|---|---|
| `email` | `USERNAME_FIELD`, unique, normalized lowercase; no username |
| `name` | display name (2–150 chars) |
| `is_active` | deactivation switch — checked **per request** (see below) |
| `is_staff` | explicit field (PermissionsMixin does not provide it) |
| `is_superuser` | via PermissionsMixin |
| `email_verified_at` | null = unverified; `verified` is derived, never stored as a role row |
| `timezone`, `locale` | profile state (`PATCH /api/v1/me`) |
| `last_login_ip` | audit, set on login |
| `created_at`, `updated_at` | via shared `TimeStampedModel` (`apps.core.models`) |

Password hashing is **Argon2id-first** (`PASSWORD_HASHERS`, PBKDF2 fallbacks for legacy). Password floor: 10 chars via `MinimumLengthValidator` **and** an independent serializer-level `MinLength10` (enforced even if validator config changes) + Django similarity/common/numeric validators. Test settings swap to MD5 for speed; a contract test asserts the real config and that no stored password is ever plaintext.

## Roles & authorization matrix

Roles are **state, not rows**: every account can be a student (BR-01); staff roles are Django groups + `is_staff`. `get_roles(user)` returns the canonical dict used by `/api/v1/me` and the frontend:

```json
{"student": true, "verified": false, "staff": false, "support": false, "admin": false, "expert": false}
```

- `student` — always true (BR-01); `verified` — `email_verified_at` set; `staff` — `is_staff`;
- `support` / `admin` — Django groups (`support`, `admin`) or superuser; `admin` also requires `is_staff`|superuser;
- `expert` — ✅ registered in Phase 3: `true` iff the user's `ExpertApplication.status == approved` (suspension flips it off; BR-04). The registry stays the extension point for future roles.

DRF permission classes (`apps.accounts.permissions`): `IsAdmin`, `IsSupport`, `IsExpert`, `IsVerified`. Global default is **deny-by-default** (`DEFAULT_PERMISSION_CLASSES = IsAuthenticated`); endpoints opt into `AllowAny` explicitly. Object-level scoping (404-not-403 ownership) is the standing rule for every domain selector from Phase 3 on; `/api/v1/me` is inherently owner-scoped.

Frontend route guards are UX only; the API is the security boundary.

## Authentication flow (ADR-0004, implemented)

- **Method:** email + password. **SimpleJWT**: access **15 min** (`JWT_ACCESS_MINUTES`) + refresh **7 days** (`JWT_REFRESH_DAYS`), `ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION` + `UPDATE_LAST_LOGIN` enabled.
- **Transport:** tokens live **only** in `httpOnly`, `SameSite=Lax` cookies `hm_access` / `hm_refresh` (`Secure` when `COOKIE_SECURE=True`, mandatory in prod). Response bodies never carry tokens; JS never reads them.
- Cookie-first authentication (`CookieJWTAuthentication` → `Bearer` fallback for scripts/tests). `ActiveUserJWTAuthentication` re-checks `is_active` **on every request**, so a deactivated account's unexpired access token dies immediately; refresh/login likewise refuse inactive users.
- **Refresh:** rotation + blacklist; reuse of a rotated refresh → `401 token_invalid`.
- **Logout:** blacklists the presented refresh (idempotent, anonymous-safe) and clears both cookies. The outstanding access token remains valid ≤ its TTL — stateless-JWT trade-off, mitigated by the short 15-min life and per-request `is_active`.
- **Password change / reset:** blacklists **all** outstanding refresh tokens for the user (all devices sign out).
- **CSRF:** JWT cookies are not session cookies (no automatic ambient auth for classic form posts); DRF views are CSRF-exempt by default and auth is header/cookie-token-based. Session auth is not enabled for `/api/`. `SameSite=Lax` blocks cross-site cookie sends; CORS pins exact origins.
- **No credentials in logs:** log lines carry `user_id` only — never tokens, passwords, or cookies (enforced by writing explicit `logger.info` calls, e.g. `login user_id=42`).

### Endpoints (`/api/v1/auth/*`, `/api/v1/me`)

| Endpoint | Auth | Behavior |
|---|---|---|
| `POST /auth/register` | public | creates account (student role), queues verification email, auto-login via cookies. **Enumeration-safe:** existing email → identical `201` + re-verification to the owner |
| `POST /auth/token` | public | login → cookies; generic `401 invalid_credentials`; records `last_login_ip` |
| `POST /auth/token/refresh` | cookie/body | rotate + blacklist; inactive user → `401 token_invalid` |
| `POST /auth/logout` | public (idempotent) | blacklist refresh + clear cookies |
| `POST /auth/verify-email` | public | signed token (24 h, bound to verified-state; single-use, idempotent) |
| `POST /auth/resend-verification` | authed | rate-limited; only for unverified accounts |
| `POST /auth/password/reset` | public | **always identical response** (no account oracle) |
| `POST /auth/password/reset/confirm` | public | `uidb64` + `DEFAULT_TOKEN_GENERATOR` (3-day `PASSWORD_RESET_TIMEOUT`, invalidated by password change); single-use; kills all sessions |
| `POST /auth/password/change` | authed | verifies current password; kills all sessions |
| `GET/PATCH /me` | authed | profile + roles; owner-scoped by construction |
| `POST /me/deactivate` | authed | self-service `is_active=False` + token blacklist |

All errors use the uniform envelope `{"error": {code, message, details}}` (401 `not_authenticated` / `invalid_credentials` / `token_invalid`, 403 `permission_denied`, 429 `throttled`).

## Email verification & password reset mechanics

- Verification: `django.core.signing.dumps({"uid", "verified"}, salt="accounts.email_verification")`, **TTL 24 h**, single-use because the payload binds the verified-state at send time; re-verify is idempotent. Emails are enqueued via **django-q2** (`send_verification_email` / `send_password_reset_email`) and render to console in dev (`EMAIL_BACKEND_MODE=console`).
- Reset: Django's salted token generator + `uidb64`; 3-day timeout; any password change invalidates outstanding tokens automatically.

## Admin & staff

- Django admin (`/admin/`, `ADMIN_URL` configurable): `ManagedUserAdmin` with search/filter by status/role, guarded activate/deactivate actions, and a password-change form that never displays hashes.
- Admin/staff use the same JWT flow; the admin site additionally keeps its own Django session.
- Sensitive future admin actions (refund, payout, ban) remain documented as guarded action functions with audit entries (phases 5+).

## Machine-to-machine

- Payment-gateway webhooks: signature verification, no session (Phase 5+).
- Health endpoints (`/healthz`, `/readyz`): public, minimal info.

## Rate limiting

- DRF `ScopedRateThrottle` scope **`auth` = 10/min per IP** (`THROTTLE_AUTH`) on register / login / refresh / verify / resend / reset / change. Generic scopes: `anon` 30/min, `user` 120/min (`THROTTLE_ANON` / `THROTTLE_USER`). Exceeded → `429 throttled` envelope.
- Per-account exponential login backoff and the 72-h unverified-account cleanup job are **designed but not yet implemented** (Phase 2 scope: correct primitives first — throttling + enumeration-safe responses). Tracked for a later hardening pass.

## WebSocket auth (compatibility)

`apps.accounts.ws.JWTAuthMiddleware` authenticates the Channels scope from the `hm_access` cookie; garbage/expired tokens or inactive users resolve to `AnonymousUser` (endpoints decide policy). Origin checking stays explicit (`OriginValidator` + allowlist derived from `FRONTEND_URL`/`CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS` — http/https twins). `/ws/whoami/` echoes the resolved auth state (proof surface).

## Session lifecycle summary (as implemented)

| Event | Access | Refresh | Other sessions |
|---|---|---|---|
| Login | set | set | unaffected |
| Access expiry (15 min) | client auto-refreshes once | rotated | |
| Refresh reuse detected | — | rejected `401 token_invalid` (old already blacklisted) | family revocation = future hardening |
| Logout | cookie cleared | blacklisted | unaffected |
| Password reset/change | cookie cleared | **all** user tokens blacklisted | logged out |
| Deactivation | dead on next request (per-request `is_active`) | blacklisted | — |

## Demo accounts (`seed_demo`, dev/test only)

`python manage.py seed_demo` creates `admin@demo.local` (superuser, `DJANGO_SEED_ADMIN_PASSWORD`, default `admin-demo-1234`), `student@demo.local` and `expert@demo.local` (`DJANGO_SEED_DEMO_PASSWORD`, default `demo-password-1234`). Guarded to DEBUG/test unless `--force`; **never** real credentials and never production defaults. Domain demo data arrives with Phases 3+.
