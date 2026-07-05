from flask import Blueprint, request, jsonify
from bson.objectid import ObjectId
import datetime

try:
    from ..services.db import get_db
    from ..services.auth import get_request_user
except ImportError:
    from services.db import get_db
    from services.auth import get_request_user

try:
    from ..app import socketio
except ImportError:
    try:
        from app import socketio
    except Exception:
        socketio = None

reservation_bp = Blueprint('reservation', __name__)


def _parse_object_id(value):
    try:
        return ObjectId(value)
    except Exception:
        return value

@reservation_bp.route('/reserve', methods=['POST'])
def reserve():
    data = request.get_json() or {}
    user_payload = get_request_user()
    if not user_payload:
        return jsonify({'error': 'unauthorized'}), 401
    parking_id = data.get('parking_id')
    if not parking_id:
        return jsonify({'error': 'parking_id required'}), 400
    user_id = user_payload.get('user_id') or data.get('user_id')
    if not user_id:
        return jsonify({'error': 'user_id required'}), 400
    db = get_db()
    reservations = db.reservations
    now = datetime.datetime.utcnow()
    expiry = now + datetime.timedelta(minutes=30)
    doc = {'user_id': user_id, 'parking_id': parking_id, 'status': 'active', 'created_at': now, 'expires_at': expiry}
    res = reservations.insert_one(doc)
    doc['reservation_id'] = str(res.inserted_id)
    doc.pop('_id', None)
    doc['created_at'] = doc['created_at'].isoformat()
    doc['expires_at'] = doc['expires_at'].isoformat()
    if socketio:
        socketio.emit('reservation_update', {'reservation_id': doc['reservation_id'], 'parking_id': parking_id, 'status': 'active'})
    return jsonify(doc), 201

@reservation_bp.route('/reservation/<rid>', methods=['DELETE'])
def cancel_reservation(rid):
    user_payload = get_request_user()
    if not user_payload:
        return jsonify({'error': 'unauthorized'}), 401
    db = get_db()
    reservations = db.reservations
    query_id = _parse_object_id(rid)
    try:
        current = reservations.find_one({'_id': query_id})
        if not current:
            return jsonify({'error': 'not found'}), 404
        if current.get('user_id') != user_payload.get('user_id'):
            return jsonify({'error': 'forbidden'}), 403
        res = reservations.update_one({'_id': query_id}, {'$set': {'status': 'cancelled'}})
        if res.matched_count == 0:
            return jsonify({'error': 'not found'}), 404
        if socketio:
            socketio.emit('reservation_update', {'reservation_id': rid, 'parking_id': None, 'status': 'cancelled'})
        return jsonify({'ok': True}), 200
    except Exception:
        return jsonify({'error': 'invalid id'}), 400

@reservation_bp.route('/reservations', methods=['GET'])
def list_reservations():
    user_payload = get_request_user()
    if not user_payload:
        return jsonify({'error': 'unauthorized'}), 401
    db = get_db()
    reservations = db.reservations
    q = {'user_id': user_payload.get('user_id')}
    docs = []
    for r in reservations.find(q).sort('created_at', -1).limit(100):
        docs.append({
            'reservation_id': str(r.get('_id')),
            'user_id': r.get('user_id'),
            'parking_id': r.get('parking_id'),
            'status': r.get('status'),
            'created_at': r.get('created_at').isoformat() if isinstance(r.get('created_at'), datetime.datetime) else str(r.get('created_at')),
            'expires_at': r.get('expires_at').isoformat() if isinstance(r.get('expires_at'), datetime.datetime) else str(r.get('expires_at'))
        })
    return jsonify(docs), 200
