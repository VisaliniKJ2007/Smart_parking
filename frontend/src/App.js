import React from 'react';
import MapView from './components/Map';
import Auth from './components/Auth';
import Reservation from './components/Reservation';

export default function App(){
  return (
    <div style={{height: '100vh', padding: '8px'}}>
      <h2>SmartPark AI</h2>
      <Auth />
      <Reservation />
      <MapView />
    </div>
  );
}
