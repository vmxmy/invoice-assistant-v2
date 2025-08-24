/**
 * 组件级懒加载包装器
 * 提供优雅的组件懒加载和错误边界
 */
import React, { Suspense, ErrorBoundary, memo } from 'react';
import { motion } from 'framer-motion';

interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  name?: string;
}

const DefaultFallback: React.FC = () => (
  <div className="flex items-center justify-center p-4">
    <div className="flex items-center space-x-2 text-base-content/60">
      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      <span className="text-sm">加载中...</span>
    </div>
  </div>
);

const DefaultErrorFallback: React.FC<{ error?: Error; resetError?: () => void; componentName?: string }> = ({ 
  error, 
  resetError, 
  componentName 
}) => (
  <motion.div 
    className="flex flex-col items-center justify-center p-6 bg-error/10 rounded-lg border border-error/20"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="text-error mb-2">
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <p className="text-sm text-error font-medium mb-2">
      组件加载失败{componentName && ` (${componentName})`}
    </p>
    {error && (
      <p className="text-xs text-error/70 mb-3 text-center max-w-md">
        {error.message}
      </p>
    )}
    {resetError && (
      <button
        onClick={resetError}
        className="btn btn-error btn-sm"
      >
        重试
      </button>
    )}
  </motion.div>
);

/**
 * 懒加载组件包装器
 */
const LazyComponent: React.FC<LazyComponentProps> = ({ 
  children, 
  fallback = <DefaultFallback />,
  errorFallback,
  name 
}) => {
  return (
    <ErrorBoundary
      fallback={errorFallback || <DefaultErrorFallback componentName={name} />}
      onError={(error) => {
        console.error(`懒加载组件错误 ${name ? `(${name})` : ''}:`, error);
      }}
    >
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * 创建懒加载高阶组件
 */
export function withLazyLoading<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    fallback?: React.ReactNode;
    errorFallback?: React.ReactNode;
    name?: string;
  } = {}
) {
  const LazyComponentInner = React.lazy(importFn);
  
  const WrappedComponent: React.FC<React.ComponentProps<T>> = (props) => (
    <LazyComponent {...options}>
      <LazyComponentInner {...props} />
    </LazyComponent>
  );

  WrappedComponent.displayName = `withLazyLoading(${options.name || 'Component'})`;
  
  return memo(WrappedComponent);
}

/**
 * Modal 懒加载专用组件
 */
export const LazyModal: React.FC<{ 
  isOpen: boolean; 
  children: React.ReactNode;
  name?: string;
}> = ({ isOpen, children, name }) => {
  if (!isOpen) return null;

  return (
    <LazyComponent 
      name={name}
      fallback={
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="flex items-center justify-center py-8">
              <DefaultFallback />
            </div>
          </div>
          <div className="modal-backdrop"></div>
        </div>
      }
    >
      {children}
    </LazyComponent>
  );
};

/**
 * 图表懒加载专用组件
 */
export const LazyChart: React.FC<{ 
  children: React.ReactNode;
  name?: string;
}> = ({ children, name }) => {
  return (
    <LazyComponent 
      name={name}
      fallback={
        <div className="w-full h-64 bg-base-200 rounded-lg flex items-center justify-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-base-content/60">图表加载中...</span>
          </div>
        </div>
      }
    >
      {children}
    </LazyComponent>
  );
};

export default LazyComponent;