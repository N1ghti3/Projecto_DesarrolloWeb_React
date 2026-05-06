import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const ToastContext = createContext({
  showToast: () => {},
  removeToast: () => {},
});

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timeoutMapRef = useRef(new Map());

  const removeToast = useCallback((toastId) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId));

    const timeoutId = timeoutMapRef.current.get(toastId);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutMapRef.current.delete(toastId);
    }
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const toastId = Date.now() + Math.random();
    setToasts((currentToasts) => [...currentToasts, { id: toastId, message, type }]);

    if (duration > 0) {
      const timeoutId = window.setTimeout(() => {
        removeToast(toastId);
      }, duration);
      timeoutMapRef.current.set(toastId, timeoutId);
    }

    return toastId;
  }, [removeToast]);

  useEffect(() => () => {
    timeoutMapRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutMapRef.current.clear();
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      removeToast,
    }),
    [showToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`} role="status">
            <span>{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Cerrar notificación"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
