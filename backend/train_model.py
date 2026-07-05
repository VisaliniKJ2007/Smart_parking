import os
import pickle

import pandas as pd
from sklearn.linear_model import LinearRegression

DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'parking_data.csv')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')


def train_and_save_model():
    if not os.path.exists(DATA_PATH) or os.path.getsize(DATA_PATH) == 0:
        sample_data = pd.DataFrame([
            {'hour': 8, 'traffic': 1, 'available_slots': 40},
            {'hour': 12, 'traffic': 2, 'available_slots': 25},
            {'hour': 18, 'traffic': 3, 'available_slots': 15},
            {'hour': 21, 'traffic': 3, 'available_slots': 10},
            {'hour': 6, 'traffic': 1, 'available_slots': 45},
        ])
    else:
        sample_data = pd.read_csv(DATA_PATH)

    X = sample_data[['hour', 'traffic']]
    y = sample_data['available_slots']

    model = LinearRegression()
    model.fit(X, y)

    with open(MODEL_PATH, 'wb') as handle:
        pickle.dump(model, handle)

    return MODEL_PATH


if __name__ == '__main__':
    print(train_and_save_model())
