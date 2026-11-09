import { useEffect, useMemo, useState } from 'react';

type Category = { id: string; name: string };
type Product = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  selling_price: string | number;
  preparation_station: string;
  is_available: boolean;
};

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const money = (amount: number) => new Intl.NumberFormat('en-TZ', {
  style: 'currency', currency: 'TZS', maximumFractionDigits: 0,
}).format(amount);

async function api(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(message || `Request failed (${response.status})`);
  }
  return data;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('citysquare.manager.token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [station, setStation] = useState('KITCHEN');
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const activeProducts = useMemo(() => products.filter((product) => product.is_available), [products]);

  async function loadMenu(auth = token) {
    const [menu, groups] = await Promise.all([
      api('/catalog/products', auth),
      api('/catalog/categories', auth),
    ]);
    setProducts(menu);
    setCategories(groups);
  }

  useEffect(() => {
    if (!token) return;
    loadMenu(token).catch((reason: any) => {
      setError(reason.message || 'Could not load the menu');
      localStorage.removeItem('citysquare.manager.token');
      setToken('');
    });
    api('/auth/me', token).then((user) => setRole(user.role)).catch(() => {});
  }, [token]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Sign in failed');
      if (!['ADMIN', 'MANAGER'].includes(data.user?.role)) {
        throw new Error('Only an administrator or manager can manage menu prices');
      }
      localStorage.setItem('citysquare.manager.token', data.token);
      setRole(data.user.role);
      setToken(data.token);
      setPassword('');
    } catch (reason: any) {
      setError(reason.message || 'Could not connect to the POS server');
    } finally {
      setBusy(false);
    }
  }

  async function addCategory(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api('/catalog/categories', token, {
        method: 'POST',
        body: JSON.stringify({ name: newCategory.trim() }),
      });
      setNewCategory('');
      setCategoryId(result.id);
      setNotice(`Category “${result.name}” added.`);
      await loadMenu();
    } catch (reason: any) {
      setError(reason.message || 'Could not add category');
    } finally {
      setBusy(false);
    }
  }

  async function addProduct(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/catalog/products', token, {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          sellingPrice: Number(price),
          categoryId: categoryId || undefined,
          preparationStation: station,
        }),
      });
      setName('');
      setSku('');
      setPrice('');
      setNotice('Menu item saved. Cashier order totals use this saved price and the selected quantity.');
      await loadMenu();
    } catch (reason: any) {
      setError(reason.message || 'Could not save menu item');
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    localStorage.removeItem('citysquare.manager.token');
    setToken('');
    setRole('');
  }

  if (!token) {
    return (
      <main className="manager-login">
        <form className="manager-login-card" onSubmit={login}>
          <p className="eyebrow">City Square · Management</p>
          <h1>Manager sign in</h1>
          <label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="notice error">{error}</p>}
          <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </main>
    );
  }

  return (
    <main className="manager-shell">
      <header className="header">
        <div>
          <p className="eyebrow">City Square Restaurant · {role || 'Management'}</p>
          <h1>Menu management</h1>
          <p className="subtle">Add food and drink items with prices. The cashier shows those prices and calculates order totals by quantity.</p>
        </div>
        <div className="header-actions">
          <button className="secondary" disabled={busy} onClick={() => loadMenu().catch((reason: any) => setError(reason.message))}>Refresh menu</button>
          <button className="secondary" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {(error || notice) && <div className={error ? 'notice error' : 'notice success'} role="status">{error || notice}</div>}

      <section className="metric-grid">
        <article className="metric-card"><span>Total menu items</span><strong>{products.length}</strong></article>
        <article className="metric-card"><span>Available items</span><strong>{activeProducts.length}</strong></article>
        <article className="metric-card"><span>Categories</span><strong>{categories.length}</strong></article>
        <article className="metric-card"><span>Currency</span><strong>TZS</strong></article>
      </section>

      <section className="report-panel">
        <p className="eyebrow">Menu</p>
        <h2>Add a food or drink item</h2>
        <form className="menu-form" onSubmit={addProduct}>
          <label>Item name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Grilled chicken" /></label>
          <label>SKU / code<input required value={sku} onChange={(event) => setSku(event.target.value.toUpperCase())} placeholder="e.g. FOOD-003" /></label>
          <label>Price (TZS)<input required type="number" min="1" step="1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="e.g. 15000" /></label>
          <label>Category<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label>Preparation station<select value={station} onChange={(event) => setStation(event.target.value)}><option value="KITCHEN">Kitchen</option><option value="BAR">Bar</option></select></label>
          <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save menu item'}</button>
        </form>

        <form className="category-form" onSubmit={addCategory}>
          <label>New category<input required value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="e.g. Breakfast" /></label>
          <button className="secondary" disabled={busy}>Add category</button>
        </form>
      </section>

      <section className="report-panel">
        <div className="section-title"><div><p className="eyebrow">Saved catalog</p><h2>Items and prices</h2></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>SKU</th><th>Category</th><th>Station</th><th>Price</th><th>Availability</th></tr></thead>
            <tbody>{products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td><td>{product.sku}</td><td>{product.category_name || '—'}</td>
                <td>{product.preparation_station}</td><td>{money(Number(product.selling_price))}</td>
                <td>{product.is_available ? 'Available' : 'Unavailable'}</td>
              </tr>
            ))}</tbody>
          </table>
          {products.length === 0 && <p className="empty">No menu items saved yet. Add a food or drink above.</p>}
        </div>
      </section>

      <p className="subtle">Order totals are recalculated by the server from the current product price and submitted quantity; the displayed cashier cart total is an estimate until the server accepts the order.</p>
    </main>
  );
}
