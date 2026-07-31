import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log minimal info; avoid noisy console in production if needed
    console.error('UI ErrorBoundary:', error, info);
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
          gap: '12px',
          fontFamily: 'sans-serif'
        }}>
          <h2>Ocurrió un error inesperado</h2>
          <button onClick={this.handleReload}>Reintentar</button>
        </div>
      );
    }

    return this.props.children;
  }
}
