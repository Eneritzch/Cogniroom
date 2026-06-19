from django.core import mail
from rest_framework.test import APITestCase

from apps.notifications.models import Notification
from apps.rooms.models import Room, RoomMembership, Section
from apps.users.models import User


class JoinRoomTests(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user('t', 't@test.com', 'pw', role='teacher')
        self.student = User.objects.create_user('s', 's@test.com', 'pw', role='student')
        self.room = Room.objects.create(name='R', subject='X', mode='group', teacher=self.teacher)

    def test_join_creates_membership_and_notifies(self):
        self.client.force_authenticate(self.student)
        r = self.client.post('/api/v1/rooms/join/', {'access_code': self.room.access_code}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(RoomMembership.objects.filter(room=self.room, student=self.student).exists())
        self.assertEqual(
            Notification.objects.filter(recipient=self.student, kind='room_joined').count(), 1
        )
        self.assertEqual(len(mail.outbox), 1)

    def test_cannot_join_twice(self):
        RoomMembership.objects.create(room=self.room, student=self.student)
        self.client.force_authenticate(self.student)
        r = self.client.post('/api/v1/rooms/join/', {'access_code': self.room.access_code}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_room_serializer_membership_for_student(self):
        RoomMembership.objects.create(room=self.room, student=self.student)
        self.client.force_authenticate(self.student)
        rooms = self.client.get('/api/v1/rooms/').json()
        self.assertTrue(rooms)
        self.assertIn('membership', rooms[0])
        self.assertIsNotNone(rooms[0]['membership']['joined_at'])


class SectionCrudTests(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user('t', 't@test.com', 'pw', role='teacher')
        self.room = Room.objects.create(name='R', subject='X', mode='group', teacher=self.teacher)
        self.client.force_authenticate(self.teacher)

    def test_crud(self):
        cr = self.client.post(f'/api/v1/rooms/{self.room.id}/sections/', {
            'code': 'A1', 'name': 'Mañana', 'schedule': 'Lun 8:00', 'capacity': 30,
        }, format='json')
        self.assertEqual(cr.status_code, 201, cr.content)
        sid = cr.json()['id_section']

        dup = self.client.post(f'/api/v1/rooms/{self.room.id}/sections/', {
            'code': 'A1', 'name': 'Otra',
        }, format='json')
        self.assertEqual(dup.status_code, 400)

        up = self.client.patch(f'/api/v1/rooms/{self.room.id}/sections/{sid}/', {
            'name': 'Tarde',
        }, format='json')
        self.assertEqual(up.status_code, 200)
        self.assertEqual(up.json()['name'], 'Tarde')

        dl = self.client.delete(f'/api/v1/rooms/{self.room.id}/sections/{sid}/')
        self.assertEqual(dl.status_code, 204)
        self.assertFalse(Section.objects.filter(id=sid).exists())
