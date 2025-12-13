import React, { Component, ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          color: '#ef4444', 
          padding: '40px', 
          backgroundColor: '#050505', 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontFamily: 'monospace',
          textAlign: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          zIndex: 9999
        }}>
          <h1 style={{fontSize: '24px', marginBottom: '20px', textTransform: 'uppercase', borderBottom: '2px solid #7f1d1d'}}>System Critical Failure</h1>
          <p style={{marginBottom: '20px', color: '#9ca3af'}}>The suit diagnostics encountered a fatal error.</p>
          <pre style={{
            backgroundColor: '#111', 
            padding: '15px', 
            borderRadius: '5px', 
            maxWidth: '90%', 
            overflow: 'auto', 
            border: '1px solid #333',
            color: '#f87171',
            fontSize: '12px',
            marginBottom: '30px'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                  for(let registration of registrations) { registration.unregister(); }
                  window.location.reload();
                });
              } else {
                window.location.reload();
              }
            }} 
            style={{
              padding: '12px 24px', 
              backgroundColor: '#7f1d1d', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 0 15px rgba(220, 38, 38, 0.4)'
            }}
          >
            Reboot System (Clear Cache)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);