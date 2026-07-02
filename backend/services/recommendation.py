import math

try:
    from .model_loader import ModelLoader
except ImportError:
    from services.model_loader import ModelLoader

model = ModelLoader()

def haversine_distance(lat1, lon1, lat2, lon2):
    # return distance in meters
    R = 6371.0  # km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c * 1000

def score_parking(parking, user_lat, user_lon, features):
    # features is dict of inputs for model.predict
    predicted = int(model.predict(features))
    distance_m = haversine_distance(user_lat, user_lon, parking['latitude'], parking['longitude'])
    # Add small epsilon to avoid division by zero
    score = predicted / (distance_m + 1)

    # occupancy percent based on predicted available slots
    total = parking.get('total_slots', 1)
    occupied = max(0, total - predicted)
    occupancy_pct = (occupied / total) * 100

    return {
        'parking_id': parking['parking_id'],
        'name': parking.get('name'),
        'latitude': parking.get('latitude'),
        'longitude': parking.get('longitude'),
        'total_slots': total,
        'predicted_available': int(predicted),
        'distance_m': round(distance_m, 1),
        'score': score,
        'occupancy_pct': round(occupancy_pct, 1)
    }
