/**
 * 高性能移动端动画系统核心
 * 提供60fps流畅动画体验，支持用户偏好和无障碍访问
 */

import { Variants, Transition, MotionProps } from 'framer-motion';

// 动画性能等级
export type AnimationPerformanceLevel = 'high' | 'medium' | 'low' | 'disabled';

// 动画类型
export type AnimationType = 'page' | 'list' | 'modal' | 'button' | 'loading' | 'notification';

// 用户动画偏好
export interface AnimationPreferences {
  performanceLevel: AnimationPerformanceLevel;
  reduceMotion: boolean;
  enableHapticFeedback: boolean;
  animationScale: number; // 0.5 - 2.0
  enableParallax: boolean;
}

// 动画系统配置
export interface AnimationSystemConfig {
  frameRate: number;
  enableGPUAcceleration: boolean;
  maxConcurrentAnimations: number;
  preloadKeyframes: boolean;
}

// 基础动画时长 (秒)
export const ANIMATION_DURATION = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.25,
  slow: 0.35,
  extended: 0.5
} as const;

// 高性能缓动函数
export const EASING = {
  // 使用CSS贝塞尔曲线优化GPU加速
  smooth: [0.25, 0.1, 0.25, 1],
  swift: [0.4, 0, 0.2, 1],
  sharp: [0.4, 0, 0.6, 1],
  spring: { type: "spring", stiffness: 300, damping: 25, mass: 0.8 },
  bouncy: { type: "spring", stiffness: 400, damping: 17, mass: 0.6 },
  elastic: { type: "spring", stiffness: 500, damping: 30, mass: 1.2 }
} as const;

// GPU优化的变换属性
export const GPU_OPTIMIZED_PROPS = {
  willChange: 'transform, opacity',
  backfaceVisibility: 'hidden' as const,
  perspective: 1000
};

// 动画系统默认配置
export const DEFAULT_ANIMATION_CONFIG: AnimationSystemConfig = {
  frameRate: 60,
  enableGPUAcceleration: true,
  maxConcurrentAnimations: 8,
  preloadKeyframes: true
};

// 用户偏好默认值
export const DEFAULT_ANIMATION_PREFERENCES: AnimationPreferences = {
  performanceLevel: 'high',
  reduceMotion: false,
  enableHapticFeedback: true,
  animationScale: 1.0,
  enableParallax: true
};

/**
 * 页面切换动画变体
 */
export const PAGE_TRANSITIONS: Record<string, Variants> = {
  // 水平滑动（iOS风格）
  slideHorizontal: {
    initial: { x: '100%', opacity: 0.8 },
    animate: { 
      x: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.8
      }
    },
    exit: { 
      x: '-100%', 
      opacity: 0.8,
      transition: { 
        duration: ANIMATION_DURATION.fast,
        ease: EASING.swift 
      }
    }
  },
  
  // 垂直滑动（Material Design风格）
  slideVertical: {
    initial: { y: '100%', opacity: 0.9 },
    animate: { 
      y: 0, 
      opacity: 1,
      transition: EASING.spring
    },
    exit: { 
      y: '-50%', 
      opacity: 0,
      transition: { 
        duration: ANIMATION_DURATION.fast 
      }
    }
  },
  
  // 淡入淡出
  fade: {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { 
        duration: ANIMATION_DURATION.normal,
        ease: EASING.smooth 
      }
    },
    exit: { 
      opacity: 0,
      transition: { 
        duration: ANIMATION_DURATION.fast 
      }
    }
  },
  
  // 缩放切换
  scale: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: EASING.spring
    },
    exit: { 
      scale: 0.9, 
      opacity: 0,
      transition: { 
        duration: ANIMATION_DURATION.fast 
      }
    }
  }
};

/**
 * 列表动画变体
 */
export const LIST_ANIMATIONS: Record<string, Variants> = {
  // 交错入场
  staggered: {
    initial: { opacity: 0, y: 20 },
    animate: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: ANIMATION_DURATION.normal,
        ease: EASING.smooth
      }
    }),
    exit: { 
      opacity: 0, 
      y: -10,
      transition: { 
        duration: ANIMATION_DURATION.fast 
      }
    }
  },
  
  // 滑入
  slideIn: {
    initial: { x: -50, opacity: 0 },
    animate: { 
      x: 0, 
      opacity: 1,
      transition: {
        duration: ANIMATION_DURATION.normal,
        ease: EASING.swift
      }
    },
    exit: { 
      x: 50, 
      opacity: 0,
      transition: { 
        duration: ANIMATION_DURATION.fast 
      }
    }
  },
  
  // 卡片展开
  expandCard: {
    initial: { scale: 0.9, opacity: 0, rotateY: -15 },
    animate: { 
      scale: 1, 
      opacity: 1, 
      rotateY: 0,
      transition: EASING.spring
    },
    exit: { 
      scale: 0.8, 
      opacity: 0, 
      rotateY: 15,
      transition: { 
        duration: ANIMATION_DURATION.fast 
      }
    }
  }
};

/**
 * 微交互动画
 */
