from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from services.db import get_db
from services.auth import encode_user, get_request_user

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip() or 'User'
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()
    if not email or not password:
        return jsonify({'error': 'email and password required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'password must be at least 6 characters'}), 400
    db = get_db()
    if db.users.find_one({'email': email}):
        return jsonify({'error': 'user exists'}), 409
    user = {'name': name, 'email': email, 'password': generate_password_hash(password)}
    res = db.users.insert_one(user)
    return jsonify({'user_id': str(res.inserted_id), 'email': email}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()
    if not email or not password:
        return jsonify({'error': 'email and password required'}), 400
    db = get_db()
    user = db.users.find_one({'email': email})
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'invalid credentials'}), 401
    token = encode_user({'user_id': str(user['_id']), 'email': email, 'name': user.get('name', 'User')})
    return jsonify({'token': token, 'user_id': str(user['_id'])}), 200


@auth_bp.route('/me', methods=['GET'])
def me():
    user = get_request_user()
    if not user:
        return jsonify({'error': 'unauthorized'}), 401
    return jsonify({'user_id': user.get('user_id'), 'email': user.get('email'), 'name': user.get('name', 'User')}), 200
