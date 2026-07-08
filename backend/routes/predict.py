from flask import Blueprint, request, jsonify

try:
    from ..services.model_loader import ModelLoader
except ImportError:
    from services.model_loader import ModelLoader

try:
    from ..services.pricing import compute_price
except ImportError:
    from services.pricing import compute_price

predict_bp = Blueprint('predict', __name__)
model = ModelLoader()


@predict_bp.route('/predict', methods=['GET'])
def predict():
    """
    GET /predict?parking_id=1&hour=17&day=4&traffic=High&weather=Rain
    Returns predicted available slots, 30-min forecast, traffic label, and price.
    """
    params = request.args.to_dict()
    try:
        available = model.predict(params)

        # 30-min forecast: shift hour by 0.5 and re-predict
        future_params = dict(params)
        future_params['hour'] = int(params.get('hour', 12)) + 1
        predicted_30 = model.predict(future_params)

        traffic_raw = str(params.get('traffic', 'medium')).lower()
        from services.model_loader import TRAFFIC_MAP
        traffic_val = TRAFFIC_MAP.get(traffic_raw, 2) if not traffic_raw.isdigit() else int(traffic_raw)
        traffic_label = 'Low' if traffic_val <= 1 else ('Medium' if traffic_val <= 2 else 'High')

        total_slots = 100
        occupied = max(0, total_slots - available)
        occupancy_pct = (occupied / total_slots) * 100
        price = compute_price(occupancy_pct)

        return jsonify({
            'parking_id': params.get('parking_id'),
            'predicted_available_slots': available,
            'predicted_slots_30_min': predicted_30,
            'traffic': traffic_label,
            'price_per_hour': price['price_per_hour'],
            'currency': price['currency'],
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400
