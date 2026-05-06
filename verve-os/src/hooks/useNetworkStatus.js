import { useCallback, useEffect, useState } from 'react';

const getInitialStatus = () => {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
};

const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(getInitialStatus);
  const [statusMessage, setStatusMessage] = useState('');

  const clearStatusMessage = useCallback(() => {
    setStatusMessage('');
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setStatusMessage('Conexión restablecida. Volviendo al modo online.');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatusMessage('Cambio a modo offline/contingencia.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    statusMessage,
    clearStatusMessage,
  };
};

export default useNetworkStatus;
