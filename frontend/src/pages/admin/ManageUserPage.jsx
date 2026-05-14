import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { getUsers, updateUser, deleteUser } from '../../api/admin';

export default function ManageUserPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      setUsers(res.data || []);
    } catch {
      showToast('Error', 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    try {
      await deleteUser(confirmId);
      showToast('Deleted', 'User deleted', 'success');
      setConfirmId(null);
      load();
    } catch {
      showToast('Error', 'Delete failed', 'error');
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await updateUser(id, { role });
      showToast('Updated', 'Role updated', 'success');
      load();
    } catch {
      showToast('Error', 'Update failed', 'error');
    }
  };

  const initials = (name) => (name || '?').charAt(0).toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ee', fontFamily: "'Prompt', sans-serif" }}>

      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#475569'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
          <i className="fa-solid fa-arrow-left"></i> Admin
        </Link>
        <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.7rem' }}></i>
        <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Manage Users</span>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg, #fef3c7, #fde68a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(245,158,11,0.2)', flexShrink: 0 }}>
              <i className="fa-solid fa-users" style={{ color: '#d97706', fontSize: '1.1rem' }}></i>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>Manage Users</h1>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                {users.length} users · view and manage roles
              </p>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 16px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', flexShrink: 0 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#d97706', lineHeight: 1 }}>{users.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>Total</div>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12, color: '#94a3b8' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.4rem' }}></i>
              <span style={{ fontSize: '0.9rem' }}>Loading users...</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['User', 'Email', 'Role', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '13px 20px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.8rem', borderBottom: '1px solid #e2e8f0', letterSpacing: '0.03em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #fde68a, #fbbf24)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#92400e', flexShrink: 0 }}>
                          {initials(u.username)}
                        </div>
                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{u.username}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.85rem', verticalAlign: 'middle' }}>{u.email}</td>
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      <select value={u.role || 'user'} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.82rem', fontFamily: 'inherit', fontWeight: 600, color: u.role === 'admin' ? '#7c3aed' : '#475569', background: u.role === 'admin' ? '#f5f3ff' : '#f8fafc', cursor: 'pointer', outline: 'none' }}>
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      <button onClick={() => setConfirmId(u.id)}
                        style={{ background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fecaca', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="fa-solid fa-trash" style={{ fontSize: '0.7rem' }}></i> Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmModal open={confirmId != null} title="Delete User?" message="This action cannot be undone." onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
    </div>
  );
}
