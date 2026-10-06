#!/usr/bin/env bash
#
# Post-deploy smoke verification (docs/architecture/deployment.md).
#
#   scripts/smoke_test.sh --api https://api.example.com --web https://app.example.com
#
# Answers one question: did this deploy produce a working, correctly-secured
# system? It is the gate between "containers started" and "declare success",
# and the same script runs from the deploy host and from CI after a release.
#
# Every check is an assertion about behaviour a user depends on, not a ping.
set -uo pipefail

API_URL=""
WEB_URL=""
EXPECT_ENFORCED_CSP=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api) API_URL="${2:?}"; shift 2 ;;
    --web) WEB_URL="${2:?}"; shift 2 ;;
    --allow-report-only-csp) EXPECT_ENFORCED_CSP=0; shift ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$API_URL" && -n "$WEB_URL" ]] || { echo "usage: $0 --api URL --web URL" >&2; exit 2; }

API_URL="${API_URL%/}"
WEB_URL="${WEB_URL%/}"
PASS=0
FAIL=0

ok()   { printf '  \033[32mPASS\033[0m  %s\n' "$1"; PASS=$((PASS + 1)); }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; FAIL=$((FAIL + 1)); }
note() { printf '\n== %s\n' "$1"; }

check() { # check <description> <command...>
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then ok "$desc"; else bad "$desc"; fi
}

body() { curl -sS --max-time 20 "$@"; }
headers() { curl -sS --max-time 20 -o /dev/null -D - "$@" | tr -d '\r'; }
status() { curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "$@"; }

note "Availability"
[[ "$(status "$API_URL/healthz")" == "200" ]] && ok "API /healthz is 200" || bad "API /healthz is not 200"
[[ "$(status "$API_URL/readyz")" == "200" ]]  && ok "API /readyz is 200 (migrations applied)" || bad "API /readyz is not 200 — migrations pending?"
[[ "$(status "$WEB_URL/")" == "200" ]]        && ok "Web root is 200" || bad "Web root is not 200"

note "Database connectivity (health probe reports it)"
# NB: capture, then match. Piping curl into `grep -q` makes grep close the pipe
# on first match, curl dies of SIGPIPE, and pipefail turns a PASS into a FAIL.
HEALTH_BODY="$(body "$API_URL/healthz")"
grep -q '"database": *true' <<<"$HEALTH_BODY" \
  && ok "health probe reports database reachable" \
  || bad "health probe does NOT report a reachable database"

note "API contract"
ROOT_BODY="$(body "$API_URL/api/v1/")"
grep -q "Hybrid Expert Marketplace API" <<<"$ROOT_BODY" \
  && ok "API root serves the expected payload" || bad "API root payload unexpected"
SCHEMA_BODY="$(body "$API_URL/api/schema/" -H "Accept: application/json")"
grep -q openapi <<<"$SCHEMA_BODY" \
  && ok "OpenAPI schema is served" || bad "OpenAPI schema missing"

note "Transport security"
API_HEADERS="$(headers "$API_URL/healthz")"
WEB_HEADERS="$(headers "$WEB_URL/")"
grep -qi '^strict-transport-security:' <<<"$WEB_HEADERS" \
  && ok "HSTS present on web" || bad "HSTS missing on web"
grep -qi '^x-content-type-options: *nosniff' <<<"$WEB_HEADERS" \
  && ok "X-Content-Type-Options: nosniff" || bad "nosniff missing"
grep -qi '^referrer-policy:' <<<"$WEB_HEADERS" \
  && ok "Referrer-Policy present" || bad "Referrer-Policy missing"

note "Content-Security-Policy (audit F-2 / ADR-0017)"
CSP_LINE="$(grep -i '^content-security-policy:' <<<"$WEB_HEADERS" || true)"
RO_LINE="$(grep -i '^content-security-policy-report-only:' <<<"$WEB_HEADERS" || true)"
if [[ "$EXPECT_ENFORCED_CSP" -eq 1 ]]; then
  [[ -n "$CSP_LINE" ]] && ok "CSP is ENFORCING" || bad "CSP is not enforcing (found report-only: ${RO_LINE:0:60})"
else
  [[ -n "$CSP_LINE" || -n "$RO_LINE" ]] && ok "CSP present (report-only accepted)" || bad "no CSP at all"
