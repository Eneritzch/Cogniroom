from collections import Counter
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.cognitive.models import BKTState, CognitiveIndex, StudentProgressSnapshot
from apps.questions.models import KnowledgeNode, Question
from apps.rooms.models import Room, RoomMembership
from apps.sessions.models import Answer, EvaluationSession
from apps.users.models import User
from services.bkt_engine import BKTEngine
from services.icc_calculator import ICCCalculator


# Perfiles de simulación: cada estudiante deja una traza cognitiva distinta a lo
# largo de 3 sesiones. correct_per_session = nº de aciertos (sobre 5) por sesión.
HISTORY_PROFILES = {
    'student1': {'confidence': 0.90, 'correct_per_session': [2, 3, 4]},  # sobreconfiado que mejora
    'student2': {'confidence': 0.65, 'correct_per_session': [3, 4, 4]},  # calibrado
    'student3': {'confidence': 0.35, 'correct_per_session': [3, 4, 5]},  # subconfiado
}


SEED_QUESTIONS = [
    {
        'text': '¿Cuál es la condición esencial que debe tener toda función recursiva para evitar un ciclo infinito?',
        'options': [
            'Una variable global compartida',
            'Un caso base que detenga la recursión',
            'Un bucle for interno',
            'Una llamada a otra función iterativa',
        ],
        'correct_index': 1,
        'difficulty': 'easy',
    },
    {
        'text': 'En una función recursiva, ¿qué representa el "caso recursivo"?',
        'options': [
            'La condición que detiene la recursión',
            'La invocación de la función a sí misma con un subproblema más pequeño',
            'La inicialización de variables locales',
            'El retorno de un valor constante',
        ],
        'correct_index': 1,
        'difficulty': 'easy',
    },
    {
        'text': 'Dada la función fact(n) = n * fact(n-1) con caso base fact(0) = 1, ¿cuál es el valor de fact(4)?',
        'options': ['12', '16', '24', '120'],
        'correct_index': 2,
        'difficulty': 'medium',
    },
    {
        'text': '¿Qué problema clásico tiene una solución recursiva natural mediante el patrón "divide y vencerás"?',
        'options': [
            'Búsqueda lineal',
            'Ordenamiento por burbuja',
            'Merge sort (ordenamiento por mezcla)',
            'Asignación de variables',
        ],
        'correct_index': 2,
        'difficulty': 'medium',
    },
    {
        'text': '¿Cuál es la principal desventaja de una función recursiva sin memoización al calcular Fibonacci?',
        'options': [
            'Genera resultados incorrectos para n > 10',
            'Tiene complejidad temporal exponencial debido a llamadas redundantes',
            'No puede ejecutarse en lenguajes compilados',
            'Requiere siempre estructuras de datos auxiliares',
        ],
        'correct_index': 1,
        'difficulty': 'hard',
    },
]


