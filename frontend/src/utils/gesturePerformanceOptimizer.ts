// 手势性能优化工具集合

interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

interface PerformanceMetrics {
  gestureType: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  touchPoints: number;
  eventCount: number;
  frameDrops: number;
  memoryUsage?: number;
}

class GesturePerformanceMonitor {
  private metrics = new Map<string, PerformanceMetrics>();
  private frameCount = 0;
  private lastFrameTime = 0;
  private isMonitoring = false;
  private rafId: number | null = null;

  startMonitoring(gestureId: string, gestureType: string, touchPoints: number) {
    const now = performance.now();
    this.metrics.set(gestureId, {
      gestureType,
      startTime: now,
      touchPoints,
      eventCount: 0,
      frameDrops: 0,
      memoryUsage: this.getMemoryUsage(),
    });

    if (!this.isMonitoring) {
      this.isMonitoring = true;
      this.lastFrameTime = now;
      this.startFrameMonitoring();
    }
  }

  updateMetrics(gestureId: string) {
    const metric = this.metrics.get(gestureId);
    if (metric) {
      metric.eventCount++;
    }
  }

  stopMonitoring(gestureId: string): PerformanceMetrics | null {
    const metric = this.metrics.get(gestureId);
    if (!metric) return null;

    const now = performance.now();
    metric.endTime = now;
    metric.duration = now - metric.startTime;
    metric.memoryUsage = this.getMemoryUsage();

    this.metrics.delete(gestureId);

    // 如果没有其他活跃的手势，停止帧监控
    if (this.metrics.size === 0) {
      this.stopFrameMonitoring();
    }

    return metric;
  }

  private startFrameMonitoring() {
    const monitor = (currentTime: number) => {
      const deltaTime = currentTime - this.lastFrameTime;
      
      // 检测掉帧（假设目标是60fps，即16.67ms/帧）
      if (deltaTime > 20) { // 超过20ms认为是掉帧
        this.metrics.forEach(metric => {
          metric.frameDrops++;
        });
      }

      this.lastFrameTime = currentTime;
      this.frameCount++;

      if (this.isMonitoring) {
        this.rafId = requestAnimationFrame(monitor);
      }
    };

    this.rafId = requestAnimationFrame(monitor);
  }

  private stopFrameMonitoring() {
    this.isMonitoring = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  getReport(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }
}

// 单例模式的性能监控器
export const gesturePerformanceMonitor = new GesturePerformanceMonitor();

// 节流函数 - 限制函数执行频率
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: ThrottleOptions = {}
): T {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;
  const { leading = true, trailing = true } = options;

  const throttled = function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    
    if (!previous && !leading) {
      previous = now;
    }
    
    const remaining = wait - (now - previous);
    
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      return func.apply(this, args);
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        previous = !leading ? 0 : Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  } as T;

  return throttled;
}

// 防抖函数 - 延迟执行，如果在等待期间再次调用则重新计时
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: DebounceOptions = {}
): T {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;
  let maxTimeoutId: NodeJS.Timeout | null = null;
  let result: ReturnType<T>;
  
  const { leading = false, trailing = true, maxWait } = options;
  
  function invokeFunc(time: number) {
    const args = lastArgs!;
    const thisArg = lastThis;
    
    lastArgs = null;
    lastThis = null;
    result = func.apply(thisArg, args);
    return result;
  }
  
  function leadingEdge(time: number) {
    result = invokeFunc(time);
    timeout = setTimeout(timerExpired, wait);
    return leading ? result : undefined;
  }
  
  function remainingWait(time: number) {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;
    
    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }
  
  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    
    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }
  
  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeout = setTimeout(timerExpired, remainingWait(time));
    return undefined;
  }
  
  function trailingEdge(time: number) {
    timeout = null;
    
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = null;
    lastThis = null;
    return result;
  }
  
  let lastCallTime = 0;
  let lastInvokeTime = 0;
  
  const debounced = function (this: any, ...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    
    lastArgs = args;
    lastThis = this;
    lastCallTime = time;
    
    if (isInvoking) {
      if (!timeout) {
        return leadingEdge(lastCallTime);
      }
      if (maxWait !== undefined) {
        timeout = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    
    if (!timeout) {
      timeout = setTimeout(timerExpired, wait);
    }
    
    return result;
  } as T;
  
  return debounced;
}

// RAF 优化包装器
export class RAFOptimizer {
  private callbacks = new Set<() => void>();
  private rafId: number | null = null;
  private isScheduled = false;

  schedule(callback: () => void) {
    this.callbacks.add(callback);
    
    if (!this.isScheduled) {
      this.isScheduled = true;
      this.rafId = requestAnimationFrame(this.flush.bind(this));
    }
  }

  cancel(callback: () => void) {
    this.callbacks.delete(callback);
    
    if (this.callbacks.size === 0 && this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.isScheduled = false;
    }
  }

  private flush() {
    const callbacks = Array.from(this.callbacks);
    this.callbacks.clear();
    this.isScheduled = false;
    this.rafId = null;
    
    callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('RAF callback error:', error);
      }
    });
  }

  clear() {
    this.callbacks.clear();
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.isScheduled = false;
    }
  }
}

