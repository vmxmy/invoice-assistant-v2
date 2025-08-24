/**
 * 通用触摸反馈 Hook
 * 集成涟漪效果、长按反馈和触觉反馈的统一接口
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { useMediaQuery } from './useMediaQuery';
import { hapticManager, HapticType, hapticPresets } from '../services/hapticFeedbackManager';

// 触摸反馈配置接口
export interface TouchFeedbackConfig {
  /** 是否启用涟漪效果 */
  ripple?: boolean;
  /** 涟漪颜色 */
  rippleColor?: string;
  /** 涟漪透明度 */
  rippleOpacity?: number;
  /** 涟漪大小倍数 */
  rippleScale?: number;
  /** 涟漪动画持续时间 */
  rippleDuration?: number;
  
  /** 是否启用长按检测 */
  longPress?: boolean;
  /** 长按阈值时间 */
  longPressThreshold?: number;
  /** 长按移动容忍距离 */
  longPressMoveTolerance?: number;
  /** 是否显示长按进度 */
  longPressProgress?: boolean;
  
  /** 是否启用触觉反馈 */
  haptic?: boolean;
  /** 点击触觉反馈类型 */
  hapticTap?: HapticType;
  /** 长按触觉反馈类型 */
  hapticLongPress?: HapticType;
  
  /** 是否禁用所有反馈 */
  disabled?: boolean;
  /** 是否只在移动端启用 */
  mobileOnly?: boolean;
}

// 触摸事件类型
export type TouchFeedbackEventType = 'tap' | 'longPress' | 'longPressStart' | 'longPressCancel';

// 事件处理器接口
export interface TouchFeedbackHandlers {
  onTap?: (event: React.MouseEvent | React.TouchEvent) => void;
  onLongPress?: (event?: React.MouseEvent | React.TouchEvent) => void;
  onLongPressStart?: () => void;
  onLongPressCancel?: () => void;
}

// 反馈状态接口
export interface TouchFeedbackState {
  /** 是否正在按下 */
  isPressed: boolean;
  /** 是否正在长按 */
  isLongPressing: boolean;
  /** 长按进度 (0-1) */
  longPressProgress: number;
  /** 是否已触发长按 */
  hasTriggeredLongPress: boolean;
}

// 默认配置
const DEFAULT_CONFIG: Required<TouchFeedbackConfig> = {
  ripple: true,
  rippleColor: 'currentColor',
  rippleOpacity: 0.3,
  rippleScale: 2.5,
  rippleDuration: 600,
  
  longPress: false,
  longPressThreshold: 500,
  longPressMoveTolerance: 10,
  longPressProgress: true,
  
  haptic: true,
  hapticTap: 'light',
  hapticLongPress: 'medium',
  
  disabled: false,
  mobileOnly: false,
};

// 涟漪状态接口
interface RippleState {
  id: number;
  x: number;
  y: number;
  size: number;
  timestamp: number;
}

let rippleIdCounter = 0;

// 涟漪对象池
class RipplePool {
  private static pool: RippleState[] = [];
  private static readonly MAX_POOL_SIZE = 20;

  static acquire(): RippleState {
    return this.pool.pop() || {
      id: 0,
      x: 0,
      y: 0,
      size: 0,
      timestamp: 0,
    };
  }

  static release(ripple: RippleState): void {
    if (this.pool.length < this.MAX_POOL_SIZE) {
      ripple.id = 0;
      ripple.x = 0;
      ripple.y = 0;
      ripple.size = 0;
      ripple.timestamp = 0;
      this.pool.push(ripple);
    }
  }
}

