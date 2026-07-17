from pathlib import Path

from django.core.management.base import BaseCommand

from services.claude_service import CognitiveAnalysisService


SAMPLE_MATERIAL = (
    'La recursividad es una técnica donde una función se llama a sí misma para '
    'resolver un problema descomponiéndolo en subproblemas más pequeños. Toda '
    'recursión necesita un caso base que detiene las llamadas y un caso '
    'recursivo que reduce el problema acercándolo al caso base. Sin un caso '
    'base se produce un desbordamiento de pila (stack overflow), porque las '
    'llamadas nunca terminan. El factorial de n se define como '
    'n * factorial(n-1), con factorial(0)=1 como caso base. La complejidad de '
    'una función recursiva depende del número de llamadas y del trabajo por '
    'llamada; el factorial recursivo es O(n) en tiempo y O(n) en espacio por '
    'la pila de llamadas.'
)

CRITERIA = [
    'single_correct',
    'plausible_distractors',
    'standalone_stem',
    'grounded_in_material',
    'homogeneous_options',
]


class Command(BaseCommand):
    help = (
        'Genera un lote de preguntas con IA, las califica con un juez '
        'automático (LLM-as-judge) e imprime un reporte de calidad para la tesis.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--node', default='Recursividad')
        parser.add_argument(
            '--difficulty', default='medium', choices=['easy', 'medium', 'hard']
        )
        parser.add_argument('--count', type=int, default=10)
        parser.add_argument(
            '--material',
            help='Ruta a un archivo de texto con el material. Si se omite, usa un material de ejemplo.',
        )

    def handle(self, *args, **options):
        service = CognitiveAnalysisService()
        if service.client is None:
            self.stderr.write(self.style.ERROR(
                'ANTHROPIC_API_KEY no configurada: no se puede generar.'
            ))
            return

        if options['material']:
            content = Path(options['material']).read_text(encoding='utf-8')
        else:
            content = SAMPLE_MATERIAL

        node = options['node']
        difficulty = options['difficulty']
        count = options['count']

        self.stdout.write(self.style.MIGRATE_HEADING(
            f'Generando {count} preguntas sobre "{node}" (dificultad {difficulty})...'
        ))
        questions = service.generate_questions(
            content=content, difficulty=difficulty, count=count, focus=node,
        )
        if not questions:
            self.stderr.write(self.style.ERROR('La generación no devolvió preguntas.'))
            return

        self.stdout.write(self.style.SUCCESS(f'Generadas: {len(questions)}\n'))

        self.stdout.write(self.style.MIGRATE_HEADING('Calificando con el juez automático...'))
        evaluations = service.judge_questions(questions, content)
        if len(evaluations) != len(questions):
            self.stderr.write(self.style.WARNING(
                f'El juez devolvió {len(evaluations)} evaluaciones para '
                f'{len(questions)} preguntas; el reporte puede estar incompleto.'
            ))

        self._print_questions(questions, evaluations)
        self._print_report(questions, evaluations)

    def _print_questions(self, questions, evaluations):
        for i, q in enumerate(questions):
            qtype = q.get('question_type', 'single')
            self.stdout.write(self.style.HTTP_INFO(f'\n[{i + 1}] ({qtype}) {q.get("text", "")}'))
            correct = set(q.get('correct_indices', []))
            for j, opt in enumerate(q.get('options', [])):
                mark = '*' if j in correct else ' '
                self.stdout.write(f'   {mark} {j}. {opt}')
            self.stdout.write(f'   rationale: {q.get("rationale", "")}')
            self.stdout.write(f'   misconception: {q.get("misconception_targeted", "")}')
            if i < len(evaluations):
                ev = evaluations[i]
                scores = ' '.join(f'{c}={ev.get(c)}' for c in CRITERIA)
                self.stdout.write(f'   juez: {scores}')
                self.stdout.write(f'   comentario: {ev.get("comment", "")}')

    def _print_report(self, questions, evaluations):
        self.stdout.write(self.style.MIGRATE_HEADING('\n===== REPORTE DE CALIDAD ====='))

        # Distribución de dificultad
        dist = {}
        for q in questions:
            d = q.get('difficulty', 'unknown')
            dist[d] = dist.get(d, 0) + 1
        self.stdout.write('Distribución de dificultad:')
        for d, n in sorted(dist.items()):
            self.stdout.write(f'   {d}: {n}')

        # Distribución de tipos
        types = {}
        for q in questions:
            t = q.get('question_type', 'single')
            types[t] = types.get(t, 0) + 1
        self.stdout.write('Distribución de tipos:')
        for t, n in sorted(types.items()):
            self.stdout.write(f'   {t}: {n}')

        # Errores conceptuales distintos cubiertos
        misconceptions = {
            (q.get('misconception_targeted') or '').strip().lower()
            for q in questions
        }
        misconceptions.discard('')
        self.stdout.write(
            f'Errores conceptuales distintos cubiertos: {len(misconceptions)}'
        )

        if not evaluations:
            self.stdout.write(self.style.WARNING(
                'Sin evaluaciones del juez: no se calculan scores ni % sin ambigüedad.'
            ))
            return

        # Score medio por criterio
        self.stdout.write('Score medio por criterio (1-5):')
        for c in CRITERIA:
            vals = [e.get(c) for e in evaluations if isinstance(e.get(c), int)]
            avg = sum(vals) / len(vals) if vals else 0.0
            self.stdout.write(f'   {c}: {avg:.2f}')

        # % de preguntas sin ambigüedad: single_correct >= 4 y standalone_stem >= 4
        non_ambiguous = [
            e for e in evaluations
            if (e.get('single_correct') or 0) >= 4 and (e.get('standalone_stem') or 0) >= 4
        ]
        pct = 100.0 * len(non_ambiguous) / len(evaluations)
        self.stdout.write(self.style.SUCCESS(
            f'Preguntas sin ambigüedad (single_correct>=4 y standalone_stem>=4): '
            f'{len(non_ambiguous)}/{len(evaluations)} ({pct:.1f}%)'
        ))
