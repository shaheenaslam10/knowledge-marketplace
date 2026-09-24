from django.urls import path

from apps.messaging.api import report_views

urlpatterns = [
    path(
        "me/messages/<uuid:message_id>/report",
        report_views.MessageReportView.as_view(),
        name="message-report",
    ),
]
