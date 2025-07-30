import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface Badge {
  text: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

interface Action {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface Alert {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  icon?: React.ReactNode;
}

interface PageHeaderProps {
  /** 页面标题 */
  title: string;
  /** 页面标题图标 */
  icon?: React.ReactNode;
  /** 页面描述文字 */
  description?: string;
  /** 徽章列表 */
  badges?: Badge[];
  /** 操作按钮列表 */
  actions?: Action[];
  /** 是否显示返回按钮 */
  showBackButton?: boolean;
  /** 自定义返回按钮点击事件，默认使用 window.history.back() */
  onBack?: () => void;
  /** 警告或提示信息 */
  alert?: Alert;
  /** 是否使用粘性定位 */
  sticky?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 子组件（用于自定义内容） */
  children?: React.ReactNode;
}

const getBadgeVariantClass = (variant: Badge['variant'] = 'default'): string => {
  const variants = {
    default: 'badge-neutral',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    info: 'badge-info'
  };
  return variants[variant];
};

const getActionVariantClass = (variant: Action['variant'] = 'default'): string => {
  const variants = {
    default: 'btn-neutral',
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost'
  };
  return variants[variant];
};

const getAlertVariantClass = (type: Alert['type']): string => {
  const variants = {
    info: 'alert-info',
    success: 'alert-success',
    warning: 'alert-warning',
    error: 'alert-error'
  };
  return variants[type];
};

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  icon,
  description,
  badges = [],
  actions = [],
  showBackButton = false,
  onBack,
  alert,
  sticky = true,
  className = '',
  children
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className={`
      ${sticky ? 'sticky top-0 z-30' : ''}
      bg-base-200/50 backdrop-blur-sm border-b border-base-300
      ${className}
    `}>
      <div className="container mx-auto px-6 py-4">
        {/* 主要头部内容 */}
        <div className="flex items-center justify-between">
          {/* 左侧：标题和徽章 */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* 返回按钮 */}
            {showBackButton && (
              <button
                onClick={handleBack}
                className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
                title="返回"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            
            {/* 标题 */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <h1 className="text-2xl font-bold flex items-center gap-2 min-w-0">
                {icon}
                <span className="truncate">{title}</span>
              </h1>
              
              {/* 徽章 */}
              {badges.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {badges.map((badge, index) => (
                    <div 
                      key={index}
                      className={`badge ${getBadgeVariantClass(badge.variant)} ${badge.className || ''}`}
                    >
                      {badge.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* 右侧：操作按钮 */}
          {actions.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`btn btn-sm ${getActionVariantClass(action.variant)} ${action.disabled ? 'btn-disabled' : ''}`}
                >
                  {action.icon}
                  <span className="hidden sm:inline">{action.label}</span>
                  <span className="sm:hidden">{action.icon ? '' : action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* 描述文字 */}
        {description && (
          <div className="mt-3">
            <p className="text-base-content/70 text-sm">
              {description}
            </p>
          </div>
        )}
        
        {/* 警告或提示信息 */}
        {alert && (
          <div className={`alert ${getAlertVariantClass(alert.type)} mt-3 py-2`}>
            {alert.icon && (
              <div className="flex-shrink-0">
                {alert.icon}
              </div>
            )}
            <span className="text-sm">
              {alert.message}
            </span>
          </div>
        )}
        
        {/* 自定义子组件 */}
        {children && (
          <div className="mt-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;