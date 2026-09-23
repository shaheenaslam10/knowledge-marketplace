"""Sub-resources under /me/ (the /me and /me/deactivate roots live directly
in config.api — direct paths avoid APPEND_SLASH masking, see Phase 2)."""

from django.urls import path

from apps.accounts.api import student_views

urlpatterns = [
    path("student-profile", student_views.StudentProfileView.as_view(), name="student-profile"),
]
