import React, { useState, useCallback, useMemo } from 'react';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';
import { ResponsiveIndicatorCard, MiniIndicatorCard } from './ResponsiveIndicatorCard';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { ErrorBoundary } from '../../common/ErrorBoundary';
import { 
  ANIMATION_VARIANTS, 
  STAGGER_CONFIG, 
  getDeviceAnimationConfig,
  GESTURE_CONFIG 
} from '../../../constants/animationConfig';

interface IndicatorData {
  id: string;
  icon: string | React.ReactNode;
  title: string;
  subtitle?: string;
  value: string | number;
  valuePrefix?: string;
  valueSuffix?: string;
  secondaryValue?: string | number;
  secondaryLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendLabel?: string;
  variant?: 'default' | 'warning' | 'error' | 'success' | 'info' | 'primary';
  onClick?: () => void;
  actionLabel?: string;
  priority?: number;
}

interface ResponsiveIndicatorSectionProps {
  indicators: IndicatorData[];
  title?: string;
  loading?: boolean;
  layout?: 'grid' | 'carousel' | 'list' | 'auto';
  className?: string;
}

/**
 * 轮播组件 - 分离关注点
 */
const CarouselLayout: React.FC<{
  indicators: IndicatorData[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}> = React.memo(({ indicators, currentIndex, onIndexChange }) => {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > GESTURE_CONFIG.swipeThreshold;
    const isRightSwipe = distance < -GESTURE_CONFIG.swipeThreshold;
    
    if (isLeftSwipe && currentIndex < indicators.length - 1) {
      onIndexChange(currentIndex + 1);
      // 安全的触觉反馈
      if ('vibrate' in navigator && navigator.vibrate) {
        try {
          navigator.vibrate(GESTURE_CONFIG.vibrateDuration);
        } catch (error) {
          console.warn('Vibration failed:', error);
        }
      }
    }
    if (isRightSwipe && currentIndex > 0) {
      onIndexChange(currentIndex - 1);
      // 安全的触觉反馈
      if ('vibrate' in navigator && navigator.vibrate) {
        try {
          navigator.vibrate(GESTURE_CONFIG.vibrateDuration);
        } catch (error) {
          console.warn('Vibration failed:', error);
        }
      }
    }
  }, [touchStart, touchEnd, currentIndex, indicators.length, onIndexChange]);

  return (
    <div className="relative">
      <div 
        className="overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <motion.div 
          className="flex"
          animate={{ x: `-${currentIndex * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {indicators.map((indicator) => (
            <div key={indicator.id} className="w-full flex-shrink-0 px-2">
              <ResponsiveIndicatorCard {...indicator} />
            </div>
          ))}
        </motion.div>
      </div>
      
      {/* 导航按钮 */}
      {indicators.length > 1 && (
        <>
          <button
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 btn btn-circle btn-sm btn-ghost ${
              currentIndex === 0 ? 'invisible' : ''
            }`}
            onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
            aria-label="上一个指标"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 btn btn-circle btn-sm btn-ghost ${
              currentIndex === indicators.length - 1 ? 'invisible' : ''
            }`}
            onClick={() => onIndexChange(Math.min(indicators.length - 1, currentIndex + 1))}
            aria-label="下一个指标"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          
          {/* 分页指示器 */}
          <div className="flex justify-center gap-1.5 mt-4 pb-1">
            {indicators.map((_, index) => (
              <motion.button
                key={index}
                className={`rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-8 h-2 bg-primary' 
                    : 'w-2 h-2 bg-base-300 hover:bg-base-content/20'
                }`}
                onClick={() => onIndexChange(index)}
                whileTap={{ scale: 0.9 }}
                aria-label={`切换到指标 ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
});

CarouselLayout.displayName = 'CarouselLayout';

/**
 * 优化后的响应式指标区域组件
 */
