import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
  variant = 'primary',
  loading = false,
}) => {
  const getVariantClasses = () => {
    const variants = {
      primary: 'border-primary/20 bg-primary/5 text-primary',
      secondary: 'border-secondary/20 bg-secondary/5 text-secondary',
      accent: 'border-accent/20 bg-accent/5 text-accent',
      success: 'border-success/20 bg-success/5 text-success',
      warning: 'border-warning/20 bg-warning/5 text-warning',
      error: 'border-error/20 bg-error/5 text-error',
      info: 'border-info/20 bg-info/5 text-info',
    };
    return variants[variant];
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    
    if (trend.direction === 'up') {
      return <span className="text-success">↗</span>;
    } else if (trend.direction === 'down') {
      return <span className="text-error">↘</span>;
    }
    return <span className="text-base-content/50">→</span>;
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      // 如果是金额，格式化为货币格式
      if (val > 1000) {
        return new Intl.NumberFormat('zh-CN', {
          style: 'currency',
          currency: 'CNY',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      }
      return val.toLocaleString();
    }
    return val;
  };

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-lg border border-base-300">
        <div className="card-body">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="skeleton h-4 w-20 mb-2"></div>
              <div className="skeleton h-8 w-24 mb-1"></div>
              <div className="skeleton h-3 w-16"></div>
            </div>
            <div className="skeleton w-12 h-12 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-lg border border-base-300 hover:shadow-xl transition-shadow duration-200">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-base-content/70 mb-1">
              {title}
            </h3>
            <div className="text-2xl font-bold text-base-content mb-1">
              {formatValue(value)}
            </div>
            
            {subValue && (
              <div className="text-sm text-base-content/60">
                {subValue}
              </div>
            )}
            
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {getTrendIcon()}
                <span className={`text-sm ${
                  trend.direction === 'up' ? 'text-success' : 
                  trend.direction === 'down' ? 'text-error' : 
                  'text-base-content/60'
                }`}>
                  {Math.abs(trend.value)}%
                </span>
                {trend.label && (
                  <span className="text-sm text-base-content/60">
                    {trend.label}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {Icon && (
            <div className={`p-3 rounded-lg ${getVariantClasses()}`}>
              <Icon className="w-6 h-6" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;