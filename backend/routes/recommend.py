import math
import random
import datetime
from flask import Blueprint, request, jsonify
from services.pricing import compute_price
from services.model_loader import ModelLoader
from services.realtime import get_weather
from routes.traffic import overpass_parking, haversine

recommend_bp = Blueprint('recommend', __name__)
_model = ModelLoader()

# Cache occupancy per OSM parking id so it stays stable between calls
_osm_occupancy = {}


def _simulate_occupancy(parking_id, total_slots):
    """Simulate realistic occupancy for any parking lot based on time of day."""
    now   = datetime.datetime.now()
    hour  = now.hour
    wday  = now.weekday()

    if 9 <= hour <= 11 or 17 <= hour <= 20:
        demand = 0.85 if wday < 5 else 0.70
    elif 12 <= hour <= 14:
        demand = 0.75
    elif 22 <= hour or hour <= 6:
        demand = 0.15
    else:
        demand = 0.50

    prev = _osm_occupancy.get(parking_id, int(total_slots * demand))
    target = int(total_slots * demand)
    delta  = (target - prev) // 4 + random.randint(-2, 2)
    new_occ = max(0, min(total_slots, prev + delta))
    _osm_occupancy[parking_id] = new_occ
    return new_occ


@recommend_bp.route('/recommend', methods=['GET'])
def recommend():
    """
    GET /recommend?user_lat=13.08&user_lon=80.27
    Works for ANY city worldwide.
    1. Fetches real parking lots from OSM Overpass near the given lat/lon
    2. Simulates real-time occupancy for each lot
    3. Applies ML model for 30-min forecast
    4. Returns ranked results with price, weather, drive time estimate
    """
    params = request.args.to_dict()
    try:
        user_lat = float(params['user_lat'])
        user_lon = float(params['user_lon'])
    except (KeyError, ValueError):
        return jsonify({'error': 'user_lat and user_lon required'}), 400

    now  = datetime.datetime.now()
    hour = int(params.get('hour', now.hour))
    day  = int(params.get('day',  now.weekday()))

    # 1. Live weather at searched location
    weather = get_weather(user_lat, user_lon)
    rain    = weather.get('is_rain', 0)

    # 2. Fetch real parking lots from OSM near this location
    elements = overpass_parking(user_lat, user_lon, radius=3000)

    lots = []
    for i, el in enumerate(elements[:15]):
        if el['type'] == 'way':
            c = el.get('center', {})
            elat, elon = c.get('lat'), c.get('lon')
        else:
            elat, elon = el.get('lat'), el.get('lon')
        if elat is None or elon is None:
            continue
        tags     = el.get('tags', {})
        name     = tags.get('name') or tags.get('operator') or f'Parking {i+1}'
        capacity = int(tags.get('capacity') or 50)
        lots.append({
            'parking_id': f"osm_{el['id']}",
            'name':       name,
            'latitude':   elat,
            'longitude':  elon,
            'total_slots': capacity,
            'fee':        tags.get('fee', 'unknown'),
        })

    # Fallback: if OSM returns nothing, generate synthetic lots around the point
    if not lots:
        offsets = [(0.005,0.003),(-0.004,0.006),(0.007,-0.002),(-0.003,-0.005),(0.002,0.008)]
        for i, (dlat, dlon) in enumerate(offsets):
            lots.append({
                'parking_id': f"syn_{i}",
                'name':       f'Parking Area {i+1}',
                'latitude':   user_lat + dlat,
                'longitude':  user_lon + dlon,
                'total_slots': random.choice([40, 60, 80, 100, 120]),
                'fee':        'yes',
            })

    # 3. Score each lot
    features  = {'hour': hour, 'day': day, 'traffic': 2, 'weather': rain}
    future_f  = {'hour': (hour + 1) % 24, 'day': day, 'traffic': 2, 'weather': rain}

    results = []
    for p in lots:
        pid      = p['parking_id']
        total    = p['total_slots']
        occupied = _simulate_occupancy(pid, total)
        available = max(0, total - occupied)
        occ_pct  = round((occupied / total) * 100, 1)
        dist     = haversine(user_lat, user_lon, p['latitude'], p['longitude'])
        score    = available / (dist + 1)
        pred_30  = _model.predict(future_f)
        price    = compute_price(occ_pct)

        results.append({
            'parking_id':             pid,
            'name':                   p['name'],
            'latitude':               p['latitude'],
            'longitude':              p['longitude'],
            'total_slots':            total,
            'occupied':               occupied,
            'predicted_available':    available,
            'predicted_slots_30_min': pred_30,
            'distance_m':             round(dist, 1),
            'score':                  round(score, 4),
            'occupancy_pct':          occ_pct,
            'traffic':                'High' if occ_pct > 80 else ('Medium' if occ_pct > 50 else 'Low'),
            'price':                  price,
            'fee':                    p.get('fee', 'unknown'),
        })

    results.sort(key=lambda x: x['score'], reverse=True)
    return jsonify({'recommendations': results, 'weather': weather}), 200
