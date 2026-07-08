import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function RegisterPage({ onAuth }) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    axios.post('/auth/register', { name, email, password })
      .then(() => {
        // Auto login after register
        return axios.post('/auth/login', { email, password });
      })
      .then(r => {
        localStorage.setItem('token', r.data.token);
        localStorage.setItem('email', email);
        localStorage.setItem('name', name);
        localStorage.setItem('user_id', r.data.user_id || '');
        axios.defaults.headers.common['Authorization'] = `Bearer ${r.data.token}`;
        onAuth({ email, name });
        navigate('/dashboard');
      })
      .catch(err => {
        const msg = err.response?.data?.error || 'Registration failed.';
        setError(msg === 'user exists' ? 'Email already registered.' : msg);
      })
      .finally(() => setLoading(false));
  }

  return (
    <div className="page" style={{ maxWidth: 420, margin: '40px auto' }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>🅿️</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>Create account</h2>
          <p style={{ color: '#64748b', fontSize: 14 }}>Join SmartPark AI — it's free</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Full Name</label>
            <input className="input" placeholder="Your name"
              value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Email</label>
            <input className="input" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Password</label>
            <input className="input" type="password" placeholder="Min. 6 characters"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 15 }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#2563eb', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
