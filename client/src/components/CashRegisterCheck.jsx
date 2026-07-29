import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getOpenCashRegister } from '../services/cashRegisterService.js';

export default function CashRegisterCheck({ children, redirectPath = '/apertura-caja' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function checkCashRegister() {
      setLoading(true);
      setReady(false);
      setError(null);

      try {
        const cashRegister = await getOpenCashRegister();
        console.log('Caja recibida:', cashRegister);

        if (cancelled) return;

        if (cashRegister?.estado === 'abierta') {
          setReady(true);
          setLoading(false);
          return;
        }

        setLoading(false);
        if (location.pathname !== redirectPath) {
          navigate(redirectPath, { replace: true });
        }
      } catch (error) {
        console.error('Error al verificar caja:', error);
        if (cancelled) return;

        setError('No se pudo verificar la caja. Intenta de nuevo.');
        setLoading(false);
      }
    }

    checkCashRegister();

    return () => {
      cancelled = true;
    };
  }, [navigate, location.pathname, redirectPath]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Verificando estado de caja...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-screen">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    );
  }

  if (!ready) {
    // Allow rendering the cash opening screen itself
    if (location.pathname === redirectPath) {
      return children;
    }
    return null;
  }

  return children;
}
