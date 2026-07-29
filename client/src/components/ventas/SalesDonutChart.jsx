const COLORS = {
  efectivo: 'var(--color-success)',
  tarjeta: 'var(--color-info)',
  transferencia: 'var(--color-warning)',
  otros: 'var(--color-secondary)'
};

export default function SalesDonutChart({ data = [], formatValue }) {
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const radius = 70;
  const stroke = 22;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = data
    .filter((d) => d.amount > 0)
    .map((item) => {
      const length = total > 0 ? (item.amount / total) * circumference : 0;
      const segment = {
        ...item,
        dash: `${length} ${circumference - length}`,
        offset
      };
      offset -= length;
      return segment;
    });

  return (
    <div className="donut-chart">
      <div className="donut-chart-visual">
        <svg viewBox="0 0 180 180" className="donut-svg" aria-hidden="true">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={stroke}
          />
          {segments.map((segment) => (
            <circle
              key={segment.key}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={COLORS[segment.key] || 'var(--color-primary)'}
              strokeWidth={stroke}
              strokeDasharray={segment.dash}
              strokeDashoffset={segment.offset}
              strokeLinecap="butt"
              transform="rotate(-90 90 90)"
              className="donut-segment"
            />
          ))}
        </svg>
        <div className="donut-center">
          <span className="donut-center-label">Total</span>
          <span className="donut-center-value">{formatValue(total)}</span>
        </div>
      </div>

      <ul className="donut-legend">
        {data.map((item) => (
          <li key={item.key}>
            <span className="donut-legend-dot" style={{ background: COLORS[item.key] }} />
            <span className="donut-legend-label">{item.label}</span>
            <span className="donut-legend-meta">
              {formatValue(item.amount)} · {item.percent.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
