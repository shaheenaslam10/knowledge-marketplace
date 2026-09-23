from django.urls import path

from apps.assignments.api import views

urlpatterns = [
    path("me/pool-invitations", views.MyInvitationListView.as_view(), name="my-invitations"),
    path(
        "me/pool-invitations/<uuid:pk>/accept",
        views.InvitationAcceptView.as_view(),
        name="invitation-accept",
    ),
    path(
        "me/pool-invitations/<uuid:pk>/decline",
        views.InvitationDeclineView.as_view(),
        name="invitation-decline",
    ),
    path("me/assignments", views.MyAssignmentListView.as_view(), name="my-assignments"),
    path(
        "me/assignments/<uuid:pk>/accept",
        views.AssignmentAcceptView.as_view(),
        name="assignment-accept",
    ),
    path(
        "me/assignments/<uuid:pk>/decline",
        views.AssignmentDeclineView.as_view(),
        name="assignment-decline",
    ),
]
