from flask import Blueprint, request, jsonify

try:
    from .parking import PARKING_LOTS
    from ..services.recommendation import score_parking
    from ..services.pricing import compute_price
except ImportError:
    from routes.parking import PARKING_LOTS
    from services.recommendation import score_parking
    from services.pricing import compute_price

recommend_bp = Blueprint('recommend', __name__)

@recommend_bp.route('/recommend', methods=['GET'])
def recommend():
    # params: user_lat, user_lon, hour, day, traffic, weather, holiday, event
    params = request.args.to_dict()
    try:
        user_lat = float(params.get('user_lat'))
        user_lon = float(params.get('user_lon'))
    except Exception:
        return jsonify({'error': 'user_lat and user_lon required and must be floats'}), 400

    # Build features dict for model predictor
    features = {k: v for k, v in params.items() if k not in ('user_lat', 'user_lon')}

    results = []
    for p in PARKING_LOTS:
        r = score_parking(p, user_lat, user_lon, features)
        price = compute_price(r['occupancy_pct'])
        r.update({'price': price})
        results.append(r)

    # Sort by score descending
    results.sort(key=lambda x: x['score'], reverse=True)
    return jsonify({'recommendations': results}), 200
