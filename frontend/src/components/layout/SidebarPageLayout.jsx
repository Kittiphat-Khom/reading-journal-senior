import { useState } from 'react';
import Sidebar from './Sidebar';

/**
 * Layout สำหรับ pages ที่ใช้ Sidebar + topbar header แบบ standard
 * Props:
 *   title       — ชื่อหน้าใน h1
 *   headerRight — slot ฝั่งขวาของ topbar (optional)
 *   headerLeft  — slot ต่อท้าย menu-btn ฝั่งซ้าย (optional, แทน title)
 *   children    — content ข้างล่าง topbar
 */
export default function SidebarPageLayout({ title, icon, accentColor = '#2563eb', headerRight, headerLeft, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <header className="topbar">
        <div className="left">
          <button className="menu-btn" onClick={() => setSidebarOpen((p) => !p)}>
            <i className="fa-solid fa-bars"></i>
          </button>
          {headerLeft || (
            <div className="topbar-title-group">
              {icon && (
                <span
                  className="topbar-icon"
                  style={{ background: `${accentColor}18`, color: accentColor }}
                >
                  <i className={`fa-solid ${icon}`}></i>
                </span>
              )}
              <h1>{title}</h1>
            </div>
          )}
        </div>
        {headerRight && <div className="actions">{headerRight}</div>}
      </header>
      {children}
    </>
  );
}
