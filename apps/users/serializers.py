from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'institution', 'first_name', 'last_name']
        read_only_fields = ['id']


class RegisterSerializer(serializers.ModelSerializer):
    # El auto-registro público solo permite student/teacher; coordinator se crea
    # por admin/seed para no exponer un rol con permisos transversales.
    PUBLIC_ROLE_CHOICES = [
        (User.ROLE_STUDENT, 'Student'),
        (User.ROLE_TEACHER, 'Teacher'),
    ]

    password = serializers.CharField(write_only=True, validators=[validate_password])
    role = serializers.ChoiceField(choices=PUBLIC_ROLE_CHOICES, default=User.ROLE_STUDENT)
    # Solo se exige cuando role == teacher. write_only: nunca se devuelve.
    teacher_code = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'role', 'teacher_code',
            'institution', 'first_name', 'last_name',
        ]
        extra_kwargs = {
            'institution': {'required': False, 'allow_blank': True},
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False},
        }

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Ya existe una cuenta con este correo.')
        return value

    def validate_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('Este nombre de usuario ya está en uso.')
        return value

    def validate(self, attrs):
        # El rol docente nunca se confía del cliente: exige el código de invitación.
        # Multi-institución futura: reemplazar la comparación contra el secreto
        # único por una búsqueda de Institution por código.
        code = (attrs.pop('teacher_code', '') or '').strip()
        if attrs.get('role') == User.ROLE_TEACHER:
            expected = settings.TEACHER_SIGNUP_CODE
            if not expected:
                raise serializers.ValidationError(
                    {'teacher_code': 'El registro de docentes no está habilitado. Contactá a tu institución.'}
                )
            if code != expected:
                raise serializers.ValidationError(
                    {'teacher_code': 'Código de docente inválido.'}
                )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError('Invalid credentials.')

        user_auth = authenticate(username=user.username, password=password)
        if not user_auth:
            raise serializers.ValidationError('Invalid credentials.')

        attrs['user'] = user_auth
        return attrs


def tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }
