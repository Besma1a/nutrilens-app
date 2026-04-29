import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('User area error:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="user-error-boundary"
          role="alert"
          style={{
            padding: '28px 20px',
            textAlign: 'center',
            background: 'var(--ink-9)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            maxWidth: 420,
            margin: '24px auto',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
            Something went wrong
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-5)', marginBottom: 16, lineHeight: 1.5 }}>
            This section hit an unexpected error. You can try again or refresh the page.
          </p>
          <button
            type="button"
            className="btn btn-prim"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
