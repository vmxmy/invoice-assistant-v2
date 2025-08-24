/**
 * 移动端优化的网络请求 Hook
 * 集成智能重试、错误处理、性能监控
 */

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { networkRequestManager, type NetworkInfo, type RetryConfig } from '../utils/networkRequestManager';

export interface NetworkRequestOptions {
  // 重试配置
  retryConfig?: Partial<RetryConfig>;
  
  // 网络适配
  skipOnSlowNetwork?: boolean;
  skipOnOffline?: boolean;
  
  // 缓存策略
  staleTime?: number;
  gcTime?: number;
  
  // 回调函数
  onRetry?: (attempt: number, error: any) => void;
  onNetworkChange?: (networkInfo: NetworkInfo) => void;
  
  // 性能监控
  enableMetrics?: boolean;
}

/**
 * 网络请求状态 Hook
 */
export function useNetworkStatus() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>(() => 
    networkRequestManager.getNetworkInfo()
  );

  useEffect(() => {
    const handleNetworkChange = (info: NetworkInfo) => {
      setNetworkInfo(info);
    };

    networkRequestManager.addNetworkListener(handleNetworkChange);

    // 初始检查
    setNetworkInfo(networkRequestManager.getNetworkInfo());

    return () => {
      networkRequestManager.removeNetworkListener(handleNetworkChange);
    };
  }, []);

  return {
    networkInfo,
    isOnline: networkInfo.isOnline,
    isSlowNetwork: networkInfo.isSlowNetwork,
    isMobile: networkInfo.isMobile,
    connectionQuality: networkInfo.connectionQuality,
    effectiveType: networkInfo.effectiveType,
  };
}

/**
 * 智能网络请求查询 Hook
 */
export function useNetworkQuery<TData = unknown, TError = Error>(
  queryKey: any[],
  queryFn: () => Promise<TData>,
  options: NetworkRequestOptions & {
    enabled?: boolean;
    initialData?: TData;
    placeholderData?: TData;
    refetchInterval?: number;
  } = {}
) {
  const {
    retryConfig,
    skipOnSlowNetwork = false,
    skipOnOffline = true,
    enableMetrics = true,
    onRetry,
    onNetworkChange,
    enabled = true,
    ...queryOptions
  } = options;

  const { networkInfo } = useNetworkStatus();
  
  // 网络状态变化通知
  useEffect(() => {
    onNetworkChange?.(networkInfo);
  }, [networkInfo, onNetworkChange]);

  // 决定是否应该执行查询
  const shouldExecuteQuery = useCallback(() => {
    if (!enabled) return false;
    
    // 在开发环境下，不要因为网络状态跳过查询
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    
    if (skipOnOffline && !networkInfo.isOnline) return false;
    if (skipOnSlowNetwork && networkInfo.isSlowNetwork) return false;
    return true;
  }, [enabled, skipOnOffline, skipOnSlowNetwork, networkInfo]);

  // 包装查询函数以支持智能重试
  const wrappedQueryFn = useCallback(async () => {
    const url = Array.isArray(queryKey) ? queryKey.join('/') : String(queryKey);
    
    return networkRequestManager.executeWithRetry(
      queryFn,
      {
        url,
        method: 'GET',
        retryConfig,
        onRetry,
        onSuccess: enableMetrics ? (result, metrics) => {
          console.log(`✅ [useNetworkQuery] 查询成功: ${url}`, {
            duration: `${metrics.duration?.toFixed(0)}ms`,
            retries: metrics.retryCount,
            network: metrics.networkType
          });
        } : undefined,
        onError: enableMetrics ? (error, metrics) => {
          console.error(`❌ [useNetworkQuery] 查询失败: ${url}`, {
            duration: `${metrics.duration?.toFixed(0)}ms`,
            retries: metrics.retryCount,
            error: metrics.error,
            network: metrics.networkType
          });
        } : undefined,
      }
    );
  }, [queryFn, queryKey, retryConfig, onRetry, enableMetrics]);

  // 基于网络状态的动态配置
  const adaptiveConfig = useCallback(() => {
    const { isSlowNetwork, isMobile, connectionQuality } = networkInfo;
    
    let staleTime = options.staleTime;
    let gcTime = options.gcTime;

    if (!staleTime) {
      switch (connectionQuality) {
        case 'excellent':
          staleTime = 2 * 60 * 1000; // 2分钟
          break;
        case 'good':
          staleTime = 5 * 60 * 1000; // 5分钟
          break;
        case 'fair':
          staleTime = 10 * 60 * 1000; // 10分钟
          break;
        case 'poor':
          staleTime = 15 * 60 * 1000; // 15分钟
          break;
        default:
          staleTime = 5 * 60 * 1000;
      }
    }

    if (!gcTime) {
      gcTime = isSlowNetwork || isMobile ? 30 * 60 * 1000 : 10 * 60 * 1000;
    }

    return { staleTime, gcTime };
  }, [networkInfo, options.staleTime, options.gcTime]);

  const adaptiveSettings = adaptiveConfig();

  return useQuery({
    queryKey,
    queryFn: wrappedQueryFn,
    enabled: shouldExecuteQuery(),
    ...adaptiveSettings,
    ...queryOptions,
    retry: false, // 禁用默认重试，使用我们的智能重试
    networkMode: 'online',
  });
}

