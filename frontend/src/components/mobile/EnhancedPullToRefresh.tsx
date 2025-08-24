import React, { useCallback, useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from 'framer-motion';
import { RefreshCw, ChevronDown, Zap, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { gestureSystemManager, GestureHandler } from '../../services/gestureSystemManager';
import { useTouchFeedback } from '../../hooks/useTouchFeedback';

interface RefreshIndicator {
  pulling: React.ReactNode;
  release: React.ReactNode;
  refreshing: React.ReactNode;
  success: React.ReactNode;
  error: React.ReactNode;
}

interface EnhancedPullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
  customIndicator?: Partial<RefreshIndicator>;
  showLastRefresh?: boolean;
  enableHapticFeedback?: boolean;
  refreshMessages?: {
    pull: string;
    release: string;
    refreshing: string;
    completed: string;
    failed: string;
  };
  onPullStart?: () => void;
  onPullProgress?: (progress: number) => void;
  onPullEnd?: (refreshTriggered: boolean) => void;
  dampingFactor?: number;
  springConfig?: {
    stiffness: number;
    damping: number;
  };
  refreshTimeout?: number;
}

type RefreshState = 'idle' | 'pulling' | 'releasing' | 'refreshing' | 'success' | 'error';

const defaultIndicator: RefreshIndicator = {
  pulling: <ChevronDown className="w-6 h-6" />,
  release: <ChevronDown className="w-6 h-6" />,
  refreshing: (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
    >
      <RefreshCw className="w-6 h-6" />
    </motion.div>
  ),
  success: <CheckCircle className="w-6 h-6" />,
  error: <AlertCircle className="w-6 h-6" />,
};

export const EnhancedPullToRefresh: React.FC<EnhancedPullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  maxPullDistance = 150,
  disabled = false,
  customIndicator = {},
  showLastRefresh = true,
  enableHapticFeedback = true,
  refreshMessages = {
    pull: '下拉刷新',
    release: '松开刷新',
    refreshing: '正在刷新...',
    completed: '刷新完成',
    failed: '刷新失败',
  },
  onPullStart,
  onPullProgress,
  onPullEnd,
  dampingFactor = 0.4,
  springConfig = { stiffness: 300, damping: 30 },
  refreshTimeout = 10000,
}) => {
  const [refreshState, setRefreshState] = useState<RefreshState>('idle');
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [pullStartTime, setPullStartTime] = useState<number>(0);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const handlerIdRef = useRef<string>(`pull-refresh-${Math.random().toString(36).substr(2, 9)}`);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const y = useMotionValue(0);
  const controls = useAnimation();
  const { triggerFeedback } = useTouchFeedback();

  // 合并指示器配置
  const indicator = { ...defaultIndicator, ...customIndicator };
  
  // 计算下拉进度和动画值
  const pullProgress = useTransform(y, [0, threshold], [0, 1]);
  const pullProgressClamped = useTransform(y, [0, maxPullDistance], [0, 1]);
  const indicatorRotation = useTransform(
    y, 
    [0, threshold * 0.5, threshold], 
    [0, 90, 180]
  );
  const indicatorScale = useTransform(
    y, 
    [0, threshold * 0.3, threshold, maxPullDistance], 
    [0.7, 0.9, 1.1, 1]
  );
  const backgroundOpacity = useTransform(y, [0, threshold], [0, 0.15]);
  const contentScale = useTransform(y, [0, maxPullDistance], [1, 0.98]);

  // 波纹效果动画值
  const rippleScale = useTransform(y, [0, threshold], [0, 2]);
  const rippleOpacity = useTransform(y, [0, threshold * 0.7, threshold], [0, 0.3, 0]);

  // 格式化最后刷新时间
  const formatLastRefresh = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return '刚刚更新';
    if (minutes < 60) return `${minutes}分钟前更新`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前更新`;
    
    return date.toLocaleDateString('zh-CN', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // 获取当前状态的指示器
  const getCurrentIndicator = useCallback(() => {
    const currentY = y.get();
    
    switch (refreshState) {
      case 'pulling':
        return currentY >= threshold ? indicator.release : indicator.pulling;
      case 'releasing':
      case 'refreshing':
        return indicator.refreshing;
      case 'success':
        return indicator.success;
      case 'error':
        return indicator.error;
      default:
        return indicator.pulling;
    }
  }, [refreshState, threshold, indicator, y]);

  // 获取当前状态的消息
  const getCurrentMessage = useCallback(() => {
    const currentY = y.get();
    
    switch (refreshState) {
      case 'pulling':
        return currentY >= threshold ? refreshMessages.release : refreshMessages.pull;
      case 'refreshing':
        return refreshMessages.refreshing;
      case 'success':
        return refreshMessages.completed;
      case 'error':
        return refreshError || refreshMessages.failed;
      default:
        return refreshMessages.pull;
    }
  }, [refreshState, threshold, refreshMessages, refreshError, y]);

  // 执行刷新
  const performRefresh = useCallback(async () => {
    if (disabled || refreshState === 'refreshing') return;

    setRefreshState('refreshing');
    setRefreshError(null);

    // 设置刷新超时
    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshError('刷新超时');
      setRefreshState('error');
    }, refreshTimeout);

    try {
      await onRefresh();
      
      setLastRefreshTime(new Date());
      setRefreshState('success');
      
      if (enableHapticFeedback) {
        triggerFeedback('medium');
      }
      
      gestureSystemManager.announceGesture('Refresh completed');
      
    } catch (error) {
      console.error('Refresh failed:', error);
      setRefreshError(error instanceof Error ? error.message : '未知错误');
      setRefreshState('error');
      
      if (enableHapticFeedback) {
        triggerFeedback('heavy');
      }
    } finally {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      
      // 显示结果状态
      setTimeout(() => {
        resetToIdle();
      }, 1500);
    }
  }, [disabled, refreshState, onRefresh, refreshTimeout, enableHapticFeedback, triggerFeedback]);

  // 重置到idle状态
  const resetToIdle = useCallback(async () => {
    await controls.start({
      y: 0,
      transition: {
        type: 'spring',
        ...springConfig,
      }
    });
    
    setRefreshState('idle');
    y.set(0);
  }, [controls, springConfig, y]);

  // 检查是否在顶部
  const isAtTop = useCallback((element: HTMLElement): boolean => {
    const scrollableParent = findScrollableParent(element);
    return !scrollableParent || scrollableParent.scrollTop <= 5;
  }, []);

  const findScrollableParent = useCallback((element: HTMLElement): HTMLElement | null => {
    let parent = element.parentElement;
    
    while (parent && parent !== document.body) {
      const style = window.getComputedStyle(parent);
      const isScrollable = ['auto', 'scroll'].includes(style.overflowY);
      
      if (isScrollable && parent.scrollHeight > parent.clientHeight) {
        return parent;
      }
      
      parent = parent.parentElement;
    }
    
    return document.documentElement;
  }, []);

  // 注册手势处理器
  useEffect(() => {
    if (!containerRef.current || disabled) return;

    const handler: GestureHandler = {
      id: handlerIdRef.current,
      element: containerRef.current,
      enabled: true,
      zIndex: 10,
      handlers: {
        onPullRefreshStart: (event) => {
          if (!isAtTop(event.target as HTMLElement)) return;
          
          setRefreshState('pulling');
          setPullStartTime(Date.now());
          onPullStart?.();
          
          if (enableHapticFeedback) {
            triggerFeedback('light');
          }
        },
        onPullRefresh: (event) => {
          if (refreshState === 'refreshing' || !event.distance) return;
          
          // 应用阻尼效果
          const dampedDistance = event.distance * dampingFactor;
          const clampedDistance = Math.min(dampedDistance, maxPullDistance);
          
          y.set(clampedDistance);
          
          // 更新进度
          const progress = clampedDistance / threshold;
          onPullProgress?.(Math.min(progress, 1));
          
          // 阈值触觉反馈
          if (clampedDistance >= threshold * 0.9 && refreshState !== 'releasing') {
            setRefreshState('releasing');
            
            if (enableHapticFeedback) {
              triggerFeedback('medium');
            }
          } else if (clampedDistance < threshold * 0.9 && refreshState === 'releasing') {
            setRefreshState('pulling');
          }
        },
        onPullRefreshEnd: (event) => {
          const pullDistance = event.distance || 0;
          const pullDuration = Date.now() - pullStartTime;
          const shouldRefresh = pullDistance >= threshold;
          
          onPullEnd?.(shouldRefresh);
          
          if (shouldRefresh) {
            // 保持在刷新位置并执行刷新
            controls.start({
              y: threshold,
              transition: {
                type: 'spring',
                ...springConfig,
              }
            });
            
            performRefresh();
          } else {
            // 回弹到原位
            resetToIdle();
          }
          
          gestureSystemManager.announceGesture(
            shouldRefresh ? 'Refresh triggered' : 'Pull to refresh cancelled'
          );
        },
      },
      config: {
        pullRefreshThreshold: threshold,
        pullRefreshMaxDistance: maxPullDistance,
        enableHaptics: enableHapticFeedback,
        conflictStrategy: 'priority',
        gesturePriority: ['pullRefresh'],
      },
    };

    gestureSystemManager.register(handler);

    return () => {
      gestureSystemManager.unregister(handlerIdRef.current);
    };
  }, [
    disabled,
    threshold,
    maxPullDistance,
    dampingFactor,
    enableHapticFeedback,
    refreshState,
    pullStartTime,
    y,
    controls,
    springConfig,
    isAtTop,
    performRefresh,
    resetToIdle,
    triggerFeedback,
    onPullStart,
    onPullProgress,
    onPullEnd,
  ]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative h-full overflow-hidden">
      {/* 背景渐变和波纹效果 */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
        style={{ opacity: backgroundOpacity }}
      >
        {/* 渐变背景 */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />
        
        {/* 波纹效果 */}
        <motion.div
          className="absolute top-16 left-1/2 w-32 h-32 -translate-x-1/2 rounded-full border-2 border-primary/30"
          style={{ 
            scale: rippleScale,
            opacity: rippleOpacity,
          }}
        />
        <motion.div
          className="absolute top-16 left-1/2 w-24 h-24 -translate-x-1/2 rounded-full border-2 border-primary/40"
          style={{ 
            scale: rippleScale,
            opacity: rippleOpacity,
          }}
        />
      </motion.div>

      {/* 下拉指示器区域 */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center pointer-events-none z-20"
        style={{ y }}
        animate={controls}
      >
        <div className="flex flex-col items-center justify-center pt-8 pb-4">
          {/* 主指示器 */}
          <motion.div
            className={`
              flex items-center justify-center w-16 h-16 rounded-full shadow-lg
              transition-colors duration-300
              ${refreshState === 'refreshing' ? 'bg-primary text-primary-content' : 
                refreshState === 'success' ? 'bg-success text-success-content' :
                refreshState === 'error' ? 'bg-error text-error-content' :
                refreshState === 'releasing' ? 'bg-secondary text-secondary-content' :
                'bg-base-200 text-base-content'}
            `}
            style={{ 
              scale: indicatorScale,
              rotate: refreshState === 'pulling' ? indicatorRotation : 0,
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={refreshState}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.2 }}
              >
                {getCurrentIndicator()}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* 状态文本 */}
          <motion.div
            className="mt-3 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: refreshState !== 'idle' ? 1 : 0, 
              y: refreshState !== 'idle' ? 0 : 10 
            }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-base font-medium text-base-content">
              {getCurrentMessage()}
            </div>
            
            {/* 最后刷新时间 */}
            {showLastRefresh && lastRefreshTime && refreshState === 'idle' && (
              <motion.div
                className="text-xs text-base-content/60 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {formatLastRefresh(lastRefreshTime)}
              </motion.div>
            )}
            
            {/* 错误详情 */}
            {refreshState === 'error' && refreshError && (
              <motion.div
                className="text-xs text-error mt-1 max-w-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {refreshError}
              </motion.div>
            )}
          </motion.div>

          {/* 进度指示器 */}
          <AnimatePresence>
            {refreshState === 'pulling' && (
              <motion.div
                className="mt-3 w-24 h-1 bg-base-300 rounded-full overflow-hidden"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 96 }}
                exit={{ opacity: 0, width: 0 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                  style={{ 
                    scaleX: pullProgress,
                    transformOrigin: 'left',
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 刷新进度环 */}
          <AnimatePresence>
            {refreshState === 'refreshing' && (
              <motion.div
                className="mt-2"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
              >
                <svg className="w-8 h-8" viewBox="0 0 32 32">
                  <motion.circle
                    cx="16"
                    cy="16"
                    r="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="24 8"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* 内容容器 */}
      <motion.div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-thin"
        style={{ 
          y,
          scale: contentScale,
        }}
        animate={controls}
      >
        {children}
      </motion.div>

      {/* 禁用状态遮罩 */}
      {disabled && (
        <div className="absolute inset-0 bg-base-100/50 backdrop-blur-sm flex items-center justify-center pointer-events-none z-30">
          <div className="text-base-content/60 text-sm bg-base-200 px-4 py-2 rounded-full">
            刷新已禁用
          </div>
        </div>
      )}

      {/* 调试信息（开发环境） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 right-4 bg-base-200 p-2 rounded text-xs font-mono opacity-50 pointer-events-none">
          State: {refreshState}<br />
          Y: {Math.round(y.get())}<br />
          Progress: {Math.round((y.get() / threshold) * 100)}%
        </div>
      )}
    </div>
  );
};

export default EnhancedPullToRefresh;