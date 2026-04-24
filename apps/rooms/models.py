import random
import string

from django.conf import settings
from django.db import models


def _generate_access_code(length=8):
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(random.choices(alphabet, k=length))


class Room(models.Model):
    MODE_GROUP = 'group'
    MODE_INDIVIDUAL = 'individual'
    MODE_CHOICES = [
        (MODE_GROUP, 'Group'),
        (MODE_INDIVIDUAL, 'Individual'),
    ]

    name = models.CharField(max_length=200)
    subject = models.CharField(max_length=200)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_rooms',
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


class RoomMembership(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='memberships')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='room_memberships',
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('room', 'student')

    def __str__(self):
        return f'{self.student.username} in {self.room.name}'
