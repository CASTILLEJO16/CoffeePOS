import { useEffect, useRef } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import './Toast.css';

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
  const toastRef = useRef(null);

  useEffect(() => {
    if (toastRef.current) {
      toastRef.current.focus();
    }

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    const size = 18;
    switch (type) {
      case 'success':
        return <Check size={size} strokeWidth={2.5} />;
      case 'error':
        return <X size={size} strokeWidth={2.5} />;
      case 'warning':
        return <AlertTriangle size={size} strokeWidth={2.5} />;
      case 'info':
        return <Info size={size} strokeWidth={2.5} />;
      default:
        return <Check size={size} strokeWidth={2.5} />;
    }
  };

  const getAriaRole = () => {
    switch (type) {
      case 'error':
      case 'warning':
        return 'alert';
      default:
        return 'status';
    }
  };

  return (
    <div
      ref={toastRef}
      className={`toast toast-${type}`}
      role={getAriaRole()}
      aria-live="polite"
      aria-atomic="true"
      tabIndex="-1"
    >
      <span className="toast-icon" aria-hidden="true">
        {getIcon()}
      </span>
      <span className="toast-message">{message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={onClose}
        aria-label="Cerrar notificación"
      >
        <X size={16} />
      </button>
    </div>
  );
}
