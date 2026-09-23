from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    verbose_name = "Accounts & roles"

    def ready(self):
        # Registers the cookie-auth drf-spectacular extension (OpenAPI).
        from .api import schema  # noqa: F401