const ResponsiveIndicatorSectionComponent: React.FC<ResponsiveIndicatorSectionProps> = ({
  indicators,
  title,
  loading = false,
  layout = 'auto',
  className = ''
}) => {
  const device = useDeviceDetection();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // 动画配置
  const animationConfig = useMemo(() => 
    getDeviceAnimationConfig(device.isMobile), 
    [device.isMobile]
  );
  
  // 根据优先级排序指标
  const sortedIndicators = useMemo(() => 
    [...indicators].sort((a, b) => (b.priority || 0) - (a.priority || 0)),
    [indicators]
  );
  
  // 自动选择布局
  const activeLayout = useMemo(() => {
    if (layout !== 'auto') return layout;
    if (device.isMobile) {
      return indicators.length > 2 ? 'carousel' : 'grid';
    }
    return 'grid';
  }, [layout, device.isMobile, indicators.length]);
  
  // 获取网格类
  const getGridClass = useCallback(() => {
    const count = indicators.length;
    if (count === 1) return 'grid grid-cols-1 max-w-lg mx-auto';
    if (count === 2) return 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4';
    if (count === 3) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4';
    if (count === 4) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4';
    return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4';
  }, [indicators.length]);
  
  // 渲染网格布局
  const renderGrid = () => (
    <div className={getGridClass()}>
      <AnimatePresence>
        {sortedIndicators.map((indicator, index) => (
          <motion.div
            key={indicator.id}
            {...(animationConfig.enabled ? ANIMATION_VARIANTS.rise : {})}
            transition={{ 
              delay: animationConfig.enabled ? index * animationConfig.stagger : 0,
              duration: animationConfig.duration 
            }}
          >
            <ResponsiveIndicatorCard {...indicator} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
  
  // 渲染列表布局
  const renderList = () => (
    <div className="space-y-2">
      <AnimatePresence>
        {sortedIndicators.map((indicator, index) => (
          <motion.div
            key={indicator.id}
            {...(animationConfig.enabled ? ANIMATION_VARIANTS.slideIn : {})}
            transition={{ 
              delay: animationConfig.enabled ? index * animationConfig.stagger : 0,
              duration: animationConfig.duration 
            }}
          >
            <MiniIndicatorCard
              icon={indicator.icon}
              label={indicator.title}
              value={indicator.value}
              trend={indicator.trend}
              onClick={indicator.onClick}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
  
  // 加载状态
  if (loading) {
    return (
      <div className={className}>
        {title && (
          <h2 className="text-lg font-semibold mb-4">{title}</h2>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-base-100 border border-base-300 rounded-xl p-5">
              <div className="animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-base-300 rounded"></div>
                  <div className="h-4 bg-base-300 rounded w-24"></div>
                </div>
                <div className="h-8 bg-base-300 rounded w-32 mb-2"></div>
                <div className="h-3 bg-base-300 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className={className}>
      {/* 标题栏 */}
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
          {device.isMobile && indicators.length > 2 && (
            <button className="btn btn-ghost btn-sm btn-circle" aria-label="更多选项">
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      
      {/* 指标内容 */}
      {activeLayout === 'carousel' && (
        <CarouselLayout 
          indicators={sortedIndicators}
          currentIndex={currentIndex}
          onIndexChange={setCurrentIndex}
        />
      )}
      {activeLayout === 'grid' && renderGrid()}
      {activeLayout === 'list' && renderList()}
    </div>
  );
};

// 使用React.memo优化
export const ResponsiveIndicatorSectionV2 = React.memo(ResponsiveIndicatorSectionComponent, (prevProps, nextProps) => {
  return (
    prevProps.indicators.length === nextProps.indicators.length &&
    prevProps.loading === nextProps.loading &&
    prevProps.layout === nextProps.layout &&
    prevProps.title === nextProps.title
  );
});

// 包装错误边界
export const ResponsiveIndicatorSection = (props: ResponsiveIndicatorSectionProps) => (
  <ErrorBoundary 
    componentName="ResponsiveIndicatorSection"
    fallback={
      <div className="p-8 border-2 border-dashed border-base-300 rounded-xl text-center">
        <p className="text-base-content/60">指标区域加载失败</p>
      </div>
    }
  >
    <ResponsiveIndicatorSectionV2 {...props} />
  </ErrorBoundary>
);

export default ResponsiveIndicatorSection;