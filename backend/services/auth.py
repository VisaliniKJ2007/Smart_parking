import time
import jwt
import hmac
import hashlib
import json
import base64
from flask import current_app


def _base64url_encode(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode('utf-8')

def _base64url_decode(s: str) -> bytes:
    padding = '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode((s + padding).encode('utf-8'))


def _sign(data: bytes, secret: str) -> str:
    sig = hmac.new(secret.encode('utf-8'), data, hashlib.sha256).digest()
    return _base64url_encode(sig)


def encode_user(payload, exp_seconds=3600):
    now = int(time.time())
    payload = payload.copy()
    payload.update({'iat': now, 'exp': now + exp_seconds})
    secret = current_app.config.get('SECRET_KEY', 'change-me')
    # Prefer PyJWT if available
    if hasattr(jwt, 'encode'):
        token = jwt.encode(payload, secret, algorithm='HS256')
        if isinstance(token, bytes):
            token = token.decode('utf-8')
        return token
    # Fallback to simple JWT implementation (HS256)
    header = {'alg': 'HS256', 'typ': 'JWT'}
    header_b = _base64url_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    payload_b = _base64url_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))
    signing_input = f"{header_b}.{payload_b}".encode('utf-8')
    signature = _sign(signing_input, secret)
    return f"{header_b}.{payload_b}.{signature}"


def decode_token(token):
    secret = current_app.config.get('SECRET_KEY', 'change-me')
    # Try PyJWT first
    if hasattr(jwt, 'decode'):
        try:
            return jwt.decode(token, secret, algorithms=['HS256'])
        except Exception:
            return None
    # Fallback simple decode (verify signature and return payload)
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header_b, payload_b, sig = parts
        signing_input = f"{header_b}.{payload_b}".encode('utf-8')
        expected_sig = _sign(signing_input, secret)
        if not hmac.compare_digest(expected_sig, sig):
            return None
        payload_json = _base64url_decode(payload_b)
        return json.loads(payload_json)
    except Exception:
        return None
