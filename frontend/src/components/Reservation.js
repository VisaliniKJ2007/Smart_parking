import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:5000';

export default function Reservation(){
  const [parkingLots, setParkingLots] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selected, setSelected] = useState('');
  const [userId, setUserId] = useState(localStorage.getItem('user_id') || 'user-1');

  useEffect(()=>{
    fetchLots();
    fetchReservations();
    const socket = io(SOCKET_URL);
    socket.on('reservation_update', fetchReservations);
    return () => socket.disconnect();
  }, []);

  function fetchLots(){
    axios.get('/parking-lots').then(r=> setParkingLots(r.data)).catch(()=>{});
  }
  function fetchReservations(){
    const uid = localStorage.getItem('user_id') || userId;
    axios.get('/reservations', { params: { user_id: uid } }).then(r=> setReservations(r.data)).catch(()=>{});
  }

  function reserve(e){
    e.preventDefault();
    if(!selected) return alert('Select parking');
    const uid = localStorage.getItem('user_id') || userId;
    axios.post('/reserve', {user_id: uid, parking_id: selected}).then(r=>{
      alert('Reserved'); fetchReservations();
    }).catch(e=> alert('Reserve failed'));
  }

  function cancel(id){
    axios.delete(`/reservation/${id}`).then(()=> fetchReservations()).catch(()=>alert('Cancel failed'));
  }

  return (
    <div style={{marginTop:12}}>
      <h4>Reserve Parking</h4>
      <form onSubmit={reserve} style={{display:'flex', gap:8}}>
        <select value={selected} onChange={e=>setSelected(e.target.value)}>
          <option value="">--select--</option>
          {parkingLots.map(p=> <option key={p.parking_id} value={p.parking_id}>{p.name} ({p.total_slots})</option>)}
        </select>
        <button type="submit">Reserve</button>
      </form>

      <h4>Your Reservations</h4>
      <ul>
        {reservations.map(r=> (
          <li key={r.reservation_id}>{r.parking_id} - {r.status} <button onClick={()=>cancel(r.reservation_id)}>Cancel</button></li>
        ))}
      </ul>
    </div>
  );
}