/**
 * 智能网络请求变更 Hook
 */
export function useNetworkMutation<TData = unknown, TError = Error, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: NetworkRequestOptions & {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: TError, variables: TVariables) => void;
    onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void;
  } = {}
) {
  const {
    retryConfig,
    skipOnOffline = true,
    enableMetrics = true,
    onRetry,
    onNetworkChange,
    onSuccess,
    onError: onErrorCallback,
    onSettled,
    ...mutationOptions
  } = options;

  const { networkInfo } = useNetworkStatus();
  const queryClient = useQueryClient();

  // 网络状态变化通知
  useEffect(() => {
    onNetworkChange?.(networkInfo);
  }, [networkInfo, onNetworkChange]);

  // 包装变更函数以支持智能重试
  const wrappedMutationFn = useCallback(async (variables: TVariables) => {
    // 检查网络状态
    if (skipOnOffline && !networkInfo.isOnline) {
      throw new Error('网络离线，无法执行操作');
    }

    const url = 'mutation';
    
    return networkRequestManager.executeWithRetry(
      () => mutationFn(variables),
      {
        url,
        method: 'POST',
        retryConfig,
        onRetry,
        onSuccess: enableMetrics ? (result, metrics) => {
          console.log(`✅ [useNetworkMutation] 变更成功: ${url}`, {
            duration: `${metrics.duration?.toFixed(0)}ms`,
            retries: metrics.retryCount,
            network: metrics.networkType
          });
        } : undefined,
        onError: enableMetrics ? (error, metrics) => {
          console.error(`❌ [useNetworkMutation] 变更失败: ${url}`, {
            duration: `${metrics.duration?.toFixed(0)}ms`,
            retries: metrics.retryCount,
            error: metrics.error,
            network: metrics.networkType
          });
        } : undefined,
      }
    );
  }, [mutationFn, networkInfo, skipOnOffline, retryConfig, onRetry, enableMetrics]);

  return useMutation({
    mutationFn: wrappedMutationFn,
    onSuccess: (data, variables) => {
      onSuccess?.(data, variables);
      
      // 网络恢复时，刷新相关查询
      if (networkInfo.isOnline) {
        queryClient.invalidateQueries();
      }
    },
    onError: (error, variables) => {
      onErrorCallback?.(error as TError, variables);
    },
    onSettled,
    retry: false, // 禁用默认重试，使用我们的智能重试
    networkMode: 'online',
    ...mutationOptions
  });
}

/**
 * 网络性能监控 Hook
 */
export function useNetworkPerformance() {
  const [performanceStats, setPerformanceStats] = useState(() =>
    networkRequestManager.getPerformanceStats()
  );

  const updateStats = useCallback(() => {
    setPerformanceStats(networkRequestManager.getPerformanceStats());
  }, []);

  useEffect(() => {
    // 定期更新性能统计
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [updateStats]);

  const exportData = useCallback(() => {
    return networkRequestManager.exportMetrics();
  }, []);

  const clearMetrics = useCallback(() => {
    networkRequestManager.clearMetrics();
    updateStats();
  }, [updateStats]);

  return {
    stats: performanceStats,
    exportData,
    clearMetrics,
    refresh: updateStats,
  };
}

/**
 * 预加载资源 Hook
 */
export function useResourcePreloader() {
  const { networkInfo } = useNetworkStatus();
  const queryClient = useQueryClient();

  const preloadQuery = useCallback(
    <TData>(
      queryKey: any[], 
      queryFn: () => Promise<TData>,
      options: { priority?: 'high' | 'low'; force?: boolean } = {}
    ) => {
      const { priority = 'low', force = false } = options;

      // 慢网络下只预加载高优先级资源
      if (networkInfo.isSlowNetwork && priority !== 'high' && !force) {
        return Promise.resolve();
      }

      // 离线时不预加载
      if (!networkInfo.isOnline) {
        return Promise.resolve();
      }

      return queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 30 * 60 * 1000, // 预加载数据保持30分钟新鲜
      });
    },
    [networkInfo, queryClient]
  );

  const preloadResource = useCallback(
    (url: string, type: 'script' | 'style' | 'image' | 'font' = 'image') => {
      // 慢网络下跳过预加载
      if (networkInfo.isSlowNetwork || !networkInfo.isOnline) {
        return;
      }

      const link = document.createElement('link');
      
      switch (type) {
        case 'script':
          link.rel = 'prefetch';
          link.as = 'script';
          break;
        case 'style':
          link.rel = 'prefetch';
          link.as = 'style';
          break;
        case 'font':
          link.rel = 'preload';
          link.as = 'font';
          link.crossOrigin = 'anonymous';
          break;
        default:
          link.rel = 'prefetch';
          break;
      }
      
      link.href = url;
      document.head.appendChild(link);
      
      console.log(`🔮 [useResourcePreloader] 预加载资源: ${url} (${type})`);
    },
    [networkInfo]
  );

  return {
    preloadQuery,
    preloadResource,
    canPreload: networkInfo.isOnline && !networkInfo.isSlowNetwork,
    networkQuality: networkInfo.connectionQuality,
  };
}

export default {
  useNetworkStatus,
  useNetworkQuery,
  useNetworkMutation,
  useNetworkPerformance,
  useResourcePreloader,
};