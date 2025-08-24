/**
 * 网络优化提供者组件
 * 初始化并管理所有网络优化功能
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { networkRequestManager, type NetworkInfo } from '../../utils/networkRequestManager';
import MobileNetworkAdapter, { defaultOfflineConfig } from '../../utils/mobileNetworkAdapter';
import DataPreloader from '../../utils/dataPreloader';
import { optimizedSupabaseService } from '../../services/optimizedSupabaseService';

interface NetworkOptimizationContextType {
  // 网络状态
  networkInfo: NetworkInfo;
  isOptimizationEnabled: boolean;
  
  // 控制方法
  enableOptimization: () => void;
  disableOptimization: () => void;
  refreshNetworkInfo: () => void;
  
  // 性能数据
  getPerformanceData: () => any;
  exportNetworkData: () => any;
  clearNetworkCache: () => void;
  
  // 预加载控制
  preloader: DataPreloader | null;
  networkAdapter: MobileNetworkAdapter | null;
}

const NetworkOptimizationContext = createContext<NetworkOptimizationContextType | null>(null);

interface NetworkOptimizationProviderProps {
  children: ReactNode;
  queryClient: QueryClient;
  options?: {
    enableByDefault?: boolean;
    enableDebugMode?: boolean;
    enablePerformanceLogging?: boolean;
    offlineConfig?: typeof defaultOfflineConfig;
  };
}

export const NetworkOptimizationProvider: React.FC<NetworkOptimizationProviderProps> = ({
  children,
  queryClient,
  options = {}
}) => {
  const {
    enableByDefault = true,
    enableDebugMode = false,
    enablePerformanceLogging = true,
    offlineConfig = defaultOfflineConfig
  } = options;

  // 状态管理
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>(() => 
    networkRequestManager.getNetworkInfo()
  );
  const [isOptimizationEnabled, setIsOptimizationEnabled] = useState(enableByDefault);
  const [networkAdapter, setNetworkAdapter] = useState<MobileNetworkAdapter | null>(null);
  const [preloader, setPreloader] = useState<DataPreloader | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化网络优化系统
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('🚀 [NetworkOptimization] 初始化网络优化系统');

        // 初始化网络适配器
        const adapter = MobileNetworkAdapter.getInstance(queryClient, offlineConfig);
        setNetworkAdapter(adapter);

        // 初始化数据预加载器
        const dataPreloader = DataPreloader.getInstance(queryClient);
        setPreloader(dataPreloader);

        // 设置网络状态监听
        const networkListener = (info: NetworkInfo) => {
          setNetworkInfo(info);
          
          if (enablePerformanceLogging) {
            console.log(`📊 [NetworkOptimization] 网络状态更新`, {
              quality: info.connectionQuality,
              type: info.effectiveType,
              online: info.isOnline,
              mobile: info.isMobile
            });
          }
        };

        networkRequestManager.addNetworkListener(networkListener);

        // 健康检查
        const healthCheck = await optimizedSupabaseService.healthCheck();
        console.log('💚 [NetworkOptimization] Supabase健康检查', healthCheck);

        // 设置预加载任务
        if (isOptimizationEnabled) {
          setupPreloadingTasks(dataPreloader);
        }

        // 设置性能监控
        if (enablePerformanceLogging) {
          setupPerformanceMonitoring();
        }

        setIsInitialized(true);
        console.log('✅ [NetworkOptimization] 网络优化系统初始化完成');

        // 清理函数
        return () => {
          networkRequestManager.removeNetworkListener(networkListener);
        };

      } catch (error) {
        console.error('❌ [NetworkOptimization] 初始化失败:', error);
      }
    };

    initialize();
  }, [queryClient, isOptimizationEnabled, enablePerformanceLogging]);

  // 设置预加载任务
  const setupPreloadingTasks = (preloader: DataPreloader) => {
    console.log('🔮 [NetworkOptimization] 设置预加载任务');

    // 关键数据预加载
    preloader.addPreloadTask(
      'critical-dashboard-stats',
      ['dashboard', 'stats'],
      async () => {
        return optimizedSupabaseService.optimizedQuery('invoices', {
          select: 'id,total_amount,invoice_date,status',
          enableCache: true,
          cacheTTL: 10 * 60 * 1000,
          priority: 'high'
        });
      },
      {
        priority: 'critical',
        trigger: 'immediate',
        networkRequirement: 'any',
        staleTime: 10 * 60 * 1000,
        background: false
      }
    );

    // 用户行为预测预加载
    preloader.addPreloadTask(
      'predictive-invoice-list',
      ['invoices', 'list', 'next-page'],
      async () => {
        return optimizedSupabaseService.optimizedQuery('invoices', {
          select: 'id,invoice_number,seller_name,total_amount,invoice_date,status',
          range: { from: 20, to: 39 }, // 预加载下一页
          enableCache: true,
          priority: 'medium'
        });
      },
      {
        priority: 'medium',
        trigger: 'idle',
        networkRequirement: 'good',
        staleTime: 5 * 60 * 1000,
        background: true,
        condition: () => {
          // 只有在发票列表页面时才预加载
          return window.location.pathname.includes('/invoices');
        }
      }
    );

    // 滚动预加载
    const invoiceContainer = document.querySelector('[data-invoice-list]');
    if (invoiceContainer) {
      preloader.enableScrollPreloading(invoiceContainer, {
        threshold: 0.8,
        rootMargin: '200px',
        dataLoader: async (offset) => {
          return optimizedSupabaseService.optimizedQuery('invoices', {
            range: { from: offset, to: offset + 19 },
            enableCache: true
          });
        },
        queryKeyGenerator: (offset) => ['invoices', 'scroll', offset]
      });
    }

    // 后台数据同步
    preloader.enableBackgroundSync([
      {
        queryKey: ['dashboard', 'stats'],
        queryFn: async () => {
          return optimizedSupabaseService.optimizedQuery('invoices', {
            select: 'COUNT(*) as total, SUM(total_amount) as sum',
            enableCache: false
          });
        },
        interval: 5 * 60 * 1000, // 每5分钟
        condition: () => document.visibilityState === 'visible'
      }
    ]);
  };

  // 设置性能监控
  const setupPerformanceMonitoring = () => {
    console.log('📊 [NetworkOptimization] 设置性能监控');

    // 定期输出性能报告
    setInterval(() => {
      const networkStats = networkRequestManager.getPerformanceStats();
      const supabaseStats = optimizedSupabaseService.getMetrics();
      const adapterStats = networkAdapter?.getDataUsageStats();

      console.group('📊 网络性能报告');
      console.log('网络请求:', networkStats);
      console.log('Supabase优化:', supabaseStats);
      console.log('数据使用:', adapterStats);
      console.groupEnd();
    }, 60000); // 每分钟一次报告

    // 性能阈值监控
    const checkPerformanceThresholds = () => {
      const stats = networkRequestManager.getPerformanceStats();
      
      // 成功率过低警告
      if (stats.successRate < 90) {
        console.warn('⚠️ [NetworkOptimization] 请求成功率过低:', `${stats.successRate.toFixed(1)}%`);
      }
      
      // 响应时间过长警告
      if (stats.averageResponseTime > 5000) {
        console.warn('⚠️ [NetworkOptimization] 平均响应时间过长:', `${stats.averageResponseTime.toFixed(0)}ms`);
      }
    };

    setInterval(checkPerformanceThresholds, 30000); // 每30秒检查一次
  };

  // 控制方法
  const enableOptimization = () => {
    setIsOptimizationEnabled(true);
    console.log('✅ [NetworkOptimization] 网络优化已启用');
  };

  const disableOptimization = () => {
    setIsOptimizationEnabled(false);
    console.log('❌ [NetworkOptimization] 网络优化已禁用');
  };

  const refreshNetworkInfo = () => {
    const newNetworkInfo = networkRequestManager.getNetworkInfo();
    setNetworkInfo(newNetworkInfo);
  };

  const getPerformanceData = () => {
    return {
      networkStats: networkRequestManager.getPerformanceStats(),
      supabaseStats: optimizedSupabaseService.getMetrics(),
      adapterStats: networkAdapter?.getDataUsageStats(),
      preloaderStats: preloader?.getStats(),
      timestamp: new Date().toISOString()
    };
  };

  const exportNetworkData = () => {
    const data = {
      networkManager: networkRequestManager.exportMetrics(),
      supabaseService: optimizedSupabaseService.exportDiagnostics(),
      networkAdapter: networkAdapter?.export(),
      preloader: preloader?.getStats(),
      timestamp: new Date().toISOString()
    };

    // 创建下载
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-optimization-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    return data;
  };

  const clearNetworkCache = () => {
    networkRequestManager.clearMetrics();
    optimizedSupabaseService.clearCache();
    queryClient.clear();
    console.log('🧹 [NetworkOptimization] 所有网络缓存已清空');
  };

  // Context值
  const contextValue: NetworkOptimizationContextType = {
    networkInfo,
    isOptimizationEnabled,
    enableOptimization,
    disableOptimization,
    refreshNetworkInfo,
    getPerformanceData,
    exportNetworkData,
    clearNetworkCache,
    preloader,
    networkAdapter,
  };

  // 调试信息
  useEffect(() => {
    if (enableDebugMode && isInitialized) {
      console.group('🔧 [NetworkOptimization] 调试信息');
      console.log('初始化状态:', isInitialized);
      console.log('优化启用:', isOptimizationEnabled);
      console.log('网络信息:', networkInfo);
      console.log('适配器:', !!networkAdapter);
      console.log('预加载器:', !!preloader);
      console.groupEnd();
    }
  }, [enableDebugMode, isInitialized, isOptimizationEnabled, networkInfo]);

  return (
    <NetworkOptimizationContext.Provider value={contextValue}>
      {children}
      {/* 网络状态指示器 */}
      {enableDebugMode && (
        <div className="fixed top-2 right-2 z-50 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {networkInfo.isOnline ? '📶' : '📵'} {networkInfo.effectiveType} | {networkInfo.connectionQuality}
          {isOptimizationEnabled && ' | ⚡'}
        </div>
      )}
    </NetworkOptimizationContext.Provider>
  );
};

// Hook for using the context
export const useNetworkOptimization = () => {
  const context = useContext(NetworkOptimizationContext);
  if (!context) {
    throw new Error('useNetworkOptimization must be used within a NetworkOptimizationProvider');
  }
  return context;
};

export default NetworkOptimizationProvider;