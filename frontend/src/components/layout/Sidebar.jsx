import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoutModal from '../ui/LogoutModal';

const menuGroups = [
  {
    label: 'LIBRARY',
    items: [
      { to: '/dashboard', icon: 'fa-book-open', label: 'Reading Journals', color: '#3b82f6', bg: '#eff6ff' },
      { to: '/favorites', icon: 'fa-heart', label: 'Favorite List', color: '#ec4899', bg: '#fdf2f8' },
      { to: '/search', icon: 'fa-magnifying-glass', label: 'Search Book', color: '#8b5cf6', bg: '#f5f3ff' },
    ],
  },
  {
    label: 'AI',
    items: [
      { to: '/recommend', icon: 'fa-lightbulb', label: 'Recommended Books', color: '#f59e0b', bg: '#fffbeb' },
    ],
  },
  {
    label: 'COMMUNITY',
    items: [
      { to: '/reviews', icon: 'fa-star', label: 'Book Reviews', color: '#f97316', bg: '#fff7ed' },
    ],
  },
  {
    label: 'SUPPORT',
    items: [
      { to: '/report-bug', icon: 'fa-bug', label: 'Bug Report', color: '#64748b', bg: '#f8fafc' },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const initial = user?.username ? user.username[0].toUpperCase() : '?';

  return (
    <>
      <aside className={`sidebar${open ? ' active' : ''}`} id="sidebar">
        <div className="sidebar-top">
          <button className="close-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className="user-hero">
            <div className="avatar-hero">{initial}</div>
            <div className="user-name-hero">{user?.username || 'Loading...'}</div>
            <div className="user-email-hero">{user?.email || ''}</div>
          </div>
        </div>

        <div className="sidebar-middle">
          {menuGroups.map((group) => (
            <div key={group.label} className="menu-group">
              <p className="menu-section-label">{group.label}</p>
              <ul className="menu">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) => isActive ? 'active' : ''}
                      style={{ '--item-color': item.color, '--item-bg': item.bg }}
                    >
                      <span className="menu-icon-wrap">
                        <i className={`fa-solid ${item.icon}`}></i>
                      </span>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={() => setLogoutOpen(true)}>
            <i className="fa-solid fa-right-from-bracket"></i> Log out
          </button>
        </div>
      </aside>

      {open && <div className="overlay show" onClick={onClose}></div>}
      <LogoutModal open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </>
  );
}
