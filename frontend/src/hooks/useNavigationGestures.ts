import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigationState } from '../components/navigation/NavigationProvider';

interface GestureConfig {
  swipeThreshold: number;
  velocityThreshold: number;
  enableSwipeBack: boolean;
  enableSwipeToDrawer: boolean;
  enablePullToRefresh: boolean;
  edgeSwipeZone: number; // 边缘滑动区域宽度 (px)
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
  startEdge: boolean; // 是否从边缘开始
}

const DEFAULT_CONFIG: GestureConfig = {
  swipeThreshold: 100,
  velocityThreshold: 0.5,
  enableSwipeBack: true,
  enableSwipeToDrawer: true,
  enablePullToRefresh: true,
  edgeSwipeZone: 20
};

export function useNavigationGestures(config: Partial<GestureConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const navigate = useNavigate();
  const { controls } = useNavigationState();
  
  const [isGesturing, setIsGesturing] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [gestureType, setGestureType] = useState<'back' | 'drawer' | 'refresh' | null>(null);
  
  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchCurrentRef = useRef<TouchPoint | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  // 计算滑动手势
  const calculateSwipe = (start: TouchPoint, current: TouchPoint): SwipeGesture => {
    const deltaX = current.x - start.x;
    const deltaY = current.y - start.y;
    const duration = current.timestamp - start.timestamp;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 确定主要方向
    let direction: SwipeGesture['direction'];
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }
    
    // 检查是否从边缘开始
    const startEdge = start.x <= finalConfig.edgeSwipeZone || 
                     start.x >= window.innerWidth - finalConfig.edgeSwipeZone;
    
    return {
      direction,
      distance,
      velocity: distance / Math.max(duration, 1),
      duration,
      startEdge
    };
  };

  // 确定手势类型
  const determineGestureType = (swipe: SwipeGesture): 'back' | 'drawer' | 'refresh' | null => {
    const { direction, startEdge, distance } = swipe;
    
    // 后退手势：从左边缘向右滑动
    if (finalConfig.enableSwipeBack && 
        direction === 'right' && 
        startEdge && 
        touchStartRef.current!.x <= finalConfig.edgeSwipeZone) {
      return 'back';
    }
    
    // 抽屉手势：从左边缘向右滑动（非后退区域）或从右边缘向左滑动
    if (finalConfig.enableSwipeToDrawer) {
      if (direction === 'right' && startEdge && touchStartRef.current!.x <= finalConfig.edgeSwipeZone) {
        return 'drawer';
      }
    }
    
    // 下拉刷新手势：从顶部向下滑动
    if (finalConfig.enablePullToRefresh && 
        direction === 'down' && 
        touchStartRef.current!.y <= 100 && 
        distance > 50) {
      return 'refresh';
    }
    
    return null;
  };

  // 计算手势进度
  const calculateProgress = (swipe: SwipeGesture, type: typeof gestureType): number => {
    const { direction, distance } = swipe;
    
    switch (type) {
      case 'back':
      case 'drawer':
        return Math.min(Math.abs(distance) / finalConfig.swipeThreshold, 1);
      case 'refresh':
        return Math.min(distance / 120, 1); // 120px 触发刷新
      default:
        return 0;
    }
  };

  // 执行手势动作
  const executeGesture = (swipe: SwipeGesture, type: typeof gestureType) => {
    const { velocity, distance } = swipe;
    const shouldTrigger = distance >= finalConfig.swipeThreshold || 
                         velocity >= finalConfig.velocityThreshold;
    
    if (!shouldTrigger) return;

    switch (type) {
      case 'back':
        // 触觉反馈
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
        controls.goBack();
        break;
        
      case 'drawer':
        if ('vibrate' in navigator) {
          navigator.vibrate(25);
        }
        controls.toggleDrawer();
        break;
        
      case 'refresh':
        if ('vibrate' in navigator) {
          navigator.vibrate([25, 50, 25]);
        }
        // 触发页面刷新事件
        window.dispatchEvent(new CustomEvent('pullToRefresh'));
        break;
    }
  };

  // 处理触摸开始
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };
    
    setIsGesturing(false);
    setSwipeProgress(0);
    setGestureType(null);
  };

  // 处理触摸移动
  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    touchCurrentRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };
    
    const swipe = calculateSwipe(touchStartRef.current, touchCurrentRef.current);
    
    // 距离太小，不处理
    if (swipe.distance < 10) return;
    
    // 首次识别手势类型
    if (!gestureType) {
      const type = determineGestureType(swipe);
      if (type) {
        setGestureType(type);
        setIsGesturing(true);
        
        // 阻止默认滚动行为（仅在需要时）
        if (type === 'back' || type === 'drawer') {
          e.preventDefault();
        }
      }
    }
    
    // 更新手势进度
    if (gestureType) {
      const progress = calculateProgress(swipe, gestureType);
      setSwipeProgress(progress);
      
      // 提供视觉反馈
      if (progress > 0.7 && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  // 处理触摸结束
  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStartRef.current || !touchCurrentRef.current) {
      resetGestureState();
      return;
    }
    
    const swipe = calculateSwipe(touchStartRef.current, touchCurrentRef.current);
    
    if (gestureType && isGesturing) {
      executeGesture(swipe, gestureType);
    }
    
    resetGestureState();
  };

  // 重置手势状态
  const resetGestureState = () => {
    setTimeout(() => {
      setIsGesturing(false);
      setSwipeProgress(0);
      setGestureType(null);
    }, 300);
    
    touchStartRef.current = null;
    touchCurrentRef.current = null;
  };

  // 设置事件监听器
  useEffect(() => {
    const element = elementRef.current || document.body;
    
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', resetGestureState, { passive: true });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', resetGestureState);
    };
  }, [gestureType, isGesturing]); // 依赖项确保事件处理器是最新的

  return {
    // 手势状态
    isGesturing,
    swipeProgress,
    gestureType,
    
    // 绑定到元素的 ref（可选，默认绑定到 body）
    gestureElementRef: elementRef,
    
    // 手势配置
    config: finalConfig,
    
    // 手动触发手势（用于测试或特殊场景）
    triggerGesture: (type: 'back' | 'drawer' | 'refresh') => {
      const mockSwipe: SwipeGesture = {
        direction: type === 'back' ? 'right' : type === 'drawer' ? 'right' : 'down',
        distance: finalConfig.swipeThreshold + 10,
        velocity: finalConfig.velocityThreshold + 0.1,
        duration: 200,
        startEdge: true
      };
      executeGesture(mockSwipe, type);
    }
  };
}

// 下拉刷新专用 Hook
export function usePullToRefresh(onRefresh: () => void | Promise<void>, enabled = true) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  const { isGesturing, swipeProgress, gestureType } = useNavigationGestures({
    enableSwipeBack: false,
    enableSwipeToDrawer: false,
    enablePullToRefresh: enabled
  });

  // 监听下拉刷新事件
  useEffect(() => {
    if (!enabled) return;

    const handlePullToRefresh = async () => {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    };

    window.addEventListener('pullToRefresh', handlePullToRefresh);
    
    return () => {
      window.removeEventListener('pullToRefresh', handlePullToRefresh);
    };
  }, [onRefresh, enabled]);

  // 更新下拉距离
  useEffect(() => {
    if (gestureType === 'refresh' && isGesturing) {
      setPullDistance(swipeProgress * 120);
    } else if (!isGesturing) {
      setPullDistance(0);
    }
  }, [gestureType, isGesturing, swipeProgress]);

  return {
    isRefreshing,
    pullDistance,
    showRefreshIndicator: pullDistance > 60 || isRefreshing
  };
}

export default useNavigationGestures;