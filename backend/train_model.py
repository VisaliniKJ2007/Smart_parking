import os
import pickle

import pandas as pd
from sklearn.ensemble import RandomForestRegressor

DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'parking_data.csv')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')

FEATURES = ['hour', 'day', 'traffic', 'weather']


def train_and_save_model():
    if not os.path.exists(DATA_PATH) or os.path.getsize(DATA_PATH) == 0:
        raise FileNotFoundError(f"Training data not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    X = df[FEATURES]
    y = df['available_slots']

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)

    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)

    print(f"Model trained and saved to {MODEL_PATH}")
    return MODEL_PATH


if __name__ == '__main__':
    train_and_save_model()
