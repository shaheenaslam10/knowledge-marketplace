"""Cursor pagination defaults (docs/architecture/api.md)."""

from rest_framework.pagination import CursorPagination


class DefaultCursorPagination(CursorPagination):
    """Stable, offset-free pagination for feeds that grow (offers, messages…).

    Views override ``ordering`` to match their queryset.
    """

    page_size = 20
    max_page_size = 100
    page_size_query_param = "page_size"
    ordering = "-created_at"
