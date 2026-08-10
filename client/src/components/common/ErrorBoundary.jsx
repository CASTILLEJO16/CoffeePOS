import React from 'react';

// Catches render/runtime errors in React tree to avoid white screens
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          flexDirection: 'column',
          fontFamily: 'sans-serif'
        }}>
          <h2>Ocurrió un error</h2>
          <p>La aplicación encontró un problema inesperado.</p>
          <button onClick={this.handleReload} style={{ padding: '10px 16px', cursor: 'pointer' }}>
            Recargar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
