import { useEffect, useMemo, useState } from 'react';

type Category = { id: string; name: string };
type Product = { id: string; sku: string; name: string; category_name?: string | null; category_id?: string | null; selling_price: string | number; preparation_station: string; is_available: boolean };
type Waiter = { id: string; waiter_code: string; nickname: string; full_name: string; status: string; pin_set: boolean };
type Report = { title: string; data: any };
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const money = (amount: number) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(amount);

async function api(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message || `Request failed (${response.status})`);
  return data;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('citysquare.manager.token') || '');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [station, setStation] = useState('KITCHEN');
  const [newCategory, setNewCategory] = useState('');
  const [waiterName, setWaiterName] = useState('');
  const [waiterCode, setWaiterCode] = useState('');
  const [pins, setPins] = useState<Record<string, string>>({});
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const availableCount = useMemo(() => products.filter((p) => p.is_available).length, [products]);

  async function refresh(auth = token) {
    const [menu, groups, staff] = await Promise.all([
      api('/catalog/products', auth), api('/catalog/categories', auth), api('/staff/waiters', auth),
    ]);
    setProducts(menu); setCategories(groups); setWaiters(staff);
  }

  useEffect(() => {
    if (!token) return;
    Promise.all([refresh(token), api('/auth/me', token)]).then(([, user]) => setRole(user.role)).catch((reason: any) => {
      setError(reason.message || 'Session expired'); localStorage.removeItem('citysquare.manager.token'); setToken('');
    });
  }, [token]);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Sign in failed');
      if (!['ADMIN', 'MANAGER'].includes(data.user?.role)) throw new Error('Manager or admin access required');
      localStorage.setItem('citysquare.manager.token', data.token); setRole(data.user.role); setToken(data.token); setPassword('');
    } catch (reason: any) { setError(reason.message || 'Could not sign in'); }
    finally { setBusy(false); }
  }

  async function submit(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (reason: any) { setError(reason.message || 'Request failed'); }
    finally { setBusy(false); }
  }

  async function addCategory(event: React.FormEvent) {
    event.preventDefault();
    await submit(async () => {
      const result = await api('/catalog/categories', token, { method: 'POST', body: JSON.stringify({ name: newCategory.trim() }) });
      setNewCategory(''); setCategoryId(result.id); setNotice(`Category “${result.name}” added.`); await refresh();
    });
  }

  async function addProduct(event: React.FormEvent) {
    event.preventDefault();
    await submit(async () => {
      await api('/catalog/products', token, { method: 'POST', body: JSON.stringify({ name: name.trim(), sku: sku.trim().toUpperCase(), sellingPrice: Number(price), categoryId: categoryId || undefined, preparationStation: station }) });
      setName(''); setSku(''); setPrice(''); setNotice('Menu item saved. Cashier totals use its saved price and quantity.'); await refresh();
    });
  }

  async function editProduct(product: Product) {
    const nextName = window.prompt('Edit item name', product.name);
    if (nextName === null) return;
    const nextPrice = window.prompt('Edit selling price (TZS)', String(product.selling_price));
    if (nextPrice === null) return;
    await submit(async () => {
      await api(`/catalog/products/${product.id}`, { } as any);
    });
  }

  async function toggleAvailability(product: Product) {
    await submit(async () => {
      await api(`/catalog/products/${product.id}`, token, { method: 'PATCH', body: JSON.stringify({ isAvailable: !product.is_available }) });
      setNotice(`${product.name} is now ${product.is_available ? 'unavailable' : 'available'}.`); await refresh();
    });
  }

  async function createWaiter(event: React.FormEvent) {
    event.preventDefault();
    await submit(async () => {
      await api('/staff/waiters', token, { method: 'POST', body: JSON.stringify({ fullName: waiterName.trim(), waiterCode: waiterCode.trim().toUpperCase() }) });
      setWaiterName(''); setWaiterCode(''); setNotice('Waiter created. Assign a unique PIN below.'); await refresh();
    });
  }

  async function setPin(waiter: Waiter) {
    const pin = pins[waiter.id] || '';
    if (!/^\d{4,8}$/.test(pin)) { setError('PIN must be 4–8 digits'); return; }
    await submit(async () => {
      await api(`/staff/waiters/${waiter.id}/pin`, token, { method: 'POST', body: JSON.stringify({ pin }) });
      setPins((previous) => ({ ...previous, [waiter.id]: '' })); setNotice(`Unique PIN saved for ${waiter.nickname || waiter.full_name}. Share it privately.`); await refresh();
    });
  }

  async function loadReport(path: string, title: string) {
    await submit(async () => { setReport({ title, data: await api(path, token) }); });
  }

  function signOut() { localStorage.removeItem('citysquare.manager.token'); setToken(''); setRole(''); }

  if (!token) return <main className="manager-login"><form className="manager-login-card" onSubmit={login}><p className="eyebrow">City Square · Management</p><h1>Manager sign in</h1><label>Email<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p className="notice error">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form></main>;

  return <main className="manager-shell">
    <header className="header"><div><p className="eyebrow">City Square Restaurant · {role}</p><h1>Management dashboard</h1><p className="subtle">Menu, prices, waiter PINs, and sales reports</p></div><div className="header-actions"><button className="secondary" disabled={busy} onClick={() => refresh().catch((e) => setError(e.message))}>Refresh</button><button className="secondary" onClick={signOut}>Sign out</button></div></header>
    {(error || notice) && <div className={error ? 'notice error' : 'notice success'} role="status">{error || notice}</div>}
    <section className="metric-grid"><article className="metric-card"><span>Menu items</span><strong>{products.length}</strong></article><article className="metric-card"><span>Available for sale</span><strong>{availableCount}</strong></article><article className="metric-card"><span>Categories</span><strong>{categories.length}</strong></article><article className="metric-card"><span>Active waiters</span><strong>{waiters.filter((w) => w.status === 'ACTIVE').length}</strong></article></section>

    <section className="report-panel"><p className="eyebrow">Menu management</p><h2>Add food or drink with a price</h2><p className="subtle">Prices are stored on the server. It recalculates order totals from current prices and quantities.</p><form className="menu-form" onSubmit={addProduct}><label>Item name<input required value={name} onChange={(e) => setName(e.target.value)} /></label><label>SKU / code<input required value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} /></label><label>Price (TZS)<input type="number" min="1" step="1" required value={price} onChange={(e) => setPrice(e.target.value)} /></label><label>Category<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">No category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Station<select value={station} onChange={(e) => setStation(e.target.value)}><option value="KITCHEN">Kitchen</option><option value="BAR">Bar</option></select></label><button className="primary" disabled={busy}>Save item</button></form><form className="category-form" onSubmit={addCategory}><label>New category<input required value={newCategory} onChange={(e) => setNewCategory(e.target.value)} /></label><button className="secondary" disabled={busy}>Add category</button></form>
      <div className="table-wrap"><table><thead><tr><th>Item</th><th>SKU</th><th>Category</th><th>Station</th><th>Price</th><th>Availability</th><th>Manage</th></tr></thead><tbody>{products.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.sku}</td><td>{p.category_name || '—'}</td><td>{p.preparation_station}</td><td>{money(Number(p.selling_price))}</td><td>{p.is_available ? 'Available' : 'Unavailable'}</td><td><button className="secondary" disabled={busy} onClick={() => editProduct(p)}>Edit</button> <button className="secondary" disabled={busy} onClick={() => toggleAvailability(p)}>{p.is_available ? 'Disable' : 'Enable'}</button></td></tr>)}</tbody></table>{products.length === 0 && <p className="empty">No menu items yet.</p>}</div>
    </section>

    <section className="report-panel"><p className="eyebrow">Staff management</p><h2>Create waiter</h2><form className="create-form" onSubmit={createWaiter}><label>Full name<input required value={waiterName} onChange={(e) => setWaiterName(e.target.value)} /></label><label>Waiter code<input required value={waiterCode} onChange={(e) => setWaiterCode(e.target.value.toUpperCase())} /></label><button className="primary" disabled={busy}>Create waiter</button></form><h2 className="spaced-heading">Waiter PINs</h2><div className="table-wrap"><table><thead><tr><th>Waiter</th><th>Code</th><th>PIN status</th><th>Set/reset PIN</th></tr></thead><tbody>{waiters.map((w) => <tr key={w.id}><td>{w.nickname || w.full_name}</td><td>{w.waiter_code}</td><td>{w.pin_set ? 'Configured' : 'Needs PIN'}</td><td><div className="pin-entry"><input type="password" inputMode="numeric" maxLength={8} placeholder="4–8 digits" value={pins[w.id] || ''} onChange={(e) => setPins((previous) => ({ ...previous, [w.id]: e.target.value.replace(/\D/g, '').slice(0, 8) }))} /><button type="button" className="secondary" disabled={busy} onClick={() => setPin(w)}>{w.pin_set ? 'Reset' : 'Set PIN'}</button></div></td></tr>)}</tbody></table>{waiters.length === 0 && <p className="empty">No waiter accounts yet.</p>}</div></section>

    <section className="report-panel"><p className="eyebrow">Reports</p><h2>Sales and waiter accountability</h2><div className="links"><button className="secondary" disabled={busy} onClick={() => loadReport('/reports/waiter-performance', 'Waiter performance')}>Waiter performance</button><button className="secondary" disabled={busy} onClick={() => loadReport('/reports/daily-summary', 'Daily sales summary')}>Daily sales summary</button><button className="secondary" disabled={busy} onClick={() => loadReport('/reports/products', 'Product performance')}>Product performance</button></div>{report && <div className="report-result"><h3>{report.title}</h3><pre>{JSON.stringify(report.data, null, 2)}</pre></div>}</section>
  </main>;
}
