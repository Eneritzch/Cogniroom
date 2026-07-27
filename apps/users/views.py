from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from apps.notifications.services import send_branded_email

from .models import Institution, User
from .serializers import (
    ChangePasswordSerializer,
    InstitutionSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UpdateMeSerializer,
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
                {'detail': 'Ingresa un código.'},
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

    def patch(self, request):
        serializer = UpdateMeSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # JWT es stateless: la sesión sigue válida tras el cambio.
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetRequestView(APIView):
    """Paso 1: el usuario pide el enlace con su correo. Responde igual exista o no
    la cuenta (anti-enumeración); si existe, envía el enlace con token de Django."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    GENERIC_MESSAGE = (
        'Si el correo corresponde a una cuenta, te enviamos un enlace para '
        'restablecer tu contraseña.'
    )

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            send_branded_email(
                user.email,
                title='Restablece tu contraseña',
                body=(
                    'Recibimos una solicitud para restablecer tu contraseña en '
                    'CogniRoom. Usa el botón para elegir una nueva. El enlace es '
                    'de un solo uso y caduca por seguridad. Si no fuiste tú, '
                    'ignora este correo: tu contraseña no cambia.'
                ),
                link=f'/app/reset-password/?uid={uid}&token={token}',
                action_label='Restablecer contraseña',
                eyebrow='Seguridad de la cuenta',
            )

        return Response({'detail': self.GENERIC_MESSAGE})


class PasswordResetConfirmView(APIView):
    """Paso 2: valida el enlace (uid + token) y fija la nueva contraseña."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'detail': 'Tu contraseña se actualizó. Ya puedes iniciar sesión.'}
        )
