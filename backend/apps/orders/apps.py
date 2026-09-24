from django.apps import AppConfig


class OrdersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.orders"

    def ready(self) -> None:
        # Listen for payments.payment_confirmed (ADR-0005 amendment): the
        # receiver imports this app's services — never the reverse.
        from apps.orders import payment_hooks  # noqa: F401
