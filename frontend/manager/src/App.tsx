import { useEffect, useState } from 'react';
import React from 'react';

type Waiter = {
  id: string;
  waiter_code: string;
  nickname: string;
  full_name: string;
  status: string;
  pin_set: boolean;
};

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const money = (value: number) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(value);

async function api(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('citysquare.manager.token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [fullName, setFullName] = useState('');
  const [waiterCode, setWaiterCode] = useState('');
  const [pins, setPins] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load(currentToken = token) {
    const data = await api('/staff/waiters', currentToken);
    setWaiters(data);
  }

  useEffect(() => {
    if (token) load().catch((e) => { setError(e.message); localStorage.removeItem('citysquare.manager.token'); setToken(''); });
  }, [token]);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');
      if (!['ADMIN', 'MANAGER'].includes(data.user.role)) throw new Error('Manager or admin access required');
      localStorage.setItem('citysquare.manager.token', data.token); setToken(data.token); setPassword('');
    } catch (e: any) { setError(e.message || 'Could not sign in'); }
    finally { setBusy(false); }
  }

  async function createWaiter(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await api('/staff/waiters', token, { method: 'POST', body: JSON.stringify({ fullName, waiterCode }) });
      setFullName(''); setWaiterCode(''); setMessage('Waiter account created. Set a unique PIN below.'); await load();
    } catch (e: any) { setError(e.message || 'Could not create waiter'); }
    finally { setBusy(false); }
  }

  async function setPin(waiter: Waiter) {
    const pin = pins[waiter.id] || '';
    if (!/^\d{4,8}$/.test(pin)) { setError('PIN must be 4–8 digits'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      await api(`/staff/waiters/${waiter.id}/pin`, token, { method: 'POST', body: JSON.stringify({ pin }) });
      setPins((current) => ({ ...current, [waiter.id]: '' }));
      setMessage(`Unique PIN set for ${waiter.nickname || waiter.full_name}. Give it to the waiter privately.`);
      await load();
    } catch (e: any) { setError(e.message || 'Could not set PIN'); }
    finally { setBusy(false); }
  }

  if (!token) return <main className="manager-login"><form className="manager-login-card" onSubmit={login}><p className="eyebrow">City Square · Management</p><h1>Manager sign in</h1><label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p className="manager-error">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form></main>;

  return <main className="manager-shell">
    <header className="header"><div><p className="eyebrow">City Square Restaurant</p><h1>Manager dashboard</h1><p className="subtle">Waiter accounts, unique PINs, and sales accountability</p></div><div className="header-actions"><button className="secondary" onClick={() => load().catch((e) => setError(e.message))}>Refresh</button><button className="secondary" onClick={() => { localStorage.removeItem('citysquare.manager.token'); setToken(''); }}>Sign out</button></div></header>
    {(error || message) && <div className={error ? 'notice error' : 'notice success'}>{error || message}</div>}
    <section className="metric-grid"><article className="metric-card"><span>Active waiters</span><strong>{waiters.filter((w) => w.status === 'ACTIVE').length}</strong></article><article className="metric-card"><span>PIN configured</span><strong>{waiters.filter((w) => w.pin_set).length}</strong></article><article className="metric-card"><span>Needs a PIN</span><strong>{waiters.filter((w) => !w.pin_set).length}</strong></article><article className="metric-card"><span>Currency</span><strong>TZS</strong></article></section>
    <section className="report-panel create-panel"><div><p className="eyebrow">Staff management</p><h2>Create waiter</h2><p className="subtle">Waiters sign in using only their unique PIN. No waiter password is issued.</p></div><form className="create-form" onSubmit={createWaiter}><label>Full name<input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Waiter name" /></label><label>Waiter code<input required value={waiterCode} onChange={(e) => setWaiterCode(e.target.value.toUpperCase())} placeholder="e.g. W-005" /></label><button className="primary" disabled={busy}>Create waiter</button></form></section>
    <section className="report-panel"><div className="section-title"><div><p className="eyebrow">Access control</p><h2>Waiter PINs</h2></div></div><p className="subtle">Each PIN must be unique. PINs are not displayed again after saving. Resetting a PIN replaces the old one.</p><div className="table-wrap"><table><thead><tr><th>Waiter</th><th>Code</th><th>PIN status</th><th>Set or reset PIN</th></tr></thead><tbody>{waiters.map((waiter) => <tr key={waiter.id}><td><strong>{waiter.nickname || waiter.full_name}</strong></td><td>{waiter.waiter_code}</td><td><span className={waiter.pin_set ? 'badge ready' : 'badge pending'}>{waiter.pin_set ? 'Configured' : 'Needs PIN'}</span></td><td><div className="pin-entry"><input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} placeholder="4–8 digits" value={pins[waiter.id] || ''} onChange={(e) => setPins((current) => ({ ...current, [waiter.id]: e.target.value.replace(/\D/g, '').slice(0, 8) }))} /><button className="secondary" disabled={busy} onClick={() => setPin(waiter)}>{waiter.pin_set ? 'Reset PIN' : 'Set PIN'}</button></div></td></tr>)}</tbody></table>{waiters.length === 0 && <p className="empty">No waiter accounts yet. Create one above.</p>}</div></section>
    <section className="report-panel"><p className="eyebrow">Operations</p><h2>Waiter accountability</h2><p className="subtle">Order ownership remains attached to the waiter. Review waiter sales and payment totals using the reports API.</p><div className="links"><a href="http://localhost:3000/reports/waiter-performance" target="_blank" rel="noreferrer">Waiter performance report</a><a href="http://localhost:3000/reports/daily-summary" target="_blank" rel="noreferrer">Daily sales summary</a></div></section>
  </main>;
}
