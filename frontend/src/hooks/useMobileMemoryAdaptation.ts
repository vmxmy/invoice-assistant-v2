import { useState, useEffect, useCallback, useRef } from 'react';
import { memoryMonitor } from '../utils/memoryMonitor';
import { imageCacheManager } from '../utils/imageCacheManager';
import { invoiceDataCache } from '../utils/dataCache';

/**
 * 移动端内存适配Hook
 * 根据设备内存限制动态调整应用行为
 */

interface DeviceMemoryInfo {
  totalMemory: number;    // 总内存（GB）
  availableMemory: number; // 可用内存（GB）
  deviceCategory: 'low-end' | 'mid-range' | 'high-end';
  supportedFeatures: {
    webp: boolean;
    intersectionObserver: boolean;
    performanceObserver: boolean;
    serviceWorker: boolean;
  };
}

interface MemoryAdaptationConfig {
  lowMemoryThreshold: number;     // 低内存模式阈值（MB）
  criticalMemoryThreshold: number; // 关键内存阈值（MB）
  adaptationStrategies: {
    images: 'aggressive' | 'conservative' | 'minimal';
    data: 'aggressive' | 'conservative' | 'minimal';
    animations: 'full' | 'reduced' | 'disabled';
    virtualScrolling: boolean;
    lazyLoading: boolean;
  };
  emergencyCleanup: boolean;
  backgroundTasksReduction: boolean;
}

interface MemoryMode {
  mode: 'normal' | 'low-memory' | 'critical-memory';
  restrictions: {
    maxImagesInCache: number;
    maxDataPagesInCache: number;
    imageQuality: 'high' | 'medium' | 'low';
    disableAnimations: boolean;
    disablePreloading: boolean;
    enableVirtualScrolling: boolean;
    reducedFunctionality: string[];
  };
}

interface AdaptationStats {
  currentMemoryUsage: number;
  memoryPressureLevel: number;
  activatedAdaptations: string[];
  performanceImpact: {
    loadTime: number;
    renderTime: number;
    interactionDelay: number;
  };
  resourceStats: {
    imagesInCache: number;
    dataPagesInCache: number;
    totalCacheSize: number;
  };
}

export function useMobileMemoryAdaptation(config: Partial<MemoryAdaptationConfig> = {}) {
  const fullConfig: MemoryAdaptationConfig = {
    lowMemoryThreshold: 100, // 100MB
    criticalMemoryThreshold: 50, // 50MB
    adaptationStrategies: {
      images: 'conservative',
      data: 'conservative',
      animations: 'reduced',
      virtualScrolling: true,
      lazyLoading: true
    },
    emergencyCleanup: true,
    backgroundTasksReduction: true,
    ...config
  };

  // 状态管理
  const [deviceInfo, setDeviceInfo] = useState<DeviceMemoryInfo | null>(null);
  const [currentMode, setCurrentMode] = useState<MemoryMode>({
    mode: 'normal',
    restrictions: {
      maxImagesInCache: 200,
      maxDataPagesInCache: 25,
      imageQuality: 'high',
      disableAnimations: false,
      disablePreloading: false,
      enableVirtualScrolling: false,
      reducedFunctionality: []
    }
  });
  const [adaptationStats, setAdaptationStats] = useState<AdaptationStats>({
    currentMemoryUsage: 0,
    memoryPressureLevel: 0,
    activatedAdaptations: [],
    performanceImpact: {
      loadTime: 0,
      renderTime: 0,
      interactionDelay: 0
    },
    resourceStats: {
      imagesInCache: 0,
      dataPagesInCache: 0,
      totalCacheSize: 0
    }
  });

  // 引用
  const adaptationsAppliedRef = useRef<Set<string>>(new Set());
  const performanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const emergencyCleanupRef = useRef<boolean>(false);

  /**
   * 检测设备内存信息
   */
  const detectDeviceMemory = useCallback((): DeviceMemoryInfo => {
    // @ts-ignore - navigator.deviceMemory 可能可用
    const deviceMemory = (navigator as any).deviceMemory || 4; // 默认4GB
    
    let deviceCategory: 'low-end' | 'mid-range' | 'high-end' = 'mid-range';
    if (deviceMemory <= 2) deviceCategory = 'low-end';
    else if (deviceMemory >= 6) deviceCategory = 'high-end';

    // 检测支持的特性
    const supportedFeatures = {
      webp: (() => {
        const canvas = document.createElement('canvas');
        return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
      })(),
      intersectionObserver: 'IntersectionObserver' in window,
      performanceObserver: 'PerformanceObserver' in window,
      serviceWorker: 'serviceWorker' in navigator
    };

    // 估算可用内存
    let availableMemory = deviceMemory * 0.7; // 假设可用内存为总内存的70%
    
    try {
      // @ts-ignore
      const memory = (performance as any).memory;
      if (memory) {
        availableMemory = (memory.jsHeapSizeLimit - memory.usedJSHeapSize) / 1024 / 1024 / 1024;
      }
    } catch (e) {
      // 内存API不可用时使用估算值
    }

    return {
      totalMemory: deviceMemory,
      availableMemory,
      deviceCategory,
      supportedFeatures
    };
  }, []);

  /**
   * 计算当前内存使用情况
   */
  const getCurrentMemoryUsage = useCallback((): number => {
    try {
      // @ts-ignore
      const memory = (performance as any).memory;
      if (memory) {
        return memory.usedJSHeapSize / 1024 / 1024; // MB
      }
    } catch (e) {
      // 降级处理：估算内存使用
    }
    
    // 基于缓存大小估算
    const imageStats = imageCacheManager.getStats();
    const dataStats = invoiceDataCache.getStats();
    
    return (imageStats.totalSize + dataStats.totalMemoryUsage) / 1024 / 1024;
  }, []);

  /**
   * 计算内存压力等级
   */
  const calculateMemoryPressure = useCallback((currentUsage: number): number => {
    if (!deviceInfo) return 0;
    
    const totalMemoryMB = deviceInfo.totalMemory * 1024; // 转换为MB
    const usagePercent = (currentUsage / totalMemoryMB) * 100;
    
    return Math.min(100, Math.max(0, usagePercent));
  }, [deviceInfo]);

  /**
   * 应用低内存模式适配
   */
  const applyLowMemoryAdaptations = useCallback(() => {
    const adaptations: string[] = [];
    
    // 图片优化
    if (fullConfig.adaptationStrategies.images === 'aggressive') {
      imageCacheManager.clear();
      adaptations.push('cleared-image-cache');
    } else if (fullConfig.adaptationStrategies.images === 'conservative') {
      // 清理低优先级图片，减少缓存大小
      adaptations.push('reduced-image-cache');
    }
    
    // 数据缓存优化
    if (fullConfig.adaptationStrategies.data === 'aggressive') {
      invoiceDataCache.clear();
      adaptations.push('cleared-data-cache');
    }
    
    // 动画优化
    const root = document.documentElement;
    if (fullConfig.adaptationStrategies.animations === 'disabled') {
      root.style.setProperty('--animation-duration', '0s');
      root.style.setProperty('--transition-duration', '0s');
      root.classList.add('no-animations');
      adaptations.push('disabled-animations');
    } else if (fullConfig.adaptationStrategies.animations === 'reduced') {
      root.style.setProperty('--animation-duration', '0.1s');
      root.style.setProperty('--transition-duration', '0.1s');
      root.classList.add('reduced-animations');
      adaptations.push('reduced-animations');
    }
    
    // 虚拟滚动
    if (fullConfig.adaptationStrategies.virtualScrolling) {
      root.classList.add('force-virtual-scrolling');
      adaptations.push('enabled-virtual-scrolling');
    }
    
    // 懒加载
    if (fullConfig.adaptationStrategies.lazyLoading) {
      root.classList.add('aggressive-lazy-loading');
      adaptations.push('enabled-aggressive-lazy-loading');
    }
    
    return adaptations;
  }, [fullConfig]);

  /**
   * 应用关键内存模式适配
   */
  const applyCriticalMemoryAdaptations = useCallback(() => {
    const adaptations = applyLowMemoryAdaptations();
    
    // 额外的关键模式适配
    const root = document.documentElement;
    
    // 禁用所有动画和过渡
    root.style.setProperty('--animation-play-state', 'paused');
    root.classList.add('critical-memory-mode');
    
    // 强制触发垃圾回收
    if ('gc' in window) {
      (window as any).gc();
    }
    
    // 减少功能
    const reducedFunctionality = [
      'image-previews',
      'auto-save',
      'background-sync',
      'push-notifications'
    ];
    
    adaptations.push('critical-memory-mode', 'forced-gc', 'reduced-functionality');
    
    return { adaptations, reducedFunctionality };
  }, [applyLowMemoryAdaptations]);

  /**
   * 更新内存模式
   */
  const updateMemoryMode = useCallback(() => {
    const currentUsage = getCurrentMemoryUsage();
    const pressureLevel = calculateMemoryPressure(currentUsage);
    
    let newMode: MemoryMode['mode'] = 'normal';
    let restrictions = currentMode.restrictions;
    let activatedAdaptations: string[] = [];
    
    if (currentUsage > fullConfig.criticalMemoryThreshold) {
      newMode = 'critical-memory';
      const result = applyCriticalMemoryAdaptations();
      activatedAdaptations = result.adaptations;
      restrictions = {
        maxImagesInCache: 50,
        maxDataPagesInCache: 5,
        imageQuality: 'low',
        disableAnimations: true,
        disablePreloading: true,
        enableVirtualScrolling: true,
        reducedFunctionality: result.reducedFunctionality
      };
      
      if (!emergencyCleanupRef.current) {
        emergencyCleanupRef.current = true;
        console.warn('🚨 进入关键内存模式，执行紧急清理');
      }
    } else if (currentUsage > fullConfig.lowMemoryThreshold) {
      newMode = 'low-memory';
      activatedAdaptations = applyLowMemoryAdaptations();
      restrictions = {
        maxImagesInCache: 100,
        maxDataPagesInCache: 10,
        imageQuality: 'medium',
        disableAnimations: false,
        disablePreloading: true,
        enableVirtualScrolling: true,
        reducedFunctionality: []
      };
      
      console.warn('⚠️ 进入低内存模式');
    } else {
      newMode = 'normal';
      emergencyCleanupRef.current = false;
      
      // 恢复正常模式
      const root = document.documentElement;
      root.classList.remove('no-animations', 'reduced-animations', 'critical-memory-mode');
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
      root.style.removeProperty('--animation-play-state');
      
      restrictions = {
        maxImagesInCache: 200,
        maxDataPagesInCache: 25,
        imageQuality: 'high',
        disableAnimations: false,
        disablePreloading: false,
        enableVirtualScrolling: false,
        reducedFunctionality: []
      };
    }
    
    // 更新状态
    setCurrentMode({ mode: newMode, restrictions });
    setAdaptationStats(prev => ({
      ...prev,
      currentMemoryUsage: currentUsage,
      memoryPressureLevel: pressureLevel,
      activatedAdaptations,
      resourceStats: {
        imagesInCache: imageCacheManager.getStats().totalImages,
        dataPagesInCache: invoiceDataCache.getStats().totalPages,
        totalCacheSize: (imageCacheManager.getStats().totalSize + invoiceDataCache.getStats().totalMemoryUsage) / 1024 / 1024
      }
    }));
    
    // 记录已应用的适配
    activatedAdaptations.forEach(adaptation => {
      adaptationsAppliedRef.current.add(adaptation);
    });
    
  }, [getCurrentMemoryUsage, calculateMemoryPressure, fullConfig, currentMode.restrictions, applyLowMemoryAdaptations, applyCriticalMemoryAdaptations]);

  /**
   * 监控性能影响
   */
  const measurePerformanceImpact = useCallback(() => {
    const startTime = performance.now();
    
    // 测量渲染时间
    requestAnimationFrame(() => {
      const renderTime = performance.now() - startTime;
      
      setAdaptationStats(prev => ({
        ...prev,
        performanceImpact: {
          ...prev.performanceImpact,
          renderTime
        }
      }));
    });
  }, []);

  /**
   * 执行紧急清理
   */
  const performEmergencyCleanup = useCallback(() => {
    if (!fullConfig.emergencyCleanup) return;
    
    console.warn('🚨 执行紧急内存清理');
    
    // 清理缓存
    imageCacheManager.clear();
    invoiceDataCache.clear();
    
    // 清理DOM
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
      img.removeAttribute('src');
    });
    
    // 强制垃圾回收
    if ('gc' in window) {
      (window as any).gc();
    }
    
    // 通知应用层
    window.dispatchEvent(new CustomEvent('emergency-memory-cleanup'));
    
    console.log('✅ 紧急清理完成');
  }, [fullConfig.emergencyCleanup]);

  /**
   * 获取优化建议
   */
  const getOptimizationSuggestions = useCallback((): string[] => {
    const suggestions: string[] = [];
    const usage = adaptationStats.currentMemoryUsage;
    const pressure = adaptationStats.memoryPressureLevel;
    
    if (pressure > 80) {
      suggestions.push('建议启用虚拟滚动以减少DOM节点');
      suggestions.push('建议减少同时加载的图片数量');
    }
    
    if (usage > fullConfig.lowMemoryThreshold) {
      suggestions.push('建议清理不必要的数据缓存');
      suggestions.push('建议降低图片质量设置');
    }
    
    if (currentMode.mode !== 'normal') {
      suggestions.push('建议避免同时打开多个页面');
      suggestions.push('建议关闭不必要的浏览器标签');
    }
    
    if (deviceInfo && deviceInfo.deviceCategory === 'low-end') {
      suggestions.push('建议在设置中启用"性能优先"模式');
      suggestions.push('建议减少动画效果的使用');
    }
    
    return suggestions;
  }, [adaptationStats, fullConfig, currentMode.mode, deviceInfo]);

  // 初始化设备信息
  useEffect(() => {
    const info = detectDeviceMemory();
    setDeviceInfo(info);
    
    console.log('📱 设备内存信息:', info);
  }, [detectDeviceMemory]);

  // 设置内存监控
  useEffect(() => {
    // 立即检查一次
    updateMemoryMode();
    
    // 定期监控
    const monitoringInterval = setInterval(() => {
      updateMemoryMode();
      measurePerformanceImpact();
    }, 10000); // 每10秒检查一次
    
    // 监听内存压力事件
    memoryMonitor.on('pressure', (data) => {
      if (data.level === 'critical' && fullConfig.emergencyCleanup) {
        performEmergencyCleanup();
      }
    });
    
    // 监听内存泄漏事件
    memoryMonitor.on('leak-detected', () => {
      updateMemoryMode();
    });
    
    // 监听页面可见性变化
    const handleVisibilityChange = () => {
      if (document.hidden && fullConfig.backgroundTasksReduction) {
        // 页面隐藏时清理部分缓存
        imageCacheManager.clear();
        console.log('📱 页面隐藏，清理缓存以释放内存');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(monitoringInterval);
      memoryMonitor.off('pressure');
      memoryMonitor.off('leak-detected');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (performanceTimerRef.current) {
        clearTimeout(performanceTimerRef.current);
      }
    };
  }, [updateMemoryMode, measurePerformanceImpact, fullConfig, performEmergencyCleanup]);

  // 根据内存模式动态调整缓存配置
  useEffect(() => {
    if (currentMode.mode === 'critical-memory') {
      imageCacheManager.updateConfig?.({
        maxSize: 20, // 20MB
        maxImages: 50
      });
      
      invoiceDataCache.updateConfig?.({
        maxPages: 5,
        maxMemoryUsage: 10 // 10MB
      });
    } else if (currentMode.mode === 'low-memory') {
      imageCacheManager.updateConfig?.({
        maxSize: 30, // 30MB
        maxImages: 100
      });
      
      invoiceDataCache.updateConfig?.({
        maxPages: 10,
        maxMemoryUsage: 20 // 20MB
      });
    } else {
      // 正常模式恢复默认配置
      imageCacheManager.updateConfig?.({
        maxSize: 50, // 50MB
        maxImages: 200
      });
      
      invoiceDataCache.updateConfig?.({
        maxPages: 25,
        maxMemoryUsage: 30 // 30MB
      });
    }
  }, [currentMode.mode]);

  return {
    deviceInfo,
    currentMode,
    adaptationStats,
    suggestions: getOptimizationSuggestions(),
    
    // 手动控制方法
    performEmergencyCleanup,
    updateMemoryMode,
    
    // 便捷属性
    isLowMemoryDevice: deviceInfo?.deviceCategory === 'low-end',
    isLowMemoryMode: currentMode.mode === 'low-memory',
    isCriticalMemoryMode: currentMode.mode === 'critical-memory',
    shouldReduceAnimations: currentMode.restrictions.disableAnimations,
    shouldUseVirtualScrolling: currentMode.restrictions.enableVirtualScrolling,
    recommendedImageQuality: currentMode.restrictions.imageQuality,
    
    // 配置访问
    config: fullConfig
  };
}

export default useMobileMemoryAdaptation;