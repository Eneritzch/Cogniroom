"""Recordatorio de práctica pendiente (correr por cron). Avisa a estudiantes de
salas grupales activas que no han rendido en N días."""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.notifications.models import Notification
from apps.notifications.services import notify
from apps.questions.models import Question
from apps.rooms.models import Room, RoomMembership
from apps.sessions.models import EvaluationSession


class Command(BaseCommand):
    help = 'Avisa por email a los estudiantes con práctica pendiente.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days', type=int, default=7,
            help='Días sin rendir para considerar la práctica pendiente (default 7).',
        )
        parser.add_argument(
            '--cooldown', type=int, default=3,
            help='No repetir el aviso si ya se envió en estos días (default 3).',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='No envía nada; solo informa a cuántos estudiantes avisaría.',
        )

    def handle(self, *args, **opts):
        now = timezone.now()
        cutoff = now - timedelta(days=opts['days'])
        cooldown = now - timedelta(days=opts['cooldown'])
        dry_run = opts['dry_run']

        sent = 0
        rooms = Room.objects.filter(mode=Room.MODE_GROUP, is_active=True)
        for room in rooms:
            # Solo tiene sentido avisar si hay algo aprobado para practicar.
            has_questions = Question.objects.filter(
                node__room=room, status=Question.STATUS_APPROVED
            ).exists()
            if not has_questions:
                continue

            members = RoomMembership.objects.filter(room=room).select_related('student')
            for m in members:
                student = m.student

                practiced = EvaluationSession.objects.filter(
                    student=student, room=room,
                    status=EvaluationSession.STATUS_COMPLETED,
                    finished_at__gte=cutoff,
                ).exists()
                if practiced:
                    continue

                already_reminded = Notification.objects.filter(
                    recipient=student,
                    kind=Notification.KIND_PRACTICE_REMINDER,
                    created_at__gte=cooldown,
                ).exists()
                if already_reminded:
                    continue

                sent += 1
                if dry_run:
                    continue

                notify(
                    student,
                    kind=Notification.KIND_PRACTICE_REMINDER,
                    title=f'Tienes práctica pendiente en {room.name}',
                    body=f'Hace varios días que no practicas en "{room.name}". '
                         'Entra cuando puedas y pon a prueba lo que sabes.',
                    link='/app/my-rooms/',
                    email_async=False,
                )

        prefix = '(dry-run) ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(f'{prefix}Recordatorios: {sent}'))
