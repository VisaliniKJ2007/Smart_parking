import sys
import os
import unittest

# Ensure backend directory is on path when running pytest from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import app


class SmartParkingApiTests(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()

    def test_health_endpoint(self):
        r = self.client.get('/health')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.get_json()['status'], 'ok')

    def test_predict_endpoint(self):
        r = self.client.get('/predict?hour=10&day=1&traffic=2&weather=0')
        self.assertEqual(r.status_code, 200)
        data = r.get_json()
        self.assertIn('predicted_available_slots', data)
        self.assertIn('predicted_slots_30_min', data)
        self.assertIn('traffic', data)
        self.assertIn('price_per_hour', data)

    def test_recommend_endpoint(self):
        r = self.client.get('/recommend?user_lat=11.38&user_lon=77.89&hour=18&day=4&traffic=3&weather=0')
        self.assertEqual(r.status_code, 200)
        data = r.get_json()
        self.assertIn('recommendations', data)
        self.assertGreater(len(data['recommendations']), 0)
        rec = data['recommendations'][0]
        self.assertIn('predicted_available', rec)
        self.assertIn('predicted_slots_30_min', rec)
        self.assertIn('traffic', rec)
        self.assertIn('price', rec)

    def test_recommend_missing_coords(self):
        r = self.client.get('/recommend?hour=18')
        self.assertEqual(r.status_code, 400)

    def test_parking_lots_endpoint(self):
        r = self.client.get('/parking-lots')
        self.assertEqual(r.status_code, 200)
        lots = r.get_json()
        self.assertIsInstance(lots, list)
        self.assertGreater(len(lots), 0)

    def test_protected_reservations_require_auth(self):
        r = self.client.get('/reservations')
        self.assertEqual(r.status_code, 401)

    def test_protected_reserve_requires_auth(self):
        r = self.client.post('/reserve', json={'parking_id': 1})
        self.assertEqual(r.status_code, 401)

    def test_register_and_login(self):
        import time
        email = f'test_{int(time.time())}@example.com'
        r = self.client.post('/auth/register', json={
            'name': 'Test User', 'email': email, 'password': 'secret123'
        })
        self.assertEqual(r.status_code, 201)

        r = self.client.post('/auth/login', json={
            'email': email, 'password': 'secret123'
        })
        self.assertEqual(r.status_code, 200)
        self.assertIn('token', r.get_json())


if __name__ == '__main__':
    unittest.main()
