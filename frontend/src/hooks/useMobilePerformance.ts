import { useEffect, useCallback, useRef, useState } from 'react';
import { useDeviceDetection } from './useMediaQuery';

interface PerformanceMetrics {
  fps: number;
  memory?: number;
  networkType: string;
  isLowPowerMode: boolean;
  isSlowDevice: boolean;
}

interface PerformanceOptions {
  /** 启用性能监控 */
  enableMonitoring?: boolean;
  /** 启用低性能设备优化 */
  enableLowEndOptimization?: boolean;
  /** 启用内存管理 */
  enableMemoryManagement?: boolean;
  /** 启用网络优化 */
  enableNetworkOptimization?: boolean;
  /** FPS 监控间隔（毫秒） */
  fpsMonitorInterval?: number;
  /** 低端设备阈值 */
  lowEndDeviceThreshold?: number;
}

interface PerformanceCallbacks {
  /** 性能变化回调 */
  onPerformanceChange?: (metrics: PerformanceMetrics) => void;
  /** 低性能检测回调 */
  onLowPerformance?: () => void;
  /** 内存警告回调 */
  onMemoryWarning?: () => void;
}

export function useMobilePerformance(
  options: PerformanceOptions = {},
  callbacks: PerformanceCallbacks = {}
) {
  const device = useDeviceDetection();
  
  const {
    enableMonitoring = true,
    enableLowEndOptimization = true,
    enableMemoryManagement = true,
    enableNetworkOptimization = true,
    fpsMonitorInterval = 1000,
    lowEndDeviceThreshold = 30
  } = options;

  const {
    onPerformanceChange,
    onLowPerformance,
    onMemoryWarning
  } = callbacks;

  // 性能指标状态
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: 0,
    networkType: 'unknown',
    isLowPowerMode: false,
    isSlowDevice: false
  });

  // FPS 监控
  const frameCount = useRef(0);
  const lastFrameTime = useRef(performance.now());
  const fpsTimer = useRef<NodeJS.Timeout | null>(null);
  const rafId = useRef<number | null>(null);

  // 内存监控
  const memoryCheckTimer = useRef<NodeJS.Timeout | null>(null);

  // FPS 计算回调
  const measureFPS = useCallback(() => {
    frameCount.current++;
    
    const countFrames = () => {
      rafId.current = requestAnimationFrame(() => {
        measureFPS();
      });
    };

    countFrames();
  }, []);

  // 开始 FPS 监控
  const startFPSMonitoring = useCallback(() => {
    if (!enableMonitoring || !device.isMobile) return;

    frameCount.current = 0;
    lastFrameTime.current = performance.now();
    
    // 开始计数帧
    measureFPS();
    
    // 定期计算 FPS
    fpsTimer.current = setInterval(() => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTime.current;
      const fps = Math.round((frameCount.current * 1000) / deltaTime);
      
      setMetrics(prev => {
        const newMetrics = { ...prev, fps };
        
        // 检测低性能
        if (fps < lowEndDeviceThreshold && !prev.isSlowDevice) {
          const updatedMetrics = { ...newMetrics, isSlowDevice: true };
          onLowPerformance?.();
          onPerformanceChange?.(updatedMetrics);
          return updatedMetrics;
        }
        
        onPerformanceChange?.(newMetrics);
        return newMetrics;
      });
      
      // 重置计数器
      frameCount.current = 0;
      lastFrameTime.current = currentTime;
    }, fpsMonitorInterval);
  }, [
    enableMonitoring, device.isMobile, measureFPS, fpsMonitorInterval,
    lowEndDeviceThreshold, onLowPerformance, onPerformanceChange
  ]);

  // 停止 FPS 监控
  const stopFPSMonitoring = useCallback(() => {
    if (fpsTimer.current) {
      clearInterval(fpsTimer.current);
      fpsTimer.current = null;
    }
    
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  // 内存监控
  const checkMemory = useCallback(() => {
    if (!enableMemoryManagement) return;

    try {
      // @ts-ignore - performance.memory 在某些浏览器中可用
      const memory = (performance as any).memory;
      
      if (memory) {
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
        const usagePercent = (usedMB / limitMB) * 100;
        
        setMetrics(prev => ({ ...prev, memory: usedMB }));
        
        // 内存使用率超过 80% 时触发警告
        if (usagePercent > 80) {
          onMemoryWarning?.();
        }
      }
    } catch (error) {
      console.warn('Memory monitoring not available:', error);
    }
  }, [enableMemoryManagement, onMemoryWarning]);

  // 网络类型检测
  const detectNetworkType = useCallback(() => {
    if (!enableNetworkOptimization || !device.isMobile) return;

    try {
      // @ts-ignore - navigator.connection 在某些浏览器中可用
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      if (connection) {
        const effectiveType = connection.effectiveType || 'unknown';
        
        setMetrics(prev => ({ ...prev, networkType: effectiveType }));
        
        // 检测慢速网络
        const isSlowNetwork = ['slow-2g', '2g'].includes(effectiveType);
        if (isSlowNetwork && !metrics.isSlowDevice) {
          setMetrics(prev => {
            const newMetrics = { ...prev, isSlowDevice: true };
            onLowPerformance?.();
            return newMetrics;
          });
        }
      }
    } catch (error) {
      console.warn('Network monitoring not available:', error);
    }
  }, [enableNetworkOptimization, device.isMobile, metrics.isSlowDevice, onLowPerformance]);

  // 低功耗模式检测
  const detectLowPowerMode = useCallback(() => {
    if (!device.isMobile) return;

    try {
      // 通过检查 CSS media query 来检测低功耗模式
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const isLowPowerMode = mediaQuery.matches;
      
      setMetrics(prev => ({ ...prev, isLowPowerMode }));
    } catch (error) {
      console.warn('Low power mode detection not available:', error);
    }
  }, [device.isMobile]);

  // 性能优化建议
  const getOptimizationSuggestions = useCallback(() => {
    const suggestions = [];
    
    if (metrics.fps < 30) {
      suggestions.push({
        type: 'fps',
        message: 'FPS过低，建议减少动画效果',
        action: 'reduceAnimations'
      });
    }
    
    if (metrics.memory && metrics.memory > 100) {
      suggestions.push({
        type: 'memory',
        message: '内存使用较高，建议清理缓存',
        action: 'clearCache'
      });
    }
    
    if (['slow-2g', '2g'].includes(metrics.networkType)) {
      suggestions.push({
        type: 'network',
        message: '网络较慢，建议延迟加载图片',
        action: 'lazyLoadImages'
      });
    }
    
    if (metrics.isLowPowerMode) {
      suggestions.push({
        type: 'power',
        message: '低功耗模式已启用，建议减少后台任务',
        action: 'reduceBgTasks'
      });
    }
    
    return suggestions;
  }, [metrics]);

  // 应用性能优化
  const applyOptimizations = useCallback(() => {
    if (!enableLowEndOptimization) return;
    
    const root = document.documentElement;
    
    if (metrics.isSlowDevice || metrics.fps < 30) {
      // 禁用复杂动画
      root.style.setProperty('--animation-duration', '0.1s');
      root.style.setProperty('--transition-duration', '0.1s');
      
      // 减少阴影效果
      root.classList.add('low-performance-mode');
      
      console.log('🚀 [Performance] 已启用低端设备优化');
    }
    
    if (metrics.isLowPowerMode) {
      // 减少动画
      root.style.setProperty('--animation-play-state', 'paused');
      
      console.log('🔋 [Performance] 已启用省电模式优化');
    }
  }, [enableLowEndOptimization, metrics]);

  // 清理内存
  const clearMemoryCache = useCallback(() => {
    try {
      // 清理图片缓存
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (img.src && !img.getBoundingClientRect().top) {
          // 移除不在视口中的图片
          img.src = '';
        }
      });
      
      // 触发垃圾回收（如果可用）
      if ('gc' in window) {
        (window as any).gc();
      }
      
      console.log('🧹 [Performance] 内存缓存已清理');
    } catch (error) {
      console.warn('Memory cleanup failed:', error);
    }
  }, []);

  // 预加载关键资源
  const preloadCriticalResources = useCallback((urls: string[]) => {
    if (metrics.networkType === 'slow-2g' || metrics.networkType === '2g') {
      // 慢速网络下不预加载
      return;
    }
    
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }, [metrics.networkType]);

  // 初始化性能监控
  useEffect(() => {
    if (!device.isMobile) return;
    
    // 检测设备能力
    detectNetworkType();
    detectLowPowerMode();
    
    // 开始监控
    if (enableMonitoring) {
      startFPSMonitoring();
      
      if (enableMemoryManagement) {
        checkMemory();
        memoryCheckTimer.current = setInterval(checkMemory, 10000); // 每10秒检查一次
      }
    }
    
    return () => {
      stopFPSMonitoring();
      
      if (memoryCheckTimer.current) {
        clearInterval(memoryCheckTimer.current);
      }
    };
  }, [
    device.isMobile, enableMonitoring, enableMemoryManagement,
    startFPSMonitoring, stopFPSMonitoring, checkMemory,
    detectNetworkType, detectLowPowerMode
  ]);

  // 应用优化
  useEffect(() => {
    applyOptimizations();
  }, [applyOptimizations]);

  // 网络状态变化监听
  useEffect(() => {
    if (!enableNetworkOptimization || !device.isMobile) return;
    
    const handleOnline = () => {
      console.log('📶 [Performance] 网络已连接');
    };
    
    const handleOffline = () => {
      console.log('📵 [Performance] 网络已断开');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enableNetworkOptimization, device.isMobile]);

  return {
    // 性能指标
    metrics,
    
    // 优化建议
    suggestions: getOptimizationSuggestions(),
    
    // 工具方法
    clearMemoryCache,
    preloadCriticalResources,
    applyOptimizations,
    
    // 监控控制
    startMonitoring: startFPSMonitoring,
    stopMonitoring: stopFPSMonitoring,
    
    // 便捷属性
    isLowEndDevice: metrics.isSlowDevice,
    isSlowNetwork: ['slow-2g', '2g'].includes(metrics.networkType),
    shouldReduceMotion: metrics.isLowPowerMode || metrics.fps < 30,
    shouldLazyLoad: ['slow-2g', '2g', '3g'].includes(metrics.networkType)
  };
}

export default useMobilePerformance;