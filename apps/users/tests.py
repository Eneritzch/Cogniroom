from rest_framework.test import APITestCase

from apps.users.models import Institution, User

STRONG_PW = 'Recursiv1dad!'


class AuthRegisterTests(APITestCase):
    def setUp(self):
        self.inst = Institution.objects.create(name='Uni Test', teacher_code='UNI2026')

    def _register(self, **over):
        payload = {
            'email': 'nuevo@test.com', 'password': STRONG_PW,
            'first_name': 'Ana', 'first_surname': 'Lopez', 'second_surname': 'Diaz',
        }
        payload.update(over)
        return self.client.post('/api/v1/auth/register/', payload, format='json')

    def test_student_requires_institution(self):
        r = self._register(role='student')
        self.assertEqual(r.status_code, 400)
        self.assertIn('institution', r.json())

    def test_student_ok(self):
        r = self._register(role='student', institution=self.inst.id)
        self.assertEqual(r.status_code, 201, r.content)
        u = User.objects.get(email='nuevo@test.com')
        self.assertEqual(u.institution_id, self.inst.id)
        self.assertEqual(u.role, 'student')
        # username derivado: inicial+apellido+inicial
        self.assertEqual(u.username, 'alopezd')

    def test_teacher_code_case_insensitive(self):
        r = self._register(email='t@test.com', role='teacher', teacher_code='uni2026')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(User.objects.get(email='t@test.com').institution_id, self.inst.id)

    def test_teacher_bad_code(self):
        r = self._register(email='t@test.com', role='teacher', teacher_code='NOPE')
        self.assertEqual(r.status_code, 400)
        self.assertIn('teacher_code', r.json())

    def test_duplicate_email(self):
        self._register(role='student', institution=self.inst.id)
        r = self._register(role='student', institution=self.inst.id)
        self.assertEqual(r.status_code, 400)
        self.assertIn('email', r.json())

    def test_weak_password(self):
        r = self._register(role='student', institution=self.inst.id, password='123')
        self.assertEqual(r.status_code, 400)


class InstitutionEndpointTests(APITestCase):
    def setUp(self):
        self.inst = Institution.objects.create(name='Uni Test', teacher_code='UNI2026')
        Institution.objects.create(name='Inactiva', teacher_code='OFF2026', is_active=False)

    def test_list_only_active_no_code(self):
        r = self.client.get('/api/v1/auth/institutions/')
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(len(data), 1)
        self.assertNotIn('teacher_code', data[0])

    def test_resolve_code_ok(self):
        r = self.client.post('/api/v1/auth/teacher-code/resolve/', {'code': 'uni2026'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['name'], 'Uni Test')

    def test_resolve_code_invalid(self):
        r = self.client.post('/api/v1/auth/teacher-code/resolve/', {'code': 'NOPE'}, format='json')
        self.assertEqual(r.status_code, 404)

    def test_resolve_inactive_institution(self):
        r = self.client.post('/api/v1/auth/teacher-code/resolve/', {'code': 'OFF2026'}, format='json')
        self.assertEqual(r.status_code, 404)


class ProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='u1', email='u1@test.com', password='OldPass123', first_name='A', last_name='B',
        )
        self.client.force_authenticate(self.user)

    def test_patch_me(self):
        r = self.client.patch('/api/v1/auth/me/', {'first_name': 'Nuevo'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Nuevo')

    def test_change_password_ok(self):
        r = self.client.post('/api/v1/auth/change-password/', {
            'current_password': 'OldPass123', 'new_password': 'NuevaClave456',
        }, format='json')
        self.assertEqual(r.status_code, 204)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NuevaClave456'))

    def test_change_password_wrong_current(self):
        r = self.client.post('/api/v1/auth/change-password/', {
            'current_password': 'WRONG', 'new_password': 'NuevaClave456',
        }, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('current_password', r.json())
