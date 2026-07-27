from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Institution, User


class InstitutionSerializer(serializers.ModelSerializer):
    """Catálogo público para el select del estudiante y la resolución del código
    del docente. Nunca expone `teacher_code`."""

    class Meta:
        model = Institution
        fields = ['id', 'name']


class UserSerializer(serializers.ModelSerializer):
    institution = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'institution', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']

    def get_institution(self, obj):
        return obj.institution.name if obj.institution_id else ''


class RegisterSerializer(serializers.ModelSerializer):
    PUBLIC_ROLE_CHOICES = [
        (User.ROLE_STUDENT, 'Student'),
        (User.ROLE_TEACHER, 'Teacher'),
    ]

    password = serializers.CharField(write_only=True, validators=[validate_password])
    role = serializers.ChoiceField(choices=PUBLIC_ROLE_CHOICES, default=User.ROLE_STUDENT)
    teacher_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    institution = serializers.PrimaryKeyRelatedField(
        queryset=Institution.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    first_surname = serializers.CharField(write_only=True, max_length=150)
    second_surname = serializers.CharField(write_only=True, max_length=150)

    class Meta:
        model = User
        fields = [
            'email', 'password', 'role', 'teacher_code', 'institution',
            'first_name', 'first_surname', 'second_surname',
        ]
        extra_kwargs = {
            'first_name': {'required': True, 'allow_blank': False},
        }

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Ya existe una cuenta con este correo.')
        return value

    def validate(self, attrs):
        code = (attrs.pop('teacher_code', '') or '').strip().upper()
        if attrs.get('role') == User.ROLE_TEACHER:
            if not code:
                raise serializers.ValidationError(
                    {'teacher_code': 'Ingresa el código de docente provisto por tu institución.'}
                )
            institution = Institution.objects.filter(
                teacher_code=code, is_active=True,
            ).first()
            if not institution:
                raise serializers.ValidationError(
                    {'teacher_code': 'Código de docente inválido.'}
                )
            attrs['institution'] = institution
        elif not attrs.get('institution'):
            raise serializers.ValidationError(
                {'institution': 'Selecciona tu institución.'}
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        first_surname = validated_data.pop('first_surname').strip()
        second_surname = validated_data.pop('second_surname').strip()
        first_name = validated_data.get('first_name', '').strip()

        validated_data['first_name'] = first_name
        validated_data['last_name'] = f'{first_surname} {second_surname}'.strip()
        validated_data['username'] = User.generate_username(
            first_name, first_surname, second_surname,
        )

        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UpdateMeSerializer(serializers.ModelSerializer):
    """Edición del propio perfil. Solo nombre y apellidos; email/rol/institución
    no se cambian acá (institución se fija en el registro)."""

    class Meta:
        model = User
        fields = ['first_name', 'last_name']
        extra_kwargs = {
            'first_name': {'required': False, 'allow_blank': False},
            'last_name': {'required': False, 'allow_blank': True},
        }


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('La contraseña actual no es correcta.')
        return value

    def validate_new_password(self, value):
        validate_password(value, self.context['request'].user)
        return value

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    """Solicitud de recuperación: solo el correo. La vista responde igual exista
    o no la cuenta, así que este serializer no revela nada."""

    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Confirma el enlace (uid + token estándar de Django) y fija la nueva
    contraseña. El token caduca por tiempo y se invalida solo al cambiar la
    contraseña, porque el generador lo deriva del hash actual."""

    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    default_error_messages = {
        'invalid_link': 'El enlace no es válido o ya expiró. Pide uno nuevo.',
    }

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        user = self._user_from_uid(attrs['uid'])
        if user is None or not default_token_generator.check_token(user, attrs['token']):
            self.fail('invalid_link')
        attrs['user'] = user
        return attrs

    @staticmethod
    def _user_from_uid(uidb64):
        try:
            pk = force_str(urlsafe_base64_decode(uidb64))
            return User.objects.get(pk=pk)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return None

    def save(self, **kwargs):
        user = self.validated_data['user']
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user


class LoginSerializer(serializers.Serializer):
    # Acepta correo o username en un mismo campo. Se mantiene 'email' como alias
    # por compatibilidad con clientes que aún envíen ese nombre.
    identifier = serializers.CharField(required=False)
    email = serializers.CharField(required=False)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        login_id = (attrs.get('identifier') or attrs.get('email') or '').strip()
        password = attrs.get('password')
        if not login_id:
            raise serializers.ValidationError('Ingresa tu correo o usuario.')

        user = User.objects.filter(
            Q(email__iexact=login_id) | Q(username__iexact=login_id)
        ).first()
        if user is None:
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
