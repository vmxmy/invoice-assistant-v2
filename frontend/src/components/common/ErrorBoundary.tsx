import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean; // 是否隔离错误，不向上传播
  componentName?: string; // 组件名称，用于错误日志
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

/**
 * 错误边界组件
 * 捕获子组件的JavaScript错误，记录错误并显示降级UI
 */
export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;
  private previousResetKeys: Array<string | number> = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新 state 使下一次渲染能够显示降级 UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, componentName } = this.props;
    
    // 记录错误到错误报告服务
    console.error(`ErrorBoundary${componentName ? ` (${componentName})` : ''} caught error:`, error, errorInfo);
    
    // 更新错误计数
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));
    
    // 调用自定义错误处理器
    if (onError) {
      onError(error, errorInfo);
    }
    
    // 如果错误次数过多，自动重置（防止无限错误循环）
    if (this.state.errorCount >= 3) {
      this.scheduleReset(5000); // 5秒后自动重置
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    // 检查是否需要基于 props 变化重置
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
    
    // 检查 resetKeys 是否变化
    if (hasError && resetKeys && this.previousResetKeys !== resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== this.previousResetKeys[index]
      );
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
    
    this.previousResetKeys = resetKeys || [];
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  scheduleReset = (delay: number) => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, delay);
  };

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    });
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback, isolate, componentName } = this.props;

    if (hasError && error) {
      // 如果提供了自定义降级UI，使用它
      if (fallback) {
        return <>{fallback}</>;
      }

      // 默认错误UI
      return (
        <div className="min-h-[200px] flex items-center justify-center p-4">
          <div className="card-compact card-compact-lg max-w-md w-full bg-error/5 border-error/20">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* 错误图标 */}
              <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-error" />
              </div>
              
              {/* 错误信息 */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-base-content">
                  {componentName ? `${componentName}组件出错了` : '出错了'}
                </h3>
                <p className="text-sm text-base-content/60">
                  {error.message || '发生了一个意外错误'}
                </p>
                {errorCount > 1 && (
                  <p className="text-xs text-warning">
                    错误已发生 {errorCount} 次
                  </p>
                )}
              </div>
              
              {/* 操作按钮 */}
              <div className="flex gap-2">
                <button
                  onClick={this.resetErrorBoundary}
                  className="btn btn-sm btn-primary gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  重试
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="btn btn-sm btn-ghost gap-2"
                >
                  <Home className="w-4 h-4" />
                  返回首页
                </button>
              </div>
              
              {/* 开发环境显示详细错误 */}
              {process.env.NODE_ENV === 'development' && errorInfo && (
                <details className="w-full text-left">
                  <summary className="text-xs text-base-content/60 cursor-pointer hover:text-base-content">
                    查看错误详情
                  </summary>
                  <div className="mt-2 p-2 bg-base-200 rounded text-xs overflow-auto">
                    <pre className="whitespace-pre-wrap break-words">
                      {error.stack}
                    </pre>
                    <pre className="whitespace-pre-wrap break-words mt-2">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 如果设置了隔离，用 try-catch 包装子组件
    if (isolate) {
      try {
        return children;
      } catch (error) {
        console.error(`Isolated error in ${componentName || 'component'}:`, error);
        return null;
      }
    }

    return children;
  }
}

/**
 * 使用 Hook 的错误边界包装器
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
};