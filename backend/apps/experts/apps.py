"""Experts AppConfig — registers the `expert` role provider (Phase 2 seam)."""

from django.apps import AppConfig


class ExpertsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.experts"
    verbose_name = "Experts (profiles, applications, directory)"

    def ready(self):
        from apps.accounts.services import register_role_provider

        from .roles import is_expert

        register_role_provider("expert", is_expert)
