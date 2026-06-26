import { Component, type ReactNode } from 'react';
import CharacterAvatar from './CharacterAvatar';

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
        <div className="min-h-screen flex items-center justify-center px-4 bg-cream">
          <div className="card p-8 max-w-sm w-full text-center space-y-4">
            <CharacterAvatar character="xionger" size="lg" animation="bounce" />
            <div>
              <p className="text-lg font-extrabold text-ink">哎呀，出错了！🐻</p>
              <p className="text-sm text-ink-light mt-1">熊二不小心碰到了时间机器...</p>
            </div>
            <p className="text-xs text-ink-muted bg-berry-pale rounded-xl p-3 text-left font-mono break-all">
              {this.state.error?.message || '未知错误'}
            </p>
            <div className="space-y-2">
              <button onClick={this.handleReset} className="btn-brand text-base">
                🔄 重新加载
              </button>
              <button onClick={() => window.location.reload()} className="btn-ghost text-sm">
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
