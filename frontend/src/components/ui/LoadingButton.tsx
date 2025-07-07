import React from 'react';
import { Loader2, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  success?: boolean;
  successText?: string;
  error?: boolean;
  errorText?: string;
  onRetry?: () => void;
  showRetry?: boolean;
  variant?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading = false,
  loadingText,
  success = false,
  successText,
  error = false,
  errorText,
  onRetry,
  showRetry = false,
  variant = 'primary',
  size = 'md',
  icon,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const getButtonClasses = () => {
    const baseClasses = 'btn';
    const variantClasses = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      error: 'btn-error',
      warning: 'btn-warning',
      success: 'btn-success',
      ghost: 'btn-ghost',
      outline: 'btn-outline'
    };
    const sizeClasses = {
      xs: 'btn-xs',
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg'
    };

    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  };

  const getContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingText || '加载中...'}
        </>
      );
    }

    if (success && successText) {
      return (
        <>
          <CheckCircle className="w-4 h-4 text-success" />
          {successText}
        </>
      );
    }

    if (error && errorText) {
      return (
        <>
          <AlertCircle className="w-4 h-4 text-error" />
          {errorText}
          {showRetry && onRetry && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className="ml-2 btn btn-xs btn-ghost"
              title="重试"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </>
      );
    }

    return (
      <>
        {icon}
        {children}
      </>
    );
  };

  return (
    <button
      className={getButtonClasses()}
      disabled={disabled || isLoading}
      {...props}
    >
      {getContent()}
    </button>
  );
};

// 预设的常用按钮组件
export const SaveButton: React.FC<Omit<LoadingButtonProps, 'variant' | 'icon'>> = (props) => {
  return (
    <LoadingButton
      variant="primary"
      icon={<CheckCircle className="w-4 h-4" />}
      {...props}
    >
      {props.children || '保存'}
    </LoadingButton>
  );
};

export const DeleteButton: React.FC<Omit<LoadingButtonProps, 'variant' | 'icon'>> = (props) => {
  return (
    <LoadingButton
      variant="error"
      icon={<AlertCircle className="w-4 h-4" />}
      {...props}
    >
      {props.children || '删除'}
    </LoadingButton>
  );
};

export const RetryButton: React.FC<Omit<LoadingButtonProps, 'variant' | 'icon'>> = (props) => {
  return (
    <LoadingButton
      variant="outline"
      icon={<RotateCcw className="w-4 h-4" />}
      {...props}
    >
      {props.children || '重试'}
    </LoadingButton>
  );
};

export default LoadingButton;