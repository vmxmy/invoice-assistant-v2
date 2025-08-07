/**
 * 指标样式工具
 * 单一职责：管理指标组件的样式变体
 */

export type IndicatorVariant = 'default' | 'warning' | 'error' | 'success' | 'info' | 'primary';

/**
 * 获取指标变体样式类
 */
export const getIndicatorVariantClasses = (variant: IndicatorVariant, highlight = false): string => {
  const baseClass = 'relative overflow-hidden rounded-3xl border-2 p-6 transition-all duration-300 ease-out shadow-sm hover:shadow-soft';
  
  const variants: Record<IndicatorVariant, string> = {
    default: 'bg-base-100/95 backdrop-blur-sm border-base-200/60 hover:border-base-300/80',
    warning: highlight 
      ? 'bg-gradient-to-br from-warning/10 to-warning/5 border-warning/30 shadow-glow-warning hover:border-warning/50' 
      : 'bg-gradient-to-br from-warning/8 to-warning/4 border-warning/30 hover:border-warning/50 shadow-warning/5',
    error: highlight 
      ? 'bg-gradient-to-br from-error/10 to-error/5 border-error/30 shadow-glow-error hover:border-error/50' 
      : 'bg-gradient-to-br from-error/8 to-error/4 border-error/30 hover:border-error/50 shadow-error/5',
    success: highlight 
      ? 'bg-gradient-to-br from-success/10 to-success/5 border-success/30 shadow-glow-success hover:border-success/50' 
      : 'bg-gradient-to-br from-success/8 to-success/4 border-success/30 hover:border-success/50 shadow-success/5',
    info: highlight 
      ? 'bg-gradient-to-br from-info/10 to-info/5 border-info/30 shadow-glow hover:border-info/50' 
      : 'bg-gradient-to-br from-info/8 to-info/4 border-info/30 hover:border-info/50 shadow-info/5',
    primary: highlight 
      ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 shadow-glow hover:border-primary/50' 
      : 'bg-gradient-to-br from-primary/8 to-primary/4 border-primary/30 hover:border-primary/50 shadow-primary/5'
  };
  
  return `${baseClass} ${variants[variant]}`;
};

/**
 * 获取紧凑模式样式类
 */
export const getCompactIndicatorClasses = (variant: IndicatorVariant, isClickable = false): string => {
  const baseClass = 'flex items-center justify-between p-3 rounded-lg border';
  const clickableClass = isClickable ? 'cursor-pointer active:scale-98' : '';
  
  const variants: Record<IndicatorVariant, string> = {
    default: 'bg-base-100/95 backdrop-blur-sm border-base-200/60 hover:border-base-300/80',
    warning: 'bg-gradient-to-br from-warning/8 to-warning/3 border-warning/20',
    error: 'bg-gradient-to-br from-error/8 to-error/3 border-error/20',
    success: 'bg-gradient-to-br from-success/8 to-success/3 border-success/20',
    info: 'bg-gradient-to-br from-info/8 to-info/3 border-info/20',
    primary: 'bg-gradient-to-br from-primary/8 to-primary/3 border-primary/20'
  };
  
  return `${baseClass} ${variants[variant]} ${clickableClass}`;
};

/**
 * 获取值的颜色类
 */
export const getValueColorClass = (variant: IndicatorVariant): string => {
  const colors: Record<IndicatorVariant, string> = {
    default: 'text-base-content',
    warning: 'text-warning',
    error: 'text-error',
    success: 'text-success',
    info: 'text-info',
    primary: 'text-primary'
  };
  
  return colors[variant];
};