const menu = [
  { name: 'Rice and Stew', qty: 2, price: 12000 },
  { name: 'Chicken Curry', qty: 1, price: 18000 },
  { name: 'Fresh Juice', qty: 3, price: 5000 },
];

function App() {
  const total = menu.reduce((sum, item) => sum + item.qty * item.price, 0);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">City Square Restaurant</p>
          <h1>Cashier POS</h1>
        </div>
        <button className="primary">New Order</button>
      </header>

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
          <span>Outstanding</span>
          <strong>TZS 30,000</strong>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2>Current Order</h2>
          {menu.map((item) => (
            <div className="order-line" key={item.name}>
              <span>{item.name}</span>
              <span>{item.qty} x {item.price.toLocaleString()}</span>
            </div>
          ))}
          <div className="order-total">
            <strong>Total</strong>
            <strong>TZS {total.toLocaleString()}</strong>
          </div>
        </div>

        <div className="panel">
          <h2>Payment</h2>
          <div className="payment-row"><span>Cash</span><span>TZS 20,000</span></div>
          <div className="payment-row"><span>M-Pesa</span><span>TZS 18,000</span></div>
          <div className="payment-row"><span>Card</span><span>TZS 0</span></div>
          <button className="primary full">Complete Sale</button>
        </div>
      </section>
    </div>
  );
}

export default App;
