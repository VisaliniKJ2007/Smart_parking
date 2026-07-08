import os
import pickle

import pandas as pd

FEATURES = ['hour', 'day', 'traffic', 'weather']

TRAFFIC_MAP = {'low': 1, 'medium': 2, 'moderate': 2, 'high': 3, 'heavy': 3}
WEATHER_MAP = {'sunny': 0, 'clear': 0, 'cloudy': 0, 'rain': 1, 'rainy': 1, 'storm': 1}


class ModelLoader:
    def __init__(self, model_path=None):
        self.model_path = model_path or os.path.join(os.path.dirname(__file__), '..', 'model.pkl')
        self.model = None
        self._load()

    def _load(self):
        try:
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
        except Exception:
            self.model = None

    def predict(self, features: dict) -> int:
        vec = self._vectorize(features)
        if self.model:
            frame = pd.DataFrame([vec])[FEATURES]
            return max(0, int(round(self.model.predict(frame)[0])))
        # Fallback heuristic
        hour = vec['hour']
        traffic = vec['traffic']
        base = 50 - (traffic * 10)
        if 8 <= hour <= 19:
            base -= 10
        return max(0, base)

    def _vectorize(self, features: dict) -> dict:
        traffic_raw = str(features.get('traffic', 'medium')).lower()
        weather_raw = str(features.get('weather', 'sunny')).lower()
        try:
            traffic_val = int(float(traffic_raw))
        except ValueError:
            traffic_val = TRAFFIC_MAP.get(traffic_raw, 2)
        try:
            weather_val = int(float(weather_raw))
        except ValueError:
            weather_val = WEATHER_MAP.get(weather_raw, 0)
        return {
            'hour': int(features.get('hour', 12)),
            'day': int(features.get('day', 0)),
            'traffic': traffic_val,
            'weather': weather_val,
        }
