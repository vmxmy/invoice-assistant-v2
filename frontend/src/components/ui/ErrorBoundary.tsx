import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // 调用错误回调
    this.props.onError?.(error, errorInfo);
    
    // 在开发环境下打印错误信息
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // 如果有自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
          <div className="max-w-md w-full">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body text-center">
                {/* 错误图标 */}
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-error" />
                  </div>
                </div>

                {/* 错误标题 */}
                <h2 className="card-title justify-center text-xl mb-2">
                  页面出现错误
                </h2>

                {/* 错误描述 */}
                <p className="text-base-content/70 mb-4">
                  抱歉，页面遇到了一个意外错误。请尝试刷新页面或返回首页。
                </p>

                {/* 开发环境下显示错误详情 */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="text-left mb-4">
                    <details className="collapse collapse-arrow bg-base-300">
                      <summary className="collapse-title text-sm font-medium">
                        错误详情 (开发模式)
                      </summary>
                      <div className="collapse-content">
                        <pre className="text-xs bg-base-100 p-2 rounded overflow-auto max-h-32">
                          {this.state.error.toString()}
                          {this.state.errorInfo?.componentStack}
                        </pre>
                      </div>
                    </details>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="card-actions justify-center gap-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={this.handleRetry}
                  >
                    <RefreshCw className="w-4 h-4" />
                    重试
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={this.handleGoHome}
                  >
                    <Home className="w-4 h-4" />
                    返回首页
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook版本的错误边界（需要配合react-error-boundary使用）
export const ErrorFallback: React.FC<{
  error: Error;
  resetErrorBoundary: () => void;
}> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-error" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">出现错误</h3>
      
      <p className="text-base-content/70 mb-4">
        {error.message || '页面遇到了一个意外错误'}
      </p>
      
      <button
        className="btn btn-primary btn-sm"
        onClick={resetErrorBoundary}
      >
        <RefreshCw className="w-4 h-4" />
        重试
      </button>
    </div>
  );
};

export default ErrorBoundary;