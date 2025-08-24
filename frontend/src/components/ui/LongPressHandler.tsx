/**
 * 长按处理组件
 * 提供渐进式视觉反馈和触觉反馈的长按交互
 */

import React, { 
  useCallback, 
  useRef, 
  useState, 
  useEffect,
  ReactNode,
  MouseEvent,
  TouchEvent,
} from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

// 长按配置接口
interface LongPressConfig {
  /** 长按阈值时间(ms) */
  threshold?: number;
  /** 是否启用触觉反馈 */
  hapticFeedback?: boolean;
  /** 是否显示视觉进度指示器 */
  showProgress?: boolean;
  /** 进度指示器样式 */
  progressStyle?: 'ring' | 'fill' | 'pulse';
  /** 是否禁用长按 */
  disabled?: boolean;
  /** 长按开始回调 */
  onLongPressStart?: () => void;
  /** 长按进度回调 */
  onLongPressProgress?: (progress: number) => void;
  /** 长按成功回调 */
  onLongPressSuccess?: () => void;
  /** 长按取消回调 */
  onLongPressCancel?: () => void;
  /** 移动容忍距离(px) */
  moveTolerance?: number;
}

interface LongPressHandlerProps extends LongPressConfig {
  /** 子组件 */
  children: ReactNode;
  /** 额外CSS类名 */
  className?: string;
  /** 点击事件处理 */
  onClick?: (event: MouseEvent | TouchEvent) => void;
}

// 默认配置
const DEFAULT_CONFIG: Required<Omit<LongPressConfig, 'onLongPressStart' | 'onLongPressProgress' | 'onLongPressSuccess' | 'onLongPressCancel'>> = {
  threshold: 500,
  hapticFeedback: true,
  showProgress: true,
  progressStyle: 'ring',
  disabled: false,
  moveTolerance: 10,
};

// 触觉反馈管理
class HapticManager {
  private static lastFeedback = 0;
  private static feedbackThrottle = 50;

  static trigger(type: 'start' | 'success' | 'cancel' = 'start'): void {
    const now = Date.now();
    if (now - this.lastFeedback < this.feedbackThrottle) {
      return;
    }
    this.lastFeedback = now;

    const patterns = {
      start: [10],
      success: [10, 50, 20],
      cancel: [5],
    };

    // Vibration API
    if ('vibrate' in navigator) {
      navigator.vibrate(patterns[type]);
    }

    // iOS 触觉反馈
    if ('HapticFeedback' in window) {
      try {
        const feedbackTypes = {
          start: 'impactLight',
          success: 'impactMedium',
          cancel: 'impactLight',
        };
        (window as any).HapticFeedback?.[feedbackTypes[type]]?.();
      } catch (error) {
        console.debug('Haptic feedback not supported');
      }
    }
  }
}

// 动画帧管理器
class AnimationManager {
  private static activeAnimations = new Set<number>();

  static start(callback: FrameRequestCallback): number {
    const id = requestAnimationFrame(callback);
    this.activeAnimations.add(id);
    return id;
  }

  static cancel(id: number): void {
    cancelAnimationFrame(id);
    this.activeAnimations.delete(id);
  }

  static cancelAll(): void {
    this.activeAnimations.forEach(id => {
      cancelAnimationFrame(id);
    });
    this.activeAnimations.clear();
  }
}

