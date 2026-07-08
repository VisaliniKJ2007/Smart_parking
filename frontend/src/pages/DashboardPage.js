import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function DashboardPage({ user }) {
  const [reservations, setReservations] = useState([]);
  const [lots, setLots]                 = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    axios.get('/reservations').then(r => setReservations(r.data)).catch(() => {});
    axios.get('/parking-lots').then(r => setLots(r.data)).catch(() => {});
  }, [user, navigate]);

  const active    = reservations.filter(r => r.status === 'active').length;
  const cancelled = reservations.filter(r => r.status === 'cancelled').length;

  return (
    <div className="page">
      {/* Welcome */}
      <div className="card" style={{ background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: '#fff', marginBottom: 20 }}>
        <div style={{ fontSize: 13, opacity: 0.85 }}>Welcome back</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{user?.name || user?.email}</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{user?.email}</div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{reservations.length}</div>
          <div className="stat-label">Total Reservations</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#16a34a' }}>{active}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#dc2626' }}>{cancelled}</div>
          <div className="stat-label">Cancelled</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{lots.length}</div>
          <div className="stat-label">Parking Lots</div>
        </div>
      </div>

      {/* Quick actions */}
      <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Quick Actions</h3>
      <div className="features-grid" style={{ marginBottom: 24 }}>
        {[
          { icon: '📍', title: 'Live Map',       desc: 'View real-time parking availability on the map.', path: '/map' },
          { icon: '🅿️', title: 'Reserve',        desc: 'Book a parking spot at your preferred location.', path: '/reserve' },
          { icon: '📋', title: 'My Reservations', desc: 'View and manage all your parking reservations.', path: '/reserve' },
        ].map(a => (
          <div key={a.title} className="feature-card" style={{ cursor: 'pointer' }} onClick={() => navigate(a.path)}>
            <div className="icon">{a.icon}</div>
            <h3>{a.title}</h3>
            <p>{a.desc}</p>
          </div>
        ))}
      </div>

      {/* Recent reservations */}
      <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Recent Reservations</h3>
      {reservations.length === 0
        ? (
          <div className="card" style={{ textAlign: 'center', color: '#94a3b8' }}>
            <p>No reservations yet.</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/reserve')}>
              Make your first reservation
            </button>
          </div>
        )
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reservations.slice(0, 5).map(r => (
              <div key={r.reservation_id} className="card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0, padding: '12px 18px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Parking #{r.parking_id}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <span className={`badge ${r.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                  {r.status}
                </span>
              </div>
            ))}
            {reservations.length > 5 && (
              <button className="btn btn-outline" onClick={() => navigate('/reserve')}
                style={{ alignSelf: 'flex-start' }}>
                View all {reservations.length} reservations
              </button>
            )}
          </div>
        )
      }
    </div>
  );
}
