import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:5000';
const DEFAULT_POS = [11.38, 77.89];

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl:   'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});
const destIcon = new L.Icon({
  iconUrl:   'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

function occColor(pct) {
  if (pct < 50) return '#16a34a';
  if (pct < 80) return '#d97706';
  return '#dc2626';
}
function occLabel(pct) {
  if (pct < 50) return 'Available';
  if (pct < 80) return 'Moderate';
  return 'Full';
}
function occBg(pct) {
  if (pct < 50) return '#dcfce7';
  if (pct < 80) return '#fef9c3';
  return '#fee2e2';
}

function MapFlyTo({ position, zoom }) {
  const map = useMap();
  useEffect(() => { map.flyTo(position, zoom || map.getZoom(), { duration: 1.2 }); }, [position]);
  return null;
}

function WeatherWidget({ weather }) {
  if (!weather || weather.temperature == null) return null;
  const icons = { 'Clear sky': '☀️', 'Partly cloudy': '⛅', 'Foggy': '🌫️', 'Rainy': '🌧️', 'Snowy': '❄️', 'Showers': '🌦️', 'Thunderstorm': '⛈️', 'Unknown': '🌡️' };
  const icon = icons[weather.description] || '🌡️';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: '#f0f9ff', borderRadius: 8, fontSize: 13, border: '1px solid #bae6fd' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span><strong>{weather.temperature}°C</strong> · {weather.description}</span>
      {weather.is_rain ? <span style={{ color: '#0369a1' }}>· 🌧 Rain detected</span> : null}
    </div>
  );
}

function OccupancyBar({ pct }) {
  return (
    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: occColor(pct), borderRadius: 3, transition: 'width 0.8s ease' }} />
    </div>
  );
}