export const LongPressHandler: React.FC<LongPressHandlerProps> = ({
  children,
  className = '',
  onClick,
  threshold = DEFAULT_CONFIG.threshold,
  hapticFeedback = DEFAULT_CONFIG.hapticFeedback,
  showProgress = DEFAULT_CONFIG.showProgress,
  progressStyle = DEFAULT_CONFIG.progressStyle,
  disabled = DEFAULT_CONFIG.disabled,
  onLongPressStart,
  onLongPressProgress,
  onLongPressSuccess,
  onLongPressCancel,
  moveTolerance = DEFAULT_CONFIG.moveTolerance,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLongPressActive, setIsLongPressActive] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pressStateRef = useRef({
    startTime: 0,
    startX: 0,
    startY: 0,
    animationId: 0,
    isPressed: false,
    hasTriggered: false,
  });

  const isMobile = useMediaQuery('(hover: none) and (pointer: coarse)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // 清理所有状态
  const cleanup = useCallback(() => {
    if (pressStateRef.current.animationId) {
      AnimationManager.cancel(pressStateRef.current.animationId);
    }
    
    setIsPressed(false);
    setProgress(0);
    setIsLongPressActive(false);
    
    pressStateRef.current = {
      startTime: 0,
      startX: 0,
      startY: 0,
      animationId: 0,
      isPressed: false,
      hasTriggered: false,
    };
  }, []);

  // 开始长按检测
  const startLongPress = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;

      cleanup();

      const startTime = performance.now();
      pressStateRef.current = {
        startTime,
        startX: clientX,
        startY: clientY,
        animationId: 0,
        isPressed: true,
        hasTriggered: false,
      };

      setIsPressed(true);
      setIsLongPressActive(true);
      onLongPressStart?.();

      if (hapticFeedback) {
        HapticManager.trigger('start');
      }

      // 启动进度动画
      const animate = () => {
        if (!pressStateRef.current.isPressed) return;

        const elapsed = performance.now() - startTime;
        const currentProgress = Math.min(elapsed / threshold, 1);
        
        setProgress(currentProgress);
        onLongPressProgress?.(currentProgress);

        if (currentProgress >= 1 && !pressStateRef.current.hasTriggered) {
          // 长按成功
          pressStateRef.current.hasTriggered = true;
          
          if (hapticFeedback) {
            HapticManager.trigger('success');
          }
          
          onLongPressSuccess?.();
          cleanup();
          return;
        }

        if (currentProgress < 1) {
          pressStateRef.current.animationId = AnimationManager.start(animate);
        }
      };

      pressStateRef.current.animationId = AnimationManager.start(animate);
    },
    [disabled, threshold, hapticFeedback, onLongPressStart, onLongPressProgress, onLongPressSuccess, cleanup]
  );

  // 取消长按
  const cancelLongPress = useCallback(
    (reason: 'movement' | 'release' | 'cancel' = 'cancel') => {
      if (!pressStateRef.current.isPressed || pressStateRef.current.hasTriggered) {
        return;
      }

      if (hapticFeedback && reason === 'movement') {
        HapticManager.trigger('cancel');
      }

      onLongPressCancel?.();
      cleanup();
    },
    [hapticFeedback, onLongPressCancel, cleanup]
  );

  // 检查移动距离
  const checkMovement = useCallback(
    (clientX: number, clientY: number) => {
      if (!pressStateRef.current.isPressed) return false;

      const deltaX = Math.abs(clientX - pressStateRef.current.startX);
      const deltaY = Math.abs(clientY - pressStateRef.current.startY);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > moveTolerance) {
        cancelLongPress('movement');
        return true;
      }
      return false;
    },
    [moveTolerance, cancelLongPress]
  );

  // 鼠标事件处理
  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (event.button !== 0) return; // 只处理左键
      startLongPress(event.clientX, event.clientY);
    },
    [startLongPress]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      checkMovement(event.clientX, event.clientY);
    },
    [checkMovement]
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (!pressStateRef.current.hasTriggered && pressStateRef.current.isPressed) {
        // 短按 - 触发普通点击
        onClick?.(event);
      }
      cancelLongPress('release');
    },
    [onClick, cancelLongPress]
  );

  // 触摸事件处理
  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      startLongPress(touch.clientX, touch.clientY);
    },
    [startLongPress]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      checkMovement(touch.clientX, touch.clientY);
    },
    [checkMovement]
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (!pressStateRef.current.hasTriggered && pressStateRef.current.isPressed) {
        // 短按 - 触发普通点击
        onClick?.(event);
      }
      cancelLongPress('release');
    },
    [onClick, cancelLongPress]
  );

  // 键盘支持
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        startLongPress(0, 0); // 键盘操作不需要坐标
      }
    },
    [startLongPress]
  );

  const handleKeyUp = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!pressStateRef.current.hasTriggered && pressStateRef.current.isPressed) {
          onClick?.(event as any);
        }
        cancelLongPress('release');
      }
    },
    [onClick, cancelLongPress]
  );

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup();
      AnimationManager.cancelAll();
    };
  }, [cleanup]);

  // 进度指示器样式
  const getProgressStyle = () => {
    if (!showProgress || prefersReducedMotion || progress === 0) {
      return {};
    }

    const progressValue = progress * 100;

    switch (progressStyle) {
      case 'ring':
        return {
          background: `conic-gradient(rgb(var(--fallback-p)) ${progressValue}%, transparent ${progressValue}%)`,
        };
      case 'fill':
        return {
          background: `linear-gradient(to right, rgb(var(--fallback-p) / 0.2) ${progressValue}%, transparent ${progressValue}%)`,
        };
      case 'pulse':
        return {
          transform: `scale(${1 + progress * 0.05})`,
          opacity: 0.8 + progress * 0.2,
        };
      default:
        return {};
    }
  };

  const containerClasses = [
    'relative select-none',
    isLongPressActive && showProgress ? 'overflow-hidden' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      onMouseDown={!isMobile ? handleMouseDown : undefined}
      onMouseMove={!isMobile && isPressed ? handleMouseMove : undefined}
      onMouseUp={!isMobile ? handleMouseUp : undefined}
      onMouseLeave={!isMobile ? () => cancelLongPress('cancel') : undefined}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchMove={isMobile && isPressed ? handleTouchMove : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
      onTouchCancel={isMobile ? () => cancelLongPress('cancel') : undefined}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      tabIndex={onClick || onLongPressSuccess ? 0 : undefined}
      role={onClick || onLongPressSuccess ? 'button' : undefined}
      aria-pressed={isPressed}
      style={{
        ...getProgressStyle(),
        transition: !prefersReducedMotion ? 'all 0.1s ease-out' : 'none',
        willChange: isLongPressActive ? 'transform, opacity, background' : 'auto',
      }}
    >
      {children}

      {/* 进度环指示器 */}
      {showProgress && progressStyle === 'ring' && isLongPressActive && !prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-[-2px] rounded-full border-2 border-transparent"
            style={{
              background: `conic-gradient(rgb(var(--fallback-p)) ${progress * 100}%, transparent ${progress * 100}%)`,
              mask: 'radial-gradient(circle closest-side, transparent 98%, black 100%)',
              WebkitMask: 'radial-gradient(circle closest-side, transparent 98%, black 100%)',
            }}
          />
        </div>
      )}

      {/* 脉冲效果 */}
      {isPressed && !prefersReducedMotion && (
        <div
          className="absolute inset-0 pointer-events-none rounded-inherit"
          style={{
            background: 'rgb(var(--fallback-p) / 0.1)',
            animation: 'pulse 2s infinite',
          }}
        />
      )}
    </div>
  );
};

// 便捷的长按按钮组件
interface LongPressButtonProps extends LongPressHandlerProps {
  /** 按钮变体 */
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  /** 按钮大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 长按提示文本 */
  longPressHint?: string;
}

export const LongPressButton: React.FC<LongPressButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  longPressHint,
  ...longPressProps
}) => {
  const baseClasses = 'btn focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variantClasses = {
    primary: 'btn-primary focus:ring-primary/50',
    secondary: 'btn-secondary focus:ring-secondary/50',
    ghost: 'btn-ghost focus:ring-base-content/20',
    outline: 'btn-outline focus:ring-primary/50',
  };
  const sizeClasses = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
  };

  return (
    <LongPressHandler
      {...longPressProps}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      <div className="flex items-center gap-2">
        {children}
        {longPressHint && (
          <span className="text-xs opacity-70">
            {longPressHint}
          </span>
        )}
      </div>
    </LongPressHandler>
  );
};

export default LongPressHandler;