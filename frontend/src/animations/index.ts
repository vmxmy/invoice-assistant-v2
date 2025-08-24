/**
 * 动画系统统一导出
 * 提供完整的动画解决方案
 */

// 核心动画系统
export * from './animationSystem';

// 动画组件
export * from './PageTransitions';
export * from './ListAnimations';
export * from './LoadingAnimations';
export * from './MicroInteractions';

// 上下文和钩子
export * from './AnimationProvider';
export * from '../hooks/useAnimationPreferences';

// 动画配置和常量
export {
  ANIMATION_DURATION,
  EASING,
  PAGE_TRANSITIONS,
  LIST_ANIMATIONS,
  MICRO_INTERACTIONS,
  LOADING_ANIMATIONS,
  animationSystem,
  performanceMonitor
} from './animationSystem';

// 样式字符串
export {
  pageTransitionStyles,
  listAnimationStyles,
  loadingAnimationStyles,
  microInteractionStyles
} from './PageTransitions';

// 类型定义
export type {
  AnimationPerformanceLevel,
  AnimationType,
  AnimationPreferences,
  AnimationSystemConfig,
  TransitionDirection,
  TransitionType,
  PageTransitionConfig,
  ListItemData,
  ListAnimationConfig,
  LoadingState,
  SkeletonConfig,
  ButtonVariant,
  FeedbackType
} from './animationSystem';

export type {
  UseAnimationPreferencesReturn
} from '../hooks/useAnimationPreferences';

// 工具函数
export const AnimationUtils = {
  // 检测是否支持GPU加速
  supportsGPUAcceleration: (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  },
  
  // 检测是否为移动设备
  isMobileDevice: (): boolean => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  // 计算最佳动画帧率
  getOptimalFrameRate: (): number => {
    const isMobile = AnimationUtils.isMobileDevice();
    const hasGPU = AnimationUtils.supportsGPUAcceleration();
    
    if (isMobile && !hasGPU) return 30;
    if (isMobile && hasGPU) return 45;
    return 60;
  },
  
  // 创建防抖动画
  createDebounced: (fn: Function, delay: number = 16) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(null, args), delay);
    };
  },
  
  // 创建节流动画
  createThrottled: (fn: Function, delay: number = 16) => {
    let lastCall = 0;
    return (...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn.apply(null, args);
      }
    };
  },
  
  // 检测CSS特性支持
  supportsCSSFeature: (property: string, value?: string): boolean => {
    if (typeof window === 'undefined') return false;
    
    const element = document.createElement('div');
    const style = element.style;
    
    if (value) {
      try {
        (style as any)[property] = value;
        return (style as any)[property] === value;
      } catch {
        return false;
      }
    } else {
      return property in style;
    }
  },
  
  // 预加载动画资源
  preloadAnimationAssets: async (urls: string[]): Promise<void> => {
    const promises = urls.map(url => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load: ${url}`));
        img.src = url;
      });
    });
    
    try {
      await Promise.all(promises);
    } catch (error) {
      console.warn('Some animation assets failed to preload:', error);
    }
  },
  
  // 计算动画缓动值
  easing: {
    linear: (t: number): number => t,
    easeIn: (t: number): number => t * t,
    easeOut: (t: number): number => t * (2 - t),
    easeInOut: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: (t: number): number => t * t * t,
    easeOutCubic: (t: number): number => --t * t * t + 1,
    easeInOutCubic: (t: number): number => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    bounce: (t: number): number => {
      if (t < 1 / 2.75) {
        return 7.5625 * t * t;
      } else if (t < 2 / 2.75) {
        return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      } else if (t < 2.5 / 2.75) {
        return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      } else {
        return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
      }
    }
  }
};

// 动画性能优化建议
export const PerformanceRecommendations = {
  // 获取基于设备的推荐设置
  getRecommendations: (): Partial<AnimationPreferences> => {
    const isMobile = AnimationUtils.isMobileDevice();
    const hasGPU = AnimationUtils.supportsGPUAcceleration();
    const memory = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 2;
    
    // 高性能设备
    if (!isMobile && hasGPU && memory >= 8 && cores >= 4) {
      return {
        performanceLevel: 'high',
        animationScale: 1.0,
        enableParallax: true,
        enableHapticFeedback: false // 桌面设备通常不支持
      };
    }
    
    // 中等性能设备
    if ((!isMobile && memory >= 4) || (isMobile && hasGPU && memory >= 4)) {
      return {
        performanceLevel: 'medium',
        animationScale: 0.9,
        enableParallax: !isMobile,
        enableHapticFeedback: isMobile
      };
    }
    
    // 低性能设备
    return {
      performanceLevel: 'low',
      animationScale: 0.7,
      enableParallax: false,
      enableHapticFeedback: isMobile
    };
  },
  
  // 获取优化建议文本
  getAdvice: (performanceData: any): string[] => {
    const advice: string[] = [];
    
    if (!performanceData) {
      return ['正在收集性能数据...'];
    }
    
    const { averageFps, lowFpsCount, deviceScore } = performanceData;
    
    if (averageFps < 30) {
      advice.push('检测到动画帧率较低，建议降低动画复杂度');
    }
    
    if (lowFpsCount > 5) {
      advice.push('频繁出现低帧率，建议禁用复杂动画效果');
    }
    
    if (deviceScore < 4) {
      advice.push('设备性能有限，建议使用简化动画模式');
    }
    
    if (AnimationUtils.isMobileDevice()) {
      advice.push('移动设备建议启用触觉反馈以改善交互体验');
    }
    
    if (!AnimationUtils.supportsGPUAcceleration()) {
      advice.push('设备不支持GPU加速，避免使用3D变换动画');
    }
    
    if (advice.length === 0) {
      advice.push('动画性能良好，可以享受完整的动画体验');
    }
    
    return advice;
  }
};

// 默认导出动画系统配置
export default {
  AnimationUtils,
  PerformanceRecommendations
};