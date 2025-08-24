/**
 * React 渲染优化 Hook
 * 提供系统化的性能优化工具和最佳实践
 */
import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

interface RenderOptimizationConfig {
  enableProfiling?: boolean;
  logRerenders?: boolean;
  enableMemoryCleanup?: boolean;
  debounceTime?: number;
}

interface RenderStats {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  peakMemoryUsage: number;
}

/**
 * 防抖Hook - 优化高频更新
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 节流Hook - 限制函数执行频率
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttleRef = useRef<NodeJS.Timeout>();
  const lastExecRef = useRef(0);

  return useCallback(
    ((...args) => {
      const now = Date.now();
      
      if (now - lastExecRef.current >= delay) {
        callback(...args);
        lastExecRef.current = now;
      } else {
        clearTimeout(throttleRef.current);
        throttleRef.current = setTimeout(() => {
          callback(...args);
          lastExecRef.current = Date.now();
        }, delay - (now - lastExecRef.current));
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * 优化的事件处理Hook
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  // 使用 useCallback 避免不必要的重新创建
  return useCallback(callback, deps);
}

/**
 * 优化的计算Hook
 */
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps);
}

/**
 * 渲染性能监控Hook
 */
export function useRenderProfiler(
  componentName: string,
  config: RenderOptimizationConfig = {}
): RenderStats {
  const {
    enableProfiling = process.env.NODE_ENV === 'development',
    logRerenders = false,
    enableMemoryCleanup = true
  } = config;

  const statsRef = useRef<RenderStats>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    peakMemoryUsage: 0
  });

  const renderStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enableProfiling) return;

    const startTime = performance.now();
    renderStartTimeRef.current = startTime;

    // 更新渲染统计
    const stats = statsRef.current;
    stats.renderCount++;
    
    // 计算渲染时间
    const renderTime = performance.now() - startTime;
    stats.lastRenderTime = renderTime;
    stats.averageRenderTime = (stats.averageRenderTime * (stats.renderCount - 1) + renderTime) / stats.renderCount;

    // 内存使用统计
    if ('memory' in performance) {
      // @ts-ignore
      const memoryUsage = performance.memory.usedJSHeapSize;
      if (memoryUsage > stats.peakMemoryUsage) {
        stats.peakMemoryUsage = memoryUsage;
      }
    }

    // 日志输出
    if (logRerenders) {
      console.log(`🔄 [${componentName}] 重渲染 #${stats.renderCount}`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        averageTime: `${stats.averageRenderTime.toFixed(2)}ms`,
        memoryUsage: stats.peakMemoryUsage > 0 ? `${(stats.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A'
      });
    }

    // 性能警告
    if (renderTime > 16) { // 超过一帧时间
      console.warn(`⚠️ [${componentName}] 渲染时间过长: ${renderTime.toFixed(2)}ms`);
    }

    if (stats.renderCount > 10 && stats.averageRenderTime > 10) {
      console.warn(`⚠️ [${componentName}] 平均渲染时间较高: ${stats.averageRenderTime.toFixed(2)}ms`);
    }
  });

  // 清理函数
  useEffect(() => {
    if (!enableMemoryCleanup) return;

    return () => {
      // 清理可能的内存引用
      if (logRerenders) {
        console.log(`🧹 [${componentName}] 组件卸载，清理资源`);
      }
    };
  }, [componentName, logRerenders, enableMemoryCleanup]);

  return statsRef.current;
}

/**
 * 智能重渲染优化Hook
 */
export function useSmartMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  maxAge = 60000 // 1分钟
): T {
  const cacheRef = useRef<{
    value: T;
    deps: React.DependencyList;
    timestamp: number;
  } | null>(null);

  return useMemo(() => {
    const now = Date.now();
    const cache = cacheRef.current;

    // 检查缓存是否有效
    if (cache && 
        cache.deps.length === deps.length &&
        cache.deps.every((dep, index) => Object.is(dep, deps[index])) &&
        now - cache.timestamp < maxAge) {
      return cache.value;
    }

    // 重新计算值
    const newValue = factory();
    cacheRef.current = {
      value: newValue,
      deps: [...deps],
      timestamp: now
    };

    return newValue;
  }, deps);
}

/**
 * 虚拟化列表优化Hook
 */
export function useVirtualizationOptimization(
  itemCount: number,
  itemHeight: number,
  containerHeight: number
) {
  return useMemo(() => {
    const visibleItemCount = Math.ceil(containerHeight / itemHeight);
    const overscanCount = Math.min(5, Math.ceil(visibleItemCount * 0.3));
    
    return {
      visibleItemCount,
      overscanCount,
      shouldVirtualize: itemCount > visibleItemCount * 2
    };
  }, [itemCount, itemHeight, containerHeight]);
}

/**
 * 条件渲染优化Hook
 */
export function useConditionalRender<T>(
  condition: boolean,
  factory: () => T,
  fallback: T | null = null
): T | null {
  return useMemo(() => {
    return condition ? factory() : fallback;
  }, [condition, factory, fallback]);
}

/**
 * 异步状态优化Hook
 */
export function useAsyncState<T>(
  asyncFunction: () => Promise<T>,
  deps: React.DependencyList,
  options: {
    retryCount?: number;
    retryDelay?: number;
    cacheTime?: number;
  } = {}
) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: false,
    error: null
  });

  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  const { retryCount = 2, retryDelay = 1000, cacheTime = 300000 } = options;

  const execute = useCallback(async () => {
    const cacheKey = JSON.stringify(deps);
    const cached = cacheRef.current.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      setState({ data: cached.data, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    let lastError: Error | null = null;
    
    for (let i = 0; i <= retryCount; i++) {
      try {
        const data = await asyncFunction();
        cacheRef.current.set(cacheKey, { data, timestamp: Date.now() });
        setState({ data, loading: false, error: null });
        return;
      } catch (error) {
        lastError = error as Error;
        if (i < retryCount) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    setState({ data: null, loading: false, error: lastError });
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return state;
}

/**
 * 综合渲染优化Hook
 */
export function useRenderOptimization(
  componentName: string,
  config: RenderOptimizationConfig = {}
) {
  const stats = useRenderProfiler(componentName, config);
  
  return {
    stats,
    useDebounce,
    useThrottle,
    useOptimizedCallback,
    useOptimizedMemo,
    useSmartMemo,
    useVirtualizationOptimization,
    useConditionalRender,
    useAsyncState
  };
}