from rest_framework.test import APITestCase

from apps.cognitive.models import AIDiagnosis
from apps.questions.models import KnowledgeNode, Question
from apps.rooms.models import Room, RoomMembership
from apps.sessions.models import EvaluationSession
from apps.users.models import User


class CognitiveReadTests(APITestCase):
    """Pantallas de lectura del estudiante: perfil, temas, detalle e historial."""

    def setUp(self):
        self.teacher = User.objects.create_user('t', 't@test.com', 'pw', role='teacher')
        self.student = User.objects.create_user('s', 's@test.com', 'pw', role='student')
        self.room = Room.objects.create(name='R', subject='X', mode='group', teacher=self.teacher)
        RoomMembership.objects.create(room=self.room, student=self.student)
        self.node = KnowledgeNode.objects.create(room=self.room, name='Recursividad')
        for i in range(3):
            Question.objects.create(
                node=self.node, statement=f'q{i}', difficulty='easy',
                options=['a', 'b', 'c', 'd'], correct_index=0, source='manual',
            )
        self.client.force_authenticate(self.student)
        self._answer_one(confidence=0.9, selected=1)

    def _answer_one(self, confidence, selected):
        self.client.post('/api/v1/sessions/', {'room_id': self.room.id}, format='json')
        session = EvaluationSession.objects.filter(student=self.student).latest('id')
        qid = self.client.get(f'/api/v1/sessions/{session.id}/next-question/').json()['id']
        self.client.post(f'/api/v1/sessions/{session.id}/answers/', {
            'question_id': qid, 'selected_index': selected, 'confidence_declared': confidence,
        }, format='json')
        return session

    def test_profile(self):
        r = self.client.get('/api/v1/profile/')
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body['role'], 'student')
        self.assertEqual(body['nodes_tracked'], 1)
        self.assertEqual(body['total_answers'], 1)
        self.assertIsNotNone(body['predominant_profile'])

    def test_nodes_list_and_detail(self):
        nodes = self.client.get('/api/v1/nodes/')
        self.assertEqual(nodes.status_code, 200)
        self.assertEqual(len(nodes.json()), 1)
        self.assertEqual(nodes.json()[0]['node_id'], self.node.id)

        detail = self.client.get(f'/api/v1/nodes/{self.node.id}/')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(len(detail.json()['recent_answers']), 1)

    def test_no_empty_diagnosis_without_api_key(self):
        """Sin IA disponible no se guarda un diagnóstico en blanco."""
        self.assertEqual(AIDiagnosis.objects.filter(student=self.student).count(), 0)

    def test_node_detail_of_another_student_is_404(self):
        other = User.objects.create_user('o', 'o@test.com', 'pw', role='student')
        self.client.force_authenticate(other)
        r = self.client.get(f'/api/v1/nodes/{self.node.id}/')
        self.assertEqual(r.status_code, 404)

    def test_diagnoses_scoped_to_owner(self):
        AIDiagnosis.objects.create(
            student=self.student, node=self.node, classification='overconfident',
            risk_level='high', risk_node=[], failure_probability=0.7,
            reasoning='Para el docente', recommendation='Pide al estudiante que compare X con Y.',
            student_reasoning='Estás mezclando X con Y.',
            student_recommendation='Compara X con Y y escribe la diferencia.',
        )
        mine = self.client.get('/api/v1/diagnoses/')
        self.assertEqual(mine.status_code, 200)
        self.assertEqual(len(mine.json()), 1)

        other = User.objects.create_user('o', 'o@test.com', 'pw', role='student')
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get('/api/v1/diagnoses/').json(), [])

    def test_node_detail_shows_student_voice_not_teacher_voice(self):
        """El estudiante nunca debe leer el texto redactado para el docente."""
        AIDiagnosis.objects.create(
            student=self.student, node=self.node, classification='overconfident',
            risk_level='high', risk_node=[], failure_probability=0.7,
            reasoning='El estudiante confunde X con Y.',
            recommendation='Pide al estudiante que compare X con Y.',
            student_reasoning='Estás mezclando X con Y.',
            student_recommendation='Compara X con Y y escribe la diferencia.',
        )
        diagnosis = self.client.get(f'/api/v1/nodes/{self.node.id}/').json()['diagnosis']
        self.assertEqual(diagnosis['reasoning'], 'Estás mezclando X con Y.')
        self.assertNotIn('Pide al estudiante', diagnosis['recommendation'])


class RoomMetricsAccessTests(APITestCase):
    """Las métricas de sala son del docente dueño: nadie más las lee."""

    def setUp(self):
        self.teacher = User.objects.create_user('t', 't@test.com', 'pw', role='teacher')
        self.intruder = User.objects.create_user('t2', 't2@test.com', 'pw', role='teacher')
        self.student = User.objects.create_user('s', 's@test.com', 'pw', role='student')
        self.room = Room.objects.create(name='R', subject='X', mode='group', teacher=self.teacher)
        RoomMembership.objects.create(room=self.room, student=self.student)
        self.node = KnowledgeNode.objects.create(room=self.room, name='N')

    def _urls(self):
        base = f'/api/v1/rooms/{self.room.id}'
        return [
            f'{base}/metrics/overview/',
            f'{base}/metrics/blind-spots/',
            f'{base}/metrics/at-risk/',
            f'{base}/metrics/heatmap/',
            f'{base}/students/{self.student.id}/',
        ]

    def test_owner_reads_all_metrics(self):
        self.client.force_authenticate(self.teacher)
        for url in self._urls():
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 200)

    def test_other_teacher_and_student_get_403(self):
        for user in (self.intruder, self.student):
            self.client.force_authenticate(user)
            for url in self._urls():
                with self.subTest(user=user.username, url=url):
                    self.assertEqual(self.client.get(url).status_code, 403)

    def test_summary_is_empty_for_students(self):
        self.client.force_authenticate(self.student)
        r = self.client.get('/api/v1/rooms/metrics/summary/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['rooms'], [])
