from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

socketio = SocketIO(cors_allowed_origins='*', async_mode='threading')


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'smartpark-secret-2024')

    CORS(app)

    from routes.predict     import predict_bp
    from routes.parking     import parking_bp
    from routes.reservation import reservation_bp
    from routes.recommend   import recommend_bp
    from routes.auth        import auth_bp
    from routes.traffic     import traffic_bp
    from routes.realtime    import realtime_bp

    app.register_blueprint(predict_bp)
    app.register_blueprint(parking_bp)
    app.register_blueprint(reservation_bp)
    app.register_blueprint(recommend_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(traffic_bp)
    app.register_blueprint(realtime_bp)

    socketio.init_app(app)

    # Start real-time occupancy engine
    from routes.parking import PARKING_LOTS
    from services.model_loader import ModelLoader
    from services.realtime import init_realtime
    init_realtime(socketio, ModelLoader(), PARKING_LOTS)

    return app


app = create_app()


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'version': '2.0'}), 200


@socketio.on('connect')
def handle_connect():
    print('Client connected')


@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