class Command(BaseCommand):
    help = 'Seed demo data: 1 teacher, 3 students, 1 group room with nodes and questions.'

    @transaction.atomic
    def handle(self, *args, **options):
        teacher, created = User.objects.get_or_create(
            email='teacher@cogniroom.com',
            defaults={
                'username': 'teacher',
                'role': User.ROLE_TEACHER,
                'institution': 'CogniRoom Demo',
            },
        )
        if created:
            teacher.set_password('password123')
            teacher.save()
            self.stdout.write(self.style.SUCCESS('Created teacher: teacher@cogniroom.com'))
        else:
            self.stdout.write('Teacher already exists.')

        students = []
        for i in range(1, 4):
            email = f'student{i}@cogniroom.com'
            student, s_created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': f'student{i}',
                    'role': User.ROLE_STUDENT,
                    'institution': 'CogniRoom Demo',
                },
            )
            if s_created:
                student.set_password('password123')
                student.save()
                self.stdout.write(self.style.SUCCESS(f'Created student: {email}'))
            students.append(student)

        room, r_created = Room.objects.get_or_create(
            name='Algoritmos I',
            teacher=teacher,
            defaults={
                'subject': 'Programación',
                'mode': Room.MODE_GROUP,
            },
        )
        if r_created:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created room "Algoritmos I" with code: {room.access_code}'
                )
            )
        else:
            self.stdout.write(f'Room exists with code: {room.access_code}')

        node_names = ['Recursividad', 'Complejidad algorítmica', 'Ordenamiento']
        nodes = {}
        for name in node_names:
            node, n_created = KnowledgeNode.objects.get_or_create(room=room, name=name)
            nodes[name] = node
            if n_created:
                self.stdout.write(self.style.SUCCESS(f'Created node: {name}'))

        for student in students:
            _, m_created = RoomMembership.objects.get_or_create(
                room=room, student=student
            )
            if m_created:
                self.stdout.write(
                    self.style.SUCCESS(f'Joined {student.username} to room')
                )

        recursividad = nodes['Recursividad']
        if recursividad.questions.count() == 0:
            for q_data in SEED_QUESTIONS:
                Question.objects.create(
                    node=recursividad,
                    statement=q_data['text'],
                    options=q_data['options'],
                    correct_index=q_data['correct_index'],
                    difficulty=q_data['difficulty'],
                    source=Question.SOURCE_MANUAL,
                )
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created {len(SEED_QUESTIONS)} approved questions in "Recursividad"'
                )
            )
        else:
            self.stdout.write('Questions already exist, skipping.')

        self._seed_history(room, students, recursividad)

        self.stdout.write(self.style.SUCCESS('Seed complete.'))
        self.stdout.write(f'Teacher login: teacher@cogniroom.com / password123')
        self.stdout.write(f'Student login: student1@cogniroom.com / password123')
        self.stdout.write(f'Room access code: {room.access_code}')

    def _seed_history(self, room, students, node):
        """Genera 3 sesiones completadas por estudiante con su traza cognitiva
        (BKT + ICC + snapshot histórico), retrofechadas para alimentar las curvas
        de evolución. Idempotente: si ya hay sesiones, no hace nada."""
        if EvaluationSession.objects.filter(room=room).exists():
            self.stdout.write('History already seeded, skipping.')
            return

        questions = list(node.questions.order_by('id')[:5])
        if not questions:
            return

        engine = BKTEngine()
        calc = ICCCalculator()
        now = timezone.now()
        n_sessions = 3

        for student in students:
            profile = HISTORY_PROFILES.get(student.username)
            if not profile:
                continue
            confidence = profile['confidence']

            bkt, _ = BKTState.objects.get_or_create(student=student, node=node)

            for s_idx in range(n_sessions):
                # sesión más antigua primero (s_idx 0 → hace ~3 semanas)
                session_dt = now - timedelta(days=(n_sessions - s_idx) * 7)
                correct_count = profile['correct_per_session'][s_idx]

                session = EvaluationSession.objects.create(
                    student=student,
                    room=room,
                    status=EvaluationSession.STATUS_COMPLETED,
                    finished_at=session_dt,
                )

                profiles_in_session = []
                for q_idx, question in enumerate(questions):
                    is_correct = q_idx < correct_count

                    new_mastery = engine.update(
                        bkt.p_mastery, bkt.p_transit, bkt.p_slip, bkt.p_guess, is_correct
                    )
                    bkt.p_mastery = new_mastery
                    bkt.attempts += 1
                    bkt.save()

                    icc = calc.calculate(confidence, new_mastery)
                    profiles_in_session.append(icc['profile'])

                    ci = CognitiveIndex.objects.create(
                        student=student,
                        node=node,
                        session=session,
                        avg_confidence=confidence,
                        bkt_mastery=new_mastery,
                        icc_value=icc['icc'],
                        metacognitive_gap=icc['gap'],
                        profile=icc['profile'],
                    )
                    ans = Answer.objects.create(
                        session=session,
                        question=question,
                        selected_index=question.correct_index if is_correct else (question.correct_index + 1) % 4,
                        is_correct=is_correct,
                        confidence_declared=confidence,
                        bkt_mastery_snapshot=new_mastery,
                        response_time_sec=20 + q_idx * 3,
                    )
                    # retrofechar (auto_now_add ignora el valor en create)
                    CognitiveIndex.objects.filter(pk=ci.pk).update(calculated_at=session_dt)
                    Answer.objects.filter(pk=ans.pk).update(answered_at=session_dt)

                dominant = Counter(profiles_in_session).most_common(1)[0][0]
                snap = StudentProgressSnapshot.objects.create(
                    student=student,
                    room=room,
                    session=session,
                    avg_icc=round(sum(calc.calculate(confidence, a.bkt_mastery_snapshot)['icc']
                                      for a in session.answers.all()) / len(questions), 4),
                    avg_bkt_mastery=round(sum(a.bkt_mastery_snapshot for a in session.answers.all()) / len(questions), 4),
                    avg_gap=round(confidence - (sum(a.bkt_mastery_snapshot for a in session.answers.all()) / len(questions)), 4),
                    dominant_profile=dominant,
                    questions_answered=len(questions),
                    correct_count=correct_count,
                )
                EvaluationSession.objects.filter(pk=session.pk).update(
                    started_at=session_dt, finished_at=session_dt
                )
                StudentProgressSnapshot.objects.filter(pk=snap.pk).update(created_at=session_dt)

            self.stdout.write(self.style.SUCCESS(
                f'Seeded {n_sessions} historical sessions for {student.username}'
            ))
