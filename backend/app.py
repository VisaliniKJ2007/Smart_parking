from flask import Flask, jsonify
from flask_socketio import SocketIO

socketio = SocketIO(cors_allowed_origins='*', async_mode='threading')

try:
    from .routes.predict import predict_bp
    from .routes.parking import parking_bp
    from .routes.reservation import reservation_bp
    from .routes.recommend import recommend_bp
    from .routes.auth import auth_bp
except ImportError:
    from routes.predict import predict_bp
    from routes.parking import parking_bp
    from routes.reservation import reservation_bp
    from routes.recommend import recommend_bp
    from routes.auth import auth_bp


def create_app():
    app = Flask(__name__)
    app.config.from_mapping({'SECRET_KEY': 'change-me'})

    # Register blueprints
    app.register_blueprint(predict_bp, url_prefix='/')
    app.register_blueprint(parking_bp, url_prefix='/')
    app.register_blueprint(reservation_bp, url_prefix='/')
    app.register_blueprint(recommend_bp, url_prefix='/')
    app.register_blueprint(auth_bp)

    socketio.init_app(app)
    return app

app = create_app()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
