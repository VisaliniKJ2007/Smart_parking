import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { io } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:5000';

export default function MapView(){
  const [recs, setRecs] = useState([]);
  const [center, setCenter] = useState([11.38, 77.89]);

  useEffect(()=>{
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos=>{
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        setCenter([lat, lon]);
        fetchRecs(lat, lon);
      }, ()=> fetchRecs(center[0], center[1]));
    } else fetchRecs(center[0], center[1]);
  },[]);

  useEffect(()=>{
    const socket = io(SOCKET_URL);
    socket.on('connect', ()=> console.log('WS connected'));
    socket.on('disconnect', ()=> console.log('WS disconnected'));
    socket.on('reservation_update', ()=> fetchRecs(center[0], center[1]));
    return () => socket.disconnect();
  }, [center]);

  function fetchRecs(lat, lon){
    axios.get(`/recommend?user_lat=${lat}&user_lon=${lon}&hour=18&traffic=High`)
      .then(r=> setRecs(r.data.recommendations || []))
      .catch(e=> console.error(e));
  }

  function colorForOccupancy(pct){
    if(pct < 50) return 'green';
    if(pct < 80) return 'orange';
    return 'red';
  }

  return (
    <MapContainer center={center} zoom={15} style={{height:'80vh', width:'100%'}}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {recs.map(p=> (
        <CircleMarker key={p.parking_id} center={[p.latitude, p.longitude]} radius={12} pathOptions={{color: colorForOccupancy(p.occupancy_pct)}}>
          <Popup>
            <div>
              <strong>{p.name}</strong><br/>
              Available: {p.predicted_available}/{p.total_slots}<br/>
              Price: {p.price.price_per_hour} {p.price.currency}<br/>
              Distance: {p.distance_m} m
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
