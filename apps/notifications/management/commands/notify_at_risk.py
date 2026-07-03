"""Resumen de estudiantes en alerta cognitiva (correr por cron). Por cada sala
grupal activa, agrupa a los estudiantes en cuadrante crítico ("no sabe y está
confiado") y envía UN correo-resumen al docente dueño. In-app siempre; email
según config. La alerta se calcula desde las métricas reales (BKT × confianza),
sin depender de que Claude haya corrido."""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Avg
from django.utils import timezone

from apps.cognitive.models import CognitiveIndex
from apps.notifications.models import Notification
from apps.notifications.services import notify
from apps.rooms.models import Room, RoomMembership
from services.cognitive_quadrant import QUADRANTS, classify_quadrant, is_critical


class Command(BaseCommand):
    help = 'Envía a cada docente un correo-resumen de sus estudiantes en alerta cognitiva.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cooldown', type=int, default=1,
            help='No repetir el resumen a un docente si ya se envió en estos días (default 1).',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='No envía nada; solo informa a cuántos docentes avisaría.',
        )

    def handle(self, *args, **opts):
        now = timezone.now()
        cooldown = now - timedelta(days=opts['cooldown'])
        dry_run = opts['dry_run']

        sent = 0
        rooms = Room.objects.filter(mode=Room.MODE_GROUP, is_active=True).select_related('teacher')
        for room in rooms:
            critical = []
            members = RoomMembership.objects.filter(room=room).select_related('student')
            for m in members:
                agg = (
                    CognitiveIndex.objects.filter(node__room=room, student=m.student)
                    .aggregate(conf=Avg('avg_confidence'), mastery=Avg('bkt_mastery'))
                )
                if agg['mastery'] is None or agg['conf'] is None:
                    continue
                quadrant = classify_quadrant(agg['mastery'], agg['conf'])
                if is_critical(quadrant):
                    critical.append(m.student)

            if not critical:
                continue

            already = Notification.objects.filter(
                recipient=room.teacher,
                kind=Notification.KIND_STUDENT_AT_RISK,
                created_at__gte=cooldown,
            ).exists()
            if already:
                continue

            sent += 1
            if dry_run:
                continue

            names = ', '.join(s.get_full_name() or s.username for s in critical)
            n = len(critical)
            label = QUADRANTS['overconfident']['label'].lower()
            notify(
                room.teacher,
                kind=Notification.KIND_STUDENT_AT_RISK,
                title=f'{n} estudiante{"" if n == 1 else "s"} en alerta en {room.name}',
                body=f'Detectamos {n} estudiante{"" if n == 1 else "s"} en el cuadrante crítico '
                     f'({label}) en "{room.name}": {names}. Revisa sus métricas para intervenir a tiempo.',
                link=f'/app/room/{room.id}/',
                email_async=False,
            )

        prefix = '(dry-run) ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(f'{prefix}Docentes avisados: {sent}'))
