import { useCallback, useRef, useState, useEffect } from 'react';

// 优化的手势处理器接口
interface PassiveGestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  onTap?: () => void;
}

// 优化的配置选项
interface PassiveGestureOptions {
  swipeThreshold?: number;
  longPressDelay?: number;
  tapTimeout?: number;
  enableVibration?: boolean;
  vibrationDuration?: number;
}

// 触摸点接口
interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

// 内部状态
interface PassiveGestureState {
  isLongPressing: boolean;
  isSwiping: boolean;
}

export const usePassiveGestures = (
  handlers: PassiveGestureHandlers,
  options: PassiveGestureOptions = {}
) => {
  const {
    swipeThreshold = 50,
    longPressDelay = 500,
    tapTimeout = 300,
    enableVibration = true,
    vibrationDuration = 50,
  } = options;

  const touchStartRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  
  const [state, setState] = useState<PassiveGestureState>({
    isLongPressing: false,
    isSwiping: false,
  });

  // 触觉反馈
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

  // 稳定化handlers引用
  const stableHandlers = useRef(handlers);
  stableHandlers.current = handlers;

  // 使用原生事件监听器避免React的事件系统
  const attachPassiveListeners = useCallback((element: HTMLElement) => {
    if (!element) return;

    let touchStart: TouchPoint | null = null;
    let longPressTimer: NodeJS.Timeout | null = null;
    let isLongPressing = false;
    let isSwiping = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      
      const touch = e.touches[0];
      const now = Date.now();
      
      touchStart = {
        x: touch.clientX,
        y: touch.clientY,
        time: now,
      };

      isLongPressing = false;
      isSwiping = false;
      
      setState(prev => ({
        ...prev,
        isLongPressing: false,
        isSwiping: false,
      }));

      // 设置长按定时器
      if (stableHandlers.current.onLongPress) {
        longPressTimer = setTimeout(() => {
          isLongPressing = true;
          setState(prev => ({ ...prev, isLongPressing: true }));
          stableHandlers.current.onLongPress?.();
          triggerVibration();
        }, longPressDelay);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStart || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // 如果移动距离超过阈值，取消长按
      if (distance > 10 && longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        
        // 检查滑动方向
        if (distance > swipeThreshold / 2) {
          isSwiping = true;
          setState(prev => ({ ...prev, isSwiping: true }));
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart) return;

      const now = Date.now();
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      // 如果是长按，不执行其他手势
      if (isLongPressing) {
        setState(prev => ({ ...prev, isLongPressing: false }));
        touchStart = null;
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      const deltaTime = now - touchStart.time;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // 检查滑动手势
      if (isSwiping && distance > swipeThreshold && deltaTime < 300) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > absY) {
          // 水平滑动
          if (deltaX > 0) {
            stableHandlers.current.onSwipeRight?.();
          } else {
            stableHandlers.current.onSwipeLeft?.();
          }
        } else {
          // 垂直滑动
          if (deltaY > 0) {
            stableHandlers.current.onSwipeDown?.();
          } else {
            stableHandlers.current.onSwipeUp?.();
          }
        }
        triggerVibration();
      } else if (distance < 10 && deltaTime < tapTimeout) {
        // 点击手势
        stableHandlers.current.onTap?.();
      }

      // 重置状态
      touchStart = null;
      setState(prev => ({ ...prev, isSwiping: false }));
    };

    const handleTouchCancel = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      touchStart = null;
      setState(prev => ({
        ...prev,
        isLongPressing: false,
        isSwiping: false,
      }));
    };

    // 添加passive事件监听器
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    // 返回清理函数
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [
    longPressDelay,
    swipeThreshold,
    tapTimeout,
    triggerVibration
  ]);

  // Ref回调函数
  const setRef = useCallback((element: HTMLElement | null) => {
    if (elementRef.current && elementRef.current !== element) {
      // 清理之前的监听器
      // 这里不需要显式清理，因为useEffect会处理
    }

    elementRef.current = element;
  }, []);

  // 设置和清理事件监听器
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const cleanup = attachPassiveListeners(element);
    return cleanup;
  }, [attachPassiveListeners]);

  // 清理副作用
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  return {
    // 用于设置元素ref的函数
    setGestureRef: setRef,
    // 手势状态
    gestureState: {
      isLongPressing: state.isLongPressing,
      isSwiping: state.isSwiping,
    },
    // 空的触摸处理器（保持接口兼容）
    touchHandlers: {},
  };
};

export default usePassiveGestures;