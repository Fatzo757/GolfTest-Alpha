import React, { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React render error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-dark text-text-main flex items-center justify-center p-6 font-press-start">
          <div className="p-8 geometric-border border-ui-red max-w-md w-full text-center space-y-6 bg-black/40 shadow-[12px_12px_0px_0px_rgba(239,68,68,0.2)]">
            <ShieldAlert className="mx-auto text-ui-red animate-pulse" size={56} />
            <h2 className="text-sm text-ui-red font-bold uppercase tracking-widest">System Render Error</h2>
            <p className="text-[10px] text-ui-gray leading-relaxed uppercase tracking-tight">
              An unhandled rendering exception occurred:
            </p>
            <div className="p-3 bg-black/60 border border-ui-border text-[9px] text-ui-yellow font-mono overflow-x-auto text-left max-h-32">
              {this.state.error?.message || 'Unknown render fault'}
            </div>
            <button
              onClick={this.handleReload}
              className="geometric-button text-xs w-full py-3 bg-ui-red text-white flex items-center justify-center gap-2 hover:bg-red-600 transition-all cursor-pointer"
            >
              <RefreshCw size={14} />
              REBOOT SYSTEM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
