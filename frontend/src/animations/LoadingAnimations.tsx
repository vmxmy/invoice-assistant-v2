/**
 * 加载状态动画组件
 * 提供现代化的骨架屏、加载指示器和状态动画
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LOADING_ANIMATIONS, animationSystem } from './animationSystem';

// 加载状态类型
export type LoadingState = 'loading' | 'success' | 'error' | 'idle';

// 骨架屏配置
export interface SkeletonConfig {
  lines: number;
  height: number;
  avatar: boolean;
  avatarSize: number;
  showShimmer: boolean;
  borderRadius: number;
}

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  type?: 'spinner' | 'dots' | 'pulse' | 'wave';
  color?: string;
  className?: string;
}

interface SkeletonProps {
  config?: Partial<SkeletonConfig>;
  className?: string;
}

interface LoadingStateProps {
  state: LoadingState;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  children?: ReactNode;
  onRetry?: () => void;
}

const DEFAULT_SKELETON_CONFIG: SkeletonConfig = {
  lines: 3,
  height: 16,
  avatar: false,
  avatarSize: 40,
  showShimmer: true,
  borderRadius: 4
};

/**
 * 旋转加载指示器
 */
const SpinnerIndicator: React.FC<{ size: string; color: string }> = ({ 
  size, 
  color 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };
  
  return (
    <motion.div
      {...animationSystem.getOptimizedConfig('loading', LOADING_ANIMATIONS.spin)}
      animate="animate"
      className={`${sizeClasses[size as keyof typeof sizeClasses]} ${color} rounded-full border-2 border-t-transparent`}
      style={{
        willChange: 'transform',
        backfaceVisibility: 'hidden'
      }}
    />
  );
};

/**
 * 点阵加载指示器
 */
const DotsIndicator: React.FC<{ size: string; color: string }> = ({ 
  size, 
  color 
}) => {
  const dotSizes = {
    small: 'w-2 h-2',
    medium: 'w-3 h-3',
    large: 'w-4 h-4'
  };
  
  const dotSize = dotSizes[size as keyof typeof dotSizes];
  
  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.2,
        repeat: Infinity,
        repeatType: 'loop' as const
      }
    }
  };
  
  const dotVariants = {
    animate: {
      y: [0, -10, 0],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 0.6,
        ease: 'easeInOut',
        repeat: Infinity
      }
    }
  };
  
  return (
    <motion.div
      variants={containerVariants}
      animate="animate"
      className="flex space-x-1"
    >
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          variants={dotVariants}
          className={`${dotSize} ${color} rounded-full`}
          style={{
            willChange: 'transform, opacity'
          }}
        />
      ))}
    </motion.div>
  );
};

/**
 * 脉冲加载指示器
 */
const PulseIndicator: React.FC<{ size: string; color: string }> = ({ 
  size, 
  color 
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };
  
  return (
    <motion.div
      {...animationSystem.getOptimizedConfig('loading', LOADING_ANIMATIONS.pulse)}
      animate="animate"
      className={`${sizeClasses[size as keyof typeof sizeClasses]} ${color} rounded-full`}
      style={{
        willChange: 'opacity'
      }}
    />
  );
};

/**
 * 波浪加载指示器
 */
const WaveIndicator: React.FC<{ size: string; color: string }> = ({ 
  size, 
  color 
}) => {
  const barHeights = {
    small: 'h-4',
    medium: 'h-6',
    large: 'h-8'
  };
  
  const barHeight = barHeights[size as keyof typeof barHeights];
  
  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.1,
        repeat: Infinity,
        repeatType: 'loop' as const
      }
    }
  };
  
  const barVariants = {
    animate: {
      scaleY: [1, 2, 1],
      transition: {
        duration: 1,
        ease: 'easeInOut',
        repeat: Infinity
      }
    }
  };
  
  return (
    <motion.div
      variants={containerVariants}
      animate="animate"
      className="flex space-x-1 items-end"
    >
      {[0, 1, 2, 3, 4].map((index) => (
        <motion.div
          key={index}
          variants={barVariants}
          className={`w-1 ${barHeight} ${color} rounded-full`}
          style={{
            willChange: 'transform',
            transformOrigin: 'bottom'
          }}
        />
      ))}
    </motion.div>
  );
};

