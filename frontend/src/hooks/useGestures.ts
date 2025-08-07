import { useCallback, useRef, useState, useEffect } from 'react';

// 扩展的手势处理器接口
interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onPinchStart?: (scale: number) => void;
  onPinch?: (scale: number) => void;
  onPinchEnd?: (scale: number) => void;
}

// 扩展的配置选项
interface GestureOptions {
  swipeThreshold?: number;
  longPressDelay?: number;
  tapTimeout?: number;
  doubleTapTimeout?: number;
  preventScroll?: boolean;
  enableVibration?: boolean;
  vibrationDuration?: number;
  enablePinch?: boolean;
  pinchThreshold?: number;
}

// 触摸点接口
interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

// 内部状态
interface GestureState {
  isLongPressing: boolean;
  isSwiping: boolean;
  isPinching: boolean;
  lastTapTime: number;
  tapCount: number;
  initialDistance: number;
  currentScale: number;
}

export const useGestures = (
  handlers: GestureHandlers,
  options: GestureOptions = {}
) => {
  const {
    swipeThreshold = 50,
    longPressDelay = 500,
    tapTimeout = 300,
    doubleTapTimeout = 300,
    preventScroll = false,
    enableVibration = true,
    vibrationDuration = 50,
    enablePinch = false,
    pinchThreshold = 10,
  } = options;

  const touchStartRef = useRef<TouchPoint | null>(null);
  const touch2StartRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<GestureState>({
    isLongPressing: false,
    isSwiping: false,
    isPinching: false,
    lastTapTime: 0,
    tapCount: 0,
    initialDistance: 0,
    currentScale: 1,
  });

  // 实用函数
  const getDistance = useCallback((point1: TouchPoint, point2: TouchPoint): number => {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const triggerVibration = useCallback(() => {
    if (enableVibration && 'vibrate' in navigator) {
      try {
        navigator.vibrate(vibrationDuration);
      } catch (error) {
        console.warn('Vibration failed:', error);
      }
    }
  }, [enableVibration, vibrationDuration]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;
    const now = Date.now();

    if (touches.length === 1) {
      // 单点触摸
      const touch = touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: now,
      };

      setState(prev => ({
        ...prev,
        isLongPressing: false,
        isSwiping: false,
        isPinching: false,
      }));

      // 设置长按定时器
      if (handlers.onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          setState(prev => ({ ...prev, isLongPressing: true }));
          handlers.onLongPress?.();
          triggerVibration();
        }, longPressDelay);
      }
    } else if (touches.length === 2 && enablePinch) {
      // 双点触摸 - 捏合手势
      const touch1 = touches[0];
      const touch2 = touches[1];
      
      touchStartRef.current = { x: touch1.clientX, y: touch1.clientY, time: now };
      touch2StartRef.current = { x: touch2.clientX, y: touch2.clientY, time: now };
      
      const initialDistance = getDistance(touchStartRef.current, touch2StartRef.current);
      
      setState(prev => ({
        ...prev,
        isPinching: true,
        initialDistance,
        currentScale: 1,
        isLongPressing: false,
        isSwiping: false,
      }));

      clearLongPressTimer();
      handlers.onPinchStart?.(1);
    }
  }, [
    handlers.onLongPress,
    handlers.onPinchStart,
    longPressDelay,
    enablePinch,
    getDistance,
    triggerVibration,
    clearLongPressTimer
  ]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touches = e.touches;

    if (state.isPinching && touches.length === 2 && touch2StartRef.current) {
      // 处理捏合手势
      const touch1 = touches[0];
      const touch2 = touches[1];
      
      const point1 = { x: touch1.clientX, y: touch1.clientY, time: Date.now() };
      const point2 = { x: touch2.clientX, y: touch2.clientY, time: Date.now() };
      
      const currentDistance = getDistance(point1, point2);
      const scale = currentDistance / state.initialDistance;
      
      if (Math.abs(scale - state.currentScale) > 0.01) {
        setState(prev => ({ ...prev, currentScale: scale }));
        handlers.onPinch?.(scale);
      }
    } else if (touches.length === 1) {
      // 单点移动处理
      const touch = touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // 如果移动距离超过阈值，取消长按
      if (distance > 10) {
        clearLongPressTimer();
        
        // 检查滑动方向
        if (distance > swipeThreshold / 2) {
          setState(prev => ({ ...prev, isSwiping: true }));
          
          // 阻止滚动
          if (preventScroll) {
            e.preventDefault();
          }
        }
      }
    }
  }, [
    state.isPinching,
    state.initialDistance, 
    state.currentScale,
    clearLongPressTimer,
    preventScroll,
    swipeThreshold,
    getDistance,
    handlers.onPinch
  ]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const now = Date.now();
    clearLongPressTimer();

    if (state.isPinching) {
      // 结束捏合手势
      handlers.onPinchEnd?.(state.currentScale);
      setState(prev => ({
        ...prev,
        isPinching: false,
        initialDistance: 0,
        currentScale: 1,
      }));
      touchStartRef.current = null;
      touch2StartRef.current = null;
      return;
    }

    // 如果是长按，不执行其他手势
    if (state.isLongPressing) {
      setState(prev => ({ ...prev, isLongPressing: false }));
      touchStartRef.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = now - touchStartRef.current.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 检查滑动手势
    if (state.isSwiping && distance > swipeThreshold && deltaTime < 300) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > absY) {
        // 水平滑动
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      } else {
        // 垂直滑动
        if (deltaY > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      }
      triggerVibration();
    } else if (distance < 10 && deltaTime < tapTimeout) {
      // 点击手势处理
      const timeSinceLastTap = now - state.lastTapTime;
      
      if (timeSinceLastTap < doubleTapTimeout && state.tapCount === 1) {
        // 双击
        handlers.onDoubleTap?.();
        setState(prev => ({ ...prev, tapCount: 0, lastTapTime: 0 }));
      } else {
        // 单击 - 延迟执行以等待可能的双击
        setState(prev => ({ ...prev, tapCount: 1, lastTapTime: now }));
        
        setTimeout(() => {
          if (state.tapCount === 1 && state.lastTapTime === now) {
            handlers.onTap?.();
            setState(prev => ({ ...prev, tapCount: 0, lastTapTime: 0 }));
          }
        }, doubleTapTimeout);
      }
    }

    // 重置状态
    touchStartRef.current = null;
    setState(prev => ({ ...prev, isSwiping: false }));
  }, [
    state.isPinching,
    state.isLongPressing,
    state.isSwiping,
    state.currentScale,
    state.lastTapTime,
    state.tapCount,
    clearLongPressTimer,
    swipeThreshold,
    tapTimeout,
    doubleTapTimeout,
    triggerVibration,
    handlers.onPinchEnd,
    handlers.onSwipeLeft,
    handlers.onSwipeRight,
    handlers.onSwipeUp,
    handlers.onSwipeDown,
    handlers.onTap,
    handlers.onDoubleTap,
  ]);

  const handleTouchCancel = useCallback(() => {
    clearLongPressTimer();
    touchStartRef.current = null;
    touch2StartRef.current = null;
    setState(prev => ({
      ...prev,
      isLongPressing: false,
      isSwiping: false,
      isPinching: false,
      tapCount: 0,
      lastTapTime: 0,
    }));
  }, [clearLongPressTimer]);

  // 清理副作用
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    gestureState: {
      isLongPressing: state.isLongPressing,
      isSwiping: state.isSwiping,
      isPinching: state.isPinching,
      currentScale: state.currentScale,
      tapCount: state.tapCount,
    },
  };
};

// 专门用于滑动的简化Hook
export const useSwipeGestures = (handlers: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}, options?: Partial<GestureOptions>) => {
  return useGestures({
    onSwipeLeft: handlers.onSwipeLeft,
    onSwipeRight: handlers.onSwipeRight,
    onSwipeUp: handlers.onSwipeUp,
    onSwipeDown: handlers.onSwipeDown,
  }, options);
};

// 专门用于点击的简化Hook
export const useTapGestures = (handlers: {
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}, options?: Partial<GestureOptions>) => {
  return useGestures({
    onTap: handlers.onTap,
    onDoubleTap: handlers.onDoubleTap,
    onLongPress: handlers.onLongPress,
  }, options);
};

// 专门用于缩放的简化Hook
export const usePinchGestures = (handlers: {
  onPinchStart?: (scale: number) => void;
  onPinch?: (scale: number) => void;
  onPinchEnd?: (scale: number) => void;
}, options?: Partial<GestureOptions>) => {
  return useGestures({
    onPinchStart: handlers.onPinchStart,
    onPinch: handlers.onPinch,
    onPinchEnd: handlers.onPinchEnd,
  }, { ...options, enablePinch: true });
};

export default useGestures;