import React from 'react';
import MapView from '../components/Map';

export default function MapPage({ user }) {
  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>📍 Live Parking Map</h2>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Real-time parking availability · OSRM routing · OpenStreetMap
        </p>
      </div>
      <MapView user={user} />
    </div>
  );
}
