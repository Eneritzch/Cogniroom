from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView  # noqa: F401

from .models import Institution
from .serializers import (
    InstitutionSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
    tokens_for_user,
)


class InstitutionListView(APIView):
    """Catálogo de instituciones activas para el select del estudiante."""

    permission_classes = [AllowAny]

    def get(self, request):
        institutions = Institution.objects.filter(is_active=True)
        return Response(InstitutionSerializer(institutions, many=True).data)


class ResolveTeacherCodeView(APIView):
    """Resuelve un código de docente a su institución. Alimenta el autocompletado
    del campo bloqueado en el registro. No revela qué códigos existen: cualquier
    código no válido devuelve 404."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        code = (request.data.get('code') or '').strip().upper()
        if not code:
            return Response(
                {'detail': 'Ingresá un código.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        institution = Institution.objects.filter(
            teacher_code=code, is_active=True,
        ).first()
        if not institution:
            return Response(
                {'detail': 'Código de docente inválido.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(InstitutionSerializer(institution).data)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = tokens_for_user(user)
        return Response(
            {'user': UserSerializer(user).data, 'tokens': tokens},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        tokens = tokens_for_user(user)
        return Response({'user': UserSerializer(user).data, 'tokens': tokens})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh = request.data.get('refresh')
        if not refresh:
            return Response(
                {'detail': 'Refresh token requerido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            RefreshToken(refresh).blacklist()
        except TokenError:
            return Response(
                {'detail': 'Token inválido o ya revocado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
