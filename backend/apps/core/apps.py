from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    verbose_name = "Core (shared kernel)"

    def ready(self):
        # Registers the `production` system checks (Phase 12 deploy gate).
        from apps.core import checks  # noqa: F401
