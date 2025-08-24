import React, { useCallback, useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from 'framer-motion';
import { RefreshCw, ChevronDown, Zap } from 'lucide-react';
import { useEnhancedGestures } from '../../hooks/useEnhancedGestures';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  disabled?: boolean;
  customIndicator?: React.ReactNode;
  showLastRefresh?: boolean;
  refreshMessages?: {
    pull: string;
    release: string;
    refreshing: string;
    completed: string;
  };
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  disabled = false,
  customIndicator,
  showLastRefresh = true,
  refreshMessages = {
    pull: '下拉刷新',
    release: '松开刷新',
    refreshing: '正在刷新...',
    completed: '刷新完成',
  },
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [refreshCompleted, setRefreshCompleted] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const y = useMotionValue(0);
  const controls = useAnimation();
  
  // 计算下拉进度和动画值
  const pullProgress = useTransform(y, [0, threshold], [0, 1]);
  const indicatorRotation = useTransform(y, [0, threshold], [0, 180]);
  const indicatorScale = useTransform(y, [0, threshold / 2, threshold], [0, 0.8, 1]);
  const arrowRotation = useTransform(y, [0, threshold * 0.8, threshold], [0, 0, 180]);
  const backgroundOpacity = useTransform(y, [0, threshold], [0, 0.1]);

  // 格式化最后刷新时间
  const formatLastRefresh = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return '刚刚更新';
    if (minutes < 60) return `${minutes}分钟前更新`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前更新`;
    
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }, []);

  // 增强的手势处理
  const { touchHandlers } = useEnhancedGestures({
    onDragStart: (position) => {
      if (disabled || isRefreshing) return;
      
      const container = containerRef.current;
      if (!container || container.scrollTop > 0) return;
      
      setIsPulling(true);
      startY.current = position.y;
    },
    onDrag: (position, delta) => {
      if (!isPulling || disabled || isRefreshing || delta.y <= 0) return;

      // 应用阻尼效果和边界限制
      const dampingFactor = Math.max(0.3, 1 - (delta.y / (threshold * 2)));
      const dampedDelta = Math.min(delta.y * dampingFactor, threshold * 1.5);
      
      y.set(dampedDelta);

      // 触觉反馈
      if (dampedDelta >= threshold * 0.9 && !isRefreshing) {
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      }
    },
    onDragEnd: async () => {
      if (!isPulling) return;

      setIsPulling(false);
      const currentPull = y.get();

      if (currentPull >= threshold && !isRefreshing) {
        // 触发刷新
        setIsRefreshing(true);
        setRefreshCompleted(false);
        
        // 保持在刷新位置
        await controls.start({
          y: threshold,
          transition: { type: 'spring', stiffness: 200, damping: 20 }
        });

        try {
          await onRefresh();
          setLastRefreshTime(new Date());
          setRefreshCompleted(true);
          
          // 显示完成状态
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error('Refresh failed:', error);
        } finally {
          setIsRefreshing(false);
          
          // 回弹到原位
          await controls.start({
            y: 0,
            transition: { type: 'spring', stiffness: 200, damping: 20 }
          });
          
          // 重置状态
          setTimeout(() => setRefreshCompleted(false), 300);
        }
      } else {
        // 回弹到原位
        await controls.start({
          y: 0,
          transition: { type: 'spring', stiffness: 200, damping: 20 }
        });
      }

      y.set(0);
    },
  }, {
    enableDrag: true,
    dragThreshold: 10,
    preventScroll: true,
    enableHaptics: true,
    hapticIntensity: 'light',
  });

  return (
    <div className="relative h-full overflow-hidden" {...touchHandlers}>
      {/* 下拉背景渐变 */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"
        style={{ opacity: backgroundOpacity }}
      />

      {/* 下拉指示器区域 */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center pointer-events-none z-10"
        style={{ y }}
        animate={controls}
      >
        <div className="flex flex-col items-center justify-center mt-4">
          {/* 自定义指示器或默认指示器 */}
          {customIndicator || (
            <motion.div
              className={`
                flex items-center justify-center w-12 h-12 rounded-full
                transition-colors duration-300
                ${isRefreshing ? 'bg-primary text-primary-content' : 
                  refreshCompleted ? 'bg-success text-success-content' : 'bg-base-200 text-base-content'}
                shadow-lg
              `}
              style={{ scale: indicatorScale }}
              layout
            >
              <AnimatePresence mode="wait">
                {refreshCompleted ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    className="w-6 h-6 text-success-content"
                  >
                    <Zap className="w-6 h-6" />
                  </motion.div>
                ) : isRefreshing ? (
                  <motion.div
                    key="refreshing"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    >
                      <RefreshCw className="w-6 h-6" />
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="arrow"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    style={{ rotate: arrowRotation }}
                  >
                    <ChevronDown className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* 状态文本 */}
          <motion.div
            className="mt-2 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isPulling || isRefreshing ? 1 : 0, y: isPulling || isRefreshing ? 0 : 10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-sm font-medium text-base-content">
              {refreshCompleted ? refreshMessages.completed :
               isRefreshing ? refreshMessages.refreshing :
               y.get() >= threshold ? refreshMessages.release : 
               refreshMessages.pull}
            </div>
            
            {/* 最后刷新时间 */}
            {showLastRefresh && lastRefreshTime && !isPulling && !isRefreshing && (
              <motion.div
                className="text-xs text-base-content/60 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {formatLastRefresh(lastRefreshTime)}
              </motion.div>
            )}
          </motion.div>

          {/* 进度指示器 */}
          {isPulling && !isRefreshing && (
            <motion.div
              className="mt-2 w-16 h-1 bg-base-300 rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="h-full bg-primary rounded-full"
                style={{ 
                  scaleX: pullProgress,
                  transformOrigin: 'left'
                }}
              />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* 内容容器 */}
      <motion.div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-thin"
        style={{ y }}
        animate={controls}
      >
        {children}
      </motion.div>

      {/* 禁用状态遮罩 */}
      {disabled && (
        <div className="absolute inset-0 bg-base-100/50 backdrop-blur-sm flex items-center justify-center pointer-events-none z-20">
          <div className="text-base-content/60 text-sm">刷新已禁用</div>
        </div>
      )}
    </div>
  );
};

export default PullToRefresh;