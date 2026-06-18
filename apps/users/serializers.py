from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
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
    # institution es FK: se devuelve su nombre como string para que los clientes
    # (perfil, dashboard) sigan leyendo un texto plano.
    institution = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'institution', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']

    def get_institution(self, obj):
        return obj.institution.name if obj.institution_id else ''


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
    # Estudiante: id de Institution del catálogo. Docente: se deriva del código,
    # no lo elige el cliente (se sobreescribe en validate()).
    institution = serializers.PrimaryKeyRelatedField(
        queryset=Institution.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    # El username no se pide al usuario: se deriva de nombre + apellidos en create().
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
        # El rol docente nunca se confía del cliente: el código resuelve a su
        # institución (uno por institución). El estudiante elige del catálogo.
        code = (attrs.pop('teacher_code', '') or '').strip().upper()
        if attrs.get('role') == User.ROLE_TEACHER:
            if not code:
                raise serializers.ValidationError(
                    {'teacher_code': 'Ingresá el código de docente provisto por tu institución.'}
                )
            institution = Institution.objects.filter(
                teacher_code=code, is_active=True,
            ).first()
            if not institution:
                raise serializers.ValidationError(
                    {'teacher_code': 'Código de docente inválido.'}
                )
            # El docente no elige institución: se deriva del código.
            attrs['institution'] = institution
        elif not attrs.get('institution'):
            raise serializers.ValidationError(
                {'institution': 'Seleccioná tu institución.'}
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
