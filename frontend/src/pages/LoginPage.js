import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function LoginPage({ onAuth }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    axios.post('/auth/login', { email, password })
      .then(r => {
        localStorage.setItem('token', r.data.token);
        localStorage.setItem('email', email);
        localStorage.setItem('user_id', r.data.user_id || '');
        axios.defaults.headers.common['Authorization'] = `Bearer ${r.data.token}`;
        onAuth({ email });
        navigate('/dashboard');
      })
      .catch(() => setError('Invalid email or password.'))
      .finally(() => setLoading(false));
  }

  return (
    <div className="page" style={{ maxWidth: 420, margin: '40px auto' }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>🅿️</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>Welcome back</h2>
          <p style={{ color: '#64748b', fontSize: 14 }}>Sign in to your SmartPark account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Email</label>
            <input className="input" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Password</label>
            <input className="input" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 15 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: '#64748b' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#2563eb', fontWeight: 600 }}>Register</Link>
        </p>
      </div>
    </div>
  );
}
