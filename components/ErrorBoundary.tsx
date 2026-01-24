import React, { Component, ErrorInfo, ReactNode } from 'react';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * React ErrorBoundary 組件
 * 用於捕捉渲染過程中的錯誤，避免整個應用程式崩潰
 */
class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // TODO: 如果日後整合 Sentry，可在此處上報錯誤
        // Sentry.captureException(error, { extra: errorInfo });
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
                    <div className="max-w-md w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center backdrop-blur-sm">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>

                        <h2 className="text-xl font-bold text-white mb-2">
                            頁面發生錯誤
                        </h2>
                        <p className="text-slate-400 text-sm mb-6">
                            很抱歉，頁面載入過程中發生了問題。請嘗試重新整理頁面，或回到首頁。
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="text-left mb-6 bg-slate-900/50 rounded-lg p-4">
                                <summary className="text-red-400 text-xs font-mono cursor-pointer">
                                    錯誤詳情 (開發模式)
                                </summary>
                                <pre className="text-red-300 text-xs mt-2 overflow-auto max-h-40">
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="flex items-center gap-2 px-6 py-3 bg-tcu-blue hover:bg-tcu-blue-light text-white rounded-xl font-bold transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                重新整理
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
                            >
                                回到首頁
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
