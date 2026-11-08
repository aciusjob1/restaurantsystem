const metrics = [
  { label: 'Gross Sales', value: 'TZS 480,000' },
  { label: 'Payments', value: 'TZS 450,000' },
  { label: 'Outstanding', value: 'TZS 30,000' },
  { label: 'Cancelled', value: '1 Order' },
];

const waiterSales = [
  { name: 'John', sales: 480000 },
  { name: 'Mary', sales: 350000 },
  { name: 'Peter', sales: 290000 },
  { name: 'Asha', sales: 420000 },
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
        {metrics.map((m) => (
          <div className="metric-card" key={m.label}>
            <span>{m.label}</span>
            <strong>{m.value}</strong>
          </div>
        ))}
      </section>

      <section className="report-panel">
        <h2>Waiter performance</h2>
        <table>
          <thead>
            <tr>
              <th>Waiter</th>
              <th>Orders</th>
              <th>Sales</th>
            </tr>
          </thead>
          <tbody>
            {waiterSales.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>22</td>
                <td>TZS {row.sales.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default App;
