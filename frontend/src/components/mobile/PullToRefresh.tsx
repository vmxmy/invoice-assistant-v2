import React, { useCallback, useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  disabled = false,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const y = useMotionValue(0);
  const controls = useAnimation();
  
  // 计算下拉进度
  const pullProgress = useTransform(y, [0, threshold], [0, 1]);
  const indicatorRotation = useTransform(y, [0, threshold], [0, 180]);
  const indicatorScale = useTransform(y, [0, threshold / 2, threshold], [0, 0.8, 1]);

  // 处理触摸开始
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;

    // 只有在容器顶部时才允许下拉
    if (container.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [disabled, isRefreshing]);

  // 处理触摸移动
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;

    if (deltaY > 0) {
      // 应用阻尼效果
      const dampedDelta = Math.min(deltaY * 0.5, threshold * 1.5);
      y.set(dampedDelta);

      // 防止页面滚动
      if (deltaY > 10) {
        e.preventDefault();
      }

      // 触觉反馈（仅iOS）
      if (dampedDelta >= threshold && !isRefreshing) {
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      }
    }
  }, [isPulling, disabled, isRefreshing, y, threshold]);

  // 处理触摸结束
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);
    const currentPull = y.get();

    if (currentPull >= threshold && !isRefreshing) {
      // 触发刷新
      setIsRefreshing(true);
      
      // 保持在刷新位置
      await controls.start({
        y: threshold,
        transition: { type: 'spring', stiffness: 200, damping: 20 }
      });

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        // 回弹到原位
        await controls.start({
          y: 0,
          transition: { type: 'spring', stiffness: 200, damping: 20 }
        });
      }
    } else {
      // 回弹到原位
      await controls.start({
        y: 0,
        transition: { type: 'spring', stiffness: 200, damping: 20 }
      });
    }

    y.set(0);
  }, [isPulling, y, threshold, isRefreshing, controls, onRefresh]);

  // 绑定事件监听器
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div className="relative h-full overflow-hidden">
      {/* 下拉指示器 */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex justify-center items-center pointer-events-none z-10"
        style={{ y }}
        animate={controls}
      >
        <motion.div
          className={`
            flex items-center justify-center w-10 h-10 rounded-full
            ${isRefreshing ? 'bg-primary' : 'bg-base-200'}
            shadow-lg transition-colors duration-200
          `}
          style={{
            scale: indicatorScale,
            marginTop: '-40px',
          }}
        >
          <motion.div
            style={{ rotate: indicatorRotation }}
            animate={isRefreshing ? { rotate: 360 } : {}}
            transition={
              isRefreshing
                ? { repeat: Infinity, duration: 1, ease: 'linear' }
                : {}
            }
          >
            <RefreshCw 
              className={`
                w-5 h-5
                ${isRefreshing ? 'text-primary-content' : 'text-base-content'}
              `}
            />
          </motion.div>
        </motion.div>
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

      {/* 下拉提示文本 */}
      {isPulling && !isRefreshing && (
        <motion.div
          className="absolute top-2 left-0 right-0 text-center text-sm text-base-content/60 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: pullProgress.get() }}
        >
          {y.get() >= threshold ? '松开刷新' : '下拉刷新'}
        </motion.div>
      )}
    </div>
  );
};

export default PullToRefresh;