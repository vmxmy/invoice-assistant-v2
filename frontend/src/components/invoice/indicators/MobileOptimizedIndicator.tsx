import React, { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MobileOptimizedIndicatorProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value: string | number;
  valuePrefix?: string;
  valueSuffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendLabel?: string;
  variant?: 'default' | 'warning' | 'error' | 'success' | 'info' | 'primary';
  onClick?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  actionLabel?: string;
  compact?: boolean;
}

export const MobileOptimizedIndicator: React.FC<MobileOptimizedIndicatorProps> = ({
  icon,
  title,
  subtitle,
  value,
  valuePrefix = '',
  valueSuffix = '',
  trend,
  trendValue,
  trendLabel,
  variant = 'default',
  onClick,
  onSwipeLeft,
  onSwipeRight,
  actionLabel,
  compact = false
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const getVariantClasses = () => {
    const variants = {
      default: 'bg-base-100/95 backdrop-blur-sm border-base-200/60 hover:border-base-300/80',
      warning: 'bg-gradient-to-br from-warning/8 to-warning/4 border-warning/30 hover:border-warning/50 shadow-warning/5',
      error: 'bg-gradient-to-br from-error/8 to-error/4 border-error/30 hover:border-error/50 shadow-error/5',
      success: 'bg-gradient-to-br from-success/8 to-success/4 border-success/30 hover:border-success/50 shadow-success/5',
      info: 'bg-gradient-to-br from-info/8 to-info/4 border-info/30 hover:border-info/50 shadow-info/5',
      primary: 'bg-gradient-to-br from-primary/8 to-primary/4 border-primary/30 hover:border-primary/50 shadow-primary/5'
    };
    return variants[variant];
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-success" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-error" />;
    return <Minus className="w-3 h-3 text-base-content/50" />;
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x < -threshold && onSwipeLeft) {
      setSwipeDirection('left');
      onSwipeLeft();
      setTimeout(() => setSwipeDirection(null), 300);
    } else if (info.offset.x > threshold && onSwipeRight) {
      setSwipeDirection('right');
      onSwipeRight();
      setTimeout(() => setSwipeDirection(null), 300);
    }
  };

  if (compact) {
    return (
      <motion.div
        className={`
          flex items-center justify-between p-3 rounded-lg border
          ${getVariantClasses()}
          ${onClick ? 'cursor-pointer active:scale-98' : ''}
        `}
        onClick={onClick}
        whileTap={{ scale: onClick ? 0.98 : 1 }}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-base-content/70 truncate">{title}</p>
            <p className="text-sm font-semibold">
              {valuePrefix}{value}{valueSuffix}
            </p>
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            {trendValue && (
              <span className="text-xs text-base-content/70">{trendValue}</span>
            )}
          </div>
        )}
        {onClick && <ChevronRight className="w-4 h-4 text-base-content/30 ml-2" />}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-3xl border-2 p-6
        ${getVariantClasses()}
        ${onClick ? 'cursor-pointer group/mobile' : ''}
        transition-all duration-300 ease-out
        shadow-sm hover:shadow-soft
      `}
      onClick={onClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      drag={onSwipeLeft || onSwipeRight ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isPressed ? 0.98 : 1,
        x: swipeDirection === 'left' ? -20 : swipeDirection === 'right' ? 20 : 0
      }}
      whileHover={onClick ? { 
        scale: 1.02, 
        y: -4,
        transition: { duration: 0.2, ease: "easeOut" }
      } : {}}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
    >
      {/* 头部区域 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">{icon}</div>
          <div>
            <h3 className="text-sm font-medium text-base-content/90">{title}</h3>
            {subtitle && (
              <p className="text-xs text-base-content/60 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {onClick && actionLabel && (
          <span className="text-xs text-primary font-medium">{actionLabel}</span>
        )}
      </div>

      {/* 数值区域 */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-bold">
            {valuePrefix}{value}
          </span>
          {valueSuffix && (
            <span className="text-sm text-base-content/70">{valueSuffix}</span>
          )}
        </div>

        {/* 趋势指示器 */}
        {trend && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              {trendValue && (
                <span className={`text-xs font-medium
                  ${trend === 'up' ? 'text-success' : 
                    trend === 'down' ? 'text-error' : 'text-base-content/50'}
                `}>
                  {trendValue}
                </span>
              )}
            </div>
            {trendLabel && (
              <span className="text-xs text-base-content/60">{trendLabel}</span>
            )}
          </div>
        )}
      </div>

      {/* 滑动指示器 */}
      {(onSwipeLeft || onSwipeRight) && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          <div className="w-4 h-0.5 bg-base-content/20 rounded-full" />
          <div className="w-4 h-0.5 bg-base-content/20 rounded-full" />
          <div className="w-4 h-0.5 bg-base-content/20 rounded-full" />
        </div>
      )}
    </motion.div>
  );
};

// 迷你指标组件（用于列表展示）
export const MiniIndicator: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}> = ({ icon, label, value, trend, onClick }) => {
  return (
    <motion.div
      className={`
        flex items-center justify-between p-2.5 rounded-lg
        bg-base-100 border border-base-200
        ${onClick ? 'cursor-pointer hover:bg-base-200/50' : ''}
      `}
      onClick={onClick}
      whileTap={{ scale: onClick ? 0.98 : 1 }}
    >
      <div className="flex items-center gap-2 flex-1">
        <div className="flex-shrink-0">{icon}</div>
        <span className="text-xs text-base-content/70">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{value}</span>
        {trend && (
          trend === 'up' ? <TrendingUp className="w-3 h-3 text-success" /> :
          trend === 'down' ? <TrendingDown className="w-3 h-3 text-error" /> :
          <Minus className="w-3 h-3 text-base-content/30" />
        )}
      </div>
    </motion.div>
  );
};

export default MobileOptimizedIndicator;