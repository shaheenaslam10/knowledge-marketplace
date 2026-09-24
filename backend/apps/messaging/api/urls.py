from django.urls import path

from apps.messaging.api import views

urlpatterns = [
    path("me/threads", views.MyThreadListView.as_view(), name="my-threads"),
    path("me/threads/open", views.ThreadContextOpenView.as_view(), name="thread-open"),
    path("me/threads/<uuid:thread_id>", views.MyThreadDetailView.as_view(), name="my-thread"),
    path(
        "me/threads/<uuid:thread_id>/messages",
        views.MyThreadMessageCreateView.as_view(),
        name="thread-message",
    ),
    path("me/threads/<uuid:thread_id>/read", views.MyThreadReadView.as_view(), name="thread-read"),
]
