from django.core.management.base import BaseCommand
from django.db import transaction

from apps.questions.models import KnowledgeNode, Question
from apps.rooms.models import Room, RoomMembership
from apps.users.models import User


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

        self.stdout.write(self.style.SUCCESS('Seed complete.'))
        self.stdout.write(f'Teacher login: teacher@cogniroom.com / password123')
        self.stdout.write(f'Student login: student1@cogniroom.com / password123')
        self.stdout.write(f'Room access code: {room.access_code}')
