import unittest

from app import app


class SmartParkingApiTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_health_endpoint(self):
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['status'], 'ok')

    def test_recommend_endpoint(self):
        response = self.client.get('/recommend?user_lat=11.38&user_lon=77.89&hour=18&traffic=High')
        self.assertEqual(response.status_code, 200)
        self.assertIn('recommendations', response.get_json())

    def test_protected_reservations_require_auth(self):
        response = self.client.get('/reservations')
        self.assertEqual(response.status_code, 401)


if __name__ == '__main__':
    unittest.main()
