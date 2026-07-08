import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';

import Home        from './pages/Home';
import MapPage     from './pages/MapPage';
import LoginPage   from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ReservePage from './pages/ReservePage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Restore session on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('email');
    const name  = localStorage.getItem('name');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser({ email, name });
    }
  }, []);

  function logout() {
    localStorage.clear();
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    navigate('/');
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Navbar ── */}
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand">🅿️ SmartPark AI</NavLink>
        <div className="navbar-links">
          <NavLink to="/"         className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} end>Home</NavLink>
          <NavLink to="/map"      className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Live Map</NavLink>
          <NavLink to="/reserve"  className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Reserve</NavLink>
          {user && <NavLink to="/dashboard" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Dashboard</NavLink>}
          {user
            ? <button className="nav-btn" onClick={logout}>Logout</button>
            : <NavLink to="/login"><button className="nav-btn">Login</button></NavLink>
          }
        </div>
      </nav>

      {/* ── Pages ── */}
      <Routes>
        <Route path="/"          element={<Home user={user} />} />
        <Route path="/map"       element={<MapPage user={user} />} />
        <Route path="/reserve"   element={<ReservePage user={user} />} />
        <Route path="/dashboard" element={<DashboardPage user={user} />} />
        <Route path="/login"     element={<LoginPage    onAuth={setUser} />} />
        <Route path="/register"  element={<RegisterPage onAuth={setUser} />} />
      </Routes>
    </div>
  );
}
