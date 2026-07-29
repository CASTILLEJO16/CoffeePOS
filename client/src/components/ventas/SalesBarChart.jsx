export default function SalesBarChart({ data = [], formatValue }) {
  const max = Math.max(...data.map((d) => d.total), 1);

  if (!data.length) {
    return (
      <div className="chart-empty">
        <p>Sin datos para graficar en este período</p>
      </div>
    );
  }

  return (
    <div className="bar-chart" role="img" aria-label="Gráfica de ventas">
      <div className="bar-chart-plot">
        {data.map((item) => {
          const height = Math.max((item.total / max) * 100, item.total > 0 ? 6 : 2);
          return (
            <div key={item.key} className="bar-chart-col" title={`${item.label}: ${formatValue(item.total)}`}>
              <div className="bar-chart-value">
                {item.total > 0 ? formatValue(item.total) : ''}
              </div>
              <div className="bar-chart-track">
                <div
                  className={`bar-chart-bar ${item.total > 0 ? 'has-value' : ''}`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <div className="bar-chart-label">{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
