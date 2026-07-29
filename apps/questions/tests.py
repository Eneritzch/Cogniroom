from django.test import override_settings
from rest_framework.test import APITestCase

from apps.questions.models import KnowledgeNode, Question
from apps.rooms.models import Room
from apps.users.models import User


class QuestionAuthoringTests(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user('t', 't@test.com', 'pw', role='teacher')
        self.other = User.objects.create_user('o', 'o@test.com', 'pw', role='teacher')
        self.room = Room.objects.create(name='R', subject='X', mode='group', teacher=self.teacher)
        self.node = KnowledgeNode.objects.create(room=self.room, name='N')
        self.client.force_authenticate(self.teacher)

    def test_manual_question_auto_approved(self):
        r = self.client.post(f'/api/v1/rooms/{self.room.id}/questions/manual/', {
            'node_id': self.node.id, 'statement': '2+2?', 'difficulty': 'easy',
            'options': ['3', '4', '5', '6'], 'correct_index': 1,
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['status'], 'approved')
        self.assertEqual(r.json()['source'], 'manual')

    def test_only_owner_creates(self):
        self.client.force_authenticate(self.other)
        r = self.client.post(f'/api/v1/rooms/{self.room.id}/questions/manual/', {
            'node_id': self.node.id, 'statement': 'x', 'difficulty': 'easy',
            'options': ['a', 'b', 'c', 'd'], 'correct_index': 0,
        }, format='json')
        self.assertEqual(r.status_code, 403)

    def test_approve_and_reject(self):
        q = Question.objects.create(
            node=self.node, statement='q', difficulty='easy',
            options=['a', 'b', 'c', 'd'], correct_index=0, source='ai',
        )
        self.assertEqual(q.status, 'pending')  # ai + group => pending
        ap = self.client.post(f'/api/v1/rooms/{self.room.id}/questions/approve/', {
            'question_ids': [q.id],
        }, format='json')
        self.assertEqual(ap.status_code, 200)
        q.refresh_from_db()
        self.assertEqual(q.status, 'approved')

        rej = self.client.post(f'/api/v1/rooms/{self.room.id}/questions/reject/', {
            'question_ids': [q.id],
        }, format='json')
        self.assertEqual(rej.status_code, 200)
        q.refresh_from_db()
        self.assertEqual(q.status, 'rejected')

    def test_approve_and_reject_individual_room(self):
        indiv_room = Room.objects.create(name='Indiv', subject='X', mode='individual', teacher=self.teacher)
        node = KnowledgeNode.objects.create(room=indiv_room, name='N')
        q = Question.objects.create(
            node=node, statement='q', difficulty='easy',
            options=['a', 'b', 'c', 'd'], correct_index=0, source='ai',
        )
        self.assertEqual(q.status, 'approved')  # ai + individual => approved (auto)

        # Reject
        rej = self.client.post(f'/api/v1/rooms/{indiv_room.id}/questions/reject/', {
            'question_ids': [q.id],
        }, format='json')
        self.assertEqual(rej.status_code, 200)
        q.refresh_from_db()
        self.assertEqual(q.status, 'rejected')

        # Approve again
        ap = self.client.post(f'/api/v1/rooms/{indiv_room.id}/questions/approve/', {
            'question_ids': [q.id],
        }, format='json')
        self.assertEqual(ap.status_code, 200)
        q.refresh_from_db()
        self.assertEqual(q.status, 'approved')

    @override_settings(ANTHROPIC_API_KEY='')
    def test_generate_without_key_degrades(self):
        r = self.client.post(f'/api/v1/rooms/{self.room.id}/questions/generate/', {
            'node_id': self.node.id, 'difficulty': 'easy', 'count': 3,
            'content': 'La recursividad es una técnica donde una función se llama a sí misma.',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['created_count'], 0)

    def test_generate_without_source_400(self):
        r = self.client.post(f'/api/v1/rooms/{self.room.id}/questions/generate/', {
            'node_id': self.node.id, 'difficulty': 'easy', 'count': 3,
        }, format='json')
        self.assertEqual(r.status_code, 400)
