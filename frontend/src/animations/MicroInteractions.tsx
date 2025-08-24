/**
 * 微交互动画组件
 * 提供按钮、表单、状态切换等细节交互的动画反馈
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, MotionValue } from 'framer-motion';
import { MICRO_INTERACTIONS, animationSystem } from './animationSystem';

// 按钮变体类型
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

// 反馈类型
export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface AnimatedButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  hapticFeedback?: boolean;
}

interface AnimatedCardProps {
  children: ReactNode;
  interactive?: boolean;
  elevated?: boolean;
  onClick?: () => void;
  className?: string;
}

interface AnimatedInputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  error?: string;
  success?: boolean;
  disabled?: boolean;
  className?: string;
}

interface FeedbackToastProps {
  type: FeedbackType;
  message: string;
  visible: boolean;
  duration?: number;
  onClose: () => void;
}

interface RippleButtonProps {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  color?: string;
  className?: string;
}

/**
 * 动画按钮组件
 */
export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  variant = 'primary',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  hapticFeedback = true
}) => {
  const [isPressed, setIsPressed] = useState(false);
  
  // 获取优化后的动画配置
  const animationConfig = animationSystem.getOptimizedConfig(
    'button',
    MICRO_INTERACTIONS.button
  );
  
  const baseStyles = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    ghost: 'bg-transparent text-blue-500 hover:bg-blue-50',
    danger: 'bg-red-500 text-white hover:bg-red-600'
  };
  
  const handleClick = () => {
    if (disabled || loading) return;
    
    // 触觉反馈
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(5);
    }
    
    onClick?.();
  };
  
  return (
    <motion.button
      {...animationConfig}
      initial="idle"
      whileHover={!disabled && !loading ? "hover" : "idle"}
      whileTap={!disabled && !loading ? "tap" : "idle"}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        relative overflow-hidden px-4 py-2 rounded-lg font-medium transition-colors
        ${baseStyles[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${loading ? 'cursor-wait' : ''}
        ${className}
      `}
      style={{
        willChange: 'transform',
        backfaceVisibility: 'hidden'
      }}
    >
      {/* 加载状态 */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear'
            }}
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
          />
        </motion.div>
      )}
      
      {/* 按钮内容 */}
      <motion.span
        initial={{ opacity: 1 }}
        animate={{ opacity: loading ? 0 : 1 }}
        className="flex items-center justify-center space-x-2"
      >
        {children}
      </motion.span>
    </motion.button>
  );
};

/**
 * 水波纹按钮
 */
export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  onClick,
  color = 'rgba(255, 255, 255, 0.6)',
  className = ''
}) => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  
  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = {
      id: Date.now(),
      x,
      y
    };
    
    setRipples(prev => [...prev, newRipple]);
    
    // 移除水波纹
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 800);
    
    onClick?.(e);
  };
  
  return (
    <motion.button
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
      
      {/* 水波纹效果 */}
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          initial={{
            scale: 0,
            opacity: 1
          }}
          animate={{
            scale: 2,
            opacity: 0
          }}
          transition={{
            duration: 0.8,
            ease: 'easeOut'
          }}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x - 25,
            top: ripple.y - 25,
            width: 50,
            height: 50,
            backgroundColor: color
          }}
        />
      ))}
    </motion.button>
  );
};

/**
 * 动画卡片组件
 */
export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  interactive = true,
  elevated = false,
  onClick,
  className = ''
}) => {
  const animationConfig = animationSystem.getOptimizedConfig(
    'button',
    MICRO_INTERACTIONS.card
  );
  
  const baseClasses = `
    relative overflow-hidden bg-white rounded-lg border transition-shadow
    ${elevated ? 'shadow-lg' : 'shadow-sm'}
    ${interactive ? 'cursor-pointer' : ''}
  `;
  
  return (
    <motion.div
      {...animationConfig}
      initial="idle"
      whileHover={interactive ? "hover" : "idle"}
      whileTap={interactive && onClick ? "tap" : "idle"}
      onClick={onClick}
      className={`${baseClasses} ${className}`}
      style={{
        willChange: 'transform, box-shadow',
        backfaceVisibility: 'hidden'
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * 动画输入框组件
 */
export const AnimatedInput: React.FC<AnimatedInputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  onFocus,
  onBlur,
  error,
  success = false,
  disabled = false,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);
  
  useEffect(() => {
    setHasValue(!!value);
  }, [value]);
  
  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHasValue(!!newValue);
    onChange?.(newValue);
  };
  
  const getBorderColor = () => {
    if (error) return 'border-red-500';
    if (success) return 'border-green-500';
    if (isFocused) return 'border-blue-500';
    return 'border-gray-300';
  };
  
  return (
    <div className="relative">
      {/* 浮动标签 */}
      {placeholder && (
        <motion.label
          initial={false}
          animate={{
            y: isFocused || hasValue ? -20 : 0,
            scale: isFocused || hasValue ? 0.85 : 1,
            color: error ? '#ef4444' : success ? '#10b981' : isFocused ? '#3b82f6' : '#6b7280'
          }}
          transition={{
            duration: 0.2,
            ease: 'easeOut'
          }}
          className="absolute left-3 top-3 pointer-events-none origin-left z-10 bg-white px-1"
          style={{ willChange: 'transform, color' }}
        >
          {placeholder}
        </motion.label>
      )}
      
      {/* 输入框 */}
      <motion.input
        type={type}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        initial={false}
        animate={{
          scale: isFocused ? 1.02 : 1,
        }}
        transition={{
          duration: 0.2,
          ease: 'easeOut'
        }}
        className={`
          w-full px-3 py-3 bg-white border-2 rounded-lg outline-none transition-all
          ${getBorderColor()}
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
          ${className}
        `}
        style={{
          willChange: 'transform, border-color',
          backfaceVisibility: 'hidden'
        }}
      />
      
      {/* 状态指示器 */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ 
          opacity: error || success ? 1 : 0,
          x: error || success ? 0 : 10
        }}
        className="absolute right-3 top-1/2 transform -translate-y-1/2"
      >
        {error && <span className="text-red-500">❌</span>}
        {success && !error && <span className="text-green-500">✅</span>}
      </motion.div>
      
      {/* 错误信息 */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="text-red-500 text-sm mt-1"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

/**
 * 反馈提示组件
 */
export const FeedbackToast: React.FC<FeedbackToastProps> = ({
  type,
  message,
  visible,
  duration = 3000,
  onClose
}) => {
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);
  
  const typeStyles = {
    success: {
      bg: 'bg-green-500',
      icon: '✅',
      color: 'text-white'
    },
    error: {
      bg: 'bg-red-500',
      icon: '❌',
      color: 'text-white'
    },
    warning: {
      bg: 'bg-yellow-500',
      icon: '⚠️',
      color: 'text-white'
    },
    info: {
      bg: 'bg-blue-500',
      icon: 'ℹ️',
      color: 'text-white'
    }
  };
  
  const style = typeStyles[type];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ 
        opacity: visible ? 1 : 0, 
        y: visible ? 0 : -50,
        scale: visible ? 1 : 0.9
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30
      }}
      className={`
        fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg
        ${style.bg} ${style.color}
      `}
      style={{
        willChange: 'transform, opacity'
      }}
    >
      <span className="text-lg">{style.icon}</span>
      <span className="font-medium">{message}</span>
      
      {/* 关闭按钮 */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="ml-2 text-white/80 hover:text-white"
      >
        ×
      </motion.button>
    </motion.div>
  );
};

/**
 * 切换开关动画
 */
interface AnimatedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const AnimatedToggle: React.FC<AnimatedToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'medium',
  className = ''
}) => {
  const sizes = {
    small: { track: 'w-8 h-4', thumb: 'w-3 h-3' },
    medium: { track: 'w-12 h-6', thumb: 'w-5 h-5' },
    large: { track: 'w-16 h-8', thumb: 'w-7 h-7' }
  };
  
  const { track, thumb } = sizes[size];
  
  const handleClick = () => {
    if (disabled) return;
    
    // 触觉反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
    
    onChange(!checked);
  };
  
  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative inline-flex items-center rounded-full transition-colors focus:outline-none
        ${track}
        ${checked ? 'bg-blue-500' : 'bg-gray-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      style={{ willChange: 'transform' }}
    >
      <motion.div
        layout
        className={`
          inline-block bg-white rounded-full shadow-md
          ${thumb}
        `}
        animate={{
          x: checked ? '100%' : '0%'
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30
        }}
        style={{
          willChange: 'transform'
        }}
      />
    </motion.button>
  );
};

/**
 * 数字计数动画
 */
interface CounterAnimationProps {
  from: number;
  to: number;
  duration?: number;
  formatter?: (value: number) => string;
  className?: string;
}

export const CounterAnimation: React.FC<CounterAnimationProps> = ({
  from,
  to,
  duration = 1,
  formatter = (value) => Math.round(value).toString(),
  className = ''
}) => {
  const motionValue = useMotionValue(from);
  const rounded = useTransform(motionValue, (latest) => formatter(latest));
  
  useEffect(() => {
    const animation = motionValue.set(to);
    motionValue.set(from);
    
    const transition = {
      duration,
      ease: 'easeOut'
    };
    
    // 延迟开始动画
    setTimeout(() => {
      motionValue.set(to);
    }, 100);
    
  }, [motionValue, from, to, duration]);
  
  return (
    <motion.span 
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {rounded}
    </motion.span>
  );
};

// 导出微交互相关的CSS类
export const microInteractionStyles = `
/* 按钮基础样式 */
.animated-button {
  position: relative;
  overflow: hidden;
  user-select: none;
}

/* 输入框动画优化 */
.animated-input {
  position: relative;
}

.animated-input input {
  transition: all 0.2s ease-out;
}

/* 性能优化 */
.micro-interaction * {
  will-change: transform;
  backface-visibility: hidden;
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .animated-button:hover {
    transform: none;
  }
}
`;