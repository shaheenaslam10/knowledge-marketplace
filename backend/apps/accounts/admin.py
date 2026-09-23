"""Django admin for user/account management (docs/product/user-roles.md).

Role management = is_staff flags + Django groups (`support`, `admin`) — the
documented path for future moderation/finance/operations roles.
"""

from __future__ import annotations

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import BaseUserCreationForm, UserChangeForm

from apps.accounts.models import User
from apps.accounts.tasks import enqueue_email


class ManagedUserCreationForm(BaseUserCreationForm):
    """Creation form honouring USERNAME_FIELD=email + our name field.

    (auth's concrete forms bind Meta.model to the default User — rebind.)"""

    class Meta(BaseUserCreationForm.Meta):
        model = get_user_model()
        fields = ("email", "name")


class ManagedUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = get_user_model()
        fields = "__all__"


@admin.action(description="Activate selected accounts")
def activate_users(modeladmin, request, queryset):
    updated = queryset.update(is_active=True)
    modeladmin.message_user(request, f"{updated} account(s) activated.")


@admin.action(description="Deactivate selected accounts")
def deactivate_users(modeladmin, request, queryset):
    if request.user in queryset:
        modeladmin.message_user(request, "You cannot deactivate your own account.", level=30)
        return
    updated = queryset.update(is_active=False)
    modeladmin.message_user(request, f"{updated} account(s) deactivated.")


@admin.action(description="Resend verification email")
def resend_verification(modeladmin, request, queryset):
    count = 0
    for user in queryset.filter(email_verified_at__isnull=True, is_active=True):
        enqueue_email("apps.accounts.tasks.send_verification_email", user.pk)
        count += 1
    modeladmin.message_user(request, f"{count} verification email(s) queued.")


@admin.register(User)
class ManagedUserAdmin(BaseUserAdmin):
    ordering = ("-created_at",)
    add_form = ManagedUserCreationForm
    list_display = (
        "email",
        "name",
        "is_active",
        "is_verified",
        "is_staff",
        "date_joined_display",
        "last_login",
    )
    list_filter = ("is_active", "is_staff", "is_superuser", "groups", "locale")
    search_fields = ("email", "name")
    readonly_fields = (
        "created_at",
        "updated_at",
        "last_login",
        "last_login_ip",
        "email_verified_at",
    )
    actions = [activate_users, deactivate_users, resend_verification]
    filter_horizontal = ("groups", "user_permissions")

    fieldsets = (
        (None, {"fields": ("email", "name", "password")}),
        (
            "Account status",
            {
                "fields": (
                    "is_active",
                    "email_verified_at",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Profile", {"fields": ("timezone", "locale")}),
        (
            "Audit",
            {
                "fields": ("last_login", "last_login_ip", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "name", "password1", "password2")}),
    )

    @admin.display(description="Joined")
    def date_joined_display(self, obj):
        return obj.created_at

    def get_fieldsets(self, request, obj=None):
        if not obj:
            return self.add_fieldsets
        return super().get_fieldsets(request, obj)

    def save_model(self, request, obj, form, change):
        # Mirror the admin auth form: editing the user refreshes the hash
        # invalidator only when the password changed (default behaviour kept).
        super().save_model(request, obj, form, change)
