from django.urls import path

from apps.accounts.api import views

urlpatterns = [
    path("", views.MeView.as_view(), name="me"),
    path("deactivate", views.DeactivateView.as_view(), name="me-deactivate"),
]
