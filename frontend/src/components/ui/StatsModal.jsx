import { useEffect, useRef, useState } from 'react';

export default function StatsModal({ open, onClose, readingLogs }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [range, setRange] = useState('week');

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    buildChart(range);
  }, [open, range, readingLogs]);

  useEffect(() => {
    return () => {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  }, []);

  function buildChart(rangeType) {
    const ctx = canvasRef.current.getContext('2d');
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const Chart = window.Chart;
    if (!Chart) return;

    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)');

    const logs = readingLogs || [];
    const today = new Date();
    let labels = [], dataPoints = [], xTitle = '';

    if (rangeType === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const key = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }));
        const sum = logs.filter((l) => l.date === key).reduce((a, c) => a + c.time, 0);
        dataPoints.push((sum / 60).toFixed(2));
      }
      xTitle = 'Last 7 Days';
    } else if (rangeType === 'month') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const key = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        const sum = logs.filter((l) => l.date === key).reduce((a, c) => a + c.time, 0);
        dataPoints.push((sum / 60).toFixed(2));
      }
      xTitle = 'Last 30 Days';
    } else {
      const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(today.getFullYear(), i, 1);
        return { label: d.toLocaleDateString('en-US', { month: 'short' }), month: i, year: today.getFullYear() };
      });
      labels = months.map((m) => m.label);
      dataPoints = months.map(({ month, year }) => {
        const sum = logs.filter((l) => {
          const d = new Date(l.date);
          return d.getMonth() === month && d.getFullYear() === year;
        }).reduce((a, c) => a + c.time, 0);
        return (sum / 60).toFixed(2);
      });
      xTitle = `Year ${today.getFullYear()}`;
    }

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Reading Time (min)',
          data: dataPoints,
          backgroundColor: gradient,
          borderColor: 'rgba(59,130,246,1)',
          borderWidth: 2,
          borderRadius: 8,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: xTitle } },
          y: { title: { display: true, text: 'Minutes' }, beginAtZero: true },
        },
      },
    });
  }

  if (!open) return null;
  return (
    <div className="popup" style={{ display: 'flex', zIndex: 8000 }}>
      <div className="input-modal-content" style={{ maxWidth: 800, width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3><i className="fa-solid fa-chart-simple"></i> Reading Statistics</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>
        <select value={range} onChange={(e) => setRange(e.target.value)} style={{ marginBottom: 16 }}>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="year">This Year</option>
        </select>
        <canvas ref={canvasRef} id="readingChart"></canvas>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 8 }}>Showing reading time in minutes.</p>
      </div>
    </div>
  );
}
