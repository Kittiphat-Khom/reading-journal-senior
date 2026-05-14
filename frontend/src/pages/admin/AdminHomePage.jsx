import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/styles-admin.css';

const ADMIN_SECTIONS = [
  { to: '/admin/books',   icon: 'fa-book',    label: 'Manage Books',   desc: 'Curate featured books for preference setup',  color: '#3b82f6', bg: '#eff6ff' },
  { to: '/admin/authors', icon: 'fa-pen-nib', label: 'Manage Authors', desc: 'Curate featured authors for preference setup', color: '#8b5cf6', bg: '#f5f3ff' },
  { to: '/admin/genres',  icon: 'fa-tags',    label: 'Manage Genres',  desc: 'Maintain genre categories',                   color: '#10b981', bg: '#ecfdf5' },
  { to: '/admin/users',   icon: 'fa-users',   label: 'Manage Users',   desc: 'View users & change roles',          color: '#f59e0b', bg: '#fffbeb' },
  { to: '/admin/reports',  icon: 'fa-flag',        label: 'Bug Reports',      desc: 'Review & resolve submitted reports',    color: '#ef4444', bg: '#fef2f2' },
  { to: '/admin/reviews', icon: 'fa-star-half-stroke', label: 'Manage Reviews', desc: 'View and delete all user book reviews', color: '#0891b2', bg: '#ecfeff' },
];

export default function AdminHomePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ee', fontFamily: "'Prompt', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '24px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-shield-halved" style={{ color: '#fff', fontSize: '1.1rem' }}></i>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#1e293b' }}>Admin Dashboard</h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Reading Journal — Control Panel</p>
          </div>
        </div>
        <button
          onClick={() => logout(navigate)}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#64748b', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fecaca'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
        >
          <i className="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '40px 48px', maxWidth: 1000, margin: '0 auto' }}>
        <p style={{ color: '#64748b', marginBottom: 28, fontSize: '0.95rem' }}>Select a section to manage</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {ADMIN_SECTIONS.map((s) => (
            <Link key={s.to} to={s.to} style={{ textDecoration: 'none' }}>
              <div
                style={{ background: '#fff', borderRadius: 18, padding: '24px 28px', border: '1px solid #e2e8f0', transition: 'all 0.2s ease', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 18 }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fa-solid ${s.icon}`} style={{ fontSize: '1.3rem', color: s.color }}></i>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{s.label}</h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4 }}>{s.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
