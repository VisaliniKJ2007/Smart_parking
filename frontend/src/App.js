import React, { useState } from 'react';
import MapView from './components/Map';
import Auth from './components/Auth';
import Reservation from './components/Reservation';
import Dashboard from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');

  return (
    <div style={{ minHeight: '100vh', padding: 12, background: '#f8fafc' }}>
      <h2 style={{ marginBottom: 8 }}>SmartPark AI</h2>
      <p style={{ marginTop: 0, marginBottom: 12, color: '#475569' }}>Live parking guidance with GPS-aware recommendations.</p>
      <Dashboard user={user} onNavigate={setPage} />
      {page === 'auth' ? <Auth onAuthChange={setUser} /> : null}
      {page === 'reserve' ? <Reservation user={user} /> : null}
      {page === 'map' || page === 'dashboard' ? <MapView user={user} /> : null}
    </div>
  );
}
