from django.core.management.base import BaseCommand

from apps.sessions.models import Answer
from services.claude_service import CognitiveAnalysisService


class Command(BaseCommand):
    help = (
        'Regenera el ai_feedback de las respuestas que ya lo tienen, usando el '
        'prompt corregido (que distingue acierto de error). Útil tras cambiar '
        'el prompt del tutor. Cada respuesta = 1 llamada a la IA.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--session', type=int, default=None,
            help='Regenerar solo las respuestas de esta sesión.',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='No guarda; solo muestra qué se regeneraría.',
        )

    def handle(self, *args, **opts):
        qs = (
            Answer.objects.exclude(ai_feedback='').exclude(ai_feedback__isnull=True)
            .select_related('question__node', 'session')
        )
        if opts['session']:
            qs = qs.filter(session_id=opts['session'])

        total = qs.count()
        self.stdout.write(f'Respuestas a regenerar: {total}')
        if opts['dry_run']:
            return

        claude = CognitiveAnalysisService()
        done = 0
        for answer in qs:
            question = answer.question
            try:
                correct_idx = question.correct_indices or [question.correct_index]
                selected_idx = answer.selected_indices or [answer.selected_index]
                correct_answer = ' / '.join(question.options[i] for i in correct_idx)
                selected_answer = ' / '.join(question.options[i] for i in selected_idx)
            except (IndexError, TypeError):
                continue

            feedback = claude.explain_error(
                question.statement,
                selected_answer,
                correct_answer,
                {'p_mastery': answer.bkt_mastery_snapshot, 'node': question.node.name},
                is_correct=answer.is_correct,
            )
            if feedback:
                answer.ai_feedback = feedback
                answer.save(update_fields=['ai_feedback'])
                done += 1

        self.stdout.write(self.style.SUCCESS(f'Regeneradas: {done}/{total}'))
