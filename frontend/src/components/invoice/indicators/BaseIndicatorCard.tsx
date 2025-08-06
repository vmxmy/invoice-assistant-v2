import React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';
import { Skeleton, IconSkeleton, TextSkeleton, NumberSkeleton } from '../../ui/Skeleton';

export interface BaseIndicatorCardProps {
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

export const BaseIndicatorCard: React.FC<BaseIndicatorCardProps> = ({
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
        bg-base-100 border rounded-xl shadow-sm hover:shadow-md 
        transition-all duration-200 
        ${getVariantStyles()}
        ${device.isMobile ? 'p-4' : 'p-5'}
        ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between h-full">
        <div className="flex-1 min-w-0">
          {/* 标题行 */}
          <div className="flex items-center gap-2 mb-3">
            {typeof icon === 'string' ? (
              <span className={`${device.isMobile ? 'text-xl' : 'text-2xl'} flex-shrink-0`}>
                {icon}
              </span>
            ) : (
              <div className="flex-shrink-0">{icon}</div>
            )}
            <h3 className={`
              font-semibold text-base-content/80 truncate
              ${device.isMobile ? 'text-xs' : 'text-sm'}
            `}>
              {title}
            </h3>
          </div>
          
          {/* 内容区域 */}
          <div className="overflow-hidden">
            {loading ? (
              <SkeletonContent />
            ) : (
              children
            )}
          </div>
        </div>
        
        {/* 操作提示 */}
        {onClick && (
          <div className={`
            flex items-center justify-center rounded-lg 
            transition-all duration-200 flex-shrink-0 ml-3
            ${getActionButtonStyles()}
            ${device.isMobile ? 'w-8 h-8' : 'w-9 h-9'}
            hover:scale-110
          `}>
            {actionIcon || <ArrowRight className={`${device.isMobile ? 'w-4 h-4' : 'w-4 h-4'}`} />}
          </div>
        )}
      </div>
    </div>
  );
};

// 通用的统计项组件
interface StatItemProps {
  value: string | number;
  unit?: string;
  label?: string;
  variant?: 'default' | 'warning' | 'error' | 'success' | 'info';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const StatItem: React.FC<StatItemProps> = ({
  value,
  unit,
  label,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const device = useDeviceDetection();
  
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
    if (device.isMobile) {
      switch (size) {
        case 'sm': return 'text-xs';
        case 'md': return 'text-sm';
        case 'lg': return 'text-base';
        case 'xl': return 'text-lg';
        default: return 'text-sm';
      }
    } else {
      switch (size) {
        case 'sm': return 'text-sm';
        case 'md': return 'text-base';
        case 'lg': return 'text-lg';
        case 'xl': return 'text-xl';
        default: return 'text-base';
      }
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

// 通用的标签组件
interface StatBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'warning' | 'error' | 'success' | 'info';
  icon?: React.ReactNode;
  className?: string;
}

export const StatBadge: React.FC<StatBadgeProps> = ({
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

// 进度条组件
interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'default' | 'warning' | 'error' | 'success' | 'info';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
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
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getProgressColor()} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-base-content/70">
          {percentage}%
        </span>
      )}
    </div>
  );
};

// Skeleton content for loading state
const SkeletonContent: React.FC = () => {
  const device = useDeviceDetection();
  
  return (
    <div className="space-y-3">
      {/* Main number skeleton */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-3">
          <NumberSkeleton size={device.isMobile ? 'lg' : 'xl'} />
          <Skeleton className="h-3 w-12" />
        </div>
        
        {/* Secondary info skeleton */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          
          {/* Progress bar skeleton */}
          <div className="space-y-1">
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseIndicatorCard;