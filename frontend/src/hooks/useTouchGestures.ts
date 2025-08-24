/**
 * 触摸手势处理 Hook
 * 专为移动端表格优化的手势识别和处理
 */

import { useRef, useCallback, useEffect } from 'react';
import { TouchGestureEvent, TouchGestureType } from '../types/table';

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface UseTouchGesturesOptions {
  /** 容器引用 */
  containerRef: React.RefObject<HTMLElement>;
  /** 是否启用手势 */
  enabled?: boolean;
  /** 长按延迟（毫秒） */
  longPressDelay?: number;
  /** 滑动最小距离 */
  swipeThreshold?: number;
  /** 滑动最大垂直偏移 */
  swipeMaxVerticalOffset?: number;
  /** 最小速度（像素/毫秒） */
  minVelocity?: number;
  /** 手势回调 */
  onGesture?: (event: TouchGestureEvent) => void;
  /** 防止默认行为 */
  preventDefault?: boolean;
}

export const useTouchGestures = ({
  containerRef,
  enabled = true,
  longPressDelay = 500,
  swipeThreshold = 50,
  swipeMaxVerticalOffset = 100,
  minVelocity = 0.1,
  onGesture,
  preventDefault = true
}: UseTouchGesturesOptions) => {
  const touchStateRef = useRef({
    isTracking: false,
    startPoint: null as TouchPoint | null,
    currentPoint: null as TouchPoint | null,
    longPressTimer: null as NodeJS.Timeout | null,
    longPressTriggered: false,
    touchId: null as number | null,
    target: null as HTMLElement | null
  });

  const hapticFeedbackRef = useRef({
    lastFeedback: 0,
    feedbackThrottle: 50 // 最小间隔50ms
  });

  // 触觉反馈
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    const now = Date.now();
    if (now - hapticFeedbackRef.current.lastFeedback < hapticFeedbackRef.current.feedbackThrottle) {
      return;
    }

    hapticFeedbackRef.current.lastFeedback = now;

    // iOS 触觉反馈
    if ('vibrate' in navigator) {
      const patterns = {
        light: [5],
        medium: [10],
        heavy: [15]
      };
      navigator.vibrate(patterns[type]);
    }

    // Web Vibration API
    if ('HapticFeedback' in window && (window as any).HapticFeedback) {
      try {
        (window as any).HapticFeedback[type]();
      } catch (error) {
        console.debug('Haptic feedback not supported');
      }
    }
  }, []);

  // 视觉反馈
  const addVisualFeedback = useCallback((element: HTMLElement, type: TouchGestureType) => {
    if (!element) return;

    // 添加CSS类来显示反馈
    const feedbackClass = `gesture-feedback-${type}`;
    element.classList.add('gesture-feedback', feedbackClass);

    // 清除反馈效果
    setTimeout(() => {
      element.classList.remove('gesture-feedback', feedbackClass);
    }, 200);

    // 长按特殊处理
    if (type === 'long-press') {
      element.classList.add('long-press-feedback');
      setTimeout(() => {
        element.classList.remove('long-press-feedback');
      }, 600);
    }
  }, []);

  // 创建手势事件
  const createGestureEvent = useCallback((
    type: TouchGestureType,
    target: HTMLElement,
    startPoint: TouchPoint,
    currentPoint: TouchPoint
  ): TouchGestureEvent => {
    const deltaX = currentPoint.x - startPoint.x;
    const deltaY = currentPoint.y - startPoint.y;
    const duration = currentPoint.timestamp - startPoint.timestamp;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = duration > 0 ? distance / duration : 0;

    // 从目标元素获取行和列信息
    const rowElement = target.closest('[data-row-id]') as HTMLElement;
    const cellElement = target.closest('[data-column-id]') as HTMLElement;

    return {
      type,
      target,
      rowId: rowElement?.dataset.rowId,
      columnId: cellElement?.dataset.columnId,
      startX: startPoint.x,
      startY: startPoint.y,
      currentX: currentPoint.x,
      currentY: currentPoint.y,
      deltaX,
      deltaY,
      duration,
      velocity
    };
  }, []);

  // 清理长按定时器
  const clearLongPressTimer = useCallback(() => {
    if (touchStateRef.current.longPressTimer) {
      clearTimeout(touchStateRef.current.longPressTimer);
      touchStateRef.current.longPressTimer = null;
    }
  }, []);

  // 重置触摸状态
  const resetTouchState = useCallback(() => {
    clearLongPressTimer();
    touchStateRef.current = {
      isTracking: false,
      startPoint: null,
      currentPoint: null,
      longPressTimer: null,
      longPressTriggered: false,
      touchId: null,
      target: null
    };
  }, [clearLongPressTimer]);

  // 判断是否为有效滑动
  const isValidSwipe = useCallback((
    startPoint: TouchPoint,
    endPoint: TouchPoint
  ): { isValid: boolean; direction: 'left' | 'right' | null } => {
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // 检查是否满足滑动条件
    if (absDeltaX < swipeThreshold || absDeltaY > swipeMaxVerticalOffset) {
      return { isValid: false, direction: null };
    }

    // 确定滑动方向
    const direction = deltaX > 0 ? 'right' : 'left';
    return { isValid: true, direction };
  }, [swipeThreshold, swipeMaxVerticalOffset]);

  // 处理触摸开始
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!enabled) return;

    const touch = event.touches[0];
    if (!touch) return;

    const target = event.target as HTMLElement;
    if (!target || !containerRef.current?.contains(target)) return;

    if (preventDefault) {
      event.preventDefault();
    }

    const point: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    touchStateRef.current = {
      isTracking: true,
      startPoint: point,
      currentPoint: point,
      longPressTimer: null,
      longPressTriggered: false,
      touchId: touch.identifier,
      target
    };

    // 设置长按定时器
    touchStateRef.current.longPressTimer = setTimeout(() => {
      if (!touchStateRef.current.isTracking || touchStateRef.current.longPressTriggered) {
        return;
      }

      touchStateRef.current.longPressTriggered = true;
      triggerHapticFeedback('medium');
      addVisualFeedback(target, 'long-press');

      if (onGesture && touchStateRef.current.startPoint) {
        const gestureEvent = createGestureEvent(
          'long-press',
          target,
          touchStateRef.current.startPoint,
          touchStateRef.current.currentPoint || touchStateRef.current.startPoint
        );
        onGesture(gestureEvent);
      }
    }, longPressDelay);

  }, [
    enabled,
    containerRef,
    preventDefault,
    longPressDelay,
    triggerHapticFeedback,
    addVisualFeedback,
    onGesture,
    createGestureEvent
  ]);

  // 处理触摸移动
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!enabled || !touchStateRef.current.isTracking) return;

    const touch = Array.from(event.touches).find(
      t => t.identifier === touchStateRef.current.touchId
    );
    if (!touch) return;

    if (preventDefault) {
      event.preventDefault();
    }

    const point: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    touchStateRef.current.currentPoint = point;

    // 检查是否超出了长按容忍范围
    if (!touchStateRef.current.longPressTriggered && touchStateRef.current.startPoint) {
      const deltaX = Math.abs(point.x - touchStateRef.current.startPoint.x);
      const deltaY = Math.abs(point.y - touchStateRef.current.startPoint.y);
      
      // 如果移动距离超过阈值，取消长按
      if (deltaX > 10 || deltaY > 10) {
        clearLongPressTimer();
      }
    }

    // 发送pan事件（如果需要）
    if (onGesture && touchStateRef.current.startPoint && touchStateRef.current.target) {
      const gestureEvent = createGestureEvent(
        'pan',
        touchStateRef.current.target,
        touchStateRef.current.startPoint,
        point
      );
      
      // 节流发送pan事件
      const now = Date.now();
      if (now - (touchStateRef.current.startPoint.timestamp || 0) > 16) { // ~60fps
        onGesture(gestureEvent);
      }
    }

  }, [
    enabled,
    preventDefault,
    clearLongPressTimer,
    onGesture,
    createGestureEvent
  ]);

  // 处理触摸结束
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!enabled || !touchStateRef.current.isTracking) return;

    const touch = Array.from(event.changedTouches).find(
      t => t.identifier === touchStateRef.current.touchId
    );
    if (!touch) return;

    if (preventDefault) {
      event.preventDefault();
    }

    const endPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    const { startPoint, target, longPressTriggered } = touchStateRef.current;

    if (!startPoint || !target) {
      resetTouchState();
      return;
    }

    // 如果已经触发了长按，不处理其他手势
    if (longPressTriggered) {
      resetTouchState();
      return;
    }

    // 检查滑动手势
    const swipeResult = isValidSwipe(startPoint, endPoint);
    if (swipeResult.isValid && swipeResult.direction && onGesture) {
      const gestureType: TouchGestureType = swipeResult.direction === 'left' ? 'swipe-left' : 'swipe-right';
      
      triggerHapticFeedback('light');
      addVisualFeedback(target, gestureType);
      
      const gestureEvent = createGestureEvent(gestureType, target, startPoint, endPoint);
      onGesture(gestureEvent);
    } else {
      // 普通点击手势
      const duration = endPoint.timestamp - startPoint.timestamp;
      const deltaX = Math.abs(endPoint.x - startPoint.x);
      const deltaY = Math.abs(endPoint.y - startPoint.y);
      
      // 检查是否为点击（移动距离小且时间短）
      if (duration < 300 && deltaX < 10 && deltaY < 10) {
        triggerHapticFeedback('light');
        addVisualFeedback(target, 'tap');
        
        if (onGesture) {
          const gestureEvent = createGestureEvent('tap', target, startPoint, endPoint);
          onGesture(gestureEvent);
        }
      }
    }

    resetTouchState();
  }, [
    enabled,
    preventDefault,
    resetTouchState,
    isValidSwipe,
    triggerHapticFeedback,
    addVisualFeedback,
    onGesture,
    createGestureEvent
  ]);

  // 处理触摸取消
  const handleTouchCancel = useCallback((event: TouchEvent) => {
    if (!enabled) return;
    resetTouchState();
  }, [enabled, resetTouchState]);

  // 绑定事件监听器
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;

    // 使用passive为false以支持preventDefault
    const options = { passive: false };

    container.addEventListener('touchstart', handleTouchStart, options);
    container.addEventListener('touchmove', handleTouchMove, options);
    container.addEventListener('touchend', handleTouchEnd, options);
    container.addEventListener('touchcancel', handleTouchCancel, options);

    // 清理函数
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
      resetTouchState();
    };
  }, [
    enabled,
    containerRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    resetTouchState
  ]);

  // 清理定时器
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  return {
    isTracking: touchStateRef.current.isTracking,
    currentGesture: touchStateRef.current.longPressTriggered ? 'long-press' as TouchGestureType : null,
    resetState: resetTouchState
  };
};