from django.core import mail
from rest_framework.test import APITestCase

from apps.notifications.models import Notification
from apps.notifications.services import notify
from apps.users.models import User


class NotificationServiceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('u', 'u@test.com', 'pw')

    def test_notify_creates_inapp_and_email(self):
        notify(self.user, kind=Notification.KIND_DIAGNOSIS_READY,
               title='Listo', body='cuerpo', link='/app/diagnoses/')
        self.assertEqual(Notification.objects.filter(recipient=self.user).count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['u@test.com'])

    def test_notify_email_false_skips_mail(self):
        notify(self.user, kind=Notification.KIND_DIAGNOSIS_READY, title='X', email=False)
        self.assertEqual(Notification.objects.filter(recipient=self.user).count(), 1)
        self.assertEqual(len(mail.outbox), 0)


class NotificationEndpointTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('u', 'u@test.com', 'pw')
        notify(self.user, kind=Notification.KIND_DIAGNOSIS_READY, title='A', email=False)
        notify(self.user, kind=Notification.KIND_ROOM_JOINED, title='B', email=False)
        self.client.force_authenticate(self.user)

    def test_list_unread_count(self):
        r = self.client.get('/api/v1/notifications/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['unread_count'], 2)
        self.assertEqual(len(r.json()['results']), 2)

    def test_mark_all_read(self):
        r = self.client.post('/api/v1/notifications/mark-read/', {}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['unread_count'], 0)

    def test_only_own_notifications(self):
        other = User.objects.create_user('o', 'o@test.com', 'pw')
        self.client.force_authenticate(other)
        r = self.client.get('/api/v1/notifications/')
        self.assertEqual(r.json()['unread_count'], 0)
        self.assertEqual(len(r.json()['results']), 0)
