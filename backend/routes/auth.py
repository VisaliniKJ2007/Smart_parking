from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

try:
    from ..services.db import get_db
    from ..services.auth import encode_user
except ImportError:
    from services.db import get_db
    from services.auth import encode_user

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error':'email and password required'}),400
    db = get_db()
    users = db.users
    if users.find_one({'email': email}):
        return jsonify({'error':'user exists'}),409
    hashed = generate_password_hash(password)
    user = {'name':name,'email':email,'password':hashed}
    res = users.insert_one(user)
    return jsonify({'user_id': str(res.inserted_id), 'email': email}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error':'email and password required'}),400
    db = get_db()
    users = db.users
    user = users.find_one({'email': email})
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error':'invalid credentials'}),401
    token = encode_user({'user_id': str(user.get('_id')), 'email': email})
    return jsonify({'token': token, 'user_id': str(user.get('_id'))}),200
