import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Auth({ onAuthChange }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const emailStored = localStorage.getItem('email');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/auth/me')
        .then((r) => {
          const profile = r.data || {};
          setUser({ email: profile.email || emailStored, name: profile.name });
          if (onAuthChange) onAuthChange({ email: profile.email || emailStored, name: profile.name });
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('email');
          localStorage.removeItem('user_id');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
          if (onAuthChange) onAuthChange(null);
        });
    }
  }, [onAuthChange]);

  function saveSession(token, email, userId) {
    localStorage.setItem('token', token);
    localStorage.setItem('email', email);
    localStorage.setItem('user_id', userId || '');
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser({ email });
    if (onAuthChange) onAuthChange({ email });
  }

  function login(e) {
    e.preventDefault();
    setMessage('Signing in...');
    axios.post('/auth/login', { email, password })
      .then((r) => {
        saveSession(r.data.token, email, r.data.user_id || '');
        setMessage('Welcome back!');
      })
      .catch(() => setMessage('Login failed. Please try again.'));
  }

  function register(e) {
    e.preventDefault();
    setMessage('Creating account...');
    axios.post('/auth/register', { name, email, password })
      .then(() => {
        setMessage('Account created. Please sign in.');
        setMode('login');
        setPassword('');
      })
      .catch(() => setMessage('Registration failed. Try another email.'));
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('user_id');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    if (onAuthChange) onAuthChange(null);
    setMessage('Signed out');
  }

  return (
    <div style={{ marginBottom: 12, border: '1px solid #e5e7eb', padding: 10, borderRadius: 8, background: '#f8fafc' }}>
      {user ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Signed in as <strong>{user.email}</strong></span>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={() => setMode('login')} disabled={mode === 'login'}>Login</button>
            <button onClick={() => setMode('register')} disabled={mode === 'register'}>Register</button>
          </div>
          {mode === 'login' ? (
            <form onSubmit={login} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
              <button type="submit">Login</button>
            </form>
          ) : (
            <form onSubmit={register} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <input placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
              <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
              <button type="submit">Register</button>
            </form>
          )}
          {message ? <div style={{ marginTop: 8, color: '#2563eb' }}>{message}</div> : null}
        </>
      )}
    </div>
  );
}
