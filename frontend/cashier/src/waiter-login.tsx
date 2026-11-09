import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './waiter-login.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function WaiterLogin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API}/auth/waiter-pin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Sign in failed');
      localStorage.setItem('citysquare.token', data.token);
      localStorage.setItem('citysquare.user', JSON.stringify(data.user));
      window.location.href = '/';
    } catch (reason: any) {
      setError(reason.message || 'Could not connect to the local restaurant server');
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="waiter-login-page">
      <form className="waiter-login-card" onSubmit={submit}>
        <div className="waiter-logo">CS</div>
        <p className="waiter-eyebrow">City Square Restaurant</p>
        <h1>Waiter sign in</h1>
        <p className="waiter-help">Enter your unique personal PIN.</p>
        <label>Waiter PIN
          <input autoFocus inputMode="numeric" autoComplete="current-password" pattern="[0-9]{4,8}" maxLength={8} required type="password" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="4–8 digits" />
        </label>
        {error && <p className="waiter-error" role="alert">{error}</p>}
        <button disabled={busy || pin.length < 4}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <a href="/">Staff / cashier login</a>
      </form>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><WaiterLogin /></React.StrictMode>);
