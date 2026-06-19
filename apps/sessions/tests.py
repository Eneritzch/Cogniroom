from rest_framework.test import APITestCase

from apps.cognitive.models import StudentProgressSnapshot
from apps.questions.models import KnowledgeNode, Question
from apps.rooms.models import Room, RoomMembership
from apps.sessions.models import Answer, EvaluationSession
from apps.users.models import User


class EvalFlowTests(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user('t', 't@test.com', 'pw', role='teacher')
        self.student = User.objects.create_user('s', 's@test.com', 'pw', role='student')
        self.room = Room.objects.create(name='R', subject='X', mode='group', teacher=self.teacher)
        RoomMembership.objects.create(room=self.room, student=self.student)
        self.node = KnowledgeNode.objects.create(room=self.room, name='N')
        for i in range(5):
            Question.objects.create(
                node=self.node, statement=f'q{i}', difficulty='easy',
                options=['a', 'b', 'c', 'd'], correct_index=0, source='manual',
            )
        self.client.force_authenticate(self.student)

    def _session(self):
        self.client.post('/api/v1/sessions/', {'room_id': self.room.id}, format='json')
        return EvaluationSession.objects.get(student=self.student, room=self.room)

    def test_create_session_requires_membership(self):
        other = User.objects.create_user('o', 'o@test.com', 'pw', role='student')
        self.client.force_authenticate(other)
        r = self.client.post('/api/v1/sessions/', {'room_id': self.room.id}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_next_question_then_answer(self):
        sess = self._session()
        nq = self.client.get(f'/api/v1/sessions/{sess.id}/next-question/')
        self.assertEqual(nq.status_code, 200)
        qid = nq.json()['id']
        # la pregunta pública no expone la respuesta correcta
        self.assertNotIn('correct_index', nq.json())

        r = self.client.post(f'/api/v1/sessions/{sess.id}/answers/', {
            'question_id': qid, 'selected_index': 0, 'confidence_declared': 0.3,
        }, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()
        self.assertTrue(body['is_correct'])
        self.assertGreater(body['bkt_mastery'], 0.3)  # subió tras acertar
        self.assertIn('icc_value', body)
        self.assertEqual(Answer.objects.filter(session=sess).count(), 1)

    def test_anti_replay(self):
        sess = self._session()
        qid = self.client.get(f'/api/v1/sessions/{sess.id}/next-question/').json()['id']
        payload = {'question_id': qid, 'selected_index': 0, 'confidence_declared': 0.3}
        self.client.post(f'/api/v1/sessions/{sess.id}/answers/', payload, format='json')
        again = self.client.post(f'/api/v1/sessions/{sess.id}/answers/', payload, format='json')
        self.assertEqual(again.status_code, 400)
        self.assertEqual(Answer.objects.filter(session=sess, question_id=qid).count(), 1)

    def test_complete_idempotent_single_snapshot(self):
        sess = self._session()
        qid = self.client.get(f'/api/v1/sessions/{sess.id}/next-question/').json()['id']
        self.client.post(f'/api/v1/sessions/{sess.id}/answers/', {
            'question_id': qid, 'selected_index': 0, 'confidence_declared': 0.3,
        }, format='json')

        c1 = self.client.post(f'/api/v1/sessions/{sess.id}/complete/')
        c2 = self.client.post(f'/api/v1/sessions/{sess.id}/complete/')
        self.assertEqual(c1.status_code, 200)
        self.assertEqual(c2.status_code, 200)
        self.assertEqual(StudentProgressSnapshot.objects.filter(session=sess).count(), 1)

    def test_next_question_after_complete(self):
        sess = self._session()
        self.client.post(f'/api/v1/sessions/{sess.id}/complete/')
        nq = self.client.get(f'/api/v1/sessions/{sess.id}/next-question/')
        self.assertEqual(nq.status_code, 200)
        self.assertTrue(nq.json().get('completed'))

    def test_answer_on_closed_session_rejected(self):
        sess = self._session()
        qid = self.client.get(f'/api/v1/sessions/{sess.id}/next-question/').json()['id']
        self.client.post(f'/api/v1/sessions/{sess.id}/complete/')
        r = self.client.post(f'/api/v1/sessions/{sess.id}/answers/', {
            'question_id': qid, 'selected_index': 0, 'confidence_declared': 0.3,
        }, format='json')
        self.assertEqual(r.status_code, 400)
