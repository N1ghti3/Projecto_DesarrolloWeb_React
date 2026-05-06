// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import TabletopView from './views/tableTopView';
import CommandView from './views/commandView';
import BarDisplayView from './views/barDisplayView';
import ContingencyView from './views/contingencyView';
import LoginView from './views/loginView';
import SelectView from './views/selectView';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/toast/ToastProvider';
import useNetworkStatus from './hooks/useNetworkStatus';
import './assets/styles/main.css';
const AppShell = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline, statusMessage, clearStatusMessage } = useNetworkStatus();

  useEffect(() => {
    if (!isOnline && location.pathname !== '/contingency') {
      navigate('/contingency', { replace: true });
    }
  }, [isOnline, location.pathname, navigate]);

  useEffect(() => {
    if (!statusMessage) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      clearStatusMessage();
    }, 3000);

    return () => window.clearTimeout(timerId);
  }, [statusMessage, clearStatusMessage]);

  return (
    <>
      {statusMessage && (
        <div className={`network-status-banner ${isOnline ? 'online' : 'offline'}`} role="status">
          {statusMessage}
        </div>
      )}
      <Routes>
        <Route path="/" element={<LoginView />} />
        <Route path="/select" element={<SelectView />} />
        <Route path="/table/:tableId" element={<TabletopView />} />
        <Route path="/command" element={<CommandView />} />
        <Route path="/bar-display" element={<BarDisplayView />} />
        <Route path="/contingency" element={<ContingencyView />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <ToastProvider>
        <ErrorBoundary>
          <div className="App">
            <AppShell />
          </div>
        </ErrorBoundary>
      </ToastProvider>
    </Router>
  );
}

export default App;
