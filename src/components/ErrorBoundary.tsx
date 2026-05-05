import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#1a1a1a',
          background: 'transparent',
          textAlign: 'center',
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
              Не удалось загрузить расписание
            </div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              Попробуйте обновить страницу. Если проблема повторяется, сообщите администратору.
            </div>
            {this.state.error?.message && (
              <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '8px' }}>
                {this.state.error.message}
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
