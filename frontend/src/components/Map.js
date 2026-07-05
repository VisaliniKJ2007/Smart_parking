import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:5000';

const userIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64113.png',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

export default function MapView({ user }) {
  const [recs, setRecs] = useState([]);
  const [center, setCenter] = useState([11.38, 77.89]);
  const [position, setPosition] = useState([11.38, 77.89]);
  const [status, setStatus] = useState('Locating you...');
  const [tick, setTick] = useState(Date.now());

  const liveTime = useMemo(() => new Date(tick).toLocaleTimeString(), [tick]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('Geolocation is not supported on this browser.');
      fetchRecs(center[0], center[1]);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setPosition([lat, lon]);
        setCenter([lat, lon]);
        setStatus('Live GPS tracking active');
        fetchRecs(lat, lon);
      },
      () => {
        setStatus('GPS unavailable, using default location');
        fetchRecs(center[0], center[1]);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on('connect', () => console.log('WS connected'));
    socket.on('disconnect', () => console.log('WS disconnected'));
    socket.on('reservation_update', () => fetchRecs(position[0], position[1]));
    return () => socket.disconnect();
  }, [position]);

  function fetchRecs(lat, lon) {
    axios.get(`/recommend?user_lat=${lat}&user_lon=${lon}&hour=18&traffic=High`)
      .then((r) => setRecs(r.data.recommendations || []))
      .catch(() => setRecs([]));
  }

  function colorForOccupancy(pct) {
    if (pct < 50) return 'green';
    if (pct < 80) return 'orange';
    return 'red';
  }

  function occupancyText(pct) {
    if (pct < 50) return 'Busy-free';
    if (pct < 80) return 'Moderate';
    return 'Heavy';
  }

  const mapProvider = process.env.REACT_APP_MAP_PROVIDER || 'osm';
  const tileUrl = mapProvider === 'google'
    ? 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const bestParking = recs[0];
  const directions = bestParking
    ? [
        `Head toward ${bestParking.name}`,
        `Use the nearest entrance within ${bestParking.distance_m}m`,
        `Expect ${occupancyText(bestParking.occupancy_pct).toLowerCase()} traffic around the area`
      ]
    : ['Waiting for parking suggestions...'];

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ padding: 10, background: '#eff6ff', borderRadius: 8 }}>
        <strong>Live GPS status:</strong> {status} · Updated {liveTime}
        {user ? <span> · Driver: {user.email}</span> : null}
        <span> · Map: {mapProvider === 'google' ? 'Google Maps style' : 'OpenStreetMap'}</span>
      </div>
      {bestParking ? (
        <div style={{ padding: 12, borderRadius: 10, background: 'linear-gradient(90deg, #2563eb, #38bdf8)', color: '#fff' }}>
          <strong>Best parking now:</strong> {bestParking.name}
          <div>Area: {occupancyText(bestParking.occupancy_pct)} · Slots left: {Math.max(0, bestParking.total_slots - bestParking.predicted_available)} / {bestParking.total_slots}</div>
          <div>Estimated cost: {bestParking.price.price_per_hour} {bestParking.price.currency} / hour</div>
        </div>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {recs.slice(0, 3).map((p, index) => (
          <div key={p.parking_id} style={{ flex: '1 1 220px', padding: 12, borderRadius: 10, background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <strong>{index + 1}. {p.name}</strong>
              <span style={{ fontSize: 12, color: '#2563eb' }}>{occupancyText(p.occupancy_pct)}</span>
            </div>
            <div style={{ fontSize: 13, color: '#334155' }}>Slots left: {Math.max(0, p.total_slots - p.predicted_available)} / {p.total_slots}</div>
            <div style={{ fontSize: 13, color: '#334155' }}>Distance: {p.distance_m} m</div>
            <div style={{ fontSize: 13, color: '#334155' }}>Rate: {p.price.price_per_hour} {p.price.currency}/hr</div>
          </div>
        ))}
      </div>
      <div style={{ padding: 12, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <strong>Turn-by-turn guidance</strong>
        <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
          {directions.map((step, i) => <li key={i}>{step}</li>)}
        </ul>
      </div>
      <MapContainer center={center} zoom={15} style={{ height: '80vh', width: '100%' }}>
        <TileLayer url={tileUrl} attribution={mapProvider === 'google' ? 'Google Maps' : '&copy; OpenStreetMap contributors'} />
        <Marker position={position} icon={userIcon}>
          <Popup>Your current location</Popup>
        </Marker>
        {recs.map((p) => (
          <CircleMarker key={p.parking_id} center={[p.latitude, p.longitude]} radius={12} pathOptions={{ color: colorForOccupancy(p.occupancy_pct), fillColor: colorForOccupancy(p.occupancy_pct), fillOpacity: 0.75 }}>
            <Popup>
              <div>
                <strong>{p.name}</strong><br />
                Available: {p.predicted_available}/{p.total_slots}<br />
                Price: {p.price.price_per_hour} {p.price.currency}<br />
                Distance: {p.distance_m} m
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
