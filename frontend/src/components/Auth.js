import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Auth(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);

  useEffect(()=>{
    const token = localStorage.getItem('token');
    const emailStored = localStorage.getItem('email');
    if(token){
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser({email: emailStored});
    }
  },[]);

  function login(e){
    e.preventDefault();
    axios.post('/auth/login', {email, password}).then(r=>{
      const token = r.data.token;
      localStorage.setItem('token', token);
      localStorage.setItem('email', email);
      localStorage.setItem('user_id', r.data.user_id || '');
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser({email});
    }).catch(()=> alert('Login failed'));
  }

  function logout(){
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('user_id');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  }

  return (
    <div style={{marginBottom:12}}>
      {user ? (
        <div>
          Logged in as {user.email} <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <form onSubmit={login} style={{display:'flex', gap:8}}>
          <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input placeholder="password" value={password} onChange={e=>setPassword(e.target.value)} type="password"/>
          <button type="submit">Login</button>
        </form>
      )}
    </div>
  );
}
