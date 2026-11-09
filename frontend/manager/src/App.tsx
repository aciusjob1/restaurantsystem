import { useEffect, useState } from 'react';

type Waiter = { id: string; waiter_code: string; nickname: string; full_name: string; status: string; pin_set: boolean };
type Category = { id: string; name: string };
type Product = { id: string; sku: string; name: string; selling_price: string | number; category_name?: string; preparation_station: string; is_available: boolean };
type Report = { title: string; data: any };
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const money = (value: number) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(value);

async function api(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message || `Request failed (${response.status})`);
  return data;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('citysquare.manager.token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [fullName, setFullName] = useState('');
  const [waiterCode, setWaiterCode] = useState('');
  const [pins, setPins] = useState<Record<string, string>>({});
  const [foodName, setFoodName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [station, setStation] = useState('KITCHEN');
  const [newCategory, setNewCategory] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load(currentToken = token) {
    const [staff, menu, groups] = await Promise.all([
      api('/staff/waiters', currentToken),
      api('/catalog/products', currentToken),
      api('/catalog/categories', currentToken),
    ]);
    setWaiters(staff);
    setProducts(menu);
    setCategories(groups);
  }

  useEffect(() => {
    if (token) load(token).catch((e) => { setError(e.message); localStorage.removeItem('citysquare.manager.token'); setToken(''); });
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
      setMessage(`Unique PIN set for ${waiter.nickname || waiter.full_name}. Give it to the waiter privately.`); await load();
    } catch (e: any) { setError(e.message || 'Could not set PIN'); }
    finally { setBusy(false); }
  }

  async function createFood(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage(''); setReport(null);
    try {
      await api('/catalog/products', token, { method: 'POST', body: JSON.stringify({ name: foodName, sku, sellingPrice: Number(price), categoryId: categoryId || undefined, preparationStation: station }) });
      setFoodName(''); setSku(''); setPrice(''); setMessage('Menu item added. Its price will be used automatically in cashier order totals.'); await load();
    } catch (e: any) { setError(e.message || 'Could not add menu item'); }
    finally { setBusy(false); }
  }

  async function createCategory(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const created = await api('/catalog/categories', token, { method: 'POST', body: JSON.stringify({ name: newCategory }) });
      setNewCategory(''); setCategoryId(created.id); setMessage(`Category “${created.name}” added.`); await load();
    } catch (e: any) { setError(e.message || 'Could not add category'); }
    finally { setBusy(false); }
  }

  async function loadReport(path: string, title: string) {
    setBusy(true); setError(''); setReport(null);
    try { setReport({ title, data: await api(path, token) }); }
    catch (e: any) { setError(e.message || 'Could not load report'); }
    finally { setBusy(false); }
  }

  if (!token) return <main className="manager-login"><form className="manager-login-card" onSubmit={login}><p className="eyebrow">City Square · Management</p><h1>Manager sign in</h1><label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p className="manager-error">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form></main>;

  return <main className="manager-shell">
    <header className="header"><div><p className="eyebrow">City Square Restaurant</p><h1>Manager dashboard</h1><p className="subtle">Menu pricing, waiter access, and restaurant reports</p></div><div className="header-actions"><button className="secondary" onClick={() => load().catch((e) => setError(e.message))}>Refresh</button><button className="secondary" onClick={() => { localStorage.removeItem('citysquare.manager.token'); setToken(''); }}>Sign out</button></div></header>
    {(error || message) && <div className={error ? 'notice error' : 'notice success'}>{error || message}</div>}
    <section className="metric-grid"><article className="metric-card"><span>Menu items</span><strong>{products.length}</strong></article><article className="metric-card"><span>Categories</span><strong>{categories.length}</strong></article><article className="metric-card"><span>Active waiters</span><strong>{waiters.filter((w) => w.status === 'ACTIVE').length}</strong></article><article className="metric-card"><span>PIN configured</span><strong>{waiters.filter((w) => w.pin_set).length}</strong></article></section>

    <section className="report-panel"><p className="eyebrow">Menu management</p><h2>Add food or drink with a price</h2><p className="subtle">The cashier and server calculate the order from the saved menu prices and quantities.</p><form className="create-form menu-form" onSubmit={createFood}><label>Item name<input required value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="e.g. Grilled chicken" /></label><label>SKU / code<input required value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} placeholder="e.g. FOOD-003" /></label><label>Price (TZS)<input required type="number" min="1" step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 15000" /></label><label>Category<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Preparation station<select value={station} onChange={(e) => setStation(e.target.value)}><option value="KITCHEN">Kitchen</option><option value="BAR">Bar</option></select></label><button className="primary" disabled={busy}>Add menu item</button></form>
      <form className="category-form" onSubmit={createCategory}><label>New category<input required value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Breakfast" /></label><button className="secondary" disabled={busy}>Add category</button></form>
      <div className="table-wrap menu-table"><table><thead><tr><th>Item</th><th>SKU</th><th>Category</th><th>Station</th><th>Price</th><th>Available</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.sku}</td><td>{product.category_name || '—'}</td><td>{product.preparation_station}</td><td>{money(Number(product.selling_price))}</td><td>{product.is_available ? 'Yes' : 'No'}</td></tr>)}</tbody></table>{products.length === 0 && <p className="empty">No menu items yet.</p>}</div>
    </section>

    <section className="report-panel create-panel"><div><p className="eyebrow">Staff management</p><h2>Create waiter</h2><p className="subtle">Waiters sign in using only their unique PIN.</p></div><form className="create-form" onSubmit={createWaiter}><label>Full name<input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Waiter name" /></label><label>Waiter code<input required value={waiterCode} onChange={(e) => setWaiterCode(e.target.value.toUpperCase())} placeholder="e.g. W-005" /></label><button className="primary" disabled={busy}>Create waiter</button></form></section>
    <section className="report-panel"><p className="eyebrow">Access control</p><h2>Waiter PINs</h2><p className="subtle">Each PIN must be unique and is not shown again after saving.</p><div className="table-wrap"><table><thead><tr><th>Waiter</th><th>Code</th><th>PIN status</th><th>Set or reset PIN</th></tr></thead><tbody>{waiters.map((waiter) => <tr key={waiter.id}><td>{waiter.nickname || waiter.full_name}</td><td>{waiter.waiter_code}</td><td>{waiter.pin_set ? 'Configured' : 'Needs PIN'}</td><td><div className="pin-entry"><input type="password" inputMode="numeric" maxLength={8} placeholder="4–8 digits" value={pins[waiter.id] || ''} onChange={(e) => setPins((current) => ({ ...current, [waiter.id]: e.target.value.replace(/\D/g, '').slice(0, 8) }))} /><button type="button" className="secondary" disabled={busy} onClick={() => setPin(waiter)}>{waiter.pin_set ? 'Reset PIN' : 'Set PIN'}</button></div></td></tr>)}</tbody></table></div></section>
    <section className="report-panel"><p className="eyebrow">Reports</p><h2>Sales and waiter accountability</h2><div className="links"><button className="secondary" disabled={busy} onClick={() => loadReport('/reports/waiter-performance', 'Waiter performance')}>Waiter performance</button><button className="secondary" disabled={busy} onClick={() => loadReport('/reports/daily-summary', 'Daily sales summary')}>Daily sales summary</button></div>{report && <div className="report-result"><h3>{report.title}</h3><pre>{JSON.stringify(report.data, null, 2)}</pre></div>}</section>
  </main>;
}
