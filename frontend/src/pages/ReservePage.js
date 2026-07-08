import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:5000';

function OccupancyBar({ pct }) {
  const color = pct < 50 ? '#16a34a' : pct < 80 ? '#d97706' : '#dc2626';
  return (
    <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginTop: 5 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
    </div>
  );
}

function statusBadge(status) {
  const styles = {
    active:    { background: '#dcfce7', color: '#16a34a' },
    cancelled: { background: '#fee2e2', color: '#dc2626' },
    expired:   { background: '#f1f5f9', color: '#64748b' },
  };
  const s = styles[status] || styles.expired;
  return (
    <span style={{ ...s, padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function ReservePage({ user }) {
  const navigate  = useNavigate();

  // Search
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [city,        setCity]        = useState('');
  const [searching,   setSearching]   = useState(false);

  // Lots
  const [lots,        setLots]        = useState([]);
  const [weather,     setWeather]     = useState(null);
  const [loading,     setLoading]     = useState(false);

  // Selection & reservation
  const [selected,    setSelected]    = useState(null);   // full lot object
  const [reservations, setReservations] = useState([]);
  const [reserving,   setReserving]   = useState(false);
  const [msg,         setMsg]         = useState({ text: '', ok: true });

  const debounceRef = useRef(null);

  useEffect(() => {
    if (user) fetchReservations();
    const socket = io(SOCKET_URL);
    socket.on('reservation_update', fetchReservations);
    return () => socket.disconnect();
  }, [user]);

  // ── Search ────────────────────────────────────────────────────────────────

  function handleSearchInput(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(() => {
      axios.get(`/geocode?q=${encodeURIComponent(val)}`)
        .then(r => setSuggestions(r.data.results || []))
        .catch(() => {});
    }, 300);
  }

  function selectCity(place) {
    setQuery(place.display_name.split(',').slice(0, 2).join(','));
    setCity(place.display_name.split(',')[0]);
    setSuggestions([]);
    setSelected(null);
    setMsg({ text: '', ok: true });
    fetchLots(place.lat, place.lon);
  }

  function fetchLots(lat, lon) {
    setSearching(true);
    setLots([]);
    axios.get(`/recommend?user_lat=${lat}&user_lon=${lon}`)
      .then(r => {
        setLots(r.data.recommendations || []);
        if (r.data.weather) setWeather(r.data.weather);
      })
      .catch(() => setMsg({ text: 'Failed to fetch parking lots.', ok: false }))
      .finally(() => setSearching(false));
  }

  // ── Reservation ───────────────────────────────────────────────────────────

  function fetchReservations() {
    axios.get('/reservations').then(r => setReservations(r.data)).catch(() => {});
  }

  function reserve() {
    if (!user)     { navigate('/login'); return; }
    if (!selected) { setMsg({ text: 'Please select a parking lot first.', ok: false }); return; }
    setReserving(true);
    setMsg({ text: '', ok: true });
    axios.post('/reserve', {
      parking_id:   selected.parking_id,
      parking_name: selected.name,
      city:         city,
      total_slots:  selected.total_slots,
      available:    selected.predicted_available,
      price:        selected.price?.price_per_hour || 0,
      latitude:     selected.latitude,
      longitude:    selected.longitude,
    })
      .then(() => {
        setMsg({ text: `✅ Reserved "${selected.name}" successfully!`, ok: true });
        setSelected(null);
        fetchReservations();
      })
      .catch(err => {
        const e = err.response?.data?.error || 'Reservation failed.';
        setMsg({ text: `❌ ${e}`, ok: false });
      })
      .finally(() => setReserving(false));
  }

  function cancel(id) {
    axios.delete(`/reservation/${id}`)
      .then(() => { setMsg({ text: 'Reservation cancelled.', ok: true }); fetchReservations(); })
      .catch(() => setMsg({ text: 'Cancel failed.', ok: false }));
  }

  function occColor(pct) {
    if (pct < 50) return '#16a34a';
    if (pct < 80) return '#d97706';
    return '#dc2626';
  }
  function occLabel(pct) {
    if (pct < 50) return 'Available';
    if (pct < 80) return 'Moderate';
    return 'Full';
  }

  const active = reservations.filter(r => r.status === 'active').length;

  return (
    <div className="page">

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>🅿️ Reserve a Parking Spot</h2>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Search any city — see real parking lots with live availability and reserve instantly.
        </p>
      </div>

      {/* Login warning */}
      {!user && (
        <div className="card" style={{ background: '#fffbeb', border: '1px solid #fde68a', marginBottom: 20 }}>
          <p style={{ color: '#92400e', fontSize: 14 }}>
            ⚠️ Sign in to make reservations.{' '}
            <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/login')}>
              Sign in →
            </span>
          </p>
        </div>
      )}

      {/* City search */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🔍 Search City or Area</div>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>📍</span>
            <input
              value={query}
              onChange={handleSearchInput}
              placeholder="e.g. Chennai, Coimbatore, Mumbai, Delhi..."
              style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: 10, border: '2px solid #e2e8f0', fontSize: 14, outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Autocomplete */}
          {suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999, marginTop: 4, overflow: 'hidden' }}>
              {suggestions.map((s, i) => (
                <div key={i} onClick={() => selectCity(s)}
                  style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, borderBottom: i < suggestions.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', gap: 10, alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <span>📍</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.display_name.split(',')[0]}</div>
                    <div style={{ color: '#94a3b8', fontSize: 11 }}>{s.display_name.split(',').slice(1, 3).join(',')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weather */}
        {weather && weather.temperature != null && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
            <span style={{ fontSize: 18 }}>{weather.is_rain ? '🌧️' : '☀️'}</span>
            <span>{city} · <strong>{weather.temperature}°C</strong> · {weather.description}</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {searching && (
        <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div>Finding real parking lots near {city}...</div>
        </div>
      )}

      {/* Parking lot grid */}
      {lots.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              🅿️ {lots.length} Parking Lots near {city}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>🔴 Live occupancy · Click to select</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {lots.map((lot, i) => {
              const isSelected = selected?.parking_id === lot.parking_id;
              const occ = lot.occupancy_pct || 0;
              return (
                <div key={lot.parking_id}
                  onClick={() => { setSelected(lot); setMsg({ text: '', ok: true }); }}
                  style={{
                    padding: 16, borderRadius: 12, background: '#fff',
                    border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: isSelected ? '0 4px 16px rgba(37,99,235,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#93c5fd'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, flex: 1, marginRight: 8 }}>
                      {i === 0 && <span style={{ fontSize: 10, background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 4, fontWeight: 700, marginRight: 5 }}>BEST</span>}
                      {lot.name}
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: occ < 50 ? '#dcfce7' : occ < 80 ? '#fef9c3' : '#fee2e2', color: occColor(occ), fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {occLabel(occ)}
                    </span>
                  </div>

                  {/* Slot count */}
                  <div style={{ fontSize: 26, fontWeight: 800, color: occColor(occ), lineHeight: 1 }}>
                    {lot.predicted_available}
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8' }}>/{lot.total_slots} free</span>
                  </div>
                  <OccupancyBar pct={occ} />

                  {/* Details */}
                  <div style={{ marginTop: 10, display: 'grid', gap: 3, fontSize: 12, color: '#64748b' }}>
                    <span>📏 {lot.distance_m >= 1000 ? `${(lot.distance_m/1000).toFixed(1)} km` : `${Math.round(lot.distance_m)} m`} away</span>
                    <span>⏱ 30-min forecast: <strong>{lot.predicted_slots_30_min}</strong> slots</span>
                    <span>💰 ₹{lot.price?.price_per_hour}/hr · {lot.fee === 'yes' ? 'Paid' : lot.fee === 'no' ? 'Free' : 'Check on-site'}</span>
                  </div>

                  {isSelected && (
                    <div style={{ marginTop: 10, padding: '5px 10px', background: '#dbeafe', borderRadius: 6, fontSize: 12, color: '#1d4ed8', fontWeight: 700 }}>
                      ✓ Selected — click Confirm below
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!searching && lots.length === 0 && !query && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Search a city to find parking</div>
          <div style={{ fontSize: 13 }}>Type any city name above to see real parking lots with live availability</div>
        </div>
      )}

      {/* Message */}
      {msg.text && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: msg.ok ? '#dcfce7' : '#fee2e2', color: msg.ok ? '#16a34a' : '#dc2626', fontSize: 14, fontWeight: 500 }}>
          {msg.text}
        </div>
      )}

      {/* Confirm button */}
      {lots.length > 0 && (
        <button
          className="btn btn-primary"
          onClick={reserve}
          disabled={reserving || !selected}
          style={{ fontSize: 15, padding: '12px 36px', marginBottom: 36, opacity: !selected ? 0.5 : 1 }}>
          {reserving ? '⏳ Reserving...' : selected ? `✅ Reserve "${selected.name}"` : '← Select a parking lot above'}
        </button>
      )}

      {/* Reservations history */}
      {user && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Your Reservations</h3>
            {active > 0 && (
              <span style={{ background: '#dcfce7', color: '#16a34a', padding: '3px 12px', borderRadius: 99, fontSize: 13, fontWeight: 700 }}>
                {active} Active
              </span>
            )}
          </div>

          {reservations.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <p>No reservations yet. Search a city and reserve a spot!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reservations.map(r => (
                <div key={r.reservation_id} className="card"
                  style={{ marginBottom: 0, padding: '16px 20px', borderLeft: `4px solid ${r.status === 'active' ? '#16a34a' : '#e2e8f0'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        🅿️ {r.parking_name || `Parking #${r.parking_id}`}
                      </div>
                      {r.city && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>📍 {r.city}</div>}
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        <span>🕐 Reserved: {new Date(r.created_at).toLocaleString()}</span>
                        <span>⏰ Expires: {new Date(r.expires_at).toLocaleTimeString()}</span>
                        {r.price > 0 && <span>💰 ₹{r.price}/hr</span>}
                        {r.total_slots > 0 && <span>🅿️ {r.available}/{r.total_slots} slots were free</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {statusBadge(r.status)}
                      {r.status === 'active' && (
                        <button className="btn btn-danger"
                          onClick={() => cancel(r.reservation_id)}
                          style={{ padding: '5px 14px', fontSize: 13 }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