/**
 * 主加载指示器组件
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'medium',
  type = 'spinner',
  color = 'border-blue-500',
  className = ''
}) => {
  const indicators = {
    spinner: SpinnerIndicator,
    dots: DotsIndicator,
    pulse: PulseIndicator,
    wave: WaveIndicator
  };
  
  const IndicatorComponent = indicators[type];
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <IndicatorComponent size={size} color={color} />
    </div>
  );
};

/**
 * 骨架屏组件
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  config = {},
  className = ''
}) => {
  const finalConfig = { ...DEFAULT_SKELETON_CONFIG, ...config };
  
  // 闪烁动画
  const shimmerVariants = {
    animate: {
      x: ['-100%', '100%'],
      transition: {
        duration: 1.5,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatDelay: 0.5
      }
    }
  };
  
  const SkeletonLine: React.FC<{ 
    width?: string; 
    height?: number; 
    isLast?: boolean 
  }> = ({ 
    width = '100%', 
    height = finalConfig.height, 
    isLast = false 
  }) => (
    <div
      className={`
        relative overflow-hidden bg-gray-200 animate-pulse
        ${isLast ? 'mb-0' : 'mb-2'}
      `}
      style={{
        width,
        height: `${height}px`,
        borderRadius: `${finalConfig.borderRadius}px`
      }}
    >
      {finalConfig.showShimmer && (
        <motion.div
          variants={shimmerVariants}
          animate="animate"
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
          style={{ willChange: 'transform' }}
        />
      )}
    </div>
  );
  
  return (
    <div className={`skeleton ${className}`}>
      {/* 头像 */}
      {finalConfig.avatar && (
        <div className="flex items-start space-x-3 mb-4">
          <div
            className="relative overflow-hidden bg-gray-200 rounded-full animate-pulse shrink-0"
            style={{
              width: `${finalConfig.avatarSize}px`,
              height: `${finalConfig.avatarSize}px`
            }}
          >
            {finalConfig.showShimmer && (
              <motion.div
                variants={shimmerVariants}
                animate="animate"
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
              />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <SkeletonLine width="60%" />
            <SkeletonLine width="40%" height={12} />
          </div>
        </div>
      )}
      
      {/* 文本行 */}
      <div className="space-y-2">
        {Array.from({ length: finalConfig.lines - 1 }).map((_, index) => (
          <SkeletonLine key={index} />
        ))}
        <SkeletonLine width="75%" isLast />
      </div>
    </div>
  );
};

/**
 * 卡片骨架屏
 */
export const CardSkeleton: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => (
  <div className={`p-4 border rounded-lg bg-white ${className}`}>
    <Skeleton
      config={{
        lines: 4,
        avatar: true,
        avatarSize: 48,
        showShimmer: true
      }}
    />
  </div>
);

/**
 * 列表骨架屏
 */
interface ListSkeletonProps {
  items?: number;
  itemHeight?: number;
  showAvatar?: boolean;
  className?: string;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  itemHeight = 80,
  showAvatar = true,
  className = ''
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div
        key={index}
        className="border rounded-lg p-4 bg-white"
        style={{ minHeight: `${itemHeight}px` }}
      >
        <Skeleton
          config={{
            lines: 2,
            avatar: showAvatar,
            avatarSize: 32,
            showShimmer: true,
            height: 14
          }}
        />
      </div>
    ))}
  </div>
);

/**
 * 加载状态管理组件
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  state,
  loadingText = '加载中...',
  successText = '加载成功',
  errorText = '加载失败',
  children,
  onRetry
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  
  useEffect(() => {
    if (state === 'success') {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [state]);
  
  const stateVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };
  
  if (state === 'loading') {
    return (
      <motion.div
        variants={stateVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex flex-col items-center justify-center py-8"
      >
        <LoadingIndicator type="spinner" size="large" />
        <p className="mt-4 text-gray-600">{loadingText}</p>
      </motion.div>
    );
  }
  
  if (state === 'error') {
    return (
      <motion.div
        variants={stateVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex flex-col items-center justify-center py-8 text-center"
      >
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <p className="text-gray-600 mb-4">{errorText}</p>
        {onRetry && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            重试
          </motion.button>
        )}
      </motion.div>
    );
  }
  
  return (
    <AnimatePresence>
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50"
        >
          ✅ {successText}
        </motion.div>
      )}
      
      <motion.div
        variants={stateVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * 进度条动画
 */
interface AnimatedProgressProps {
  progress: number; // 0-100
  height?: number;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  className?: string;
}

export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  progress,
  height = 8,
  color = 'bg-blue-500',
  backgroundColor = 'bg-gray-200',
  showLabel = false,
  className = ''
}) => {
  return (
    <div className={`relative ${className}`}>
      <div
        className={`w-full ${backgroundColor} rounded-full overflow-hidden`}
        style={{ height: `${height}px` }}
      >
        <motion.div
          className={`h-full ${color} rounded-full origin-left`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={{
            duration: 0.5,
            ease: 'easeOut'
          }}
          style={{ willChange: 'transform' }}
        />
      </div>
      
      {showLabel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-semibold text-gray-700"
        >
          {Math.round(progress)}%
        </motion.div>
      )}
    </div>
  );
};

// 导出加载动画相关的CSS类
export const loadingAnimationStyles = `
.skeleton {
  user-select: none;
  pointer-events: none;
}

/* 骨架屏动画优化 */
@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.animate-pulse {
  animation: skeleton-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 性能优化 */
.loading-indicator * {
  will-change: transform;
  backface-visibility: hidden;
}
`;