from flask import Blueprint, jsonify

parking_bp = Blueprint('parking', __name__)

PARKING_LOTS = [
    {'parking_id': 1, 'name': 'City Mall Parking',   'latitude': 11.3800, 'longitude': 77.8900, 'total_slots': 100},
    {'parking_id': 2, 'name': 'Central Plaza',        'latitude': 11.3900, 'longitude': 77.8800, 'total_slots': 50},
    {'parking_id': 3, 'name': 'Bus Stand Parking',    'latitude': 11.3750, 'longitude': 77.8950, 'total_slots': 80},
    {'parking_id': 4, 'name': 'Market Street Lot',    'latitude': 11.3850, 'longitude': 77.8850, 'total_slots': 60},
]


@parking_bp.route('/parking-lots', methods=['GET'])
def get_parking_lots():
    return jsonify(PARKING_LOTS), 200
