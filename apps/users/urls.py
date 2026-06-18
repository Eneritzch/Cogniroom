from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    InstitutionListView,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
    ResolveTeacherCodeView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('institutions/', InstitutionListView.as_view(), name='auth-institutions'),
    path('teacher-code/resolve/', ResolveTeacherCodeView.as_view(), name='auth-teacher-code-resolve'),
]
