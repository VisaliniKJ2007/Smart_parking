import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home({ user }) {
  const navigate = useNavigate();

  return (
    <div className="page">

      {/* Hero */}
      <div className="hero">
        <div style={{ fontSize: 56, marginBottom: 12 }}>🅿️</div>
        <h1>SmartPark AI</h1>
        <p>Find, predict, and reserve parking spaces in real time using AI-powered recommendations.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn" style={{ background: '#fff', color: '#1d4ed8', fontSize: 15 }} onClick={() => navigate('/map')}>
            📍 Open Live Map
          </button>
          {!user && (
            <button className="btn btn-outline" style={{ borderColor: '#fff', color: '#fff', fontSize: 15 }} onClick={() => navigate('/register')}>
              Create Account
            </button>
          )}
          {user && (
            <button className="btn btn-outline" style={{ borderColor: '#fff', color: '#fff', fontSize: 15 }} onClick={() => navigate('/reserve')}>
              Reserve a Spot
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">4+</div>
          <div className="stat-label">Parking Locations</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">AI</div>
          <div className="stat-label">ML Predictions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">Live</div>
          <div className="stat-label">GPS Tracking</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">Free</div>
          <div className="stat-label">No API Key Needed</div>
        </div>
      </div>

      {/* Features */}
      <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 700 }}>Features</h2>
      <div className="features-grid">
        {[
          { icon: '📍', title: 'Live GPS Tracking',       desc: 'Real-time location tracking with auto-panning map.' },
          { icon: '🤖', title: 'AI Predictions',          desc: 'Random Forest model predicts available slots.' },
          { icon: '🗺️', title: 'OpenStreetMap',           desc: 'Free map with real parking lots from OSM.' },
          { icon: '🚗', title: 'OSRM Routing',            desc: 'Real road-based drive time and turn-by-turn directions.' },
          { icon: '🅿️', title: 'Smart Recommendations',  desc: 'Best parking ranked by availability and distance.' },
          { icon: '📅', title: 'Reservations',            desc: 'Reserve a slot and manage your bookings.' },
          { icon: '💰', title: 'Dynamic Pricing',         desc: 'Price adjusts based on real-time occupancy.' },
          { icon: '🔐', title: 'Secure Auth',             desc: 'JWT-based login and registration.' },
        ].map(f => (
          <div className="feature-card" key={f.title}>
            <div className="icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      {!user && (
        <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg,#eff6ff,#dbeafe)' }}>
          <h3 style={{ marginBottom: 8 }}>Ready to get started?</h3>
          <p style={{ color: '#475569', marginBottom: 16 }}>Create a free account to reserve parking spots.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate('/register')}>Register</button>
            <button className="btn btn-outline" onClick={() => navigate('/login')}>Login</button>
          </div>
        </div>
      )}
    </div>
  );
}