fi
ACTIVE_CSP="${CSP_LINE:-$RO_LINE}"
grep -q "nonce-" <<<"$ACTIVE_CSP" && ok "CSP carries a per-request nonce" || bad "CSP has no nonce"
SCRIPT_SRC="$(sed -n 's/.*script-src \([^;]*\).*/\1/p' <<<"$ACTIVE_CSP")"
grep -q "unsafe-inline" <<<"$SCRIPT_SRC" && bad "script-src still allows unsafe-inline" || ok "script-src forbids unsafe-inline"
grep -q "unsafe-eval"   <<<"$SCRIPT_SRC" && bad "script-src still allows unsafe-eval"   || ok "script-src forbids unsafe-eval"
# The nonce in the policy must authorise EVERY executable script in the
# document, on every document route.
#
# Sampling one route is not enough. A statically prerendered page is built
# without a request, so Next cannot stamp the per-request nonce onto its
# bootstrap scripts; the header is still perfect but the HTML no longer
# matches it, and under 'strict-dynamic' ('self' is ignored) the browser then
# refuses every chunk and the page ships with no JavaScript at all. That
# failure is invisible to a header-only check and to curl, which is how it
# reached a release gate once already — so probe an auth route and a marketing
# route too, not just the home page.
for ROUTE in "/" "/login" "/about"; do
  PAGE="$(body "$WEB_URL$ROUTE" -D /tmp/.smoke-h)"
  H_NONCE="$(tr -d '\r' < /tmp/.smoke-h | sed -n 's/.*nonce-\([A-Za-z0-9+/=]*\).*/\1/p' | head -1)"
  rm -f /tmp/.smoke-h
  if [[ -z "$H_NONCE" ]]; then
    bad "no nonce in policy for $ROUTE"
    continue
  fi
  # Executable scripts only — JSON-LD data blocks are never run, so
  # script-src does not gate them and they are deliberately un-nonced.
  TOTAL="$(grep -o '<script[^>]*>' <<<"$PAGE" | grep -cv 'application/ld+json')"
  NONCED="$(grep -o '<script[^>]*>' <<<"$PAGE" | grep -v 'application/ld+json' | grep -c "nonce=\"$H_NONCE\"")"
  if [[ "$TOTAL" -gt 0 && "$TOTAL" == "$NONCED" ]]; then
    ok "policy nonce authorises all $TOTAL scripts on $ROUTE"
  else
    bad "un-nonced scripts on $ROUTE ($NONCED/$TOTAL nonced) — is the route statically prerendered?"
  fi
done

note "Production hygiene"
grep -qi '^x-frame-options: *DENY' <<<"$WEB_HEADERS" && ok "X-Frame-Options: DENY" || bad "X-Frame-Options missing"
# DEBUG=True renders Django's yellow traceback page on a bad route.
NOT_FOUND_BODY="$(body "$API_URL/api/v1/__does_not_exist__")"
grep -qi "Traceback\|DJANGO_SETTINGS_MODULE" <<<"$NOT_FOUND_BODY" \
  && bad "DEBUG appears to be ON — traceback leaked" \
  || ok "no debug traceback on unknown API route"
[[ "$(status "$API_URL/api/v1/__does_not_exist__")" == "404" ]] \
  && ok "unknown API route returns 404 envelope" || bad "unknown API route is not 404"

note "Authentication boundary"
# Deny-by-default: an unauthenticated read of a protected endpoint must 401.
AUTH_CODE="$(status "$API_URL/api/v1/me")"
[[ "$AUTH_CODE" == "401" || "$AUTH_CODE" == "403" ]] \
  && ok "/api/v1/me refuses anonymous callers ($AUTH_CODE)" \
  || bad "/api/v1/me returned $AUTH_CODE for an anonymous caller"
OPS_CODE="$(status "$API_URL/api/v1/ops/kpis")"
[[ "$OPS_CODE" == "401" || "$OPS_CODE" == "403" || "$OPS_CODE" == "404" ]] \
  && ok "staff ops API refuses anonymous callers ($OPS_CODE)" \
  || bad "staff ops API returned $OPS_CODE for an anonymous caller"

note "Legal pages (launch requirement)"
for path in /terms /privacy /academic-integrity; do
  [[ "$(status "$WEB_URL$path")" == "200" ]] && ok "$path reachable" || bad "$path missing"
done

printf '\n%s\n' "------------------------------------------------------------"
printf 'smoke: %d passed, %d failed\n' "$PASS" "$FAIL"
[[ "$FAIL" -eq 0 ]] || { echo "SMOKE FAILED — roll back (scripts/rollback.sh)"; exit 1; }
echo "SMOKE PASSED"