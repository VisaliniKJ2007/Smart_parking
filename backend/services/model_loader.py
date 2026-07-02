import os
import pickle

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

    def predict(self, features: dict):
        if self.model:
            return int(self.model.predict([self._vectorize(features)])[0])
        hour = int(features.get('hour', 12))
        traffic = features.get('traffic', 'Medium')
        base = 50
        if str(traffic).lower() in ('high', 'heavy'):
            base -= 30
        if 18 <= hour <= 21:
            base -= 10
        return max(0, base)

    def _vectorize(self, features: dict):
        return [int(features.get('hour', 12)), 0]
