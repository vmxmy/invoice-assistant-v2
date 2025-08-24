import { useCallback, useRef, useState, useEffect } from 'react';
import { useGestures } from './useGestures';

// 增强的手势处理器接口
interface EnhancedGestureHandlers {
  // 滑动手势
  onSwipeLeft?: (velocity: number, distance: number) => void;
  onSwipeRight?: (velocity: number, distance: number) => void;
  onSwipeUp?: (velocity: number, distance: number) => void;
  onSwipeDown?: (velocity: number, distance: number) => void;
  
  // 点击手势
  onTap?: (position: { x: number; y: number }) => void;
  onDoubleTap?: (position: { x: number; y: number }) => void;
  onLongPress?: (position: { x: number; y: number }) => void;
  
  // 缩放手势
  onPinchStart?: (scale: number, center: { x: number; y: number }) => void;
  onPinch?: (scale: number, center: { x: number; y: number }, velocity: number) => void;
  onPinchEnd?: (scale: number, center: { x: number; y: number }, velocity: number) => void;
  
  // 拖拽手势
  onDragStart?: (position: { x: number; y: number }) => void;
  onDrag?: (position: { x: number; y: number }, delta: { x: number; y: number }) => void;
  onDragEnd?: (position: { x: number; y: number }, velocity: { x: number; y: number }) => void;
  
  // 复杂手势
  onRotateStart?: (angle: number, center: { x: number; y: number }) => void;
  onRotate?: (angle: number, center: { x: number; y: number }) => void;
  onRotateEnd?: (angle: number, center: { x: number; y: number }) => void;
}

// 增强的配置选项
interface EnhancedGestureOptions {
  // 基础配置
  swipeThreshold?: number;
  swipeVelocityThreshold?: number;
  longPressDelay?: number;
  tapTimeout?: number;
  doubleTapTimeout?: number;
  
  // 缩放配置
  enablePinch?: boolean;
  pinchThreshold?: number;
  minScale?: number;
  maxScale?: number;
  
  // 拖拽配置
  enableDrag?: boolean;
  dragThreshold?: number;
  
  // 旋转配置
  enableRotation?: boolean;
  rotationThreshold?: number;
  
  // 冲突处理
  preventScroll?: boolean;
  gestureConflictStrategy?: 'first-wins' | 'priority' | 'hybrid';
  gesturePriority?: Array<'swipe' | 'tap' | 'pinch' | 'drag' | 'rotate'>;
  
  // 性能配置
  enableRAF?: boolean;
  throttleMs?: number;
  enableHaptics?: boolean;
  hapticIntensity?: 'light' | 'medium' | 'heavy';
  
  // 辅助功能
  enableAccessibility?: boolean;
  accessibilityAnnouncements?: boolean;
}

// 手势状态接口
interface GestureState {
  activeGestures: Set<string>;
  isGestureActive: boolean;
  currentScale: number;
  currentRotation: number;
  currentPosition: { x: number; y: number };
  velocity: { x: number; y: number; scale: number; rotation: number };
  gestureStartTime: number;
  lastEventTime: number;
}

// 触摸点跟踪
interface TouchPoint {
  id: number;
  x: number;
  y: number;
  time: number;
  startX: number;
  startY: number;
}

