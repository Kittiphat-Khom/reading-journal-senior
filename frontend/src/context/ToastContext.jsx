import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((title, message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

const TOAST_STYLES = {
  success: { background: '#ecfdf5', color: '#065f46', borderLeft: '4px solid #10b981' },
  error:   { background: '#fef2f2', color: '#991b1b', borderLeft: '4px solid #ef4444' },
  info:    { background: '#eff6ff', color: '#1e40af', borderLeft: '4px solid #3b82f6' },
};

function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          padding: '12px 18px',
          borderRadius: 10,
          minWidth: 220,
          maxWidth: 320,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          fontFamily: "'Prompt', sans-serif",
          ...(TOAST_STYLES[t.type] || TOAST_STYLES.info),
        }}>
          <strong style={{ display: 'block', fontSize: '0.95rem', marginBottom: 2 }}>{t.title}</strong>
          {t.message && <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.85 }}>{t.message}</p>}
        </div>
      ))}
    </div>
  );
}

export const useToast = () => useContext(ToastContext);
