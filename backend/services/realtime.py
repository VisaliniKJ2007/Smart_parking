"""
Real-time parking occupancy engine.
- Fetches live weather from Open-Meteo (free, no key)
- Simulates occupancy changes based on time, weather, day
- Pushes live updates to all connected clients via WebSocket every 30s
- Stores current occupancy in DB
"""
import threading
import time
import random
import datetime
import requests as req

_socketio = None
_model    = None

# In-memory occupancy state: parking_id -> occupied count
_occupancy = {}

def init_realtime(socketio, model, parking_lots):
    global _socketio, _model
    _socketio = socketio
    _model    = model
    for p in parking_lots:
        _occupancy[p['parking_id']] = int(p['total_slots'] * 0.4)
    t = threading.Thread(target=_update_loop, args=(parking_lots,), daemon=True)
    t.start()


def get_weather(lat, lon):
    """Fetch real current weather from Open-Meteo — free, no key needed."""
    try:
        r = req.get(
            'https://api.open-meteo.com/v1/forecast',
            params={
                'latitude': lat, 'longitude': lon,
                'current': 'temperature_2m,precipitation,weathercode',
                'timezone': 'auto',
            },
            timeout=5
        )
        c = r.json().get('current', {})
        code = c.get('weathercode', 0)
        rain = 1 if code in (51,53,55,61,63,65,71,73,75,80,81,82,95,96,99) else 0
        return {
            'temperature': c.get('temperature_2m'),
            'precipitation': c.get('precipitation', 0),
            'weathercode': code,
            'is_rain': rain,
            'description': _weather_desc(code),
        }
    except Exception:
        return {'temperature': None, 'precipitation': 0, 'is_rain': 0, 'description': 'Unknown'}


def _weather_desc(code):
    if code == 0:   return 'Clear sky'
    if code <= 3:   return 'Partly cloudy'
    if code <= 48:  return 'Foggy'
    if code <= 67:  return 'Rainy'
    if code <= 77:  return 'Snowy'
    if code <= 82:  return 'Showers'
    return 'Thunderstorm'


def get_current_occupancy(parking_id):
    return _occupancy.get(parking_id, 0)


def _update_loop(parking_lots):
    """Background thread: updates occupancy every 30s and broadcasts via WebSocket."""
    while True:
        now   = datetime.datetime.now()
        hour  = now.hour
        wday  = now.weekday()   # 0=Mon

        # Fetch weather for first parking lot location
        p0     = parking_lots[0]
        weather = get_weather(p0['latitude'], p0['longitude'])
        rain   = weather['is_rain']

        updates = []
        for p in parking_lots:
            pid   = p['parking_id']
            total = p['total_slots']
            cur   = _occupancy.get(pid, int(total * 0.4))

            # Demand curve: peak at 9-11am and 5-8pm on weekdays
            if 9 <= hour <= 11 or 17 <= hour <= 20:
                demand = 0.85 if wday < 5 else 0.70
            elif 12 <= hour <= 14:
                demand = 0.75
            elif 22 <= hour or hour <= 6:
                demand = 0.15
            else:
                demand = 0.50

            # Rain reduces parking demand (people avoid driving)
            if rain:
                demand *= 0.85

            target   = int(total * demand)
            # Drift current occupancy toward target with small random noise
            delta    = (target - cur) // 4 + random.randint(-2, 2)
            new_occ  = max(0, min(total, cur + delta))
            _occupancy[pid] = new_occ

            available = total - new_occ
            occ_pct   = round((new_occ / total) * 100, 1)

            # ML prediction for next 30 min
            if _model:
                future_hour = (hour + 1) % 24
                pred_30 = _model.predict({
                    'hour': future_hour, 'day': wday,
                    'traffic': 2, 'weather': rain
                })
            else:
                pred_30 = available

            updates.append({
                'parking_id':        pid,
                'name':              p['name'],
                'total_slots':       total,
                'occupied':          new_occ,
                'available':         available,
                'occupancy_pct':     occ_pct,
                'predicted_30_min':  pred_30,
                'weather':           weather,
                'timestamp':         now.isoformat(),
            })

        if _socketio:
            _socketio.emit('occupancy_update', {'lots': updates})

        time.sleep(30)
