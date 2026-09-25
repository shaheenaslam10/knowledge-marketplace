"""Request-ID correlation (docs/architecture/observability.md).

Every request/response carries X-Request-ID; all log lines within the request
are stamped with it via RequestIDFilter + a context variable.
"""

import contextvars
import logging
import uuid

_request_id: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

REQUEST_ID_HEADER = "X-Request-ID"


def get_request_id() -> str:
    return _request_id.get()


class RequestIDMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        rid = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex
        token = _request_id.set(rid)
        try:
            response = self.get_response(request)
        finally:
            _request_id.reset(token)
        response[REQUEST_ID_HEADER] = rid
        return response


class RequestIDFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id()
        return True


class SecurityHeadersMiddleware:
    """Content-Security-Policy / Permissions-Policy (Phase 11 audit F-2).

    Prod-only wiring (config/settings/prod.py MIDDLEWARE). CSP ships
    report-only by default (CSP_REPORT_ONLY=True) so the pre-launch sweep can
    promote it to enforcing via env without a deploy-code change. The Django
    admin path is exempt: django.contrib.admin relies on inline script
    attributes that a strict policy would break (documented in the audit).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        from django.conf import settings

        admin_prefix = f"/{getattr(settings, 'ADMIN_URL', 'admin/').lstrip('/')}"
        csp = getattr(settings, "SECURITY_HEADERS_CSP", "")
        if csp and not request.path.startswith(admin_prefix):
            if getattr(settings, "SECURITY_HEADERS_CSP_REPORT_ONLY", True):
                response["Content-Security-Policy-Report-Only"] = csp
            else:
                response["Content-Security-Policy"] = csp
        policy = getattr(settings, "SECURITY_HEADERS_PERMISSIONS_POLICY", "")
        if policy:
            response["Permissions-Policy"] = policy
        return response
