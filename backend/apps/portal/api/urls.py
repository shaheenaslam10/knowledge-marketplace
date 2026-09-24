from django.urls import path

from apps.portal.api import views

urlpatterns = [
    path("ops/kpis", views.KpiDashboardView.as_view(), name="ops-kpis"),
    path("ops/reports", views.ReportQueueView.as_view(), name="ops-reports"),
    path(
        "ops/reports/<int:report_id>/review",
        views.ReportReviewView.as_view(),
        name="ops-report-review",
    ),
    path("ops/disputes", views.DisputeQueueView.as_view(), name="ops-disputes"),
    path("ops/audit", views.AuditViewerView.as_view(), name="ops-audit"),
    path("ops/config", views.PlatformConfigView.as_view(), name="ops-config"),
    path("ops/reconciliation", views.ReconciliationView.as_view(), name="ops-reconciliation"),
    path("ops/users", views.UsersOverviewView.as_view(), name="ops-users"),
]
