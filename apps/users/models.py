import re
import unicodedata

from django.contrib.auth.models import AbstractUser
from django.db import models


def _ascii_slug(value):
    """Normaliza a minúsculas ASCII alfanumérico: 'Ñúñez' -> 'nunez'."""
    decomposed = unicodedata.normalize('NFKD', value or '')
    ascii_only = decomposed.encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'[^a-z0-9]', '', ascii_only.lower())


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
    institution = models.CharField(max_length=200, blank=True)

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