export function useTouchFeedback(
  config: TouchFeedbackConfig = {},
  handlers: TouchFeedbackHandlers = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const {
    ripple,
    rippleColor,
    rippleOpacity,
    rippleScale,
    rippleDuration,
    longPress,
    longPressThreshold,
    longPressMoveTolerance,
    longPressProgress,
    haptic,
    hapticTap,
    hapticLongPress,
    disabled,
    mobileOnly,
  } = finalConfig;

  const {
    onTap,
    onLongPress,
    onLongPressStart,
    onLongPressCancel,
  } = handlers;

  // 状态管理
  const [feedbackState, setFeedbackState] = useState<TouchFeedbackState>({
    isPressed: false,
    isLongPressing: false,
    longPressProgress: 0,
    hasTriggeredLongPress: false,
  });

  const [ripples, setRipples] = useState<RippleState[]>([]);

  // 设备检测
  const isMobile = useMediaQuery('(hover: none) and (pointer: coarse)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // 内部状态引用
  const stateRef = useRef({
    startTime: 0,
    startX: 0,
    startY: 0,
    animationId: 0,
    timeoutId: 0,
    element: null as HTMLElement | null,
  });

  // 检查是否应该启用反馈
  const shouldEnableFeedback = useCallback(() => {
    if (disabled) return false;
    if (mobileOnly && !isMobile) return false;
    return true;
  }, [disabled, mobileOnly, isMobile]);

  // 创建涟漪效果
  const createRipple = useCallback(
    (element: HTMLElement, clientX: number, clientY: number) => {
      if (!ripple || !shouldEnableFeedback() || prefersReducedMotion) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // 计算涟漪大小
      const sizeX = Math.max(Math.abs(rect.width - x), x) * 2;
      const sizeY = Math.max(Math.abs(rect.height - y), y) * 2;
      const size = Math.sqrt(sizeX * sizeX + sizeY * sizeY) * rippleScale;

      const newRipple = RipplePool.acquire();
      newRipple.id = ++rippleIdCounter;
      newRipple.x = x;
      newRipple.y = y;
      newRipple.size = size;
      newRipple.timestamp = Date.now();

      setRipples(prev => [...prev, newRipple]);

      // 清理涟漪
      setTimeout(() => {
        setRipples(prev => {
          const updated = prev.filter(r => r.id !== newRipple.id);
          const removed = prev.find(r => r.id === newRipple.id);
          if (removed) {
            RipplePool.release(removed);
          }
          return updated;
        });
      }, rippleDuration);
    },
    [ripple, shouldEnableFeedback, prefersReducedMotion, rippleScale, rippleDuration]
  );

  // 触觉反馈
  const triggerHapticFeedback = useCallback(
    (type: HapticType) => {
      if (!haptic || !shouldEnableFeedback()) return;
      hapticManager.trigger(type);
    },
    [haptic, shouldEnableFeedback]
  );

  // 清理状态
  const cleanup = useCallback(() => {
    if (stateRef.current.animationId) {
      cancelAnimationFrame(stateRef.current.animationId);
      stateRef.current.animationId = 0;
    }
    if (stateRef.current.timeoutId) {
      clearTimeout(stateRef.current.timeoutId);
      stateRef.current.timeoutId = 0;
    }

    setFeedbackState({
      isPressed: false,
      isLongPressing: false,
      longPressProgress: 0,
      hasTriggeredLongPress: false,
    });

    stateRef.current.startTime = 0;
    stateRef.current.startX = 0;
    stateRef.current.startY = 0;
    stateRef.current.element = null;
  }, []);

  // 开始触摸
  const startTouch = useCallback(
    (element: HTMLElement, clientX: number, clientY: number) => {
      if (!shouldEnableFeedback()) return;

      cleanup();

      const startTime = performance.now();
      stateRef.current.startTime = startTime;
      stateRef.current.startX = clientX;
      stateRef.current.startY = clientY;
      stateRef.current.element = element;

      setFeedbackState(prev => ({
        ...prev,
        isPressed: true,
        isLongPressing: longPress,
      }));

      // 创建涟漪效果
      createRipple(element, clientX, clientY);

      // 触觉反馈
      triggerHapticFeedback(hapticTap);

      // 长按检测
      if (longPress) {
        onLongPressStart?.();

        const animate = () => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / longPressThreshold, 1);

          setFeedbackState(prev => ({
            ...prev,
            longPressProgress: progress,
          }));

          if (progress >= 1) {
            // 长按成功
            setFeedbackState(prev => ({
              ...prev,
              hasTriggeredLongPress: true,
            }));

            triggerHapticFeedback(hapticLongPress);
            onLongPress?.();
            return;
          }

          stateRef.current.animationId = requestAnimationFrame(animate);
        };

        stateRef.current.animationId = requestAnimationFrame(animate);
      }
    },
    [
      shouldEnableFeedback,
      cleanup,
      longPress,
      longPressThreshold,
      createRipple,
      triggerHapticFeedback,
      hapticTap,
      hapticLongPress,
      onLongPressStart,
      onLongPress,
    ]
  );

  // 移动检测
  const checkMovement = useCallback(
    (clientX: number, clientY: number) => {
      if (!longPress || !feedbackState.isLongPressing) return false;

      const deltaX = Math.abs(clientX - stateRef.current.startX);
      const deltaY = Math.abs(clientY - stateRef.current.startY);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > longPressMoveTolerance) {
        onLongPressCancel?.();
        cleanup();
        return true;
      }

      return false;
    },
    [longPress, feedbackState.isLongPressing, longPressMoveTolerance, onLongPressCancel, cleanup]
  );

  // 结束触摸
  const endTouch = useCallback(
    (event?: React.MouseEvent | React.TouchEvent) => {
      if (!feedbackState.hasTriggeredLongPress && feedbackState.isPressed) {
        // 短按 - 触发点击事件
        onTap?.(event!);
      }
      cleanup();
    },
    [feedbackState.hasTriggeredLongPress, feedbackState.isPressed, onTap, cleanup]
  );

  // 取消触摸
  const cancelTouch = useCallback(() => {
    if (feedbackState.isLongPressing && !feedbackState.hasTriggeredLongPress) {
      onLongPressCancel?.();
    }
    cleanup();
  }, [feedbackState.isLongPressing, feedbackState.hasTriggeredLongPress, onLongPressCancel, cleanup]);

  // 事件处理器生成
  const getEventHandlers = useCallback(() => {
    if (!shouldEnableFeedback()) {
      return {
        onClick: onTap,
      };
    }

    const handlers: any = {};

    if (isMobile) {
      // 移动端事件
      handlers.onTouchStart = (event: React.TouchEvent) => {
        if (event.touches.length !== 1) return;
        const touch = event.touches[0];
        startTouch(event.currentTarget as HTMLElement, touch.clientX, touch.clientY);
      };

      handlers.onTouchMove = (event: React.TouchEvent) => {
        if (event.touches.length !== 1) return;
        const touch = event.touches[0];
        checkMovement(touch.clientX, touch.clientY);
      };

      handlers.onTouchEnd = (event: React.TouchEvent) => {
        endTouch(event);
      };

      handlers.onTouchCancel = () => {
        cancelTouch();
      };
    } else {
      // 桌面端事件
      handlers.onMouseDown = (event: React.MouseEvent) => {
        if (event.button !== 0) return; // 只处理左键
        startTouch(event.currentTarget as HTMLElement, event.clientX, event.clientY);
      };

      handlers.onMouseMove = (event: React.MouseEvent) => {
        checkMovement(event.clientX, event.clientY);
      };

      handlers.onMouseUp = (event: React.MouseEvent) => {
        endTouch(event);
      };

      handlers.onMouseLeave = () => {
        cancelTouch();
      };
    }

    // 键盘支持
    handlers.onKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        startTouch(event.currentTarget as HTMLElement, 0, 0);
      }
    };

    handlers.onKeyUp = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        endTouch();
      }
    };

    return handlers;
  }, [shouldEnableFeedback, isMobile, startTouch, checkMovement, endTouch, cancelTouch, onTap]);

  // 获取涟漪样式
  const getRippleElements = useCallback(() => {
    return ripples.map(ripple => ({
      key: ripple.id,
      style: {
        position: 'absolute' as const,
        left: ripple.x - ripple.size / 2,
        top: ripple.y - ripple.size / 2,
        width: ripple.size,
        height: ripple.size,
        borderRadius: '50%',
        backgroundColor: rippleColor,
        opacity: rippleOpacity,
        pointerEvents: 'none' as const,
        transform: 'scale(0)',
        animation: `ripple-expand ${rippleDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden' as const,
      },
    }));
  }, [ripples, rippleColor, rippleOpacity, rippleDuration]);

  // 获取长按进度样式
  const getLongPressProgressStyle = useCallback(() => {
    if (!longPressProgress || !feedbackState.isLongPressing || prefersReducedMotion) {
      return {};
    }

    const progress = feedbackState.longPressProgress * 100;
    return {
      background: `conic-gradient(rgb(var(--fallback-p)) ${progress}%, transparent ${progress}%)`,
      mask: 'radial-gradient(circle closest-side, transparent 98%, black 100%)',
      WebkitMask: 'radial-gradient(circle closest-side, transparent 98%, black 100%)',
    };
  }, [longPressProgress, feedbackState.isLongPressing, feedbackState.longPressProgress, prefersReducedMotion]);

  // 清理副作用
  useEffect(() => {
    return () => {
      cleanup();
      // 清理所有涟漪
      ripples.forEach(ripple => RipplePool.release(ripple));
    };
  }, [cleanup]);

  // 添加涟漪动画样式
  useEffect(() => {
    if (!ripple || prefersReducedMotion) return;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes ripple-expand {
        from {
          transform: scale(0);
          opacity: ${rippleOpacity};
        }
        to {
          transform: scale(1);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [ripple, rippleOpacity, prefersReducedMotion]);

  return {
    // 状态
    ...feedbackState,
    
    // 事件处理器
    ...getEventHandlers(),
    
    // 样式和元素
    rippleElements: getRippleElements(),
    longPressProgressStyle: getLongPressProgressStyle(),
    
    // 工具方法
    triggerHaptic: triggerHapticFeedback,
    reset: cleanup,
    
    // 配置信息
    config: finalConfig,
    isEnabled: shouldEnableFeedback(),
  };
}

// 预设配置
export const touchFeedbackPresets = {
  // 按钮
  button: {
    ripple: true,
    haptic: true,
    hapticTap: 'light' as HapticType,
  },
  
  // 长按按钮
  longPressButton: {
    ripple: true,
    longPress: true,
    longPressThreshold: 500,
    haptic: true,
    hapticTap: 'light' as HapticType,
    hapticLongPress: 'medium' as HapticType,
  },
  
  // 卡片
  card: {
    ripple: true,
    rippleOpacity: 0.1,
    haptic: true,
    hapticTap: 'light' as HapticType,
  },
  
  // 列表项
  listItem: {
    ripple: true,
    longPress: true,
    longPressThreshold: 600,
    haptic: true,
    hapticTap: 'selection' as HapticType,
    hapticLongPress: 'medium' as HapticType,
  },
  
  // 导航项
  navigation: {
    ripple: true,
    rippleOpacity: 0.2,
    haptic: true,
    hapticTap: 'selection' as HapticType,
  },
  
  // 禁用所有反馈
  disabled: {
    disabled: true,
  },
  
  // 仅移动端
  mobileOnly: {
    mobileOnly: true,
    ripple: true,
    haptic: true,
    hapticTap: 'light' as HapticType,
  },
} as const;

export default useTouchFeedback;