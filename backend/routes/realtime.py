from flask import Blueprint, jsonify, request
from services.realtime import get_current_occupancy, get_weather
from routes.parking import PARKING_LOTS

realtime_bp = Blueprint('realtime', __name__)


@realtime_bp.route('/occupancy', methods=['GET'])
def occupancy():
    """GET /occupancy — returns live occupancy for all parking lots + weather."""
    lat = float(request.args.get('lat', PARKING_LOTS[0]['latitude']))
    lon = float(request.args.get('lon', PARKING_LOTS[0]['longitude']))
    weather = get_weather(lat, lon)
    lots = []
    for p in PARKING_LOTS:
        occupied  = get_current_occupancy(p['parking_id'])
        available = max(0, p['total_slots'] - occupied)
        occ_pct   = round((occupied / p['total_slots']) * 100, 1)
        lots.append({
            'parking_id':    p['parking_id'],
            'name':          p['name'],
            'latitude':      p['latitude'],
            'longitude':     p['longitude'],
            'total_slots':   p['total_slots'],
            'occupied':      occupied,
            'available':     available,
            'occupancy_pct': occ_pct,
        })
    return jsonify({'lots': lots, 'weather': weather}), 200
