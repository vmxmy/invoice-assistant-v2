/**
 * 涟漪效果组件
 * Material Design 标准的涟漪动画，支持 GPU 硬件加速
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

// 涟漪配置接口
interface RippleConfig {
  /** 涟漪颜色 */
  color?: string;
  /** 涟漪大小倍数 */
  scale?: number;
  /** 动画持续时间(ms) */
  duration?: number;
  /** 是否禁用涟漪效果 */
  disabled?: boolean;
  /** 是否居中显示（忽略点击位置） */
  centered?: boolean;
  /** 涟漪透明度 */
  opacity?: number;
}

// 涟漪状态接口
interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  scale: number;
  duration: number;
}

// 组件Props
interface RippleEffectProps extends RippleConfig {
  /** 子组件 */
  children: React.ReactNode;
  /** 额外的CSS类名 */
  className?: string;
  /** 点击事件处理 */
  onClick?: (event: React.MouseEvent | React.TouchEvent) => void;
  /** 是否禁用指针事件 */
  disablePointerEvents?: boolean;
  /** 涟漪容器元素类型 */
  component?: keyof JSX.IntrinsicElements;
  /** 涟漪边界裁剪 */
  clipBounds?: boolean;
}

// 默认配置
const DEFAULT_CONFIG: Required<RippleConfig> = {
  color: 'currentColor',
  scale: 2.5,
  duration: 600,
  disabled: false,
  centered: false,
  opacity: 0.3,
};

// 涟漪ID计数器
let rippleId = 0;

// 对象池 - 复用涟漪对象以减少垃圾回收
class RipplePool {
  private static pool: Ripple[] = [];
  private static maxPoolSize = 50;

  static acquire(): Ripple {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return {} as Ripple;
  }

  static release(ripple: Ripple): void {
    if (this.pool.length < this.maxPoolSize) {
      // 重置对象属性
      ripple.id = 0;
      ripple.x = 0;
      ripple.y = 0;
      ripple.size = 0;
      ripple.color = '';
      ripple.opacity = 0;
      ripple.scale = 0;
      ripple.duration = 0;
      this.pool.push(ripple);
    }
  }
}

