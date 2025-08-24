/**
 * 动画系统上下文提供者
 * 全局管理动画偏好、性能监控和配置
 */

import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAnimationPreferences, UseAnimationPreferencesReturn } from '../hooks/useAnimationPreferences';

// 动画上下文接口
interface AnimationContextValue extends UseAnimationPreferencesReturn {
  // 便捷方法
  isAnimationEnabled: (type: string) => boolean;
  getOptimizedDuration: (baseDuration: number) => number;
  shouldPreventAnimation: () => boolean;
}

// 创建上下文
const AnimationContext = createContext<AnimationContextValue | null>(null);

// 动画提供者组件属性
interface AnimationProviderProps {
  children: ReactNode;
  fallbackToCSS?: boolean; // 是否在性能不足时回退到CSS动画
  debugMode?: boolean; // 是否启用调试模式
}

/**
 * 动画系统提供者组件
 */
export const AnimationProvider: React.FC<AnimationProviderProps> = ({
  children,
  fallbackToCSS = true,
  debugMode = false
}) => {
  const animationPrefs = useAnimationPreferences();
  
  // 性能监控和降级处理
  useEffect(() => {
    const handlePerformanceLow = (event: CustomEvent) => {
      if (debugMode) {
        console.warn('Animation performance low:', event.detail);
      }
      
      // 自动降级动画质量
      animationPrefs.updatePreferences({
        performanceLevel: 'low',
        animationScale: Math.max(0.5, animationPrefs.preferences.animationScale - 0.1)
      });
    };
    
    const handleVisibilityChange = () => {
      // 页面不可见时暂停不必要的动画
      if (document.hidden) {
        document.documentElement.style.setProperty('--animation-play-state', 'paused');
      } else {
        document.documentElement.style.setProperty('--animation-play-state', 'running');
      }
    };
    
    // 监听性能事件
    window.addEventListener('animation:performance-low', handlePerformanceLow as EventListener);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('animation:performance-low', handlePerformanceLow as EventListener);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [animationPrefs, debugMode]);
  
  // 设置全局CSS变量
  useEffect(() => {
    const { preferences, shouldUseSimpleAnimations } = animationPrefs;
    const root = document.documentElement;
    
    // 动画时长缩放
    root.style.setProperty('--animation-scale', preferences.animationScale.toString());
    
    // 性能等级
    root.style.setProperty('--animation-performance', preferences.performanceLevel);
    
    // 是否使用简单动画
    root.style.setProperty('--use-simple-animations', shouldUseSimpleAnimations ? '1' : '0');
    
    // 减少动画设置
    if (animationPrefs.isReducedMotion) {
      root.style.setProperty('--animation-duration-multiplier', '0.01');
    } else {
      root.style.setProperty('--animation-duration-multiplier', '1');
    }
    
    // GPU加速设置
    root.style.setProperty(
      '--gpu-acceleration', 
      animationPrefs.systemConfig.enableGPUAcceleration ? 'auto' : 'none'
    );
  }, [animationPrefs]);
  
  // 便捷方法实现
  const contextValue: AnimationContextValue = {
    ...animationPrefs,
    
    // 检查特定类型的动画是否启用
    isAnimationEnabled: (type: string) => {
      if (animationPrefs.isReducedMotion || animationPrefs.preferences.performanceLevel === 'disabled') {
        return false;
      }
      
      const { enabledFeatures } = animationPrefs;
      
      switch (type) {
        case 'page':
        case 'route':
          return enabledFeatures.pageTransitions;
        case 'list':
        case 'stagger':
          return enabledFeatures.listAnimations;
        case 'button':
        case 'hover':
        case 'micro':
          return enabledFeatures.microInteractions;
        case 'loading':
        case 'skeleton':
          return enabledFeatures.loadingAnimations;
        case 'parallax':
          return enabledFeatures.parallaxEffects;
        default:
          return true;
      }
    },
    
    // 获取优化后的动画时长
    getOptimizedDuration: (baseDuration: number) => {
      if (animationPrefs.isReducedMotion) return 0.01;
      
      const { preferences, shouldUseSimpleAnimations } = animationPrefs;
      let duration = baseDuration * preferences.animationScale;
      
      // 简单动画模式下缩短时长
      if (shouldUseSimpleAnimations) {
        duration *= 0.7;
      }
      
      return Math.max(0.1, duration);
    },
    
    // 检查是否应该完全阻止动画
    shouldPreventAnimation: () => {
      return (
        animationPrefs.isReducedMotion ||
        animationPrefs.preferences.performanceLevel === 'disabled' ||
        (animationPrefs.performanceData?.averageFps || 60) < 15
      );
    }
  };
  
  // 调试信息
  useEffect(() => {
    if (debugMode) {
      console.log('Animation System Status:', {
        preferences: animationPrefs.preferences,
        performanceData: animationPrefs.performanceData,
        systemConfig: animationPrefs.systemConfig,
        enabledFeatures: animationPrefs.enabledFeatures,
        shouldUseSimpleAnimations: animationPrefs.shouldUseSimpleAnimations,
        isReducedMotion: animationPrefs.isReducedMotion
      });
    }
  }, [animationPrefs, debugMode]);
  
  return (
    <AnimationContext.Provider value={contextValue}>
      {children}
    </AnimationContext.Provider>
  );
};

/**
 * 使用动画上下文的钩子
 */
export const useAnimationContext = () => {
  const context = useContext(AnimationContext);
  
  if (!context) {
    throw new Error('useAnimationContext must be used within an AnimationProvider');
  }
  
  return context;
};

/**
 * 动画状态监听钩子
 */
export const useAnimationStatus = () => {
  const { performanceData, preferences, isReducedMotion } = useAnimationContext();
  
  const [status, setStatus] = React.useState<{
    level: 'excellent' | 'good' | 'fair' | 'poor';
    fps: number;
    message: string;
  }>({
    level: 'good',
    fps: 60,
    message: '动画性能良好'
  });
  
  React.useEffect(() => {
    if (!performanceData) return;
    
    const { averageFps, lowFpsCount } = performanceData;
    
    let level: typeof status.level = 'good';
    let message = '动画性能良好';
    
    if (isReducedMotion) {
      level = 'fair';
      message = '已启用减少动画模式';
    } else if (averageFps >= 50) {
      level = 'excellent';
      message = '动画性能优秀';
    } else if (averageFps >= 30) {
      level = 'good';
      message = '动画性能良好';
    } else if (averageFps >= 20) {
      level = 'fair';
      message = '动画性能一般，建议降低动画复杂度';
    } else {
      level = 'poor';
      message = '动画性能较差，建议禁用复杂动画';
    }
    
    // 如果低帧率次数过多，降级评级
    if (lowFpsCount > 5 && level === 'excellent') {
      level = 'good';
    } else if (lowFpsCount > 3 && level === 'good') {
      level = 'fair';
    }
    
    setStatus({
      level,
      fps: averageFps,
      message
    });
  }, [performanceData, isReducedMotion]);
  
  return status;
};

/**
 * 条件动画组件
 * 根据动画偏好决定是否渲染动画版本
 */
interface ConditionalAnimationProps {
  children: ReactNode;
  fallback?: ReactNode;
  type?: string;
  minPerformanceLevel?: 'low' | 'medium' | 'high';
}

export const ConditionalAnimation: React.FC<ConditionalAnimationProps> = ({
  children,
  fallback,
  type = 'default',
  minPerformanceLevel = 'low'
}) => {
  const { isAnimationEnabled, preferences } = useAnimationContext();
  
  // 检查性能等级是否满足要求
  const meetsPerformanceRequirement = () => {
    const levels = { disabled: 0, low: 1, medium: 2, high: 3 };
    const currentLevel = levels[preferences.performanceLevel];
    const requiredLevel = levels[minPerformanceLevel];
    return currentLevel >= requiredLevel;
  };
  
  const shouldShowAnimation = isAnimationEnabled(type) && meetsPerformanceRequirement();
  
  return <>{shouldShowAnimation ? children : (fallback || null)}</>;
};

// 导出动画系统相关的工具方法
export const animationUtils = {
  // 创建响应式动画配置
  createResponsiveConfig: (baseConfig: any, context: AnimationContextValue) => {
    if (context.shouldPreventAnimation()) {
      return { ...baseConfig, duration: 0 };
    }
    
    return {
      ...baseConfig,
      duration: context.getOptimizedDuration(baseConfig.duration || 0.3),
      ease: context.shouldUseSimpleAnimations ? 'easeOut' : baseConfig.ease
    };
  },
  
  // 获取条件CSS类
  getConditionalClasses: (context: AnimationContextValue) => ({
    'reduce-motion': context.isReducedMotion,
    'simple-animations': context.shouldUseSimpleAnimations,
    'gpu-acceleration': context.systemConfig.enableGPUAcceleration,
    [`performance-${context.preferences.performanceLevel}`]: true
  })
};