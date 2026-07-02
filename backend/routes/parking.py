from flask import Blueprint, jsonify

parking_bp = Blueprint('parking', __name__)

PARKING_LOTS = [
    {'parking_id': 1, 'name': 'City Mall Parking', 'latitude': 11.38, 'longitude': 77.89, 'total_slots': 100},
    {'parking_id': 2, 'name': 'Central Plaza', 'latitude': 11.39, 'longitude': 77.88, 'total_slots': 50}
]

@parking_bp.route('/parking-lots', methods=['GET'])
def get_parking_lots():
    return jsonify(PARKING_LOTS), 200
