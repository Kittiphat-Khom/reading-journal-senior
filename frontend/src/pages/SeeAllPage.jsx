import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { formatTime, parseDBTime } from '../hooks/useTimer';
import { useAuth } from '../context/AuthContext';
import { getJournal } from '../api/journals';
import '../styles/seeall.css';

export default function SeeAllPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const journalId = params.get('id');
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [range, setRange] = useState('week');
  const [logs, setLogs] = useState([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!journalId) { setLoading(false); return; }
    getJournal(journalId)
      .then((res) => {
        let rawLogs = res.data.reading_log;
        if (typeof rawLogs === 'string') {
          try { rawLogs = JSON.parse(rawLogs); } catch { rawLogs = []; }
        }
        setLogs(rawLogs || []);
        setTotalSeconds(parseDBTime(res.data.total_reading_time));
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [journalId]);

  useEffect(() => {
    if (loading || !canvasRef.current) return;
    buildChart(range, logs);
  }, [range, logs, loading]);

  useEffect(() => () => { if (chartRef.current) chartRef.current.destroy(); }, []);

  function buildChart(rangeType, readingLogs) {
    const Chart = window.Chart;
    if (!Chart || !canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const ctx = canvasRef.current.getContext('2d');
    const today = new Date();
    let labels = [], dataPoints = [];

    if (rangeType === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(today.getDate() - i);
        const key = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }));
        dataPoints.push((readingLogs.filter((l) => l.date === key).reduce((a, c) => a + c.time, 0) / 60).toFixed(2));
      }
    } else if (rangeType === 'month') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(today.getDate() - i);
        const key = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        dataPoints.push((readingLogs.filter((l) => l.date === key).reduce((a, c) => a + c.time, 0) / 60).toFixed(2));
      }
    } else {
      for (let m = 0; m < 12; m++) {
        const d = new Date(today.getFullYear(), m, 1);
        labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
        dataPoints.push((readingLogs.filter((l) => { const ld = new Date(l.date); return ld.getMonth() === m && ld.getFullYear() === today.getFullYear(); }).reduce((a, c) => a + c.time, 0) / 60).toFixed(2));
      }
    }

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Reading Time (min)', data: dataPoints, backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 8 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Minutes' } } } },
    });
  }

  const ttH = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const ttM = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const ttS = String(totalSeconds % 60).padStart(2, '0');

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#548CA8' }}></i>
      </div>
    );
  }

  return (
    <div className="stat-content">
      <header className="stat-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <i className="fa-solid fa-chevron-left"></i> Reading Stat
        </button>
        {user && (
          <div className="user-info">
            <i className="fa-solid fa-user"></i> {user.username || user.email}
          </div>
        )}
      </header>

      <div className="stat-body">
        <div className="stat-chart-section">
          <h3>Time spent</h3>
          <div className="chart-container" style={{ height: 350, width: '100%' }}>
            <canvas ref={canvasRef}></canvas>
          </div>
          <div className="chart-filter">
            <span>Time you have spent in a</span>
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
        </div>

        <div className="stat-list-section">
          <div className="total-time-box">
            <h3>Total reading time</h3>
            <div className="digital-clock-popup">
              <span className="digit-box">{ttH}</span>
              {' : '}
              <span className="digit-box">{ttM}</span>
              {' : '}
              <span className="digit-box">{ttS}</span>
            </div>
          </div>

          <div className="session-list-container">
            <h3>Reading time</h3>
            {logs.length === 0 ? (
              <p style={{ color: '#90A4AE', textAlign: 'center', paddingTop: 20 }}>No sessions recorded yet.</p>
            ) : (
              <ul className="session-log-list">
                {[...logs].reverse().map((log, i) => (
                  <li key={i}>
                    <span className="session-date">{log.date}</span>
                    <span className="session-time-badge">{formatTime(log.time)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="stat-footer">
            <button className="btn-done" onClick={() => navigate(-1)}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
