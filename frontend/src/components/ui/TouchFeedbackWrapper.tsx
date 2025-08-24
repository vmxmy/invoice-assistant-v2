/**
 * 触摸反馈包装器组件
 * 为现有组件快速添加触摸反馈功能
 */

import React, { forwardRef, ReactNode } from 'react';
import { useTouchFeedback, TouchFeedbackConfig, TouchFeedbackHandlers, touchFeedbackPresets } from '../../hooks/useTouchFeedback';

interface TouchFeedbackWrapperProps extends TouchFeedbackConfig, TouchFeedbackHandlers {
  /** 子组件 */
  children: ReactNode;
  /** 额外的CSS类名 */
  className?: string;
  /** 包装器元素类型 */
  as?: keyof JSX.IntrinsicElements;
  /** 预设配置 */
  preset?: keyof typeof touchFeedbackPresets;
  /** 是否显示溢出的涟漪 */
  clipOverflow?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 其他HTML属性 */
  [key: string]: any;
}

export const TouchFeedbackWrapper = forwardRef<HTMLElement, TouchFeedbackWrapperProps>(
  (
    {
      children,
      className = '',
      as: Component = 'div',
      preset,
      clipOverflow = true,
      style,
      onTap,
      onLongPress,
      onLongPressStart,
      onLongPressCancel,
      ...restProps
    },
    ref
  ) => {
    // 应用预设配置
    const presetConfig = preset ? touchFeedbackPresets[preset] : {};
    const config = { ...presetConfig, ...restProps };

    // 使用触摸反馈hook
    const touchFeedback = useTouchFeedback(
      config,
      {
        onTap,
        onLongPress,
        onLongPressStart,
        onLongPressCancel,
      }
    );

    // 提取事件处理器
    const {
      rippleElements,
      longPressProgressStyle,
      isPressed,
      isLongPressing,
      longPressProgress,
      hasTriggeredLongPress,
      config: finalConfig,
      isEnabled,
      ...eventHandlers
    } = touchFeedback;

    // 构建CSS类名
    const wrapperClasses = [
      'relative',
      clipOverflow ? 'overflow-hidden' : '',
      isEnabled ? 'select-none' : '',
      className,
    ].filter(Boolean).join(' ');

    // 构建样式
    const wrapperStyle: React.CSSProperties = {
      ...style,
      // 长按进度样式
      ...(isLongPressing && finalConfig.longPressProgress ? longPressProgressStyle : {}),
      // GPU加速优化
      ...(isPressed || isLongPressing ? {
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
        perspective: '1000px',
      } : {}),
    };

    return (
      <Component
        ref={ref}
        className={wrapperClasses}
        style={wrapperStyle}
        {...eventHandlers}
        {...(isEnabled ? {
          tabIndex: onTap || onLongPress ? 0 : undefined,
          role: onTap || onLongPress ? 'button' : undefined,
          'aria-pressed': isPressed,
          'aria-describedby': finalConfig.longPress ? 'long-press-hint' : undefined,
        } : {})}
      >
        {children}

        {/* 涟漪效果层 */}
        {isEnabled && rippleElements.map((ripple) => (
          <span
            key={ripple.key}
            style={ripple.style}
          />
        ))}

        {/* 长按进度环 */}
        {isEnabled && finalConfig.longPress && finalConfig.longPressProgress && isLongPressing && (
          <div 
            className="absolute inset-[-2px] pointer-events-none rounded-full border-2 border-transparent"
            style={{
              background: `conic-gradient(rgb(var(--fallback-p)) ${longPressProgress * 100}%, transparent ${longPressProgress * 100}%)`,
              mask: 'radial-gradient(circle closest-side, transparent 98%, black 100%)',
              WebkitMask: 'radial-gradient(circle closest-side, transparent 98%, black 100%)',
            }}
          />
        )}

        {/* 无障碍提示 */}
        {isEnabled && finalConfig.longPress && (
          <span id="long-press-hint" className="sr-only">
            长按 {finalConfig.longPressThreshold}ms 激活额外功能
          </span>
        )}
      </Component>
    );
  }
);

TouchFeedbackWrapper.displayName = 'TouchFeedbackWrapper';

// 专门的按钮组件
export const TouchButton = forwardRef<HTMLButtonElement, TouchFeedbackWrapperProps>(
  ({ children, className = '', ...props }, ref) => (
    <TouchFeedbackWrapper
      as="button"
      preset="button"
      className={`btn ${className}`}
      {...props}
      ref={ref as any}
    >
      {children}
    </TouchFeedbackWrapper>
  )
);

TouchButton.displayName = 'TouchButton';

// 专门的卡片组件
export const TouchCard = forwardRef<HTMLDivElement, TouchFeedbackWrapperProps>(
  ({ children, className = '', ...props }, ref) => (
    <TouchFeedbackWrapper
      as="div"
      preset="card"
      className={`card ${className}`}
      {...props}
      ref={ref as any}
    >
      {children}
    </TouchFeedbackWrapper>
  )
);

TouchCard.displayName = 'TouchCard';

// 专门的列表项组件
export const TouchListItem = forwardRef<HTMLDivElement, TouchFeedbackWrapperProps>(
  ({ children, className = '', ...props }, ref) => (
    <TouchFeedbackWrapper
      as="div"
      preset="listItem"
      className={`${className}`}
      {...props}
      ref={ref as any}
    >
      {children}
    </TouchFeedbackWrapper>
  )
);

TouchListItem.displayName = 'TouchListItem';

// 专门的导航项组件
export const TouchNavItem = forwardRef<HTMLDivElement, TouchFeedbackWrapperProps>(
  ({ children, className = '', ...props }, ref) => (
    <TouchFeedbackWrapper
      as="div"
      preset="navigation"
      className={`${className}`}
      {...props}
      ref={ref as any}
    >
      {children}
    </TouchFeedbackWrapper>
  )
);

TouchNavItem.displayName = 'TouchNavItem';

export default TouchFeedbackWrapper;