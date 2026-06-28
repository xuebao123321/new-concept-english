import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
          <div style={{ fontSize: 48 }}>🐻</div>
          <p style={{ fontSize: 18, fontWeight: 'bold', color: '#3D3830' }}>页面出错了</p>
          <p style={{ fontSize: 14, color: '#8B8580', margin: '8px 0' }}>{this.state.error?.message}</p>
          <button onClick={this.handleReset}
            style={{ padding: '10px 24px', background: '#5B9A5A', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 'bold', cursor: 'pointer' }}>
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
