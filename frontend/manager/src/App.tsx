const waiterRows = [
  { name: 'John', orders: 22, sales: 480000, payments: 450000 },
  { name: 'Mary', orders: 18, sales: 350000, payments: 350000 },
  { name: 'Peter', orders: 15, sales: 290000, payments: 260000 },
  { name: 'Asha', orders: 20, sales: 420000, payments: 420000 },
];

function App() {
  return (
    <div className="manager-shell">
      <header className="header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Manager Dashboard</h1>
        </div>
        <button className="primary">Export Report</button>
      </header>

      <section className="metric-grid">
        <div className="metric-card"><span>Gross Sales</span><strong>TZS 480,000</strong></div>
        <div className="metric-card"><span>Net Sales</span><strong>TZS 460,000</strong></div>
        <div className="metric-card"><span>Outstanding</span><strong>TZS 30,000</strong></div>
        <div className="metric-card"><span>Cancelled</span><strong>1 order</strong></div>
      </section>

      <section className="report-panel">
        <h2>Waiter accountability</h2>
        <table>
          <thead>
            <tr>
              <th>Waiter</th>
              <th>Orders</th>
              <th>Sales</th>
              <th>Payments</th>
            </tr>
          </thead>
          <tbody>
            {waiterRows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.orders}</td>
                <td>TZS {row.sales.toLocaleString()}</td>
                <td>TZS {row.payments.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default App;