export const MICRO_INTERACTIONS: Record<string, Variants> = {
  // 按钮点击
  button: {
    idle: { scale: 1 },
    hover: { 
      scale: 1.02,
      transition: { 
        duration: ANIMATION_DURATION.fast,
        ease: EASING.swift 
      }
    },
    tap: { 
      scale: 0.95,
      transition: { 
        duration: ANIMATION_DURATION.instant,
        ease: EASING.sharp 
      }
    }
  },
  
  // 卡片悬浮
  card: {
    idle: { 
      scale: 1, 
      y: 0, 
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
    },
    hover: { 
      scale: 1.02, 
      y: -4, 
      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
      transition: { 
        duration: ANIMATION_DURATION.normal,
        ease: EASING.spring 
      }
    },
    tap: { 
      scale: 0.98, 
      y: -2,
      transition: { 
        duration: ANIMATION_DURATION.instant 
      }
    }
  },
  
  // 输入框聚焦
  input: {
    idle: { scale: 1, borderColor: '#e5e7eb' },
    focus: { 
      scale: 1.01, 
      borderColor: '#3b82f6',
      transition: { 
        duration: ANIMATION_DURATION.normal,
        ease: EASING.smooth 
      }
    }
  }
};

/**
 * 加载动画
 */
export const LOADING_ANIMATIONS: Record<string, Variants> = {
  // 脉冲
  pulse: {
    animate: {
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 1.5,
        ease: "easeInOut",
        repeat: Infinity
      }
    }
  },
  
  // 旋转
  spin: {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        ease: "linear",
        repeat: Infinity
      }
    }
  },
  
  // 弹跳点
  dots: {
    animate: {
      y: [-4, 4, -4],
      transition: {
        duration: 0.6,
        ease: "easeInOut",
        repeat: Infinity
      }
    }
  }
};

/**
 * 性能优化的动画配置生成器
 */
export class AnimationConfigGenerator {
  private preferences: AnimationPreferences;
  private systemConfig: AnimationSystemConfig;
  
  constructor(
    preferences: AnimationPreferences = DEFAULT_ANIMATION_PREFERENCES,
    systemConfig: AnimationSystemConfig = DEFAULT_ANIMATION_CONFIG
  ) {
    this.preferences = preferences;
    this.systemConfig = systemConfig;
  }
  
  /**
   * 获取优化后的动画配置
   */
  getOptimizedConfig(
    animationType: AnimationType,
    baseVariants: Variants
  ): MotionProps {
    // 检查是否需要减少动画
    if (this.shouldReduceMotion()) {
      return this.getReducedMotionConfig();
    }
    
    const config: MotionProps = {
      variants: baseVariants,
      style: this.systemConfig.enableGPUAcceleration ? GPU_OPTIMIZED_PROPS : {},
      transition: this.getOptimizedTransition(animationType)
    };
    
    // 根据性能等级调整配置
    return this.adjustForPerformance(config);
  }
  
  /**
   * 检查是否应该减少动画
   */
  private shouldReduceMotion(): boolean {
    return (
      this.preferences.reduceMotion ||
      this.preferences.performanceLevel === 'disabled' ||
      (typeof window !== 'undefined' && 
       window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    );
  }
  
  /**
   * 获取减少动画的配置
   */
  private getReducedMotionConfig(): MotionProps {
    return {
      initial: false,
      animate: false,
      exit: false,
      transition: { duration: 0 }
    };
  }
  
  /**
   * 获取优化后的过渡配置
   */
  private getOptimizedTransition(animationType: AnimationType): Transition {
    const baseTransition: Transition = {
      duration: ANIMATION_DURATION.normal * this.preferences.animationScale,
      ease: EASING.smooth
    };
    
    // 根据动画类型调整
    switch (animationType) {
      case 'button':
        return {
          ...baseTransition,
          duration: ANIMATION_DURATION.fast * this.preferences.animationScale
        };
      case 'loading':
        return {
          ...baseTransition,
          repeat: Infinity,
          repeatType: 'loop' as const
        };
      default:
        return baseTransition;
    }
  }
  
  /**
   * 根据性能等级调整配置
   */
  private adjustForPerformance(config: MotionProps): MotionProps {
    switch (this.preferences.performanceLevel) {
      case 'low':
        return {
          ...config,
          transition: { 
            ...config.transition as Transition, 
            duration: (config.transition as Transition)?.duration ? 
              (config.transition as Transition).duration! * 0.7 : 
              ANIMATION_DURATION.fast 
          }
        };
      case 'medium':
        return config;
      case 'high':
        return {
          ...config,
          style: {
            ...config.style,
            ...GPU_OPTIMIZED_PROPS
          }
        };
      default:
        return config;
    }
  }
}

/**
 * 动画性能监控器
 */
export class AnimationPerformanceMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private fps = 60;
  private isMonitoring = false;
  
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.monitorFrame();
  }
  
  stopMonitoring(): void {
    this.isMonitoring = false;
  }
  
  private monitorFrame(): void {
    if (!this.isMonitoring) return;
    
    const currentTime = performance.now();
    this.frameCount++;
    
    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.frameCount = 0;
      this.lastTime = currentTime;
      
      // 如果FPS低于阈值，触发性能降级
      if (this.fps < 30) {
        this.triggerPerformanceDegradation();
      }
    }
    
    requestAnimationFrame(() => this.monitorFrame());
  }
  
  private triggerPerformanceDegradation(): void {
    // 发送性能降级事件
    window.dispatchEvent(new CustomEvent('animation:performance-low', {
      detail: { fps: this.fps }
    }));
  }
  
  getCurrentFPS(): number {
    return this.fps;
  }
}

// 全局动画系统实例
export const animationSystem = new AnimationConfigGenerator();
export const performanceMonitor = new AnimationPerformanceMonitor();