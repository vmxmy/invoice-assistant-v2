import React from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';

interface IndicatorContentProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value: string | number;
  valuePrefix?: string;
  valueSuffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendLabel?: string;
  actionLabel?: string;
  onClick?: () => void;
  compact?: boolean;
}

/**
 * 指标内容组件
 * 单一职责：渲染指标卡片的内容部分
 */
export const IndicatorContent: React.FC<IndicatorContentProps> = React.memo(({
  icon,
  title,
  subtitle,
  value,
  valuePrefix = '',
  valueSuffix = '',
  trend,
  trendValue,
  trendLabel,
  actionLabel,
  onClick,
  compact = false,
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-success" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-error" />;
    return <Minus className="w-3 h-3 text-base-content/50" />;
  };

  // 紧凑模式
  if (compact) {
    return (
      <div className="flex items-center justify-between w-full">
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
      </div>
    );
  }

  // 标准模式
  return (
    <>
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
    </>
  );
});

IndicatorContent.displayName = 'IndicatorContent';