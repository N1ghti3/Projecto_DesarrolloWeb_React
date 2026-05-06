import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('Error crítico capturado por ErrorBoundary:', error, errorInfo);

    if (typeof window !== 'undefined' && window.location.pathname !== '/contingency') {
      window.location.assign('/contingency');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback card">
          <h2>Se detectó un error crítico.</h2>
          <p>Redirigiendo automáticamente al modo de contingencia…</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
