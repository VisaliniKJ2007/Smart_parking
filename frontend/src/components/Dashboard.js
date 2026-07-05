import React from 'react';

export default function Dashboard({ user, onNavigate }) {
  return (
    <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>Parking at a glance</h3>
      <p style={{ marginTop: 0, color: '#475569' }}>
        {user ? `Welcome back, ${user.name || user.email}.` : 'Sign in to unlock reservations and live guidance.'}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={() => onNavigate('map')}>Live GPS Map</button>
        <button onClick={() => onNavigate('reserve')}>Reservations</button>
        <button onClick={() => onNavigate('auth')}>Account</button>
      </div>
    </div>
  );
}
