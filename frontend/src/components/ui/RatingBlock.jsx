const ICONS = {
  stars: 'fa-star',
  spicy: 'fa-pepper-hot',
  drama: 'fa-droplet',
};

const COLORS = {
  stars: { filled: '#f59e0b', bg: '#fffbeb', label: '#92400e' },
  spicy: { filled: '#ef4444', bg: '#fef2f2', label: '#991b1b' },
  drama: { filled: '#3b82f6', bg: '#eff6ff', label: '#1e40af' },
};

const LABELS = {
  stars: 'Stars',
  spicy: 'Spicy',
  drama: 'Drama',
};

export default function RatingBlock({ type, value, onChange }) {
  const icon = ICONS[type] || 'fa-star';
  const color = COLORS[type] || COLORS.stars;
  const label = LABELS[type] || type;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: value > 0 ? color.bg : '#f8fafc', border: `1.5px solid ${value > 0 ? color.filled + '40' : '#e2e8f0'}`, transition: 'all 0.2s' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: value > 0 ? color.label : '#94a3b8', minWidth: 42, letterSpacing: '0.02em' }}>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <i
            key={n}
            className={`fa-solid ${icon}`}
            style={{ fontSize: '1.05rem', cursor: 'pointer', color: value >= n ? color.filled : '#e2e8f0', transition: 'color 0.15s', width: 20, textAlign: 'center', display: 'inline-block' }}
            onClick={() => onChange(n === value ? 0 : n)}
            onMouseEnter={(e) => { if (value < n) e.target.style.color = color.filled + '80'; }}
            onMouseLeave={(e) => { e.target.style.color = value >= n ? color.filled : '#e2e8f0'; }}
          />
        ))}
      </div>
    </div>
  );
}
