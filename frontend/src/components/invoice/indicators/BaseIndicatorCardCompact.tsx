import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';
import { Skeleton } from '../../ui/Skeleton';

export interface BaseIndicatorCardCompactProps {
  // 标题部分
  icon: string | React.ReactNode;
  title: string;
  
  // 主要内容
  children: React.ReactNode;
  
  // 状态
  loading?: boolean;
  variant?: 'default' | 'warning' | 'error' | 'success' | 'info';
  
  // 交互
  onClick?: () => void;
  actionIcon?: React.ReactNode;
  
  // 样式
  className?: string;
  borderHighlight?: boolean;
}

export const BaseIndicatorCardCompact: React.FC<BaseIndicatorCardCompactProps> = ({
  icon,
  title,
  children,
  loading = false,
  variant = 'default',
  onClick,
  actionIcon,
  className = '',
  borderHighlight = false
}) => {
  const device = useDeviceDetection();
  
  // 根据变体获取边框和背景样式
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return borderHighlight 
          ? 'border-warning bg-warning/5' 
          : 'border-base-300';
      case 'error':
        return borderHighlight 
          ? 'border-error bg-error/5' 
          : 'border-base-300';
      case 'success':
        return borderHighlight 
          ? 'border-success bg-success/5' 
          : 'border-base-300';
      case 'info':
        return borderHighlight 
          ? 'border-info bg-info/5' 
          : 'border-base-300';
      default:
        return 'border-base-300';
    }
  };
  
  // 根据变体获取操作按钮样式
  const getActionButtonStyles = () => {
    switch (variant) {
      case 'warning':
        return 'bg-warning/10 text-warning';
      case 'error':
        return 'bg-error/10 text-error';
      case 'success':
        return 'bg-success/10 text-success';
      case 'info':
        return 'bg-info/10 text-info';
      default:
        return 'bg-primary/10 text-primary';
    }
  };
  
  return (
    <div 
      className={`
        indicator-card-compact
        ${getVariantStyles()}
        ${onClick ? 'cursor-pointer hover:scale-[1.01]' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between h-full">
        <div className="flex-1 min-w-0">
          {/* 标题行 - 紧凑版 */}
          <div className="indicator-header">
            {typeof icon === 'string' ? (
              <span className="indicator-icon">
                {icon}
              </span>
            ) : (
              <div className="flex-shrink-0">{icon}</div>
            )}
            <h3 className="indicator-title">
              {title}
            </h3>
          </div>
          
          {/* 内容区域 */}
          <div className="indicator-content overflow-hidden">
            {loading ? (
              <SkeletonContentCompact />
            ) : (
              children
            )}
          </div>
        </div>
        
        {/* 操作提示 - 紧凑版 */}
        {onClick && (
          <div className={`
            flex items-center justify-center rounded-md 
            transition-all duration-200 flex-shrink-0 ml-2
            ${getActionButtonStyles()}
            w-6 h-6
            hover:scale-110
          `}>
            {actionIcon || <ArrowRight className="w-3 h-3" />}
          </div>
        )}
      </div>
    </div>
  );
};

// 紧凑版统计项组件
interface StatItemCompactProps {
  value: string | number;
  unit?: string;
  label?: string;
  variant?: 'default' | 'warning' | 'error' | 'success' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatItemCompact: React.FC<StatItemCompactProps> = ({
  value,
  unit,
  label,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const getTextColor = () => {
    switch (variant) {
      case 'warning': return 'text-warning';
      case 'error': return 'text-error';
      case 'success': return 'text-success';
      case 'info': return 'text-info';
      default: return 'text-base-content';
    }
  };
  
  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'text-xs';
      case 'md': return 'text-sm';
      case 'lg': return 'text-base';
      default: return 'text-sm';
    }
  };
  
  return (
    <div className={`flex items-baseline gap-1 ${className}`}>
      <span className={`font-bold ${getSizeClass()} ${getTextColor()}`}>
        {value}
      </span>
      {unit && (
        <span className="text-xs text-base-content/60">{unit}</span>
      )}
      {label && (
        <span className="text-xs text-base-content/50">{label}</span>
      )}
    </div>
  );
};

// 紧凑版标签组件
interface StatBadgeCompactProps {
  children: React.ReactNode;
  variant?: 'default' | 'warning' | 'error' | 'success' | 'info';
  icon?: React.ReactNode;
  className?: string;
}

export const StatBadgeCompact: React.FC<StatBadgeCompactProps> = ({
  children,
  variant = 'default',
  icon,
  className = ''
}) => {
  const getBadgeClass = () => {
    switch (variant) {
      case 'warning': return 'text-warning';
      case 'error': return 'text-error';
      case 'success': return 'text-success';
      case 'info': return 'text-info';
      default: return 'text-base-content/60';
    }
  };
  
  return (
    <div className={`flex items-center gap-1 text-xs ${getBadgeClass()} ${className}`}>
      {icon}
      <span className="truncate">{children}</span>
    </div>
  );
};

// 紧凑版进度条组件
interface ProgressBarCompactProps {
  value: number;
  max?: number;
  variant?: 'default' | 'warning' | 'error' | 'success' | 'info';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBarCompact: React.FC<ProgressBarCompactProps> = ({
  value,
  max = 100,
  variant = 'default',
  showLabel = false,
  className = ''
}) => {
  const percentage = Math.min(Math.round((value / max) * 100), 100);
  
  const getProgressColor = () => {
    switch (variant) {
      case 'warning': return 'bg-warning';
      case 'error': return 'bg-error';
      case 'success': return 'bg-success';
      case 'info': return 'bg-info';
      default: return 'bg-primary';
    }
  };
  
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex-1 h-1 bg-base-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getProgressColor()} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-base-content/70 w-8 text-right">
          {percentage}%
        </span>
      )}
    </div>
  );
};

// 紧凑版加载骨架屏
const SkeletonContentCompact: React.FC = () => {
  return (
    <div className="space-y-2">
      {/* 主要数字骨架 */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-3 w-8" />
        </div>
        
        {/* 次要信息骨架 */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <Skeleton className="h-2 w-12" />
            <Skeleton className="h-3 w-16 rounded-full" />
          </div>
          
          {/* 进度条骨架 */}
          <div className="space-y-0.5">
            <Skeleton className="h-1 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-2 w-10" />
              <Skeleton className="h-2 w-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseIndicatorCardCompact;