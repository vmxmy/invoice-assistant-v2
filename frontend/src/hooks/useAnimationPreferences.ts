/**
 * 动画偏好设置管理钩子
 * 处理用户动画偏好、性能监控和自适应调整
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimationPreferences, AnimationSystemConfig, DEFAULT_ANIMATION_PREFERENCES, DEFAULT_ANIMATION_CONFIG } from '../animations/animationSystem';

// 本地存储键
const ANIMATION_PREFERENCES_KEY = 'animation-preferences';
const PERFORMANCE_DATA_KEY = 'animation-performance';

// 性能数据接口
interface PerformanceData {
  averageFps: number;
  lowFpsCount: number;
  lastUpdated: number;
  deviceScore: number; // 1-10, 设备性能评分
}

// 动画偏好钩子返回类型
export interface UseAnimationPreferencesReturn {
  preferences: AnimationPreferences;
  updatePreferences: (newPreferences: Partial<AnimationPreferences>) => void;
  resetToDefaults: () => void;
  isReducedMotion: boolean;
  performanceData: PerformanceData | null;
  systemConfig: AnimationSystemConfig;
  shouldUseSimpleAnimations: boolean;
  enabledFeatures: {
    pageTransitions: boolean;
    listAnimations: boolean;
    microInteractions: boolean;
    loadingAnimations: boolean;
    parallaxEffects: boolean;
  };
}

/**
 * 检测设备性能评分
 */
const detectDevicePerformance = (): number => {
  // 基于硬件并发数、内存信息等评估设备性能
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  const memory = (navigator as any).deviceMemory || 4; // GB
  
  // 简单的评分算法
  let score = 5; // 基础分
  
  // CPU核心数加分
  if (hardwareConcurrency >= 8) score += 2;
  else if (hardwareConcurrency >= 4) score += 1;
  else if (hardwareConcurrency <= 2) score -= 1;
  
  // 内存加分
  if (memory >= 8) score += 2;
  else if (memory >= 4) score += 1;
  else if (memory <= 2) score -= 2;
  
  // 用户代理字符串检测（移动设备通常性能较低）
  const userAgent = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad/.test(userAgent)) {
    score -= 1;
  }
  
  return Math.max(1, Math.min(10, score));
};

/**
 * FPS监控器
 */
class FpsMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private isMonitoring = false;
  private samples: number[] = [];
  private onFpsUpdate?: (fps: number) => void;
  
  start(onFpsUpdate?: (fps: number) => void) {
    this.onFpsUpdate = onFpsUpdate;
    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.monitor();
  }
  
  stop() {
    this.isMonitoring = false;
  }
  
  private monitor = () => {
    if (!this.isMonitoring) return;
    
    const currentTime = performance.now();
    this.frameCount++;
    
    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.samples.push(this.fps);
      
      // 保留最近10个样本
      if (this.samples.length > 10) {
        this.samples = this.samples.slice(-10);
      }
      
      this.frameCount = 0;
      this.lastTime = currentTime;
      
      this.onFpsUpdate?.(this.fps);
    }
    
    requestAnimationFrame(this.monitor);
  };
  
  getAverageFps(): number {
    if (this.samples.length === 0) return 60;
    return this.samples.reduce((sum, fps) => sum + fps, 0) / this.samples.length;
  }
  
  getLowFpsCount(): number {
    return this.samples.filter(fps => fps < 30).length;
  }
}

/**
 * 动画偏好设置钩子
 */
