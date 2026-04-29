# consultations/tests.py
"""
Run with:
    python manage.py test consultations -v 2
"""
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from datetime import timedelta

from .models import Nutritionist, Consultation, NutritionistFeedback, ConsultationFeedback

User = get_user_model()


# ─── helpers ─────────────────────────────────────────────────────────────────

def create_user(username='testuser', email='test@test.com', password='testpass123'):
    return User.objects.create_user(username=username, email=email, password=password)


def create_nutritionist(name='Dr. Lisa Chen', email='lisa@nutrilens.com'):
    return Nutritionist.objects.create(
        name=name, email=email,
        specialization='general', is_active=True
    )


def future(days=1):
    return timezone.now() + timedelta(days=days)


def past(days=1):
    return timezone.now() - timedelta(days=days)


# ─── Model tests ─────────────────────────────────────────────────────────────

class NutritionistModelTest(TestCase):

    def test_create_nutritionist(self):
        n = create_nutritionist()
        self.assertEqual(str(n), "Dr. Lisa Chen – General Nutrition")
        self.assertTrue(n.is_active)


class ConsultationModelTest(TestCase):

    def setUp(self):
        self.user = create_user()
        self.nutritionist = create_nutritionist()

    def test_create_consultation(self):
        c = Consultation.objects.create(
            user=self.user,
            nutritionist=self.nutritionist,
            scheduled_at=future(),
            session_type='monthly_checkin',
            notes='Looking forward to this.',
        )
        self.assertEqual(c.status, 'pending')
        self.assertIn('testuser', str(c))

    def test_nutritionist_feedback_relation(self):
        c = Consultation.objects.create(
            user=self.user,
            nutritionist=self.nutritionist,
            scheduled_at=future(),
        )
        fb = NutritionistFeedback.objects.create(
            consultation=c,
            text='Great progress this week!'
        )
        self.assertEqual(c.nutritionist_feedback.text, 'Great progress this week!')


# ─── API tests ────────────────────────────────────────────────────────────────

