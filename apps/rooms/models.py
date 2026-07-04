import secrets
import string

from django.conf import settings
from django.db import models


def _generate_access_code(length=8):
    # secrets (no random): el código es el secreto de invitación a la sala.
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


class Room(models.Model):
    MODE_GROUP = 'group'
    MODE_INDIVIDUAL = 'individual'
    MODE_CHOICES = [
        (MODE_GROUP, 'Group'),
        (MODE_INDIVIDUAL, 'Individual'),
    ]

    name = models.CharField(max_length=200)
    subject = models.CharField(max_length=200)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='teacher_rooms',
    )
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default=MODE_GROUP)
    access_code = models.CharField(max_length=8, unique=True, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.mode == self.MODE_INDIVIDUAL:
            self.access_code = None
        elif self.mode == self.MODE_GROUP and not self.access_code:
            for _ in range(20):
                code = _generate_access_code()
                if not Room.objects.filter(access_code=code).exists():
                    self.access_code = code
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} [{self.mode}]'


class Section(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='sections')
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    schedule = models.CharField(max_length=100, blank=True, default='')
    capacity = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('room', 'code')
        ordering = ['code']

    def __str__(self):
        return f'{self.room.name} · {self.code}'


class RoomJoinRequest(models.Model):
    """Solicitud de autoinscripcion de un alumno a una sala grupal de su
    institucion, pendiente de aprobacion del docente. Separada de
    RoomMembership: no cuenta como miembro activo hasta ser aprobada."""
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='join_requests')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='join_requests',
    )
    # Paralelo que el alumno declara al solicitar; el docente lo confirma o
    # corrige al aprobar. Null si la sala no tiene secciones definidas.
    section = models.ForeignKey(
        'Section',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='join_requests',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('room', 'student')
        ordering = ['created_at']

    def __str__(self):
        return f'{self.student.username} -> {self.room.name} (pendiente)'


class RoomMembership(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='memberships')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='room_memberships',
    )
    section = models.ForeignKey(
        Section,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='memberships',
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('room', 'student')

    def __str__(self):
        return f'{self.student.username} in {self.room.name}'