// 单例 RAF 优化器
export const rafOptimizer = new RAFOptimizer();

// 内存管理工具
export class GestureMemoryManager {
  private objectPool = new Map<string, any[]>();
  private maxPoolSize = 10;

  getFromPool<T>(type: string, factory: () => T): T {
    const pool = this.objectPool.get(type) || [];
    
    if (pool.length > 0) {
      return pool.pop() as T;
    }
    
    return factory();
  }

  returnToPool(type: string, object: any) {
    const pool = this.objectPool.get(type) || [];
    
    if (pool.length < this.maxPoolSize) {
      // 重置对象状态
      if (object && typeof object === 'object') {
        Object.keys(object).forEach(key => {
          if (typeof object[key] !== 'function') {
            delete object[key];
          }
        });
      }
      
      pool.push(object);
      this.objectPool.set(type, pool);
    }
  }

  clear() {
    this.objectPool.clear();
  }

  getStats() {
    const stats: Record<string, number> = {};
    this.objectPool.forEach((pool, type) => {
      stats[type] = pool.length;
    });
    return stats;
  }
}

// 单例内存管理器
export const gestureMemoryManager = new GestureMemoryManager();

// 批处理优化器
export class BatchProcessor<T> {
  private batch: T[] = [];
  private batchSize: number;
  private timeout: NodeJS.Timeout | null = null;
  private processor: (batch: T[]) => void;
  private maxWaitTime: number;

  constructor(
    processor: (batch: T[]) => void,
    batchSize = 10,
    maxWaitTime = 16 // ~60fps
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.maxWaitTime = maxWaitTime;
  }

  add(item: T) {
    this.batch.push(item);
    
    if (this.batch.length >= this.batchSize) {
      this.flush();
    } else if (!this.timeout) {
      this.timeout = setTimeout(() => this.flush(), this.maxWaitTime);
    }
  }

  private flush() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    
    if (this.batch.length > 0) {
      const currentBatch = this.batch.slice();
      this.batch.length = 0;
      
      try {
        this.processor(currentBatch);
      } catch (error) {
        console.error('Batch processing error:', error);
      }
    }
  }

  clear() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.batch.length = 0;
  }
}

// 性能优化的手势事件处理器
export function createOptimizedGestureHandler<T extends Event>(
  handler: (event: T) => void,
  options: {
    throttleMs?: number;
    debounceMs?: number;
    useRAF?: boolean;
    enableProfiling?: boolean;
  } = {}
) {
  const {
    throttleMs = 16,
    debounceMs,
    useRAF = true,
    enableProfiling = false
  } = options;

  let optimizedHandler = handler;

  // 应用防抖
  if (debounceMs) {
    optimizedHandler = debounce(optimizedHandler, debounceMs);
  }

  // 应用节流
  if (throttleMs && !debounceMs) {
    optimizedHandler = throttle(optimizedHandler, throttleMs);
  }

  // RAF 优化
  if (useRAF) {
    const originalHandler = optimizedHandler;
    optimizedHandler = (event: T) => {
      rafOptimizer.schedule(() => originalHandler(event));
    };
  }

  // 性能监控
  if (enableProfiling) {
    const originalHandler = optimizedHandler;
    optimizedHandler = (event: T) => {
      const gestureId = `${event.type}_${Date.now()}`;
      gesturePerformanceMonitor.startMonitoring(
        gestureId,
        event.type,
        'touches' in event ? (event as any).touches.length : 1
      );
      
      try {
        originalHandler(event);
        gesturePerformanceMonitor.updateMetrics(gestureId);
      } finally {
        const metrics = gesturePerformanceMonitor.stopMonitoring(gestureId);
        if (metrics && metrics.duration! > 16) {
          console.warn('Slow gesture handler:', metrics);
        }
      }
    };
  }

  return optimizedHandler;
}

// 清理所有性能优化资源
export function cleanupPerformanceOptimizers() {
  rafOptimizer.clear();
  gestureMemoryManager.clear();
}

// 导出性能报告
export function getPerformanceReport() {
  return {
    gestureMetrics: gesturePerformanceMonitor.getReport(),
    memoryStats: gestureMemoryManager.getStats(),
    timestamp: new Date().toISOString(),
  };
}