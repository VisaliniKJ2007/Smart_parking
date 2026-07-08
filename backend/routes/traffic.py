import math
import requests
from flask import Blueprint, request, jsonify

traffic_bp = Blueprint('traffic', __name__)

# ── helpers ──────────────────────────────────────────────────────────────────

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def osrm_route(origin_lat, origin_lon, dest_lat, dest_lon):
    """
    Free OSRM public API — no key needed.
    Returns (distance_m, duration_sec) or None on failure.
    """
    url = (
        f"http://router.project-osrm.org/route/v1/driving/"
        f"{origin_lon},{origin_lat};{dest_lon},{dest_lat}"
        f"?overview=false"
    )
    try:
        r = requests.get(url, timeout=5)
        data = r.json()
        if data.get('code') == 'Ok':
            leg = data['routes'][0]['legs'][0]
            return leg['distance'], leg['duration']
    except Exception:
        pass
    return None, None


def overpass_parking(lat, lon, radius=2000):
    """
    Free Overpass API — queries real parking lots from OpenStreetMap.
    No key needed.
    """
    query = f"""
    [out:json][timeout:10];
    (
      node["amenity"="parking"]({lat-0.02},{lon-0.02},{lat+0.02},{lon+0.02});
      way["amenity"="parking"]({lat-0.02},{lon-0.02},{lat+0.02},{lon+0.02});
    );
    out center 15;
    """
    try:
        r = requests.post(
            'https://overpass-api.de/api/interpreter',
            data={'data': query},
            timeout=10
        )
        return r.json().get('elements', [])
    except Exception:
        return []


# ── routes ────────────────────────────────────────────────────────────────────

@traffic_bp.route('/traffic', methods=['GET'])
def get_traffic():
    """
    GET /traffic?origin_lat=13.08&origin_lon=80.27&dest_lat=13.09&dest_lon=80.28
    Accepts optional dest_lat/dest_lon list as JSON body, or fetches OSM lots near dest.
    Works for any city worldwide.
    """
    try:
        origin_lat = float(request.args.get('origin_lat'))
        origin_lon = float(request.args.get('origin_lon'))
    except (TypeError, ValueError):
        return jsonify({'error': 'origin_lat and origin_lon required'}), 400

    # Use destination coords if provided, else use origin (nearby parking)
    dest_lat = float(request.args.get('dest_lat', origin_lat))
    dest_lon = float(request.args.get('dest_lon', origin_lon))

    # Fetch real OSM parking lots near destination
    elements = overpass_parking(dest_lat, dest_lon, radius=3000)
    parking_list = []
    for i, el in enumerate(elements[:12]):
        if el['type'] == 'way':
            c = el.get('center', {})
            elat, elon = c.get('lat'), c.get('lon')
        else:
            elat, elon = el.get('lat'), el.get('lon')
        if elat is None or elon is None:
            continue
        tags = el.get('tags', {})
        parking_list.append({
            'parking_id': f"osm_{el['id']}",
            'name': tags.get('name') or tags.get('operator') or f'Parking {i+1}',
            'latitude': elat, 'longitude': elon,
        })

    # Fallback to static lots if OSM empty
    if not parking_list:
        from routes.parking import PARKING_LOTS
        parking_list = PARKING_LOTS

    results = []
    for p in parking_list:
        dist_m, dur_sec = osrm_route(origin_lat, origin_lon, p['latitude'], p['longitude'])
        if dist_m is None:
            dist_m  = haversine(origin_lat, origin_lon, p['latitude'], p['longitude'])
            dur_sec = dist_m / 8.33
        dur_min   = max(1, int(dur_sec / 60))
        dist_km   = dist_m / 1000
        speed_kmh = (dist_km / (dur_sec / 3600)) if dur_sec > 0 else 30
        condition = 'Low' if speed_kmh > 40 else ('Medium' if speed_kmh > 20 else 'High')
        results.append({
            'parking_id':              p['parking_id'],
            'name':                    p['name'],
            'distance_m':             round(dist_m),
            'distance_text':          f"{round(dist_km,1)} km" if dist_km >= 1 else f"{round(dist_m)} m",
            'duration_sec':           round(dur_sec),
            'duration_text':          f"{dur_min} min",
            'duration_in_traffic_text': f"{dur_min} min",
            'traffic_condition':      condition,
        })
    return jsonify({'results': results, 'source': 'osrm'}), 200


