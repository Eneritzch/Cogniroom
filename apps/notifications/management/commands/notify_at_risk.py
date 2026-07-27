"""Resumen por cron: un solo correo al docente con los estudiantes de su sala en
cuadrante crítico ("no sabe y está confiado"). Se calcula desde las métricas
reales (BKT × confianza), sin depender de que Claude haya corrido."""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Avg
from django.utils import timezone

from apps.cognitive.models import CognitiveIndex
from apps.notifications.models import Notification
from apps.notifications.services import notify
from apps.rooms.models import Room, RoomMembership
from services.cognitive_quadrant import QUADRANTS, classify_quadrant

# Cuadrantes que le importan al docente, en orden de urgencia. El calibrado
# ("sabe y confía") no se reporta: es el estado sano.
NOTABLE = ['overconfident', 'underconfident', 'aware_gap']


class Command(BaseCommand):
    help = 'Envía a cada docente un resumen (in-app + correo) de sus estudiantes por cuadrante cognitivo.'

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
            groups = {q: [] for q in NOTABLE}
            members = RoomMembership.objects.filter(room=room).select_related('student')
            for m in members:
                agg = (
                    CognitiveIndex.objects.filter(node__room=room, student=m.student)
                    .aggregate(conf=Avg('avg_confidence'), mastery=Avg('bkt_mastery'))
                )
                if agg['mastery'] is None or agg['conf'] is None:
                    continue
                quadrant = classify_quadrant(agg['mastery'], agg['conf'])
                if quadrant in groups:
                    groups[quadrant].append(m.student)

            total = sum(len(v) for v in groups.values())
            if total == 0:
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

            # Cuerpo agrupado por cuadrante, el crítico primero.
            lines = []
            for q in NOTABLE:
                students = groups[q]
                if not students:
                    continue
                names = ', '.join(s.get_full_name() or s.username for s in students)
                lines.append(f'{QUADRANTS[q]["label"]} ({len(students)}): {names}')
            body = (
                f'Resumen cognitivo de "{room.name}". '
                + ' · '.join(lines)
                + '. Revisa la sección de Métricas para intervenir.'
            )
            crit = len(groups['overconfident'])
            title = (
                f'{crit} estudiante{"" if crit == 1 else "s"} que cree saber y no sabe en {room.name}'
                if crit else f'{total} estudiante{"" if total == 1 else "s"} para revisar en {room.name}'
            )
            notify(
                room.teacher,
                kind=Notification.KIND_STUDENT_AT_RISK,
                title=title,
                body=body,
                link='/app/metrics/',
                email_async=False,
            )

        prefix = '(dry-run) ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(f'{prefix}Docentes avisados: {sent}'))
