from flask import Blueprint, request, jsonify

try:
    from ..services.model_loader import ModelLoader
except ImportError:
    from services.model_loader import ModelLoader

predict_bp = Blueprint('predict', __name__)
model = ModelLoader()

@predict_bp.route('/predict', methods=['GET'])
def predict():
    params = request.args.to_dict()
    try:
        pred = model.predict(params)
        return jsonify({'predicted_slots': int(pred)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400