@traffic_bp.route('/places', methods=['GET'])
def get_nearby_parking():
    """
    GET /places?lat=11.38&lon=77.89&radius=2000
    Returns real parking lots from OpenStreetMap via free Overpass API.
    Falls back to static list if Overpass returns nothing.
    """
    try:
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
    except (TypeError, ValueError):
        return jsonify({'error': 'lat and lon required'}), 400

    radius = int(request.args.get('radius', 2000))

    try:
        from routes.parking import PARKING_LOTS
    except ImportError:
        from .parking import PARKING_LOTS

    elements = overpass_parking(lat, lon, radius)

    places = []
    for i, el in enumerate(elements[:12]):
        # Ways have a 'center', nodes have direct lat/lon
        if el['type'] == 'way':
            c = el.get('center', {})
            elat, elon = c.get('lat'), c.get('lon')
        else:
            elat, elon = el.get('lat'), el.get('lon')

        if elat is None or elon is None:
            continue

        tags = el.get('tags', {})
        name = tags.get('name') or tags.get('operator') or f'Parking {i + 1}'
        capacity = int(tags.get('capacity', 50))

        places.append({
            'parking_id': f"osm_{el['id']}",
            'name': name,
            'latitude': elat,
            'longitude': elon,
            'total_slots': capacity,
            'osm_id': el['id'],
            'fee': tags.get('fee', 'unknown'),
            'access': tags.get('access', 'yes'),
        })

    if not places:
        # Overpass returned nothing (rural area / timeout) — use static lots
        return jsonify({'places': PARKING_LOTS, 'source': 'static'}), 200

    return jsonify({'places': places, 'source': 'osm'}), 200


@traffic_bp.route('/geocode', methods=['GET'])
def geocode():
    """
    GET /geocode?q=Chennai
    Free Nominatim geocoding — converts city/address to lat/lon.
    """
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify({'error': 'q required'}), 400
    try:
        r = requests.get(
            'https://nominatim.openstreetmap.org/search',
            params={'q': q, 'format': 'json', 'limit': 5},
            headers={'User-Agent': 'SmartParkAI/1.0'},
            timeout=6
        )
        results = r.json()
        places = [{
            'display_name': p['display_name'],
            'lat': float(p['lat']),
            'lon': float(p['lon']),
            'type': p.get('type', ''),
        } for p in results]
        return jsonify({'results': places}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 502


@traffic_bp.route('/route', methods=['GET'])
def get_route():
    """
    GET /route?origin_lat=&origin_lon=&dest_lat=&dest_lon=
    Returns full GeoJSON polyline from OSRM for drawing on map.
    """
    try:
        olat = float(request.args.get('origin_lat'))
        olon = float(request.args.get('origin_lon'))
        dlat = float(request.args.get('dest_lat'))
        dlon = float(request.args.get('dest_lon'))
    except (TypeError, ValueError):
        return jsonify({'error': 'origin_lat, origin_lon, dest_lat, dest_lon required'}), 400

    url = (
        f"http://router.project-osrm.org/route/v1/driving/"
        f"{olon},{olat};{dlon},{dlat}"
        f"?overview=full&geometries=geojson&steps=true"
    )
    try:
        r = requests.get(url, timeout=8)
        data = r.json()
        if data.get('code') != 'Ok':
            return jsonify({'error': 'No route found'}), 404
        route = data['routes'][0]
        steps = [
            s['maneuver'].get('instruction', s.get('name', ''))
            for leg in route['legs']
            for s in leg['steps']
            if s['maneuver'].get('instruction') or s.get('name')
        ]
        return jsonify({
            'geometry': route['geometry'],
            'distance_m': round(route['distance']),
            'duration_sec': round(route['duration']),
            'duration_text': f"{max(1, int(route['duration'] / 60))} min",
            'steps': steps[:8],
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 502
