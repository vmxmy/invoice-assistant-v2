// React Query Provider 配置 - 移动端网络优化版本
import React from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// 网络状态检测
const getNetworkInfo = () => {
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;
  
  const isOnline = navigator.onLine;
  const effectiveType = connection?.effectiveType || 'unknown';
  const isSlowNetwork = ['slow-2g', '2g'].includes(effectiveType);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  return { isOnline, effectiveType, isSlowNetwork, isMobile, connection };
};

// 动态重试策略
const createRetryFn = () => {
  const { isSlowNetwork, isMobile } = getNetworkInfo();
  
  return (failureCount: number, error: any) => {
    // 网络错误时的重试策略
    if (!navigator.onLine) {
      return false; // 离线状态不重试
    }
    
    // 5xx 服务器错误重试
    if (error?.status >= 500) {
      return failureCount < (isSlowNetwork ? 2 : 3);
    }
    
    // 4xx 客户端错误一般不重试（除了 408, 429）
    if (error?.status >= 400 && error?.status < 500) {
      return [408, 429].includes(error?.status) && failureCount < 2;
    }
    
    // 网络超时错误重试
    if (error?.name === 'TimeoutError' || error?.code === 'NETWORK_ERROR') {
      return failureCount < (isSlowNetwork || isMobile ? 3 : 2);
    }
    
    // 默认重试策略
    return failureCount < (isSlowNetwork ? 1 : 2);
  };
};

// 动态延迟策略（指数退避）
const createRetryDelay = () => {
  const { isSlowNetwork, isMobile } = getNetworkInfo();
  const baseDelay = isSlowNetwork || isMobile ? 2000 : 1000;
  
  return (attemptIndex: number) => {
    const delay = Math.min(baseDelay * Math.pow(2, attemptIndex), 10000);
    // 添加随机抖动避免惊群效应
    const jitter = Math.random() * 1000;
    return delay + jitter;
  };
};

// 移动端优化配置
const getMobileOptimizedConfig = () => {
  const { isSlowNetwork, isMobile, effectiveType } = getNetworkInfo();
  
  return {
    // 基于网络条件的缓存时间
    staleTime: isSlowNetwork ? 10 * 60 * 1000 : // 慢网络：10分钟
               isMobile ? 5 * 60 * 1000 :       // 移动端：5分钟
               2 * 60 * 1000,                   // 桌面端：2分钟
               
    // 垃圾回收时间
    gcTime: isSlowNetwork ? 30 * 60 * 1000 :    // 慢网络：30分钟
            isMobile ? 15 * 60 * 1000 :         // 移动端：15分钟
            10 * 60 * 1000,                     // 桌面端：10分钟
    
    // 后台重新获取间隔
    refetchInterval: isSlowNetwork ? 10 * 60 * 1000 : // 慢网络：10分钟
                     isMobile ? 5 * 60 * 1000 :       // 移动端：5分钟
                     3 * 60 * 1000,                   // 桌面端：3分钟
  };
};

// 创建 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 动态重试策略
      retry: createRetryFn(),
      retryDelay: createRetryDelay(),
      
      // 移动端优化的缓存配置
      ...getMobileOptimizedConfig(),
      
      // 网络优化配置
      refetchOnWindowFocus: false, // 移动端窗口焦点切换频繁，禁用
      refetchOnReconnect: true,    // 网络重连时重新获取
      refetchOnMount: 'always',    // 组件挂载时总是检查数据
      
      // 后台更新配置
      refetchIntervalInBackground: false, // 应用在后台时停止自动刷新
      
      // 错误处理
      throwOnError: false, // 不抛出错误，通过 error 状态处理
      
      // 网络模式配置
      networkMode: 'online', // 只在在线时执行查询
    },
    mutations: {
      // 变更重试配置
      retry: (failureCount, error) => {
        const { isSlowNetwork } = getNetworkInfo();
        
        if (!navigator.onLine) return false;
        
        // 网络相关错误重试
        if (error?.name === 'TimeoutError' || error?.code === 'NETWORK_ERROR') {
          return failureCount < (isSlowNetwork ? 2 : 1);
        }
        
        // 5xx 错误重试
        if ((error as any)?.status >= 500) {
          return failureCount < 1;
        }
        
        return false;
      },
      
      retryDelay: createRetryDelay(),
      networkMode: 'online',
    },
  },
})

// 网络状态变化处理
const setupNetworkListeners = () => {
  const handleOnline = () => {
    console.log('📶 [QueryProvider] 网络已连接，恢复查询');
    queryClient.resumePausedMutations();
    queryClient.invalidateQueries();
  };

  const handleOffline = () => {
    console.log('📵 [QueryProvider] 网络已断开，暂停查询');
  };

  // 网络连接状态变化监听
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  };
};

// 初始化网络监听
if (typeof window !== 'undefined') {
  setupNetworkListeners();
}

interface QueryProviderProps {
  children: ReactNode
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 开发环境显示React Query调试工具 */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  )
}

export default QueryProvider