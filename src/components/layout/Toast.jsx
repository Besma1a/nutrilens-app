import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

const ICONS = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 15, height: 15 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 15, height: 15 }}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 15, height: 15 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 15, height: 15 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  loading: (
    <div style={{ width: 15, height: 15, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
  ),
};

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleRemove = () => {
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 250);
  };

  return (
    <div
      className={`toast-item toast-${toast.type} ${visible ? 'toast-visible' : ''}`}
      onClick={handleRemove}
      role="alert"
    >
      <span className={`toast-icon-wrap toast-icon-${toast.type}`}>
        {ICONS[toast.type]}
      </span>
      <span className="toast-msg">{toast.message}</span>
      <button className="toast-close" aria-label="Dismiss">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 12, height: 12 }}>
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [visibleToasts, setVisibleToasts] = useState([]);
  const [queuedToasts, setQueuedToasts] = useState([]);
  const MAX_VISIBLE = 3;

  const removeToast = useCallback((id) => {
    setVisibleToasts(p => {
      const newVisible = p.filter(t => t.id !== id);
      // If we have queued toasts and space available, show the next one
      if (newVisible.length < MAX_VISIBLE && queuedToasts.length > 0) {
        const [nextToast, ...remainingQueued] = queuedToasts;
        setQueuedToasts(remainingQueued);
        return [...newVisible, nextToast];
      }
      return newVisible;
    });
  }, [queuedToasts]);

  const toast = useCallback(({ message, type = 'success', duration = 3800 }) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type };

    setVisibleToasts(p => {
      if (p.length < MAX_VISIBLE) {
        // Add directly to visible
        return [...p, newToast];
      } else {
        // Add to queue
        setQueuedToasts(q => [...q, newToast]);
        return p;
      }
    });

    // Set up auto-removal for non-loading toasts
    if (duration > 0 && type !== 'loading') {
      setTimeout(() => {
        setVisibleToasts(p => p.map(t => t.id === id ? { ...t, leaving: true } : t));
        setTimeout(() => removeToast(id), 250);
      }, duration);
    }

    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" aria-live="polite">
        {visibleToasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default ToastProvider;

<style>{`
@keyframes spin {
  to { transform: rotate(360deg); }
}
`}</style>
