from flask import Blueprint, request, jsonify
from bson.objectid import ObjectId
import datetime
from services.db import get_db
from services.auth import get_request_user

try:
    from app import socketio
except Exception:
    socketio = None

reservation_bp = Blueprint('reservation', __name__)


def _parse_id(value):
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
    user_id = user_payload.get('user_id')
    db = get_db()
    now = datetime.datetime.utcnow()
    doc = {
        'user_id':      user_id,
        'parking_id':   parking_id,
        'parking_name': data.get('parking_name', str(parking_id)),
        'city':         data.get('city', ''),
        'total_slots':  data.get('total_slots', 0),
        'available':    data.get('available', 0),
        'latitude':     data.get('latitude'),
        'longitude':    data.get('longitude'),
        'price':        data.get('price', 0),
        'status':       'active',
        'created_at':   now,
        'expires_at':   now + datetime.timedelta(minutes=30),
    }
    res = db.reservations.insert_one(doc)
    doc['reservation_id'] = str(res.inserted_id)
    doc.pop('_id', None)
    doc['created_at'] = doc['created_at'].isoformat()
    doc['expires_at'] = doc['expires_at'].isoformat()
    if socketio:
        socketio.emit('reservation_update', {'reservation_id': doc['reservation_id'], 'parking_id': parking_id, 'status': 'active'})
    return jsonify(doc), 201


@reservation_bp.route('/cancel', methods=['DELETE'])
@reservation_bp.route('/reservation/<rid>', methods=['DELETE'])
def cancel_reservation(rid=None):
    user_payload = get_request_user()
    if not user_payload:
        return jsonify({'error': 'unauthorized'}), 401
    if rid is None:
        rid = (request.get_json() or {}).get('reservation_id')
    if not rid:
        return jsonify({'error': 'reservation_id required'}), 400
    db = get_db()
    query_id = _parse_id(rid)
    current = db.reservations.find_one({'_id': query_id})
    if not current:
        return jsonify({'error': 'not found'}), 404
    if current.get('user_id') != user_payload.get('user_id'):
        return jsonify({'error': 'forbidden'}), 403
    result = db.reservations.update_one({'_id': query_id}, {'$set': {'status': 'cancelled'}})
    if result.matched_count == 0:
        return jsonify({'error': 'not found'}), 404
    if socketio:
        socketio.emit('reservation_update', {'reservation_id': rid, 'status': 'cancelled'})
    return jsonify({'ok': True}), 200


@reservation_bp.route('/reservations', methods=['GET'])
def list_reservations():
    user_payload = get_request_user()
    if not user_payload:
        return jsonify({'error': 'unauthorized'}), 401
    db = get_db()
    docs = []
    for r in db.reservations.find({'user_id': user_payload.get('user_id')}).sort('created_at', -1).limit(100):
        docs.append({
            'reservation_id': str(r.get('_id')),
            'user_id':        r.get('user_id'),
            'parking_id':     r.get('parking_id'),
            'parking_name':   r.get('parking_name', str(r.get('parking_id', ''))),
            'city':           r.get('city', ''),
            'total_slots':    r.get('total_slots', 0),
            'available':      r.get('available', 0),
            'price':          r.get('price', 0),
            'latitude':       r.get('latitude'),
            'longitude':      r.get('longitude'),
            'status':         r.get('status'),
            'created_at':     r['created_at'].isoformat() if isinstance(r.get('created_at'), datetime.datetime) else str(r.get('created_at')),
            'expires_at':     r['expires_at'].isoformat() if isinstance(r.get('expires_at'), datetime.datetime) else str(r.get('expires_at')),
        })
    return jsonify(docs), 200