export const useAnimationPreferences = (): UseAnimationPreferencesReturn => {
  // 状态管理
  const [preferences, setPreferences] = useState<AnimationPreferences>(DEFAULT_ANIMATION_PREFERENCES);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [systemConfig, setSystemConfig] = useState<AnimationSystemConfig>(DEFAULT_ANIMATION_CONFIG);
  
  // FPS监控器引用
  const fpsMonitor = useRef<FpsMonitor>();
  const performanceCheckInterval = useRef<NodeJS.Timeout>();
  
  // 检测是否启用了减少动画
  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  
  // 从本地存储加载偏好设置
  useEffect(() => {
    const loadPreferences = () => {
      try {
        const stored = localStorage.getItem(ANIMATION_PREFERENCES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences({ ...DEFAULT_ANIMATION_PREFERENCES, ...parsed });
        }
      } catch (error) {
        console.warn('Failed to load animation preferences:', error);
      }
    };
    
    const loadPerformanceData = () => {
      try {
        const stored = localStorage.getItem(PERFORMANCE_DATA_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // 检查数据是否过期（24小时）
          if (Date.now() - parsed.lastUpdated < 24 * 60 * 60 * 1000) {
            setPerformanceData(parsed);
          }
        }
      } catch (error) {
        console.warn('Failed to load performance data:', error);
      }
    };
    
    loadPreferences();
    loadPerformanceData();
  }, []);
  
  // 监听系统减少动画偏好设置变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // 初始化性能监控
  useEffect(() => {
    if (!performanceData) {
      // 初次运行，创建性能数据
      const deviceScore = detectDevicePerformance();
      const initialData: PerformanceData = {
        averageFps: 60,
        lowFpsCount: 0,
        lastUpdated: Date.now(),
        deviceScore
      };
      setPerformanceData(initialData);
    }
    
    // 启动FPS监控
    if (!fpsMonitor.current) {
      fpsMonitor.current = new FpsMonitor();
    }
    
    fpsMonitor.current.start((fps) => {
      // 实时FPS更新处理
      if (fps < 20) {
        // FPS过低，触发性能降级
        handlePerformanceDegradation();
      }
    });
    
    // 定期更新性能数据
    performanceCheckInterval.current = setInterval(() => {
      updatePerformanceData();
    }, 10000); // 每10秒更新一次
    
    return () => {
      fpsMonitor.current?.stop();
      if (performanceCheckInterval.current) {
        clearInterval(performanceCheckInterval.current);
      }
    };
  }, []);
  
  // 性能降级处理
  const handlePerformanceDegradation = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      performanceLevel: 'low',
      animationScale: Math.max(0.5, prev.animationScale - 0.1)
    }));
    
    // 触发性能降级事件
    window.dispatchEvent(new CustomEvent('animation:performance-degraded', {
      detail: { reason: 'low-fps' }
    }));
  }, []);
  
  // 更新性能数据
  const updatePerformanceData = useCallback(() => {
    if (fpsMonitor.current && performanceData) {
      const averageFps = fpsMonitor.current.getAverageFps();
      const lowFpsCount = fpsMonitor.current.getLowFpsCount();
      
      const newData: PerformanceData = {
        ...performanceData,
        averageFps,
        lowFpsCount,
        lastUpdated: Date.now()
      };
      
      setPerformanceData(newData);
      
      // 保存到本地存储
      try {
        localStorage.setItem(PERFORMANCE_DATA_KEY, JSON.stringify(newData));
      } catch (error) {
        console.warn('Failed to save performance data:', error);
      }
    }
  }, [performanceData]);
  
  // 更新偏好设置
  const updatePreferences = useCallback((newPreferences: Partial<AnimationPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPreferences };
      
      // 保存到本地存储
      try {
        localStorage.setItem(ANIMATION_PREFERENCES_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save animation preferences:', error);
      }
      
      return updated;
    });
  }, []);
  
  // 重置为默认设置
  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_ANIMATION_PREFERENCES);
    try {
      localStorage.removeItem(ANIMATION_PREFERENCES_KEY);
    } catch (error) {
      console.warn('Failed to reset preferences:', error);
    }
  }, []);
  
  // 计算是否应该使用简单动画
  const shouldUseSimpleAnimations = useCallback((): boolean => {
    // 用户明确要求减少动画
    if (isReducedMotion || preferences.reduceMotion) return true;
    
    // 性能等级为低
    if (preferences.performanceLevel === 'low' || preferences.performanceLevel === 'disabled') return true;
    
    // 设备性能评分过低
    if (performanceData && performanceData.deviceScore < 4) return true;
    
    // FPS过低次数过多
    if (performanceData && performanceData.lowFpsCount > 3) return true;
    
    return false;
  }, [isReducedMotion, preferences, performanceData]);
  
  // 计算启用的功能
  const enabledFeatures = useCallback(() => {
    const simple = shouldUseSimpleAnimations();
    const disabled = preferences.performanceLevel === 'disabled' || isReducedMotion;
    
    return {
      pageTransitions: !disabled && (simple ? preferences.performanceLevel !== 'low' : true),
      listAnimations: !disabled,
      microInteractions: !disabled,
      loadingAnimations: !disabled,
      parallaxEffects: !disabled && !simple && preferences.enableParallax
    };
  }, [shouldUseSimpleAnimations, preferences, isReducedMotion]);
  
  // 根据性能调整系统配置
  useEffect(() => {
    const simple = shouldUseSimpleAnimations();
    const deviceScore = performanceData?.deviceScore || 5;
    
    setSystemConfig({
      frameRate: simple ? 30 : 60,
      enableGPUAcceleration: deviceScore > 3,
      maxConcurrentAnimations: simple ? 4 : deviceScore > 6 ? 12 : 8,
      preloadKeyframes: deviceScore > 4
    });
  }, [shouldUseSimpleAnimations, performanceData]);
  
  return {
    preferences,
    updatePreferences,
    resetToDefaults,
    isReducedMotion,
    performanceData,
    systemConfig,
    shouldUseSimpleAnimations: shouldUseSimpleAnimations(),
    enabledFeatures: enabledFeatures()
  };
};

/**
 * 动画偏好设置上下文提供者钩子
 */
export const useAnimationContext = () => {
  const animationPrefs = useAnimationPreferences();
  
  // 提供便捷的动画配置获取方法
  const getAnimationConfig = useCallback((
    type: 'page' | 'list' | 'modal' | 'button' | 'loading'
  ) => {
    const { preferences, shouldUseSimpleAnimations } = animationPrefs;
    
    if (preferences.performanceLevel === 'disabled' || animationPrefs.isReducedMotion) {
      return {
        duration: 0,
        enabled: false
      };
    }
    
    const baseDuration = shouldUseSimpleAnimations ? 0.2 : 0.3;
    
    return {
      duration: baseDuration * preferences.animationScale,
      enabled: true,
      simple: shouldUseSimpleAnimations
    };
  }, [animationPrefs]);
  
  return {
    ...animationPrefs,
    getAnimationConfig
  };
};