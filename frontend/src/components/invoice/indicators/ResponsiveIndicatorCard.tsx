import React from 'react';
import { ArrowRight, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';
import { motion } from 'framer-motion';

export interface ResponsiveIndicatorCardProps {
  // 标题部分
  icon: string | React.ReactNode;
  title: string;
  subtitle?: string;
  
  // 主要数值
  value: string | number;
  valuePrefix?: string;
  valueSuffix?: string;
  valueColor?: string;
  
  // 次要信息
  secondaryValue?: string | number;
  secondaryLabel?: string;
  
  // 趋势
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendLabel?: string;
  
  // 状态
  loading?: boolean;
  variant?: 'default' | 'warning' | 'error' | 'success' | 'info' | 'primary';
  
  // 交互
  onClick?: () => void;
  actionLabel?: string;
  
  // 样式
  className?: string;
  compact?: boolean;
  highlight?: boolean;
}

export const ResponsiveIndicatorCard: React.FC<ResponsiveIndicatorCardProps> = ({
  icon,
  title,
  subtitle,
  value,
  valuePrefix,
  valueSuffix,
  valueColor,
  secondaryValue,
  secondaryLabel,
  trend,
  trendValue,
  trendLabel,
  loading = false,
  variant = 'default',
  onClick,
  actionLabel,
  className = '',
  compact = false,
  highlight = false
}) => {
  const device = useDeviceDetection();
  
  // 获取变体样式 - 使用紧凑设计系统
  const getVariantStyles = () => {
    const baseClass = 'card-compact';
    const variants = {
      default: 'bg-gradient-to-br from-base-50/50 to-base-100',
      warning: highlight 
        ? 'bg-gradient-to-br from-warning/10 to-warning/5 border-warning/30 shadow-glow-warning' 
        : 'bg-gradient-to-br from-warning/8 to-warning/3 border-warning/20',
      error: highlight 
        ? 'bg-gradient-to-br from-error/10 to-error/5 border-error/30 shadow-glow-error' 
        : 'bg-gradient-to-br from-error/8 to-error/3 border-error/20',
      success: highlight 
        ? 'bg-gradient-to-br from-success/10 to-success/5 border-success/30 shadow-glow-success' 
        : 'bg-gradient-to-br from-success/8 to-success/3 border-success/20',
      info: highlight 
        ? 'bg-gradient-to-br from-info/10 to-info/5 border-info/30 shadow-glow' 
        : 'bg-gradient-to-br from-info/8 to-info/3 border-info/20',
      primary: highlight 
        ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 shadow-glow' 
        : 'bg-gradient-to-br from-primary/8 to-primary/3 border-primary/20'
    };
    return `${baseClass} ${variants[variant]}`;
  };
  
  // 获取值的颜色
  const getValueColor = () => {
    if (valueColor) return valueColor;
    const colors = {
      default: 'text-base-content',
      warning: 'text-warning',
      error: 'text-error',
      success: 'text-success',
      info: 'text-info',
      primary: 'text-primary'
    };
    return colors[variant];
  };
  
  // 获取趋势图标
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-success" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-error" />;
    return null;
  };
  
  // 响应式padding - 使用紧凑设计系统
  const getPadding = () => {
    if (compact) return 'card-compact-sm';
    if (device.isMobile) return 'card-compact-md';
    return 'card-compact-md';
  };
  
  // 响应式文本大小
  const getTitleSize = () => {
    if (compact) return 'text-xs';
    if (device.isMobile) return 'text-sm';
    return 'text-sm sm:text-base';
  };
  
  const getValueSize = () => {
    if (compact) return 'text-lg';
    if (device.isMobile) return 'text-xl';
    return 'text-xl sm:text-2xl lg:text-3xl';
  };
  
  if (loading) {
    return (
      <div className={`
        ${getVariantStyles()}
        ${getPadding()}
        ${className}
      `}>
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-container-compact-lg bg-base-300 rounded-xl"></div>
            <div className="h-4 bg-base-300 rounded w-24"></div>
          </div>
          <div className="h-8 bg-base-300 rounded w-32 mb-2"></div>
          <div className="h-3 bg-base-300 rounded w-20"></div>
        </div>
      </div>
    );
  }
  
  return (
    <motion.div
      className={`
        relative overflow-hidden
        ${getVariantStyles()}
        ${getPadding()}
        ${onClick ? 'compact-hover-lift cursor-pointer group/card' : ''}
        ${className}
      `}
      onClick={onClick}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={onClick ? { 
        y: -4, 
        scale: 1.02,
        transition: { duration: 0.2, ease: "easeOut" }
      } : {}}
      whileTap={onClick ? { 
        scale: 0.98,
        y: -2,
        transition: { duration: 0.1 }
      } : {}}
    >
      {/* 装饰性渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-base-content/[0.01] opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
      
      {/* 头部区域 - 优化视觉层次 */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* 优化的图标展示 */}
            {typeof icon === 'string' ? (
              <div className="icon-container-compact-lg bg-gradient-to-br from-primary/10 to-accent/10 ring-1 ring-primary/10 group-hover/card:ring-primary/20 transition-all duration-300">
                <span className="text-xl">{icon}</span>
              </div>
            ) : (
              <div className="icon-container-compact-lg bg-gradient-to-br from-primary/10 to-accent/10 ring-1 ring-primary/10 group-hover/card:ring-primary/20 transition-all duration-300">
                {icon}
              </div>
            )}
            
            {/* 标题区域 */}
            <div className="flex-1 min-w-0">
              <h3 className={`${getTitleSize()} font-bold text-base-content/90 truncate mb-1`}>
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-base-content/60 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          
          {/* 优化的趋势指示器 */}
          {trend && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-base-200/50">
              {getTrendIcon()}
              {trendValue && (
                <span className={`text-xs font-semibold ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-error' : 'text-base-content/60'}`}>
                  {trendValue}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* 优化的数值展示区域 */}
        <div className="mb-4">
          <div className={`${getValueSize()} font-black ${getValueColor()} tracking-tight`}>
            {valuePrefix && <span className="text-base-content/50 font-medium">{valuePrefix}</span>}
            <span className="inline-block transform group-hover/card:scale-105 transition-transform duration-200">
              {value}
            </span>
            {valueSuffix && <span className="text-base text-base-content/50 ml-1 font-medium">{valueSuffix}</span>}
          </div>
          {trendLabel && (
            <p className="text-xs text-base-content/60 mt-2 font-medium">{trendLabel}</p>
          )}
        </div>
        
        {/* 底部信息区域 */}
        <div className="flex items-center justify-between">
          {/* 次要数值 */}
          {secondaryValue !== undefined && (
            <div className="text-xs sm:text-sm bg-base-200/40 px-2 py-1 rounded-lg">
              <span className="text-base-content/60">{secondaryLabel}: </span>
              <span className="font-semibold text-base-content/80">{secondaryValue}</span>
            </div>
          )}
          
          {/* 优化的操作按钮 */}
          {onClick && actionLabel && (
            <motion.button 
              className="flex items-center gap-1.5 text-xs sm:text-sm text-primary hover:text-primary-focus font-medium"
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>{actionLabel}</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover/card:translate-x-0.5 transition-transform duration-200" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// 迷你指标卡 - 用于紧凑空间
export const MiniIndicatorCard: React.FC<{
  icon: string | React.ReactNode;
  label: string;
  value: string | number;
  trend?: 'up' | 'down';
  onClick?: () => void;
  className?: string;
}> = ({ icon, label, value, trend, onClick, className = '' }) => {
  return (
    <motion.div
      className={`
        card-compact card-compact-sm
        flex items-center gap-3
        ${onClick ? 'compact-hover-lift cursor-pointer compact-scale-press' : ''}
        ${className}
      `}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      {/* 图标 */}
      {typeof icon === 'string' ? (
        <span className="text-lg">{icon}</span>
      ) : (
        <div className="flex-shrink-0">{icon}</div>
      )}
      
      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-base-content/60 truncate">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
      
      {/* 趋势 */}
      {trend && (
        <div className="flex-shrink-0">
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4 text-success" />
          ) : (
            <TrendingDown className="w-4 h-4 text-error" />
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ResponsiveIndicatorCard;