import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * When a render throws, React unmounts the entire tree — which is why one
 * undefined field rendered as a blank white page with nothing on screen to
 * explain it. This catches the throw and shows the message instead, so the next
 * failure of this kind is diagnosable without opening the console.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-1.5 text-xl font-semibold tracking-tight">Something broke</h1>
          <p className="mb-4 text-sm text-ink-muted">
            The page hit an error it could not recover from.
          </p>
          <pre
            className="mb-6 overflow-x-auto rounded-lg border border-danger/30 bg-danger/10
                       px-3.5 py-3 text-left text-xs text-danger"
          >
            {error.message}
          </pre>
          <div className="flex justify-center gap-2">
            <button onClick={() => window.location.reload()} className="btn-secondary">
              Reload
            </button>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              className="btn-primary"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
