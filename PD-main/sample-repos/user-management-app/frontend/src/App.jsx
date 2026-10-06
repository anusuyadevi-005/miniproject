import React, { useState } from 'react';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
    }
  };

  return (
    <div className="login-container">
      <h1>User Management Portal</h1>
      {!user ? (
        <form onSubmit={handleLogin}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
          <button type="submit">Sign In</button>
        </form>
      ) : (
        <div>
          <h2>Welcome, {user.role}</h2>
          <p>Logged in successfully with bearer token.</p>
        </div>
      )}
    </div>
  );
}