export const useEnhancedGestures = (
  handlers: EnhancedGestureHandlers,
  options: EnhancedGestureOptions = {}
) => {
  const {
    swipeThreshold = 50,
    swipeVelocityThreshold = 0.5,
    longPressDelay = 500,
    tapTimeout = 300,
    doubleTapTimeout = 300,
    enablePinch = false,
    pinchThreshold = 10,
    minScale = 0.5,
    maxScale = 3,
    enableDrag = false,
    dragThreshold = 10,
    enableRotation = false,
    rotationThreshold = 10,
    preventScroll = false,
    gestureConflictStrategy = 'priority',
    gesturePriority = ['pinch', 'rotate', 'drag', 'swipe', 'tap'],
    enableRAF = true,
    throttleMs = 16,
    enableHaptics = true,
    hapticIntensity = 'light',
    enableAccessibility = true,
    accessibilityAnnouncements = false,
  } = options;

  // 状态管理
  const [gestureState, setGestureState] = useState<GestureState>({
    activeGestures: new Set(),
    isGestureActive: false,
    currentScale: 1,
    currentRotation: 0,
    currentPosition: { x: 0, y: 0 },
    velocity: { x: 0, y: 0, scale: 0, rotation: 0 },
    gestureStartTime: 0,
    lastEventTime: 0,
  });

  // 引用和定时器
  const touchesRef = useRef<Map<number, TouchPoint>>(new Map());
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastThrottleTimeRef = useRef<number>(0);
  const velocityHistoryRef = useRef<Array<{ time: number; x: number; y: number }>>([]);

  // 工具函数
  const getDistance = useCallback((p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getCenter = useCallback((touches: TouchPoint[]): { x: number; y: number } => {
    if (touches.length === 0) return { x: 0, y: 0 };
    
    const sum = touches.reduce(
      (acc, touch) => ({ x: acc.x + touch.x, y: acc.y + touch.y }),
      { x: 0, y: 0 }
    );
    
    return { x: sum.x / touches.length, y: sum.y / touches.length };
  }, []);

  const getAngle = useCallback((p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
  }, []);

  const calculateVelocity = useCallback((current: { x: number; y: number }, time: number) => {
    const history = velocityHistoryRef.current;
    history.push({ time, x: current.x, y: current.y });
    
    // 保持最近100ms的历史记录
    const cutoffTime = time - 100;
    while (history.length > 0 && history[0].time < cutoffTime) {
      history.shift();
    }
    
    if (history.length < 2) return { x: 0, y: 0 };
    
    const oldest = history[0];
    const newest = history[history.length - 1];
    const dt = newest.time - oldest.time;
    
    if (dt === 0) return { x: 0, y: 0 };
    
    return {
      x: (newest.x - oldest.x) / dt,
      y: (newest.y - oldest.y) / dt,
    };
  }, []);

  // 触觉反馈
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = hapticIntensity) => {
    if (!enableHaptics) return;
    
    try {
      if ('vibrate' in navigator) {
        const durations = { light: 10, medium: 20, heavy: 50 };
        navigator.vibrate(durations[type]);
      }
      
      // iOS 触觉反馈 API (如果可用)
      if ('hapticFeedback' in window) {
        const impact = (window as any).hapticFeedback?.impactOccurred;
        if (impact) {
          const intensities = { light: 0, medium: 1, heavy: 2 };
          impact(intensities[type]);
        }
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [enableHaptics, hapticIntensity]);

  // 无障碍功能
  const announceGesture = useCallback((gesture: string, details?: string) => {
    if (!enableAccessibility || !accessibilityAnnouncements) return;
    
    try {
      const message = details ? `${gesture}: ${details}` : gesture;
      
      // 创建临时的 aria-live 区域
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.style.position = 'absolute';
      announcement.style.left = '-10000px';
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);
    } catch (error) {
      console.warn('Accessibility announcement failed:', error);
    }
  }, [enableAccessibility, accessibilityAnnouncements]);

  // 手势冲突解决
  const resolveGestureConflict = useCallback((newGesture: string): boolean => {
    const { activeGestures } = gestureState;
    
    switch (gestureConflictStrategy) {
      case 'first-wins':
        return activeGestures.size === 0;
      
      case 'priority':
        const currentPriorities = Array.from(activeGestures)
          .map(gesture => gesturePriority.indexOf(gesture))
          .filter(priority => priority !== -1);
        
        const newPriority = gesturePriority.indexOf(newGesture);
        
        return newPriority !== -1 && (
          currentPriorities.length === 0 ||
          newPriority <= Math.min(...currentPriorities)
        );
      
      case 'hybrid':
        // 允许兼容的手势组合
        const compatibleCombinations = [
          ['pinch', 'rotate'],
          ['drag', 'tap'],
        ];
        
        for (const combination of compatibleCombinations) {
          if (combination.includes(newGesture) && 
              Array.from(activeGestures).every(gesture => combination.includes(gesture))) {
            return true;
          }
        }
        
        return activeGestures.size === 0;
      
      default:
        return true;
    }
  }, [gestureState, gestureConflictStrategy, gesturePriority]);

  // 节流处理
  const throttledUpdate = useCallback((callback: () => void) => {
    const now = Date.now();
    
    if (now - lastThrottleTimeRef.current >= throttleMs) {
      lastThrottleTimeRef.current = now;
      
      if (enableRAF) {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
        }
        rafIdRef.current = requestAnimationFrame(callback);
      } else {
        callback();
      }
    }
  }, [throttleMs, enableRAF]);

  // 触摸开始处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    const touches = Array.from(e.touches);
    
    // 更新触摸点跟踪
    touchesRef.current.clear();
    touches.forEach(touch => {
      touchesRef.current.set(touch.identifier, {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        time: now,
        startX: touch.clientX,
        startY: touch.clientY,
      });
    });

    // 重置速度历史
    velocityHistoryRef.current = [];

    const touchArray = Array.from(touchesRef.current.values());
    const center = getCenter(touchArray);

    setGestureState(prev => ({
      ...prev,
      gestureStartTime: now,
      lastEventTime: now,
      currentPosition: center,
      isGestureActive: true,
    }));

    // 单点触摸 - 设置长按定时器
    if (touches.length === 1 && handlers.onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        const touch = touchArray[0];
        handlers.onLongPress?.({ x: touch.x, y: touch.y });
        triggerHapticFeedback('medium');
        announceGesture('Long press detected');
      }, longPressDelay);
    }

    // 多点触摸 - 初始化复杂手势
    if (touches.length === 2) {
      const [touch1, touch2] = touchArray;
      const initialDistance = getDistance(touch1, touch2);
      const initialAngle = getAngle(touch1, touch2);

      setGestureState(prev => ({
        ...prev,
        currentScale: 1,
        currentRotation: 0,
      }));

      if (enablePinch && handlers.onPinchStart) {
        handlers.onPinchStart(1, center);
      }

      if (enableRotation && handlers.onRotateStart) {
        handlers.onRotateStart(0, center);
      }
    }
  }, [
    handlers.onLongPress,
    handlers.onPinchStart,
    handlers.onRotateStart,
    longPressDelay,
    enablePinch,
    enableRotation,
    getCenter,
    getDistance,
    getAngle,
    triggerHapticFeedback,
    announceGesture,
  ]);

  // 触摸移动处理
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    const touches = Array.from(e.touches);
    
    // 更新触摸点
    touches.forEach(touch => {
      const existing = touchesRef.current.get(touch.identifier);
      if (existing) {
        touchesRef.current.set(touch.identifier, {
          ...existing,
          x: touch.clientX,
          y: touch.clientY,
          time: now,
        });
      }
    });

    const touchArray = Array.from(touchesRef.current.values());
    const center = getCenter(touchArray);
    const velocity = calculateVelocity(center, now);

    // 清除长按定时器（移动时取消长按）
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    throttledUpdate(() => {
      if (touches.length === 1) {
        // 单点手势处理
        const touch = touchArray[0];
        const deltaX = touch.x - touch.startX;
        const deltaY = touch.y - touch.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // 拖拽手势
        if (enableDrag && distance > dragThreshold && handlers.onDrag) {
          if (resolveGestureConflict('drag')) {
            setGestureState(prev => ({
              ...prev,
              activeGestures: new Set([...prev.activeGestures, 'drag']),
              currentPosition: center,
              velocity: { ...prev.velocity, x: velocity.x, y: velocity.y },
            }));

            handlers.onDrag(center, { x: deltaX, y: deltaY });
            
            if (preventScroll) {
              e.preventDefault();
            }
          }
        }
      } else if (touches.length === 2) {
        // 双点手势处理
        const [touch1, touch2] = touchArray;
        const currentDistance = getDistance(touch1, touch2);
        const currentAngle = getAngle(touch1, touch2);

        // 获取初始状态
        const initialTouches = [touch1, touch2].map(t => ({
          x: t.startX, y: t.startY
        }));
        const initialDistance = getDistance(initialTouches[0], initialTouches[1]);
        const initialAngle = getAngle(initialTouches[0], initialTouches[1]);

        // 缩放手势
        if (enablePinch && Math.abs(currentDistance - initialDistance) > pinchThreshold) {
          const scale = Math.max(minScale, Math.min(maxScale, currentDistance / initialDistance));
          
          if (resolveGestureConflict('pinch') && handlers.onPinch) {
            setGestureState(prev => ({
              ...prev,
              activeGestures: new Set([...prev.activeGestures, 'pinch']),
              currentScale: scale,
              velocity: { ...prev.velocity, scale: (scale - prev.currentScale) / (now - prev.lastEventTime) },
            }));

            handlers.onPinch(scale, center, velocity.x);
            triggerHapticFeedback('light');
          }
        }

        // 旋转手势
        if (enableRotation) {
          const angleDelta = currentAngle - initialAngle;
          
          if (Math.abs(angleDelta) > rotationThreshold && resolveGestureConflict('rotate') && handlers.onRotate) {
            setGestureState(prev => ({
              ...prev,
              activeGestures: new Set([...prev.activeGestures, 'rotate']),
              currentRotation: angleDelta,
              velocity: { ...prev.velocity, rotation: angleDelta / (now - prev.gestureStartTime) },
            }));

            handlers.onRotate(angleDelta, center);
          }
        }

        if (preventScroll) {
          e.preventDefault();
        }
      }

      setGestureState(prev => ({
        ...prev,
        lastEventTime: now,
        currentPosition: center,
      }));
    });
  }, [
    enableDrag,
    enablePinch,
    enableRotation,
    dragThreshold,
    pinchThreshold,
    rotationThreshold,
    minScale,
    maxScale,
    preventScroll,
    handlers.onDrag,
    handlers.onPinch,
    handlers.onRotate,
    getCenter,
    getDistance,
    getAngle,
    calculateVelocity,
    resolveGestureConflict,
    triggerHapticFeedback,
    throttledUpdate,
  ]);

  // 触摸结束处理
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    const remainingTouches = Array.from(e.touches);
    
    // 清除长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // 获取当前状态
    const touchArray = Array.from(touchesRef.current.values());
    const { activeGestures, gestureStartTime, currentPosition, velocity } = gestureState;

    if (remainingTouches.length === 0) {
      // 所有触摸结束
      if (touchArray.length === 1) {
        const touch = touchArray[0];
        const deltaX = touch.x - touch.startX;
        const deltaY = touch.y - touch.startY;
        const deltaTime = now - touch.time;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const speed = distance / deltaTime;

        // 判断手势类型
        if (activeGestures.has('drag') && handlers.onDragEnd) {
          handlers.onDragEnd(currentPosition, velocity);
          announceGesture('Drag ended');
        } else if (distance > swipeThreshold && speed > swipeVelocityThreshold) {
          // 滑动手势
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);

          if (absX > absY) {
            if (deltaX > 0) {
              handlers.onSwipeRight?.(speed, distance);
              announceGesture('Swiped right');
            } else {
              handlers.onSwipeLeft?.(speed, distance);
              announceGesture('Swiped left');
            }
          } else {
            if (deltaY > 0) {
              handlers.onSwipeDown?.(speed, distance);
              announceGesture('Swiped down');
            } else {
              handlers.onSwipeUp?.(speed, distance);
              announceGesture('Swiped up');
            }
          }
          
          triggerHapticFeedback();
        } else if (distance < 10 && deltaTime < tapTimeout) {
          // 点击手势
          const timeSinceLastTap = now - gestureState.lastEventTime;
          
          if (timeSinceLastTap < doubleTapTimeout) {
            handlers.onDoubleTap?.({ x: touch.x, y: touch.y });
            announceGesture('Double tap');
          } else {
            setTimeout(() => {
              handlers.onTap?.({ x: touch.x, y: touch.y });
              announceGesture('Tap');
            }, doubleTapTimeout);
          }
          
          triggerHapticFeedback('light');
        }
      } else if (touchArray.length === 2) {
        // 双点手势结束
        if (activeGestures.has('pinch') && handlers.onPinchEnd) {
          handlers.onPinchEnd(gestureState.currentScale, currentPosition, velocity.scale);
          announceGesture('Pinch ended', `Scale: ${gestureState.currentScale.toFixed(2)}`);
        }

        if (activeGestures.has('rotate') && handlers.onRotateEnd) {
          handlers.onRotateEnd(gestureState.currentRotation, currentPosition);
          announceGesture('Rotation ended', `Angle: ${gestureState.currentRotation.toFixed(1)}°`);
        }
      }

      // 重置状态
      setGestureState(prev => ({
        ...prev,
        activeGestures: new Set(),
        isGestureActive: false,
        currentScale: 1,
        currentRotation: 0,
        velocity: { x: 0, y: 0, scale: 0, rotation: 0 },
      }));
      
      touchesRef.current.clear();
      velocityHistoryRef.current = [];
    } else {
      // 部分触摸结束，更新剩余触摸点
      const newTouches = new Map<number, TouchPoint>();
      remainingTouches.forEach(touch => {
        const existing = touchesRef.current.get(touch.identifier);
        if (existing) {
          newTouches.set(touch.identifier, existing);
        }
      });
      touchesRef.current = newTouches;
    }
  }, [
    gestureState,
    swipeThreshold,
    swipeVelocityThreshold,
    tapTimeout,
    doubleTapTimeout,
    handlers.onDragEnd,
    handlers.onSwipeLeft,
    handlers.onSwipeRight,
    handlers.onSwipeUp,
    handlers.onSwipeDown,
    handlers.onTap,
    handlers.onDoubleTap,
    handlers.onPinchEnd,
    handlers.onRotateEnd,
    triggerHapticFeedback,
    announceGesture,
  ]);

  // 触摸取消处理
  const handleTouchCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    setGestureState(prev => ({
      ...prev,
      activeGestures: new Set(),
      isGestureActive: false,
      currentScale: 1,
      currentRotation: 0,
      velocity: { x: 0, y: 0, scale: 0, rotation: 0 },
    }));

    touchesRef.current.clear();
    velocityHistoryRef.current = [];
  }, []);

  // 清理副作用
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
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
      activeGestures: Array.from(gestureState.activeGestures),
      isGestureActive: gestureState.isGestureActive,
      currentScale: gestureState.currentScale,
      currentRotation: gestureState.currentRotation,
      currentPosition: gestureState.currentPosition,
      velocity: gestureState.velocity,
    },
    utils: {
      triggerHapticFeedback,
      announceGesture,
    },
  };
};

export default useEnhancedGestures;