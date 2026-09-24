from django.urls import path

from apps.notifications.api import views

urlpatterns = [
    path("me/notifications", views.MyNotificationListView.as_view(), name="my-notifications"),
    path(
        "me/notifications/read-all",
        views.MyNotificationReadAllView.as_view(),
        name="my-notifications-read-all",
    ),
    path(
        "me/notifications/<uuid:notification_id>/read",
        views.MyNotificationReadView.as_view(),
        name="my-notification-read",
    ),
    path(
        "me/notification-preferences",
        views.MyNotificationPreferencesView.as_view(),
        name="my-notification-preferences",
    ),
]