export const RippleEffect: React.FC<RippleEffectProps> = ({
  children,
  className = '',
  onClick,
  disablePointerEvents = false,
  component: Component = 'div',
  clipBounds = true,
  color = DEFAULT_CONFIG.color,
  scale = DEFAULT_CONFIG.scale,
  duration = DEFAULT_CONFIG.duration,
  disabled = DEFAULT_CONFIG.disabled,
  centered = DEFAULT_CONFIG.centered,
  opacity = DEFAULT_CONFIG.opacity,
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const containerRef = useRef<HTMLElement>(null);
  const isMobile = useMediaQuery('(hover: none) and (pointer: coarse)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // 获取涟漪起始位置和大小
  const getRippleData = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      const container = containerRef.current;
      if (!container) return null;

      const rect = container.getBoundingClientRect();
      let clientX: number, clientY: number;

      // 处理触摸和鼠标事件
      if ('touches' in event && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else if ('clientX' in event) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else {
        return null;
      }

      const x = centered ? rect.width / 2 : clientX - rect.left;
      const y = centered ? rect.height / 2 : clientY - rect.top;

      // 计算涟漪半径 - 确保覆盖整个容器
      const sizeX = Math.max(Math.abs(rect.width - x), x) * 2;
      const sizeY = Math.max(Math.abs(rect.height - y), y) * 2;
      const size = Math.sqrt(sizeX * sizeX + sizeY * sizeY) * scale;

      return { x, y, size };
    },
    [centered, scale]
  );

  // 创建涟漪
  const createRipple = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (disabled || prefersReducedMotion) return;

      const rippleData = getRippleData(event);
      if (!rippleData) return;

      const ripple = RipplePool.acquire();
      ripple.id = ++rippleId;
      ripple.x = rippleData.x;
      ripple.y = rippleData.y;
      ripple.size = rippleData.size;
      ripple.color = color;
      ripple.opacity = opacity;
      ripple.scale = 0;
      ripple.duration = duration;

      setRipples(prev => [...prev, ripple]);

      // 启动动画
      requestAnimationFrame(() => {
        setRipples(prev =>
          prev.map(r =>
            r.id === ripple.id ? { ...r, scale: 1, opacity: opacity } : r
          )
        );
      });

      // 动画结束后移除涟漪
      setTimeout(() => {
        setRipples(prev => {
          const updated = prev.filter(r => r.id !== ripple.id);
          // 回收到对象池
          const removedRipple = prev.find(r => r.id === ripple.id);
          if (removedRipple) {
            RipplePool.release(removedRipple);
          }
          return updated;
        });
      }, duration);
    },
    [disabled, prefersReducedMotion, getRippleData, color, opacity, duration]
  );

  // 处理点击事件
  const handleInteraction = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      createRipple(event);
      onClick?.(event);
    },
    [createRipple, onClick]
  );

  // 键盘事件支持
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        // 模拟中心点击
        const mockEvent = {
          touches: [],
          clientX: 0,
          clientY: 0,
        } as any;
        createRipple(mockEvent);
        onClick?.(mockEvent);
      }
    },
    [createRipple, onClick]
  );

  // 清理所有涟漪（内存泄漏防护）
  useEffect(() => {
    return () => {
      ripples.forEach(ripple => RipplePool.release(ripple));
    };
  }, []);

  return (
    <Component
      ref={containerRef}
      className={`relative ${clipBounds ? 'overflow-hidden' : ''} ${
        disablePointerEvents ? 'pointer-events-none' : ''
      } ${className}`}
      onClick={handleInteraction}
      onTouchStart={isMobile ? handleInteraction : undefined}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
    >
      {children}

      {/* 涟漪层 */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute pointer-events-none will-change-transform"
          style={{
            left: ripple.x - ripple.size / 2,
            top: ripple.y - ripple.size / 2,
            width: ripple.size,
            height: ripple.size,
            borderRadius: '50%',
            backgroundColor: ripple.color,
            opacity: ripple.opacity * (1 - ripple.scale * 0.7), // 渐变透明
            transform: `scale(${ripple.scale})`,
            transition: `all ${ripple.duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            // GPU 加速
            backfaceVisibility: 'hidden',
            perspective: '1000px',
            transformStyle: 'preserve-3d',
          }}
        />
      ))}
    </Component>
  );
};

// 便捷的涟漪按钮组件
interface RippleButtonProps extends RippleEffectProps {
  /** 按钮变体 */
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  /** 按钮大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否禁用 */
  disabled?: boolean;
}

export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  disabled = false,
  ...rippleProps
}) => {
  const baseClasses = 'btn transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
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
    <RippleEffect
      {...rippleProps}
      component="button"
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      opacity={variant === 'ghost' ? 0.1 : 0.3}
      color={variant === 'ghost' ? 'currentColor' : 'rgba(255,255,255,0.7)'}
    >
      {children}
    </RippleEffect>
  );
};

// 预设配置
export const ripplePresets = {
  // 默认涟漪
  default: {
    color: 'currentColor',
    scale: 2.5,
    duration: 600,
    opacity: 0.3,
  },
  // 快速涟漪
  fast: {
    color: 'currentColor',
    scale: 2,
    duration: 300,
    opacity: 0.2,
  },
  // 慢速涟漪
  slow: {
    color: 'currentColor',
    scale: 3,
    duration: 1000,
    opacity: 0.4,
  },
  // 高亮涟漪
  highlight: {
    color: 'rgb(var(--fallback-p))',
    scale: 2.5,
    duration: 600,
    opacity: 0.3,
  },
  // 成功涟漪
  success: {
    color: 'rgb(var(--fallback-su))',
    scale: 2.5,
    duration: 600,
    opacity: 0.3,
  },
  // 错误涟漪
  error: {
    color: 'rgb(var(--fallback-er))',
    scale: 2.5,
    duration: 600,
    opacity: 0.3,
  },
  // 警告涟漪
  warning: {
    color: 'rgb(var(--fallback-wa))',
    scale: 2.5,
    duration: 600,
    opacity: 0.3,
  },
} as const;

export default RippleEffect;