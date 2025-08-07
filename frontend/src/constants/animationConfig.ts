/**
 * 动画配置常量
 * 集中管理所有动画参数，提高可维护性和性能
 */

// 动画时长配置
export const ANIMATION_DURATION = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  verySlow: 0.8,
} as const;

// 动画缓动函数配置
export const ANIMATION_EASING = {
  easeOut: [0.4, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  spring: { type: "spring", stiffness: 300, damping: 30 },
  bounce: { type: "spring", stiffness: 400, damping: 10 },
  smooth: { type: "spring", stiffness: 200, damping: 20 },
} as const;

// 手势配置
export const GESTURE_CONFIG = {
  swipeThreshold: 50, // 滑动触发阈值（像素）
  longPressDelay: 500, // 长按延迟（毫秒）
  dragElastic: 0.2, // 拖拽弹性
  vibrateDuration: 10, // 触觉反馈时长（毫秒）
} as const;

// 动画变体配置
export const ANIMATION_VARIANTS = {
  // 淡入淡出
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  // 滑入滑出
  slideIn: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  // 缩放
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  // 上升
  rise: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  // 卡片悬停
  cardHover: {
    rest: { scale: 1, y: 0 },
    hover: { 
      scale: 1.02, 
      y: -4,
      transition: { 
        duration: ANIMATION_DURATION.fast, 
        ease: "easeOut" 
      }
    },
    tap: { 
      scale: 0.98,
      y: -2,
      transition: { 
        duration: ANIMATION_DURATION.instant 
      }
    },
  },
  // 按钮按下
  buttonPress: {
    rest: { scale: 1 },
    tap: { scale: 0.95 },
  },
} as const;

// 交错动画配置
export const STAGGER_CONFIG = {
  fast: 0.05,
  normal: 0.1,
  slow: 0.15,
} as const;

// 移动端动画配置（降低复杂度）
export const MOBILE_ANIMATION_CONFIG = {
  reduceMotion: false, // 是否减少动画
  disableComplexAnimations: true, // 禁用复杂动画
  maxStaggerItems: 4, // 最大交错动画项目数
} as const;

// 性能优化配置
export const PERFORMANCE_CONFIG = {
  enableGPUAcceleration: true,
  will­change: 'transform, opacity',
  backfaceVisibility: 'hidden',
} as const;

// 创建动画配置的工具函数
export const createAnimationConfig = (
  duration: keyof typeof ANIMATION_DURATION = 'normal',
  easing: keyof typeof ANIMATION_EASING = 'easeOut'
) => ({
  duration: ANIMATION_DURATION[duration],
  ease: ANIMATION_EASING[easing],
});

// 检测是否需要减少动画
export const shouldReduceMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// 获取设备适配的动画配置
export const getDeviceAnimationConfig = (isMobile: boolean) => {
  if (shouldReduceMotion()) {
    return {
      duration: 0,
      stagger: 0,
      enabled: false,
    };
  }
  
  if (isMobile && MOBILE_ANIMATION_CONFIG.disableComplexAnimations) {
    return {
      duration: ANIMATION_DURATION.fast,
      stagger: STAGGER_CONFIG.fast,
      enabled: true,
      simple: true,
    };
  }
  
  return {
    duration: ANIMATION_DURATION.normal,
    stagger: STAGGER_CONFIG.normal,
    enabled: true,
    simple: false,
  };
};