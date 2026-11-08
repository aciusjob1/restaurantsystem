const menu = [
  { id: 'rice', name: 'Rice & Stew', price: 12000, category: 'Food' },
  { id: 'chicken', name: 'Chicken Curry', price: 18000, category: 'Food' },
  { id: 'fish', name: 'Fish Plate', price: 20000, category: 'Food' },
  { id: 'juice', name: 'Fresh Juice', price: 5000, category: 'Drink' },
  { id: 'soda', name: 'Soda', price: 3000, category: 'Drink' },
  { id: 'water', name: 'Water', price: 2000, category: 'Drink' },
];

const waiters = [
  { id: 'w1', name: 'John', code: 'W-001' },
  { id: 'w2', name: 'Mary', code: 'W-002' },
  { id: 'w3', name: 'Peter', code: 'W-003' },
];

const tables = ['Table 01', 'Table 02', 'Table 03', 'Table 04', 'Table 05'];

function App() {
  const [selectedWaiter, setSelectedWaiter] = React.useState(waiters[0].name);
  const [selectedTable, setSelectedTable] = React.useState(tables[0]);
  const [items, setItems] = React.useState([
    { id: 'rice', name: 'Rice & Stew', qty: 2, price: 12000 },
    { id: 'juice', name: 'Fresh Juice', qty: 1, price: 5000 },
  ]);

  const addItem = (id: string) => {
    const product = menu.find((item) => item.id === id);
    if (!product) return;

    setItems((current) => {
      const existing = current.find((item) => item.id === id);
      if (existing) {
        return current.map((item) =>
          item.id === id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...current, { id: product.id, name: product.name, qty: 1, price: product.price }];
    });
  };

  const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const discount = 5000;
  const total = subtotal - discount;

  const handlePayment = () => {
    alert(`Order for ${selectedWaiter} at ${selectedTable} recorded. Total: TZS ${total.toLocaleString()}`);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">City Square Restaurant</p>
          <h1>Desktop POS</h1>
        </div>
        <button className="primary">New Order</button>
      </header>

      <section className="toolbar">
        <label>
          Waiter
          <select value={selectedWaiter} onChange={(e) => setSelectedWaiter(e.target.value)}>
            {waiters.map((waiter) => (
              <option key={waiter.id} value={waiter.name}>{waiter.name} ({waiter.code})</option>
            ))}
          </select>
        </label>

        <label>
          Table
          <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}>
            {tables.map((table) => (
              <option key={table} value={table}>{table}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="stats-grid">
        <div className="card">
          <span>Open Orders</span>
          <strong>18</strong>
        </div>
        <div className="card">
          <span>Today Sales</span>
          <strong>TZS 480,000</strong>
        </div>
        <div className="card">
          <span>Waiter Sales</span>
          <strong>TZS 120,000</strong>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2>Menu</h2>
          <div className="menu-grid">
            {menu.map((product) => (
              <button key={product.id} className="menu-item" onClick={() => addItem(product.id)}>
                <span>{product.name}</span>
                <strong>TZS {product.price.toLocaleString()}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Current Order</h2>
          {items.map((item) => (
            <div className="order-line" key={item.id}>
              <span>{item.name}</span>
              <span>{item.qty} x {item.price.toLocaleString()}</span>
            </div>
          ))}

          <div className="totals">
            <div><span>Subtotal</span><strong>TZS {subtotal.toLocaleString()}</strong></div>
            <div><span>Discount</span><strong>TZS {discount.toLocaleString()}</strong></div>
            <div className="grand-total"><span>Total</span><strong>TZS {total.toLocaleString()}</strong></div>
          </div>

          <div className="payment-box">
            <div className="payment-row"><span>Cash</span><span>TZS 20,000</span></div>
            <div className="payment-row"><span>M-Pesa</span><span>TZS 30,000</span></div>
            <div className="payment-row"><span>Card</span><span>TZS 0</span></div>
          </div>

          <button className="primary full" onClick={handlePayment}>Complete Sale</button>
        </div>
      </section>
    </div>
  );
}

export default App;
