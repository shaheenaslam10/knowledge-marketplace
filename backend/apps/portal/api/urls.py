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
    path("ops/disputes/", views.DisputeQueueView.as_view(), name="ops-disputes-slash"),
    path(
        "ops/disputes/<uuid:pk>/resolve",
        views.DisputeResolveView.as_view(),
        name="ops-dispute-resolve",
    ),
    path(
        "ops/disputes/<uuid:pk>/resolve/",
        views.DisputeResolveView.as_view(),
        name="ops-dispute-resolve-slash",
    ),
    path("ops/audit", views.AuditViewerView.as_view(), name="ops-audit"),
    path("ops/config", views.PlatformConfigView.as_view(), name="ops-config"),
    path("ops/reconciliation", views.ReconciliationView.as_view(), name="ops-reconciliation"),
    path("ops/users", views.UsersOverviewView.as_view(), name="ops-users"),
    path("ops/finance/ledger", views.LedgerExplorerView.as_view(), name="ops-finance-ledger"),
    path(
        "ops/finance/ledger/", views.LedgerExplorerView.as_view(), name="ops-finance-ledger-slash"
    ),
    path(
        "ops/finance/ledger/export-csv",
        views.LedgerExportCsvView.as_view(),
        name="ops-finance-ledger-export-csv",
    ),
    path(
        "ops/finance/ledger/export-csv/",
        views.LedgerExportCsvView.as_view(),
        name="ops-finance-ledger-export-csv-slash",
    ),
    path("ops/payouts", views.OpsPayoutListView.as_view(), name="ops-payouts"),
    path("ops/payouts/", views.OpsPayoutListView.as_view(), name="ops-payouts-slash"),
    path("ops/payouts/<int:payout_id>/settle", views.OpsPayoutSettleView.as_view(), name="ops-payout-settle"),
    path("ops/payouts/<int:payout_id>/settle/", views.OpsPayoutSettleView.as_view(), name="ops-payout-settle-slash"),
]
