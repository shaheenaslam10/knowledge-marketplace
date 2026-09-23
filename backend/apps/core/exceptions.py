"""Domain errors + the uniform API error envelope.

Envelope contract (docs/architecture/backend.md, consumed by the frontend's
`lib/api/client.ts`)::

    {"error": {"code": "machine_readable_code", "message": "human readable", "details": {...}}}

Services raise DomainError subclasses; views never format errors themselves.
"""

from __future__ import annotations

import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_base_exception_handler

logger = logging.getLogger(__name__)


class DomainError(Exception):
    """Base class for expected, well-described domain failures."""

    status_code = 400
    default_code = "domain_error"
    default_message = "Request could not be completed."

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        details: dict | None = None,
        status_code: int | None = None,
    ):
        super().__init__(message or self.default_message)
        self.code = code or self.default_code
        self.details = details or {}
        if status_code is not None:
            self.status_code = status_code


class NotFoundError(DomainError):
    status_code = 404
    default_code = "not_found"
    default_message = "Resource not found."


class PermissionDeniedError(DomainError):
    status_code = 403
    default_code = "permission_denied"
    default_message = "You do not have permission to perform this action."


class ConflictError(DomainError):
    """Illegal state transition / concurrency conflict (docs: 409)."""

    status_code = 409
    default_code = "conflict"
    default_message = "This action conflicts with the current state."


def _envelope(code: str, message: str, details: dict | None = None) -> dict:
    return {"error": {"code": code, "message": message, "details": details or {}}}


def drf_exception_handler(exc, context):
    """Wrap every error into the uniform envelope; unexpected errors become 500s."""
    # DomainError is not an APIException, so the base handler ignores it —
    # respond directly with the envelope.
    if isinstance(exc, DomainError):
        return Response(_envelope(exc.code, str(exc), exc.details), status=exc.status_code)

    response = drf_base_exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled exception", exc_info=exc)
        return None  # let Django/DRF produce the standard 500 (generic, no leak)

    code = "error"
    data = response.data
    if isinstance(data, dict):
        details: dict = dict(data)
        code = {
            400: "validation_error",
            401: "not_authenticated",
            403: "permission_denied",
            404: "not_found",
            405: "method_not_allowed",
            429: "throttled",
        }.get(response.status_code, "error")
        # flatten DRF's single "detail" shape into the message
        if set(details.keys()) == {"detail"}:
            details = {}
            message = str(data["detail"])
        else:
            message = (
                "Validation failed."
                if response.status_code == 400
                else str(data.get("detail", "Error."))
            )
    elif isinstance(data, list):
        details = {"non_field_errors": data}
        message = str(data[0]) if data else "Error."
    else:
        details = {}
        message = str(data)

    response.data = _envelope(code, message, details)
    return response