class ConsultationAPITest(TestCase):

    def setUp(self):
        self.client       = APIClient()
        self.user         = create_user()
        self.nutritionist = create_nutritionist()
        self.client.force_authenticate(user=self.user)

        # URL helpers
        self.list_url     = '/api/v1/consultations/consultations/'
        self.upcoming_url = '/api/v1/consultations/consultations/upcoming/'
        self.past_url     = '/api/v1/consultations/consultations/past/'
        self.feedback_url = '/api/v1/consultations/consultations/all-feedback/'

    # ── Book ──────────────────────────────────────────────────────────────────

    def test_book_consultation(self):
        data = {
            'nutritionist':     self.nutritionist.pk,
            'scheduled_at':     (future(2)).isoformat(),
            'duration_minutes': 30,
            'session_type':     'monthly_checkin',
            'topic':            'Weight loss review',
            'notes':            'Please review my last 2 weeks.',
            'is_premium':       False,
        }
        res = self.client.post(self.list_url, data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Consultation.objects.count(), 1)
        c = Consultation.objects.first()
        self.assertEqual(c.notes, 'Please review my last 2 weeks.')
        self.assertEqual(c.session_type, 'monthly_checkin')

    def test_book_past_date_fails(self):
        data = {
            'nutritionist': self.nutritionist.pk,
            'scheduled_at': past(1).isoformat(),
            'session_type': 'other',
        }
        res = self.client.post(self.list_url, data, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_book_without_nutritionist_auto_assigns(self):
        data = {
            'scheduled_at': future(3).isoformat(),
            'session_type': 'other',
        }
        res = self.client.post(self.list_url, data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        c = Consultation.objects.first()
        self.assertIsNotNone(c.nutritionist)

    # ── List ──────────────────────────────────────────────────────────────────

    # ── List ──────────────────────────────────────────────────────────────────

    def test_list_returns_only_own_consultations(self):
        other_user = create_user(username='other', email='other@test.com')
        my_c = Consultation.objects.create(
            user=self.user, nutritionist=self.nutritionist,
            scheduled_at=future()
        )
        Consultation.objects.create(
            user=other_user, nutritionist=self.nutritionist,
            scheduled_at=future()
        )
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        # FIX: Check if data is paginated (has 'results' key)
        data_list = res.data['results'] if isinstance(res.data, dict) and 'results' in res.data else res.data
        
        returned_ids = [item['id'] for item in data_list]
        self.assertIn(my_c.pk, returned_ids)
        
        other_ids = list(
            Consultation.objects.filter(user=other_user).values_list('id', flat=True)
        )
        for oid in other_ids:
            self.assertNotIn(oid, returned_ids)

    # ── Upcoming / past ───────────────────────────────────────────────────────

    def test_upcoming_excludes_past(self):
        Consultation.objects.create(
            user=self.user, nutritionist=self.nutritionist,
            scheduled_at=future(), status='confirmed'
        )
        Consultation.objects.create(
            user=self.user, nutritionist=self.nutritionist,
            scheduled_at=past(), status='completed'
        )
        res = self.client.get(self.upcoming_url)
        self.assertEqual(len(res.data), 1)

    def test_past_returns_past(self):
        Consultation.objects.create(
            user=self.user, nutritionist=self.nutritionist,
            scheduled_at=past(), status='completed'
        )
        res = self.client.get(self.past_url)
        self.assertEqual(len(res.data), 1)

    # ── Cancel ────────────────────────────────────────────────────────────────

    def test_cancel_consultation(self):
        c = Consultation.objects.create(
            user=self.user, nutritionist=self.nutritionist,
            scheduled_at=future(), status='confirmed'
        )
        url = f'/api/v1/consultations/consultations/{c.pk}/cancel/'
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        c.refresh_from_db()
        self.assertEqual(c.status, 'cancelled')

    def test_cannot_cancel_completed(self):
        c = Consultation.objects.create(
            user=self.user, nutritionist=self.nutritionist,
            scheduled_at=past(), status='completed'
        )
        url = f'/api/v1/consultations/consultations/{c.pk}/cancel/'
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Nutritionist feedback ─────────────────────────────────────────────────

    def test_add_feedback_and_get_all(self):
        c = Consultation.objects.create(
            user=self.user, nutritionist=self.nutritionist,
            scheduled_at=past(), status='completed'
        )
        # Post feedback
        url = f'/api/v1/consultations/consultations/{c.pk}/add-feedback/'
        res = self.client.post(url, {'text': 'Keep it up!'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # getAllFeedback
        res = self.client.get(self.feedback_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['text'], 'Keep it up!')
        self.assertEqual(res.data[0]['nutritionist_name'], 'Dr. Lisa Chen')

    def test_get_single_feedback(self):
        c = Consultation.objects.create(
            user=self.user, nutritionist=self.nutritionist,
            scheduled_at=past(), status='completed'
        )
        NutritionistFeedback.objects.create(consultation=c, text='Good work!')
        url = f'/api/v1/consultations/consultations/{c.pk}/feedback/'
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['text'], 'Good work!')

    def test_no_feedback_returns_404(self):
        c = Consultation.objects.create(
            user=self.user, nutritionist=self.nutritionist,
            scheduled_at=future()
        )
        url = f'/api/v1/consultations/consultations/{c.pk}/feedback/'
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_all_feedback_empty_for_new_user(self):
        res = self.client.get(self.feedback_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, [])

    # ── User rates session ────────────────────────────────────────────────────

    def test_user_rates_completed_session(self):
        c = Consultation.objects.create(
            user=self.user, nutritionist=self.nutritionist,
            scheduled_at=past(), status='completed'
        )
        url = f'/api/v1/consultations/consultations/{c.pk}/add-user-feedback/'
        res = self.client.post(url, {
            'rating': 5,
            'comment': 'Amazing session!',
            'would_recommend': True,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_user_cannot_rate_pending_session(self):
        c = Consultation.objects.create(
            user=self.user, nutritionist=self.nutritionist,
            scheduled_at=future()
        )
        url = f'/api/v1/consultations/consultations/{c.pk}/add-user-feedback/'
        res = self.client.post(url, {'rating': 4}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Auth guard ────────────────────────────────────────────────────────────

    def test_unauthenticated_blocked(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class NutritionistAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user   = create_user()
        self.client.force_authenticate(user=self.user)
        create_nutritionist()

    def test_list_nutritionists(self):
        res = self.client.get('/api/v1/consultations/nutritionists/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        # FIX: Access .results
        data_list = res.data['results'] if isinstance(res.data, dict) and 'results' in res.data else res.data
        
        names = [n['name'] for n in data_list]
        self.assertIn('Dr. Lisa Chen', names)
        for n in data_list:
            self.assertTrue(n['is_active'])

    def test_inactive_hidden(self):
        inactive = Nutritionist.objects.create(
            name='Inactive Doc', email='inactive@test.com', is_active=False
        )
        res = self.client.get('/api/v1/consultations/nutritionists/')
        
        # FIX: Access .results
        data_list = res.data['results'] if isinstance(res.data, dict) and 'results' in res.data else res.data
        
        returned_ids = [n['id'] for n in data_list]
        self.assertNotIn(inactive.pk, returned_ids)
        for n in data_list:
            self.assertTrue(n['is_active'])