import { useCallback, useRef, useState } from 'react';

interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLongPress?: () => void;
  onTap?: () => void;
}

interface GestureOptions {
  swipeThreshold?: number;
  longPressDelay?: number;
  tapTimeout?: number;
  preventScroll?: boolean;
}

export const useGestures = (
  handlers: GestureHandlers,
  options: GestureOptions = {}
) => {
  const {
    swipeThreshold = 50,
    longPressDelay = 500,
    tapTimeout = 300,
    preventScroll = false,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    setIsLongPressing(false);
    setIsSwiping(false);

    // 设置长按定时器
    if (handlers.onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        setIsLongPressing(true);
        handlers.onLongPress?.();
        
        // 触觉反馈
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, longPressDelay);
    }
  }, [handlers.onLongPress, longPressDelay]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 如果移动距离超过阈值，取消长按
    if (distance > 10) {
      clearLongPressTimer();
      
      // 检查是否为水平滑动
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        setIsSwiping(true);
        
        // 阻止垂直滚动
        if (preventScroll) {
          e.preventDefault();
        }
      }
    }
  }, [clearLongPressTimer, preventScroll]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    clearLongPressTimer();

    // 如果是长按，不执行其他手势
    if (isLongPressing) {
      setIsLongPressing(false);
      touchStartRef.current = null;
      return;
    }

    // 检查滑动手势
    if (isSwiping && Math.abs(deltaY) < Math.abs(deltaX)) {
      if (Math.abs(deltaX) > swipeThreshold) {
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      }
    } else if (
      // 检查点击手势
      Math.abs(deltaX) < 10 && 
      Math.abs(deltaY) < 10 && 
      deltaTime < tapTimeout
    ) {
      handlers.onTap?.();
    }

    touchStartRef.current = null;
    setIsSwiping(false);
  }, [
    clearLongPressTimer,
    isLongPressing,
    isSwiping,
    swipeThreshold,
    tapTimeout,
    handlers.onSwipeLeft,
    handlers.onSwipeRight,
    handlers.onTap,
  ]);

  const handleTouchCancel = useCallback(() => {
    clearLongPressTimer();
    touchStartRef.current = null;
    setIsLongPressing(false);
    setIsSwiping(false);
  }, [clearLongPressTimer]);

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    gestureState: {
      isLongPressing,
      isSwiping,
    },
  };
};

export default useGestures;