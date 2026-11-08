import { useEffect, useMemo, useState } from 'react';

type Product = { id:string; name:string; sku:string; selling_price:number|string; category_name?:string; preparation_station:string };
type Waiter = { id:string; waiter_code:string; full_name:string; nickname?:string };
type Table = { id:string; table_name:string; table_code:string; status:string };
type CartLine = { product:Product; quantity:number };
type User = { id:string; name:string; email:string; role:string };
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const money = (value:number) => new Intl.NumberFormat('en-TZ',{style:'currency',currency:'TZS',maximumFractionDigits:0}).format(value);

async function request(path:string, token:string, options:RequestInit={}) {
  const response = await fetch(`${API}${path}`, { ...options, headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...options.headers} });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

function App() {
  const [token,setToken]=useState(localStorage.getItem('citysquare.token') || '');
  const [user,setUser]=useState<User | null>(null);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [products,setProducts]=useState<Product[]>([]);
  const [waiters,setWaiters]=useState<Waiter[]>([]);
  const [tables,setTables]=useState<Table[]>([]);
  const [orders,setOrders]=useState<any[]>([]);
  const [cart,setCart]=useState<CartLine[]>([]);
  const [waiterId,setWaiterId]=useState('');
  const [tableId,setTableId]=useState('');
  const [orderType,setOrderType]=useState('DINE_IN');
  const [notice,setNotice]=useState('');
  const [drafts,setDrafts]=useState<any[]>(()=>JSON.parse(localStorage.getItem('citysquare.drafts') || '[]'));
  const [category,setCategory]=useState('All');
  const [search,setSearch]=useState('');

  const total=useMemo(()=>cart.reduce((sum,line)=>sum+Number(line.product.selling_price)*line.quantity,0),[cart]);
  const categories=useMemo(()=>['All',...new Set(products.map(p=>p.category_name || 'Other'))],[products]);
  const filtered=products.filter(p=>(category==='All'||(p.category_name||'Other')===category)&&p.name.toLowerCase().includes(search.toLowerCase()));

  const loadData=async (auth:string)=>{
    const [me,menu,staff,dining,orderList]=await Promise.all([
      request('/auth/me',auth),request('/products',auth),request('/waiters',auth),request('/tables',auth),request('/orders',auth)
    ]);
    setUser({id:me.id,name:me.full_name,email:me.email,role:me.role});
    setProducts(menu);setWaiters(staff);setTables(dining);setOrders(orderList);
    if(staff.length&&!waiterId)setWaiterId(staff[0].id);
    if(dining.length&&!tableId)setTableId(dining[0].id);
  };

  useEffect(()=>{ if(token) loadData(token).catch(e=>{setError(e.message);localStorage.removeItem('citysquare.token');setToken('');}); },[token]);
  useEffect(()=>{localStorage.setItem('citysquare.drafts',JSON.stringify(drafts));},[drafts]);

  const login=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');
    try { const result=await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});const data=await result.json();if(!result.ok)throw new Error(data.message||'Login failed');localStorage.setItem('citysquare.token',data.token);setToken(data.token);setPassword(''); }
    catch(e:any){setError(e.message || 'Could not connect to the local POS server');}finally{setBusy(false);}
  };

  const add=(product:Product)=>setCart(current=>{const found=current.find(line=>line.product.id===product.id);return found?current.map(line=>line.product.id===product.id?{...line,quantity:line.quantity+1}:line):[...current,{product,quantity:1}];});
  const changeQuantity=(id:string,delta:number)=>setCart(current=>current.map(line=>line.product.id===id?{...line,quantity:line.quantity+delta}:line).filter(line=>line.quantity>0));

  const submitOrder=async()=>{
    if(!cart.length)return;
    const payload={idempotencyKey:crypto.randomUUID(),waiterId:waiterId||undefined,tableId:tableId||undefined,orderType,items:cart.map(line=>({productId:line.product.id,quantity:line.quantity}))};
    setBusy(true);setError('');
    try { const order=await request('/orders',token,{method:'POST',body:JSON.stringify(payload)});setNotice(`Order ${order.order_number} sent to preparation.`);setCart([]);await loadData(token); }
    catch(e:any){const draft={...payload,localCreatedAt:new Date().toISOString(),status:'LOCAL_DRAFT',error:e.message};setDrafts(current=>[draft,...current]);setNotice('Server unavailable: order saved as a local draft, not sent to the kitchen.');setError(e.message);}
    finally{setBusy(false);}
  };

  const syncDrafts=async()=>{
    if(!drafts.length)return;
    setBusy(true);let remaining=[...drafts];
    for(const draft of drafts){try{await request('/orders',token,{method:'POST',body:JSON.stringify(draft)});remaining=remaining.filter(item=>item.idempotencyKey!==draft.idempotencyKey);}catch(e:any){setError(`Draft sync paused: ${e.message}`);break;}}
    setDrafts(remaining);await loadData(token).catch(()=>{});setBusy(false);
  };

  const takePayment=async(order:any)=>{
    const amount=Number(prompt(`Enter payment amount for ${order.order_number} (outstanding ${money(Number(order.total_amount)-Number(order.paid_amount||0))})`));
    if(!Number.isFinite(amount)||amount<=0)return;
    const methodCode=prompt('Payment method code: CASH, MPESA, or CARD','CASH')?.toUpperCase();if(!methodCode)return;
    try{await request('/payments',token,{method:'POST',body:JSON.stringify({orderId:order.id,amount,methodCode,idempotencyKey:crypto.randomUUID()})});setNotice('Payment recorded.');await loadData(token);}catch(e:any){setError(e.message);}
  };

  if(!token) return <main className="login-screen"><form className="login-card" onSubmit={login}><div className="brand-mark">CS</div><p className="eyebrow">City Square Restaurant</p><h1>Desktop POS</h1><p className="muted">Sign in to the local restaurant system.</p><label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error">{error}</p>}<button className="primary full" disabled={busy}>{busy?'Signing in…':'Sign in'}</button><small>For offline operation, connect to the restaurant LAN server.</small></form></main>;

  return <div className="app-shell">
    <header className="topbar"><div><p className="eyebrow">City Square Restaurant · Local POS</p><h1>Point of sale</h1><p className="muted">Signed in as {user?.name} · {user?.role}</p></div><div className="header-actions"><span className="connection"><i/> Local server</span><button className="secondary" onClick={()=>loadData(token).catch(e=>setError(e.message))}>Refresh</button><button className="secondary" onClick={()=>{localStorage.removeItem('citysquare.token');setToken('');setUser(null);}}>Sign out</button></div></header>
    {(error||notice)&&<div className={error?'alert error':'alert success'}>{error||notice}<button onClick={()=>{setError('');setNotice('');}}>×</button></div>}
    <div className="toolbar"><label>Waiter<select value={waiterId} onChange={e=>setWaiterId(e.target.value)}><option value="">Choose waiter</option>{waiters.map(w=><option key={w.id} value={w.id}>{w.nickname||w.full_name} · {w.waiter_code}</option>)}</select></label><label>Table<select value={tableId} onChange={e=>setTableId(e.target.value)}><option value="">No table</option>{tables.map(t=><option key={t.id} value={t.id}>{t.table_name} · {t.status}</option>)}</select></label><label>Order type<select value={orderType} onChange={e=>setOrderType(e.target.value)}><option value="DINE_IN">Dine in</option><option value="TAKEAWAY">Takeaway</option><option value="DELIVERY">Delivery</option></select></label><button className="secondary" onClick={syncDrafts} disabled={!drafts.length||busy}>Sync drafts ({drafts.length})</button></div>
    <section className="stats-grid"><div className="card"><span>Open orders</span><strong>{orders.filter(o=>!['PAID','CANCELLED'].includes(o.status)).length}</strong></div><div className="card"><span>Today's orders</span><strong>{orders.filter(o=>new Date(o.created_at).toDateString()===new Date().toDateString()).length}</strong></div><div className="card"><span>Local drafts</span><strong>{drafts.length}</strong></div></section>
    <section className="content-grid"><div className="panel menu-panel"><div className="section-heading"><div><p className="eyebrow">Menu</p><h2>Choose items</h2></div><input className="search" placeholder="Search menu" value={search} onChange={e=>setSearch(e.target.value)}/></div><nav className="categories">{categories.map(item=><button key={item} className={category===item?'selected':''} onClick={()=>setCategory(item)}>{item}</button>)}</nav><div className="menu-grid">{filtered.map(product=><button key={product.id} className="menu-item" onClick={()=>add(product)}><span className="station">{product.preparation_station}</span><strong>{product.name}</strong><span>{money(Number(product.selling_price))}</span></button>)}</div></div>
    <div className="panel cart-panel"><div className="section-heading"><div><p className="eyebrow">New sale</p><h2>Current order</h2></div><button className="text-button" onClick={()=>setCart([])}>Clear</button></div>{cart.length===0?<div className="empty">Add menu items to start an order.</div>:cart.map(line=><div className="cart-line" key={line.product.id}><div><strong>{line.product.name}</strong><small>{money(Number(line.product.selling_price))} each</small></div><div className="quantity"><button onClick={()=>changeQuantity(line.product.id,-1)}>−</button><b>{line.quantity}</b><button onClick={()=>changeQuantity(line.product.id,1)}>+</button></div><strong>{money(Number(line.product.selling_price)*line.quantity)}</strong></div>)}<div className="cart-total"><span>Total · TZS</span><strong>{money(total)}</strong></div><button className="primary full" disabled={!cart.length||busy||(!waiterId&&user?.role==='CASHIER')} onClick={submitOrder}>{busy?'Working…':'Send order to kitchen'}</button><p className="helper">Waiter assignment is preserved on every order. Orders are only kitchen-submitted after server confirmation.</p></div></section>
    <section className="panel orders-panel"><div className="section-heading"><div><p className="eyebrow">Service</p><h2>Recent orders</h2></div></div><div className="table-wrap"><table><thead><tr><th>Order</th><th>Waiter</th><th>Time</th><th>Status</th><th>Total</th><th>Paid</th><th/></tr></thead><tbody>{orders.slice(0,12).map(order=><tr key={order.id}><td>{order.order_number}</td><td>{order.waiter_name}</td><td>{new Date(order.created_at).toLocaleTimeString()}</td><td><span className="status">{order.status}</span></td><td>{money(Number(order.total_amount))}</td><td>{money(Number(order.paid_amount||0))}</td><td><button className="text-button" disabled={Number(order.paid_amount)>=Number(order.total_amount)||order.status==='CANCELLED'} onClick={()=>takePayment(order)}>Payment</button></td></tr>)}</tbody></table></div></section>
  </div>;
}

export default App;
