import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { IndicatorGestures } from './components/IndicatorGestures';
import { IndicatorContent } from './components/IndicatorContent';
import { 
  getIndicatorVariantClasses, 
  getCompactIndicatorClasses,
  type IndicatorVariant 
} from './components/IndicatorStyles';
import { ErrorBoundary } from '../../common/ErrorBoundary';
import { ANIMATION_VARIANTS, ANIMATION_DURATION } from '../../../constants/animationConfig';

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
  variant?: IndicatorVariant;
  onClick?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  actionLabel?: string;
  compact?: boolean;
  highlight?: boolean;
}

/**
 * 优化后的移动端指标组件
 * 使用组合模式，职责分离
 */
const MobileOptimizedIndicatorComponent: React.FC<MobileOptimizedIndicatorProps> = ({
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
  compact = false,
  highlight = false
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  // 清理swipe方向状态
  useEffect(() => {
    if (swipeDirection) {
      const timer = setTimeout(() => {
        setSwipeDirection(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [swipeDirection]);

  // 处理滑动回调
  const handleSwipeLeft = useCallback(() => {
    setSwipeDirection('left');
    onSwipeLeft?.();
  }, [onSwipeLeft]);

  const handleSwipeRight = useCallback(() => {
    setSwipeDirection('right');
    onSwipeRight?.();
  }, [onSwipeRight]);

  // 紧凑模式 - 简单布局
  if (compact) {
    return (
      <motion.div
        className={getCompactIndicatorClasses(variant, !!onClick)}
        onClick={onClick}
        whileTap={{ scale: onClick ? 0.98 : 1 }}
        {...ANIMATION_VARIANTS.fadeIn}
        transition={{ duration: ANIMATION_DURATION.fast }}
      >
        <IndicatorContent
          icon={icon}
          title={title}
          value={value}
          valuePrefix={valuePrefix}
          valueSuffix={valueSuffix}
          trend={trend}
          trendValue={trendValue}
          onClick={onClick}
          compact={true}
        />
      </motion.div>
    );
  }

  // 标准模式 - 完整功能
  return (
    <IndicatorGestures
      onSwipeLeft={onSwipeLeft ? handleSwipeLeft : undefined}
      onSwipeRight={onSwipeRight ? handleSwipeRight : undefined}
      onTap={onClick}
      isPressed={isPressed}
      swipeDirection={swipeDirection}
      className={`${getIndicatorVariantClasses(variant, highlight)} ${onClick ? 'cursor-pointer group/mobile' : ''}`}
    >
      <motion.div
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        {...ANIMATION_VARIANTS.scale}
        transition={{ duration: ANIMATION_DURATION.normal }}
      >
        <IndicatorContent
          icon={icon}
          title={title}
          subtitle={subtitle}
          value={value}
          valuePrefix={valuePrefix}
          valueSuffix={valueSuffix}
          trend={trend}
          trendValue={trendValue}
          trendLabel={trendLabel}
          actionLabel={actionLabel}
          onClick={onClick}
          compact={false}
        />
        
        {/* 滑动指示器 */}
        {(onSwipeLeft || onSwipeRight) && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            <div className="w-4 h-0.5 bg-base-content/20 rounded-full" />
            <div className="w-4 h-0.5 bg-base-content/20 rounded-full" />
            <div className="w-4 h-0.5 bg-base-content/20 rounded-full" />
          </div>
        )}
      </motion.div>
    </IndicatorGestures>
  );
};

// 使用React.memo优化性能
export const MobileOptimizedIndicatorV2 = React.memo(MobileOptimizedIndicatorComponent, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.trend === nextProps.trend &&
    prevProps.trendValue === nextProps.trendValue &&
    prevProps.variant === nextProps.variant &&
    prevProps.compact === nextProps.compact &&
    prevProps.highlight === nextProps.highlight
  );
});

// 包装错误边界
export const MobileOptimizedIndicator = (props: MobileOptimizedIndicatorProps) => (
  <ErrorBoundary 
    componentName="MobileOptimizedIndicator"
    fallback={
      <div className="p-6 border-2 border-dashed border-base-300 rounded-xl">
        <p className="text-sm text-base-content/60">指标加载失败</p>
      </div>
    }
  >
    <MobileOptimizedIndicatorV2 {...props} />
  </ErrorBoundary>
);

export default MobileOptimizedIndicator;