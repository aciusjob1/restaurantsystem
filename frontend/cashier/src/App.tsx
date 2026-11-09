import { useEffect, useMemo, useState } from 'react';

type Product = { id: string; name: string; sku: string; selling_price: number | string; category_name?: string; preparation_station: string };
type Waiter = { id: string; waiter_code: string; full_name: string; nickname?: string };
type Table = { id: string; table_name: string; table_code: string; status: string };
type CartLine = { product: Product; quantity: number };
type User = { id: string; name: string; email: string; role: string };

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const money = (value: number) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(value);

async function request(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('citysquare.token') || '');
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [waiterId, setWaiterId] = useState('');
  const [tableId, setTableId] = useState('');
  const [orderType, setOrderType] = useState('DINE_IN');
  const [notice, setNotice] = useState('');
  const [drafts, setDrafts] = useState<any[]>(() => JSON.parse(localStorage.getItem('citysquare.drafts') || '[]'));
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const total = useMemo(() => cart.reduce((sum, line) => sum + Number(line.product.selling_price) * line.quantity, 0), [cart]);
  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category_name || 'Other'))], [products]);
  const filtered = products.filter((p) => (category === 'All' || (p.category_name || 'Other') === category) && p.name.toLowerCase().includes(search.toLowerCase()));

  const loadData = async (auth: string) => {
    const [me, menu, staff, dining, orderList] = await Promise.all([
      request('/auth/me', auth),
      request('/catalog/products', auth),
      request('/waiters', auth),
      request('/catalog/tables', auth),
      request('/orders', auth),
    ]);

    setUser({ id: me.id, name: me.full_name, email: me.email, role: me.role });
    setProducts(menu);
    setWaiters(staff);
    setTables(dining);
    setOrders(orderList);

    if (staff.length && !waiterId) setWaiterId(staff[0].id);
    if (dining.length && !tableId) setTableId(dining[0].id);
  };

  useEffect(() => {
    if (token) {
      loadData(token).catch((e) => {
        setError(e.message);
        localStorage.removeItem('citysquare.token');
        setToken('');
      });
    }
  }, [token]);

  useEffect(() => {
    localStorage.setItem('citysquare.drafts', JSON.stringify(drafts));
  }, [drafts]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const result = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await result.json();
      if (!result.ok) throw new Error(data.message || 'Login failed');
      localStorage.setItem('citysquare.token', data.token);
      setToken(data.token);
      setPassword('');
    } catch (e: any) {
      setError(e.message || 'Could not connect to the local POS server');
    } finally {
      setBusy(false);
    }
  };

  const add = (product: Product) => setCart((current) => {
    const found = current.find((line) => line.product.id === product.id);
    return found
      ? current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
      : [...current, { product, quantity: 1 }];
  });

  const changeQuantity = (id: string, delta: number) => setCart((current) => current.map((line) => line.product.id === id ? { ...line, quantity: line.quantity + delta } : line).filter((line) => line.quantity > 0));

  const submitOrder = async () => {
    if (!cart.length) return;
    const payload = {
      idempotencyKey: crypto.randomUUID(),
      waiterId: waiterId || undefined,
      tableId: tableId || undefined,
      orderType,
      items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
    };

    setBusy(true);
    setError('');

    try {
      const order = await request('/orders', token, { method: 'POST', body: JSON.stringify(payload) });
      setNotice(`Order ${order.order_number} sent to preparation.`);
      setCart([]);
      await loadData(token);
    } catch (e: any) {
      const draft = { ...payload, localCreatedAt: new Date().toISOString(), status: 'LOCAL_DRAFT', error: e.message };
      setDrafts((current) => [draft, ...current]);
      setNotice('Server unavailable: order saved as a local draft.');
    } finally {
      setBusy(false);
    }
  };

  const syncDrafts = async () => {
    if (!drafts.length) return;
    setBusy(true);
    let remaining = [...drafts];

    for (const draft of drafts) {
      try {
        await request('/orders', token, { method: 'POST', body: JSON.stringify(draft) });
        remaining = remaining.filter((item) => item.idempotencyKey !== draft.idempotencyKey);
      } catch {
        // leave unsent drafts in place
      }
    }

    setDrafts(remaining);
    await loadData(token).catch(() => {});
    setBusy(false);
  };

  const takePayment = async (order: any) => {
    const amount = Number(prompt(`Enter payment amount for ${order.order_number} (outstanding ${money(Number(order.total_amount) - Number(order.paid_amount || 0))})`));
    if (!Number.isFinite(amount) || amount <= 0) return;

    const methodCode = prompt('Payment method code: CASH, MPESA, or CARD', 'CASH')?.toUpperCase();
    if (!methodCode) return;

    try {
      await request('/payments', token, { method: 'POST', body: JSON.stringify({ orderId: order.id, amount, methodCode, idempotencyKey: crypto.randomUUID() }) });
      setNotice('Payment recorded.');
      await loadData(token);
    } catch (e: any) {
      setError(e.message || 'Payment failed');
    }
  };

  if (!token) {
    return (
      <main className="login-screen">
        <form className="login-card" onSubmit={login}>
          <div className="brand-mark">CS</div>
          <p className="eyebrow">City Square Restaurant</p>
          <h1>Desktop POS</h1>
          <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {error && <p className="alert error">{error}</p>}
          <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">City Square Restaurant · Local POS</p>
          <h1>Point of sale</h1>
          <p className="muted">Signed in as {user?.name} · {user?.role}</p>
        </div>
        <button className="text-button" onClick={() => { localStorage.removeItem('citysquare.token'); setToken(''); }}>Sign out</button>
      </header>

      {(error || notice) && <div className={error ? 'alert error' : 'alert success'}>{error || notice}<button onClick={() => { setError(''); setNotice(''); }}>×</button></div>}

      <div className="toolbar">
        <label>Waiter<select value={waiterId} onChange={(e) => setWaiterId(e.target.value)}><option value="">Choose waiter</option>{waiters.map((w) => <option key={w.id} value={w.id}>{w.full_name || w.nickname || w.waiter_code}</option>)}</select></label>
        <label>Table<select value={tableId} onChange={(e) => setTableId(e.target.value)}><option value="">Choose table</option>{tables.map((t) => <option key={t.id} value={t.id}>{t.table_name}</option>)}</select></label>
        <label>Order type<select value={orderType} onChange={(e) => setOrderType(e.target.value)}><option value="DINE_IN">Dine in</option><option value="TAKEAWAY">Takeaway</option><option value="DELIVERY">Delivery</option></select></label>
      </div>

      <section className="stats-grid">
        <div className="card"><span>Open orders</span><strong>{orders.filter((o) => !['PAID', 'CANCELLED'].includes(o.status)).length}</strong></div>
        <div className="card"><span>Drafts</span><strong>{drafts.length}</strong></div>
        <div className="card"><span>Cart total</span><strong>{money(total)}</strong></div>
        <div className="card"><span>Service status</span><strong>Ready</strong></div>
      </section>

      <section className="content-grid">
        <div className="panel menu-panel">
          <div className="section-heading">
            <div><p className="eyebrow">Menu</p><h2>Choose items</h2></div>
            <input className="search" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="category-strip">{categories.map((c) => <button key={c} className={category === c ? 'chip active' : 'chip'} onClick={() => setCategory(c)}>{c}</button>)}</div>

          <div className="product-grid">
            {filtered.map((product) => (
              <button key={product.id} className="product-card" onClick={() => add(product)}>
                <span className="name">{product.name}</span>
                <span className="meta">{product.sku}</span>
                <strong>{money(Number(product.selling_price))}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="panel cart-panel">
          <div className="section-heading">
            <div><p className="eyebrow">New sale</p><h2>Current order</h2></div>
            <button className="text-button" onClick={() => setCart([])}>Clear</button>
          </div>

          <div className="cart-list">
            {cart.length === 0 && <div className="empty">Select products to create an order.</div>}
            {cart.map((line) => (
              <div key={line.product.id} className="cart-line">
                <div>
                  <div className="name">{line.product.name}</div>
                  <div className="meta">{money(Number(line.product.selling_price))} each</div>
                </div>
                <div className="qty-controls">
                  <button onClick={() => changeQuantity(line.product.id, -1)}>-</button>
                  <span>{line.quantity}</span>
                  <button onClick={() => changeQuantity(line.product.id, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="totals">
            <div><span>Subtotal</span><strong>{money(total)}</strong></div>
            <div><span>Tax</span><strong>{money(0)}</strong></div>
            <div className="grand-total"><span>Total</span><strong>{money(total)}</strong></div>
          </div>

          <button className="primary" disabled={!cart.length || busy} onClick={submitOrder}>{busy ? 'Sending…' : 'Send order'}</button>
          <button className="secondary" disabled={!drafts.length || busy} onClick={syncDrafts}>Sync drafts</button>
        </div>
      </section>

      <section className="panel orders-panel">
        <div className="section-heading">
          <div><p className="eyebrow">Service</p><h2>Recent orders</h2></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Order</th><th>Status</th><th>Waiter</th><th>Total</th><th>Paid</th><th>Action</th></tr>
            </thead>
            <tbody>
              {orders.slice(0, 8).map((order) => (
                <tr key={order.id}>
                  <td>{order.order_number}</td>
                  <td>{order.status}</td>
                  <td>{order.waiter_name || 'Unassigned'}</td>
                  <td>{money(Number(order.total_amount))}</td>
                  <td>{money(Number(order.paid_amount || 0))}</td>
                  <td><button className="small-button" onClick={() => takePayment(order)}>Pay</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default App;
