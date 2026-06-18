import re
import unicodedata

from django.contrib.auth.models import AbstractUser
from django.db import models


def _ascii_slug(value):
    """Normaliza a minúsculas ASCII alfanumérico: 'Ñúñez' -> 'nunez'."""
    decomposed = unicodedata.normalize('NFKD', value or '')
    ascii_only = decomposed.encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'[^a-z0-9]', '', ascii_only.lower())


class Institution(models.Model):
    """Universidad/institución del catálogo. El estudiante la elige de una lista;
    el docente queda vinculado resolviendo su `teacher_code` (uno por institución).
    Gestionable desde el admin de Django."""

    name = models.CharField(max_length=200, unique=True)
    # Código de invitación de docentes propio de la institución. Único en todo el
    # sistema para que un código resuelva a una sola institución. Se normaliza a
    # mayúsculas en save() para que la comparación sea estable.
    teacher_code = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.teacher_code = (self.teacher_code or '').strip().upper()
        super().save(*args, **kwargs)


class User(AbstractUser):
    ROLE_STUDENT = 'student'
    ROLE_TEACHER = 'teacher'
    ROLE_COORDINATOR = 'coordinator'
    ROLE_CHOICES = [
        (ROLE_STUDENT, 'Student'),
        (ROLE_TEACHER, 'Teacher'),
        (ROLE_COORDINATOR, 'Coordinator'),
    ]

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_STUDENT)
    institution = models.ForeignKey(
        Institution,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='members',
    )

    def __str__(self):
        return f'{self.username} ({self.role})'

    @staticmethod
    def generate_username(first_name, first_surname, second_surname):
        """Inicial del nombre + primer apellido + inicial del segundo apellido.
        Si la base ya existe, agrega un número incremental para garantizar unicidad
        (agarcial, agarcial1, agarcial2, ...)."""
        base = (
            _ascii_slug(first_name)[:1]
            + _ascii_slug(first_surname)
            + _ascii_slug(second_surname)[:1]
        ) or 'user'
        candidate, suffix = base, 1
        while User.objects.filter(username__iexact=candidate).exists():
            candidate = f'{base}{suffix}'
            suffix += 1
        return candidate