export default function MapView({ user }) {
  const watchRef  = useRef(null);

  const [position,    setPosition]    = useState(DEFAULT_POS);
  const [gpsStatus,   setGpsStatus]   = useState('Locating you...');
  const [accuracy,    setAccuracy]    = useState(null);

  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [destination, setDestination] = useState(null);

  const [recs,        setRecs]        = useState([]);
  const [liveOcc,     setLiveOcc]     = useState({});   // parking_id -> live data
  const [weather,     setWeather]     = useState(null);
  const [trafficData, setTrafficData] = useState({});

  const [route,       setRoute]       = useState(null);
  const [routeTarget, setRouteTarget] = useState(null);
  const [mapCenter,   setMapCenter]   = useState(DEFAULT_POS);
  const [mapZoom,     setMapZoom]     = useState(15);
  const [tick,        setTick]        = useState(Date.now());
  const [lastUpdate,  setLastUpdate]  = useState(null);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // WebSocket — live occupancy every 30s
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.on('occupancy_update', (data) => {
      const map = {};
      (data.lots || []).forEach(l => { map[l.parking_id] = l; });
      setLiveOcc(map);
      setLastUpdate(new Date().toLocaleTimeString());
      if (data.lots?.[0]?.weather) setWeather(data.lots[0].weather);
    });
    socket.on('reservation_update', () => fetchRecs(position[0], position[1]));
    return () => socket.disconnect();
  }, [position]);

  // Live GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported');
      fetchAll(DEFAULT_POS[0], DEFAULT_POS[1]);
      return;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        setAccuracy(Math.round(pos.coords.accuracy));
        setGpsStatus('Live GPS active');
        if (!destination) { fetchRecs(lat, lng); fetchTraffic(lat, lng); setMapCenter([lat, lng]); }
      },
      (err) => {
        setGpsStatus(`GPS unavailable — ${err.message}`);
        if (!destination) fetchRecs(DEFAULT_POS[0], DEFAULT_POS[1]);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchRef.current);
  }, [destination]);

  // Initial load
  useEffect(() => {
    fetchRecs(DEFAULT_POS[0], DEFAULT_POS[1]);
    fetchTraffic(DEFAULT_POS[0], DEFAULT_POS[1]);
    fetchOccupancy(DEFAULT_POS[0], DEFAULT_POS[1]);
  }, []);

  function fetchAll(lat, lng) {
    fetchRecs(lat, lng);
    fetchTraffic(lat, lng);
  }

  function fetchOccupancy(lat, lng) {
    axios.get(`/occupancy?lat=${lat}&lon=${lng}`)
      .then(r => {
        const map = {};
        (r.data.lots || []).forEach(l => { map[l.parking_id] = l; });
        setLiveOcc(map);
        if (r.data.weather) setWeather(r.data.weather);
      }).catch(() => {});
  }

  function fetchRecs(lat, lng) {
    const now  = new Date();
    axios.get(`/recommend?user_lat=${lat}&user_lon=${lng}&hour=${now.getHours()}&day=${now.getDay()}`)
      .then(r => {
        setRecs(r.data.recommendations || []);
        if (r.data.weather) setWeather(r.data.weather);
      }).catch(() => {});
  }

  function fetchTraffic(lat, lng) {
    axios.get(`/traffic?origin_lat=${position[0]}&origin_lon=${position[1]}&dest_lat=${lat}&dest_lon=${lng}`)
      .then(r => {
        const map = {};
        (r.data.results || []).forEach(t => { map[t.parking_id] = t; });
        setTrafficData(map);
      }).catch(() => {});
  }

  // Search
  function handleSearch(e) {
    const val = e.target.value;
    setQuery(val);
    if (val.length < 3) { setSuggestions([]); return; }
    axios.get(`/geocode?q=${encodeURIComponent(val)}`)
      .then(r => setSuggestions(r.data.results || []))
      .catch(() => {});
  }

  function selectDest(place) {
    const dest = { lat: place.lat, lon: place.lon, name: place.display_name };
    setDestination(dest);
    setQuery(place.display_name.split(',').slice(0, 2).join(','));
    setSuggestions([]);
    setMapCenter([place.lat, place.lon]);
    setMapZoom(14);
    // Fetch parking + weather AT the destination
    fetchRecs(place.lat, place.lon);
    fetchTraffic(place.lat, place.lon);
    fetchOccupancy(place.lat, place.lon);
  }

  function clearDest() {
    setDestination(null);
    setQuery('');
    setSuggestions([]);
    setRoute(null);
    setRouteTarget(null);
    setMapCenter(position);
    setMapZoom(15);
    fetchRecs(position[0], position[1]);
    fetchTraffic(position[0], position[1]);
  }

  function navigateTo(parking) {
    setRouteTarget(parking);
    axios.get(`/route?origin_lat=${position[0]}&origin_lon=${position[1]}&dest_lat=${parking.latitude}&dest_lon=${parking.longitude}`)
      .then(r => {
        const coords = r.data.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setRoute({ coords, steps: r.data.steps, duration_text: r.data.duration_text, distance_m: r.data.distance_m, target: parking.name });
        setMapCenter([parking.latitude, parking.longitude]);
      }).catch(() => {});
  }

  // Merge live occupancy into recs
  const enriched = recs.map(p => {
    const live = liveOcc[p.parking_id];
    if (live) {
      return { ...p, predicted_available: live.available, occupied: live.occupied, occupancy_pct: live.occupancy_pct };
    }
    return p;
  });

  const best = enriched[0];

  return (
    <div style={{ display: 'grid', gap: 10 }}>

      {/* Search bar */}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, zIndex: 1 }}>🔍</span>
            <input value={query} onChange={handleSearch}
              placeholder="Search city or destination (e.g. Chennai, Coimbatore...)"
              style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: 10, border: '2px solid #e2e8f0', fontSize: 14, outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          {destination && (
            <button onClick={clearDest}
              style={{ padding: '0 16px', borderRadius: 10, border: 'none', background: '#fee2e2', color: '#dc2626', fontWeight: 600, cursor: 'pointer' }}>
              ✕ Clear
            </button>
          )}
        </div>
        {suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999, marginTop: 4, overflow: 'hidden' }}>
            {suggestions.map((s, i) => (
              <div key={i} onClick={() => selectDest(s)}
                style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, borderBottom: i < suggestions.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', gap: 10, alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <span>📍</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.display_name.split(',')[0]}</div>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>{s.display_name.split(',').slice(1, 3).join(',')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status + weather row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ padding: '6px 12px', background: '#eff6ff', borderRadius: 8, fontSize: 13, display: 'flex', gap: 10, alignItems: 'center', flex: 1 }}>
          <span>📍 <strong>{gpsStatus}</strong>{accuracy ? ` ±${accuracy}m` : ''}</span>
          <span>🕐 {new Date(tick).toLocaleTimeString()}</span>
          {lastUpdate && <span style={{ color: '#16a34a' }}>🔴 Live · {lastUpdate}</span>}
          {user && <span>👤 {user.name || user.email}</span>}
        </div>
        <WeatherWidget weather={weather} />
        {route && (
          <div style={{ padding: '6px 12px', background: '#dbeafe', borderRadius: 8, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>🧭 <strong>{route.duration_text}</strong> · {route.distance_m >= 1000 ? `${(route.distance_m/1000).toFixed(1)} km` : `${route.distance_m} m`} to {route.target}</span>
            <button onClick={() => { setRoute(null); setRouteTarget(null); }}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, border: '1px solid #2563eb', background: 'transparent', color: '#2563eb', cursor: 'pointer' }}>
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Destination banner */}
      {destination && (
        <div style={{ padding: '10px 14px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13 }}>
          🎯 <strong>Destination:</strong> {destination.name.split(',').slice(0, 3).join(', ')}
          <span style={{ color: '#92400e', marginLeft: 8 }}>· Showing real-time parking near this location</span>
        </div>
      )}

      {/* Best parking banner */}
      {best && (
        <div style={{ padding: 14, borderRadius: 12, background: 'linear-gradient(90deg,#1d4ed8,#0ea5e9)', color: '#fff', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 2 }}>🏆 BEST RECOMMENDATION {destination ? `NEAR ${destination.name.split(',')[0].toUpperCase()}` : 'NEAR YOU'}</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{best.name}</div>
            <div style={{ fontSize: 13, marginTop: 4, opacity: 0.95 }}>
              <strong>{best.predicted_available}</strong>/{best.total_slots} slots free
              · {occLabel(best.occupancy_pct)}
              {trafficData[best.parking_id] && <span> · 🚗 {trafficData[best.parking_id].duration_in_traffic_text}</span>}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
              30-min forecast: {best.predicted_slots_30_min} slots · ₹{best.price?.price_per_hour}/hr
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
            <button onClick={() => navigateTo(best)}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#fff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              🧭 Navigate
            </button>
          </div>
        </div>
      )}

      {/* Parking cards */}
      {enriched.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
            🅿️ {enriched.length} parking lots · Real-time occupancy · Updated {lastUpdate || 'loading...'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
            {enriched.map((p, i) => {
              const td = trafficData[p.parking_id];
              const isTarget = routeTarget?.parking_id === p.parking_id;
              return (
                <div key={p.parking_id} onClick={() => navigateTo(p)}
                  style={{ padding: 14, borderRadius: 12, background: '#fff', border: `2px solid ${isTarget ? '#2563eb' : i === 0 ? '#93c5fd' : '#e2e8f0'}`, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>#{i+1} {p.name}</div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: occBg(p.occupancy_pct), color: occColor(p.occupancy_pct), fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {occLabel(p.occupancy_pct)}
                    </span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: occColor(p.occupancy_pct) }}>
                    {p.predicted_available}
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8' }}>/{p.total_slots} free</span>
                  </div>
                  <OccupancyBar pct={p.occupancy_pct} />
                  <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', display: 'grid', gap: 2 }}>
                    {td && <span>🚗 {td.duration_in_traffic_text} · {td.distance_text}</span>}
                    <span>⏱ 30-min: {p.predicted_slots_30_min} slots</span>
                    <span>💰 ₹{p.price?.price_per_hour}/hr</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: isTarget ? '#2563eb' : '#94a3b8', fontWeight: 600 }}>
                    {isTarget ? '🧭 Navigating...' : 'Click to navigate →'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Turn-by-turn */}
      {route?.steps?.length > 0 && (
        <div style={{ padding: 14, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>🧭 Directions to {route.target}</div>
          <ol style={{ margin: '0 0 0 20px', padding: 0, fontSize: 13, lineHeight: 2, color: '#334155' }}>
            {route.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}

      {/* Map */}
      <MapContainer center={DEFAULT_POS} zoom={15} style={{ height: '72vh', width: '100%', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapFlyTo position={mapCenter} zoom={mapZoom} />

        {/* User */}
        <Marker position={position} icon={userIcon}>
          <Popup><strong>📍 You</strong>{accuracy && <div>±{accuracy}m accuracy</div>}</Popup>
        </Marker>
        {accuracy && (
          <CircleMarker center={position} radius={Math.min(accuracy/3, 40)}
            pathOptions={{ color: '#2563eb', fillColor: '#93c5fd', fillOpacity: 0.2, weight: 1 }} />
        )}

        {/* Destination */}
        {destination && (
          <Marker position={[destination.lat, destination.lon]} icon={destIcon}>
            <Popup><strong>🎯 {destination.name.split(',')[0]}</strong><div style={{ fontSize: 12 }}>Destination</div></Popup>
          </Marker>
        )}

        {/* Parking markers */}
        {enriched.map(p => (
          <CircleMarker key={p.parking_id}
            center={[p.latitude, p.longitude]} radius={16}
            pathOptions={{ color: occColor(p.occupancy_pct), fillColor: occColor(p.occupancy_pct), fillOpacity: 0.85, weight: 2 }}
            eventHandlers={{ click: () => navigateTo(p) }}>
            <Popup>
              <div style={{ minWidth: 180, fontSize: 13 }}>
                <strong style={{ fontSize: 15 }}>🅿️ {p.name}</strong>
                <div style={{ margin: '6px 0 2px' }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: occColor(p.occupancy_pct) }}>{p.predicted_available}</span>
                  <span style={{ color: '#94a3b8' }}>/{p.total_slots} free</span>
                </div>
                <OccupancyBar pct={p.occupancy_pct} />
                <div style={{ marginTop: 6, display: 'grid', gap: 2 }}>
                  <span>Status: <strong style={{ color: occColor(p.occupancy_pct) }}>{occLabel(p.occupancy_pct)}</strong></span>
                  {trafficData[p.parking_id] && <span>🚗 {trafficData[p.parking_id].duration_in_traffic_text} · {trafficData[p.parking_id].distance_text}</span>}
                  <span>⏱ 30-min: {p.predicted_slots_30_min} slots</span>
                  <span>💰 ₹{p.price?.price_per_hour}/hr</span>
                </div>
                <button onClick={() => navigateTo(p)}
                  style={{ marginTop: 8, width: '100%', padding: '6px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                  🧭 Navigate Here
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Route */}
        {route && <Polyline positions={route.coords} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.9 }} />}
      </MapContainer>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#64748b', padding: '4px 0' }}>
        <span><span style={{ color: '#16a34a', fontWeight: 700 }}>●</span> Available &lt;50%</span>
        <span><span style={{ color: '#d97706', fontWeight: 700 }}>●</span> Moderate 50–80%</span>
        <span><span style={{ color: '#dc2626', fontWeight: 700 }}>●</span> Full &gt;80%</span>
        <span>🔵 You &nbsp; 🔴 Destination</span>
        <span style={{ marginLeft: 'auto' }}>🔴 Live updates every 30s · OpenStreetMap · OSRM · Overpass · Open-Meteo</span>
      </div>
    </div>
  );
}
