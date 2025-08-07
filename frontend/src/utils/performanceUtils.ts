/**
 * 性能优化工具函数
 * 用于检测设备性能并提供相应的优化策略
 */

interface DevicePerformance {
  tier: 'low' | 'medium' | 'high';
  maxConcurrentAnimations: number;
  virtualScrollItemHeight: number;
  virtualScrollOverscan: number;
  imageQuality: 'low' | 'medium' | 'high';
  enableAdvancedAnimations: boolean;
  enableParallax: boolean;
  enableBlur: boolean;
  debounceDelay: number;
}

// 检测设备性能等级
export const detectDevicePerformance = (): DevicePerformance => {
  // 默认中等性能配置
  let config: DevicePerformance = {
    tier: 'medium',
    maxConcurrentAnimations: 3,
    virtualScrollItemHeight: 280,
    virtualScrollOverscan: 3,
    imageQuality: 'medium',
    enableAdvancedAnimations: true,
    enableParallax: true,
    enableBlur: true,
    debounceDelay: 300,
  };

  // 检测硬件并发数（CPU核心数的代理指标）
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  
  // 检测内存（如果支持）
  const memory = (navigator as any).deviceMemory || 4;
  
  // 检测连接速度（如果支持）
  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType || '4g';
  
  // 检测是否为移动设备
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // 检测是否为低端设备
  const isLowEndDevice = memory < 2 || hardwareConcurrency < 2;
  
  // 检测是否为慢速网络
  const isSlowNetwork = effectiveType === 'slow-2g' || effectiveType === '2g';

  // 基于检测结果调整配置
  if (isLowEndDevice || isSlowNetwork) {
    config = {
      tier: 'low',
      maxConcurrentAnimations: 1,
      virtualScrollItemHeight: 240,
      virtualScrollOverscan: 1,
      imageQuality: 'low',
      enableAdvancedAnimations: false,
      enableParallax: false,
      enableBlur: false,
      debounceDelay: 500,
    };
  } else if (hardwareConcurrency >= 8 && memory >= 8 && !isMobile) {
    config = {
      tier: 'high',
      maxConcurrentAnimations: 6,
      virtualScrollItemHeight: 320,
      virtualScrollOverscan: 5,
      imageQuality: 'high',
      enableAdvancedAnimations: true,
      enableParallax: true,
      enableBlur: true,
      debounceDelay: 150,
    };
  }

  return config;
};

// 创建防抖函数
export const createDebounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// 创建节流函数
export const createThrottle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// 图片懒加载配置
export const getLazyLoadConfig = (performance: DevicePerformance) => {
  return {
    threshold: performance.tier === 'low' ? 0.5 : 0.1,
    rootMargin: performance.tier === 'low' ? '20px' : '50px',
    placeholder: performance.tier === 'low' ? '/images/placeholder-small.jpg' : '/images/placeholder.jpg',
  };
};

// 虚拟滚动配置
export const getVirtualScrollConfig = (performance: DevicePerformance) => {
  return {
    itemHeight: performance.virtualScrollItemHeight,
    overscanCount: performance.virtualScrollOverscan,
    threshold: performance.tier === 'low' ? 10 : 5,
    minimumBatchSize: performance.tier === 'low' ? 10 : 20,
  };
};

// 动画配置
export const getAnimationConfig = (performance: DevicePerformance) => {
  return {
    duration: performance.tier === 'low' ? 0.1 : 0.3,
    easing: performance.tier === 'low' ? 'linear' : 'cubic-bezier(0.4, 0, 0.2, 1)',
    staggerDelay: performance.tier === 'low' ? 0.02 : 0.05,
    enableSpring: performance.tier !== 'low',
    enableGestures: true,
    maxConcurrent: performance.maxConcurrentAnimations,
  };
};

// 内存管理
export const createMemoryAwareCache = <T>(maxSize: number = 100) => {
  const cache = new Map<string, T>();
  
  return {
    get: (key: string): T | undefined => cache.get(key),
    
    set: (key: string, value: T): void => {
      // 如果缓存已满，删除最旧的项目
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        if (firstKey) {
          cache.delete(firstKey);
        }
      }
      cache.set(key, value);
    },
    
    clear: (): void => cache.clear(),
    
    size: (): number => cache.size,
  };
};

// 性能监控
export const createPerformanceMonitor = () => {
  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 60;

  const measureFPS = () => {
    frameCount++;
    const currentTime = performance.now();
    
    if (currentTime >= lastTime + 1000) {
      fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      frameCount = 0;
      lastTime = currentTime;
    }
    
    requestAnimationFrame(measureFPS);
  };

  // 开始监控
  measureFPS();

  return {
    getFPS: () => fps,
    isPerformanceGood: () => fps >= 30,
  };
};

// 电池优化（如果支持）
export const getBatteryOptimizations = async () => {
  try {
    const battery = await (navigator as any).getBattery?.();
    
    if (battery) {
      const isLowBattery = battery.level < 0.2;
      const isCharging = battery.charging;
      
      return {
        reducedAnimations: isLowBattery && !isCharging,
        lowerRefreshRate: isLowBattery && !isCharging,
        disableBackgroundTasks: isLowBattery && !isCharging,
      };
    }
  } catch (error) {
    // Battery API 不支持或被阻止
  }
  
  return {
    reducedAnimations: false,
    lowerRefreshRate: false,
    disableBackgroundTasks: false,
  };
};

// 网络优化
export const getNetworkOptimizations = () => {
  const connection = (navigator as any).connection;
  
  if (connection) {
    const isSlowConnection = 
      connection.effectiveType === 'slow-2g' || 
      connection.effectiveType === '2g';
    
    const isSaveData = connection.saveData;
    
    return {
      reduceImageQuality: isSlowConnection || isSaveData,
      disablePrefetch: isSlowConnection || isSaveData,
      enableCompression: isSlowConnection,
      reduceConcurrentRequests: isSlowConnection,
    };
  }
  
  return {
    reduceImageQuality: false,
    disablePrefetch: false,
    enableCompression: false,
    reduceConcurrentRequests: false,
  };
};

// 全局性能配置实例
export const globalPerformanceConfig = detectDevicePerformance();

// 性能监控实例
export const performanceMonitor = createPerformanceMonitor();