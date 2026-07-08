import math

try:
    from .model_loader import ModelLoader
except ImportError:
    from services.model_loader import ModelLoader

model = ModelLoader()


def haversine_distance(lat1, lon1, lat2, lon2):
    """Return distance in meters between two coordinates."""
    R = 6371000  # meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def congestion_label(traffic_val):
    """Map numeric traffic (1-3) to label."""
    if traffic_val <= 1:
        return 'Low'
    if traffic_val <= 2:
        return 'Medium'
    return 'High'


def score_parking(parking, user_lat, user_lon, features):
    predicted = model.predict(features)
    distance_m = haversine_distance(user_lat, user_lon, parking['latitude'], parking['longitude'])

    # score = available_slots / distance (per spec)
    score = predicted / (distance_m + 1)

    total = parking.get('total_slots', 1)
    occupied = max(0, total - predicted)
    occupancy_pct = round((occupied / total) * 100, 1)

    traffic_raw = str(features.get('traffic', 'medium')).lower()
    try:
        traffic_val = int(float(traffic_raw))
    except ValueError:
        from services.model_loader import TRAFFIC_MAP
        traffic_val = TRAFFIC_MAP.get(traffic_raw, 2)

    return {
        'parking_id': parking['parking_id'],
        'name': parking.get('name'),
        'latitude': parking.get('latitude'),
        'longitude': parking.get('longitude'),
        'total_slots': total,
        'predicted_available': predicted,
        'distance_m': round(distance_m, 1),
        'score': round(score, 4),
        'occupancy_pct': occupancy_pct,
        'traffic': congestion_label(traffic_val),
    }
