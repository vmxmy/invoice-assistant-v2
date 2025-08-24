import { useEffect, useRef, useCallback } from 'react';

/**
 * 内存清理管理 Hook
 * 提供全面的资源清理功能，防止内存泄漏
 */

interface CleanupOptions {
  /** 是否启用详细日志 */
  enableVerboseLogging?: boolean;
  /** 清理检查间隔（毫秒） */
  cleanupCheckInterval?: number;
  /** 是否在组件卸载时强制清理 */
  forceCleanupOnUnmount?: boolean;
}

interface CleanupResource {
  id: string;
  type: 'timer' | 'interval' | 'listener' | 'observer' | 'animation' | 'custom';
  resource: any;
  element?: Element | Window | Document;
  cleanup: () => void;
  createdAt: number;
}

export function useMemoryCleanup(options: CleanupOptions = {}) {
  const {
    enableVerboseLogging = process.env.NODE_ENV === 'development',
    cleanupCheckInterval = 30000, // 30秒检查一次
    forceCleanupOnUnmount = true
  } = options;

  // 资源追踪
  const resourcesRef = useRef<Map<string, CleanupResource>>(new Map());
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const componentMountedRef = useRef(true);
  
  // 日志记录
  const log = useCallback((message: string, ...args: any[]) => {
    if (enableVerboseLogging) {
      console.log(`🧹 [MemoryCleanup]: ${message}`, ...args);
    }
  }, [enableVerboseLogging]);

  // 生成唯一资源ID
  const generateResourceId = useCallback(() => {
    return `cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 注册定时器
  const registerTimer = useCallback((
    callback: () => void,
    delay: number,
    type: 'timeout' | 'interval' = 'timeout'
  ) => {
    const id = generateResourceId();
    let timerId: NodeJS.Timeout;

    if (type === 'timeout') {
      timerId = setTimeout(() => {
        if (componentMountedRef.current) {
          callback();
        }
        // 自动清理已完成的timeout
        resourcesRef.current.delete(id);
      }, delay);
    } else {
      timerId = setInterval(() => {
        if (componentMountedRef.current) {
          callback();
        } else {
          clearInterval(timerId);
          resourcesRef.current.delete(id);
        }
      }, delay);
    }

    const resource: CleanupResource = {
      id,
      type: type === 'timeout' ? 'timer' : 'interval',
      resource: timerId,
      cleanup: () => {
        if (type === 'timeout') {
          clearTimeout(timerId);
        } else {
          clearInterval(timerId);
        }
      },
      createdAt: Date.now()
    };

    resourcesRef.current.set(id, resource);
    log(`已注册${type}: ${id}`);
    
    return id;
  }, [generateResourceId, log]);

  // 注册事件监听器
  const registerEventListener = useCallback(<K extends keyof HTMLElementEventMap>(
    element: Element | Window | Document,
    type: K | string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) => {
    const id = generateResourceId();

    // 添加事件监听器
    element.addEventListener(type as K, listener, options);

    const resource: CleanupResource = {
      id,
      type: 'listener',
      resource: { type, listener, options },
      element,
      cleanup: () => {
        element.removeEventListener(type as K, listener, options);
      },
      createdAt: Date.now()
    };

    resourcesRef.current.set(id, resource);
    log(`已注册事件监听器: ${type} on`, element);
    
    return id;
  }, [generateResourceId, log]);

  // 注册 Observer
  const registerObserver = useCallback((
    observer: IntersectionObserver | MutationObserver | ResizeObserver | PerformanceObserver,
    type: string = 'generic'
  ) => {
    const id = generateResourceId();

    const resource: CleanupResource = {
      id,
      type: 'observer',
      resource: observer,
      cleanup: () => {
        observer.disconnect();
      },
      createdAt: Date.now()
    };

    resourcesRef.current.set(id, resource);
    log(`已注册Observer: ${type}`);
    
    return id;
  }, [generateResourceId, log]);

  // 注册动画帧
  const registerAnimationFrame = useCallback((callback: FrameRequestCallback) => {
    const id = generateResourceId();
    const rafId = requestAnimationFrame((time) => {
      if (componentMountedRef.current) {
        callback(time);
      }
      // 自动清理已完成的动画帧
      resourcesRef.current.delete(id);
    });

    const resource: CleanupResource = {
      id,
      type: 'animation',
      resource: rafId,
      cleanup: () => {
        cancelAnimationFrame(rafId);
      },
      createdAt: Date.now()
    };

    resourcesRef.current.set(id, resource);
    log(`已注册动画帧: ${id}`);
    
    return id;
  }, [generateResourceId, log]);

  // 注册自定义清理函数
  const registerCustomCleanup = useCallback((
    cleanupFn: () => void,
    resourceName: string = 'custom'
  ) => {
    const id = generateResourceId();

    const resource: CleanupResource = {
      id,
      type: 'custom',
      resource: resourceName,
      cleanup: cleanupFn,
      createdAt: Date.now()
    };

    resourcesRef.current.set(id, resource);
    log(`已注册自定义清理: ${resourceName}`);
    
    return id;
  }, [generateResourceId, log]);

  // 手动清理单个资源
  const cleanupResource = useCallback((resourceId: string) => {
    const resource = resourcesRef.current.get(resourceId);
    if (resource) {
      try {
        resource.cleanup();
        resourcesRef.current.delete(resourceId);
        log(`已清理资源: ${resourceId} (${resource.type})`);
      } catch (error) {
        console.error(`清理资源失败: ${resourceId}`, error);
      }
    }
  }, [log]);

  // 清理所有资源
  const cleanupAllResources = useCallback(() => {
    const resources = Array.from(resourcesRef.current.values());
    let cleanedCount = 0;
    let errorCount = 0;

    resources.forEach(resource => {
      try {
        resource.cleanup();
        cleanedCount++;
        log(`已清理: ${resource.id} (${resource.type})`);
      } catch (error) {
        errorCount++;
        console.error(`清理资源失败: ${resource.id}`, error);
      }
    });

    resourcesRef.current.clear();
    log(`清理完成: 成功 ${cleanedCount}, 失败 ${errorCount}`);
    
    return { cleaned: cleanedCount, errors: errorCount };
  }, [log]);

  // 清理过期资源（超过指定时间未使用的资源）
  const cleanupStaleResources = useCallback((maxAge: number = 300000) => { // 默认5分钟
    const now = Date.now();
    const staleResources: CleanupResource[] = [];

    resourcesRef.current.forEach(resource => {
      if (now - resource.createdAt > maxAge) {
        staleResources.push(resource);
      }
    });

    staleResources.forEach(resource => {
      cleanupResource(resource.id);
    });

    if (staleResources.length > 0) {
      log(`已清理 ${staleResources.length} 个过期资源`);
    }

    return staleResources.length;
  }, [cleanupResource, log]);

  // 获取资源统计信息
  const getResourceStats = useCallback(() => {
    const stats = {
      total: resourcesRef.current.size,
      byType: {} as Record<string, number>,
      oldest: 0,
      newest: 0
    };

    let oldestTime = Date.now();
    let newestTime = 0;

    resourcesRef.current.forEach(resource => {
      stats.byType[resource.type] = (stats.byType[resource.type] || 0) + 1;
      
      if (resource.createdAt < oldestTime) {
        oldestTime = resource.createdAt;
      }
      if (resource.createdAt > newestTime) {
        newestTime = resource.createdAt;
      }
    });

    if (resourcesRef.current.size > 0) {
      stats.oldest = Date.now() - oldestTime;
      stats.newest = Date.now() - newestTime;
    }

    return stats;
  }, []);

  // 启动定期清理检查
  const startPeriodicCleanup = useCallback(() => {
    if (cleanupTimerRef.current) return;

    cleanupTimerRef.current = setInterval(() => {
      if (!componentMountedRef.current) {
        if (cleanupTimerRef.current) {
          clearInterval(cleanupTimerRef.current);
          cleanupTimerRef.current = null;
        }
        return;
      }

      // 清理过期资源
      const staleCount = cleanupStaleResources();
      
      // 输出统计信息
      if (enableVerboseLogging) {
        const stats = getResourceStats();
        if (stats.total > 0) {
          log('资源统计:', stats);
        }
      }
    }, cleanupCheckInterval);

    log('已启动定期清理检查');
  }, [cleanupCheckInterval, cleanupStaleResources, enableVerboseLogging, getResourceStats, log]);

  // 停止定期清理检查
  const stopPeriodicCleanup = useCallback(() => {
    if (cleanupTimerRef.current) {
      clearInterval(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
      log('已停止定期清理检查');
    }
  }, [log]);

  // 组件挂载时启动定期清理
  useEffect(() => {
    componentMountedRef.current = true;
    startPeriodicCleanup();

    return () => {
      componentMountedRef.current = false;
      stopPeriodicCleanup();
      
      if (forceCleanupOnUnmount) {
        const stats = cleanupAllResources();
        if (stats.cleaned > 0 || stats.errors > 0) {
          console.log(`组件卸载时清理了 ${stats.cleaned} 个资源，${stats.errors} 个清理失败`);
        }
      }
    };
  }, [startPeriodicCleanup, stopPeriodicCleanup, cleanupAllResources, forceCleanupOnUnmount]);

  // 内存压力检测和清理
  const checkMemoryPressure = useCallback(() => {
    try {
      // @ts-ignore - performance.memory 在某些浏览器中可用
      const memory = (performance as any).memory;
      
      if (memory) {
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        if (usagePercent > 85) {
          log(`内存使用率过高: ${usagePercent.toFixed(2)}%，触发紧急清理`);
          
          // 清理过期资源，使用更短的时间阈值
          const staleCount = cleanupStaleResources(60000); // 1分钟
          
          // 强制垃圾回收（如果可用）
          if ('gc' in window) {
            (window as any).gc();
            log('已触发垃圾回收');
          }
          
          return { usagePercent, staleCount, gcTriggered: 'gc' in window };
        }
      }
    } catch (error) {
      console.warn('内存压力检测失败:', error);
    }
    
    return null;
  }, [cleanupStaleResources, log]);

  return {
    // 注册方法
    registerTimer,
    registerEventListener,
    registerObserver,
    registerAnimationFrame,
    registerCustomCleanup,
    
    // 清理方法
    cleanupResource,
    cleanupAllResources,
    cleanupStaleResources,
    
    // 监控方法
    getResourceStats,
    checkMemoryPressure,
    
    // 控制方法
    startPeriodicCleanup,
    stopPeriodicCleanup,
    
    // 状态信息
    isComponentMounted: () => componentMountedRef.current,
    resourceCount: () => resourcesRef.current.size
  };
}

export default useMemoryCleanup;