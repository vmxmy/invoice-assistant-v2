/**
 * 移动端网络适配器
 * 统一管理网络检测、策略调整、离线支持等功能
 */

import { QueryClient } from '@tanstack/react-query';
import { networkRequestManager, type NetworkInfo } from './networkRequestManager';
import DataPreloader from './dataPreloader';

export interface NetworkStrategy {
  // 缓存策略
  cacheStrategy: {
    staleTime: number;
    gcTime: number;
    maxRetries: number;
    retryDelay: number;
  };
  
  // 预加载策略
  preloadStrategy: {
    enabled: boolean;
    priority: 'critical' | 'normal' | 'disabled';
    maxConcurrent: number;
  };
  
  // 数据压缩
  compressionStrategy: {
    enabled: boolean;
    imageQuality: number;
    compressText: boolean;
  };
  
  // UI适配
  uiStrategy: {
    reducedAnimations: boolean;
    lazyLoading: boolean;
    virtualScrolling: boolean;
    imageOptimization: boolean;
  };
}

export interface OfflineConfig {
  // 离线缓存
  enableOfflineCache: boolean;
  maxOfflineSize: number; // MB
  criticalData: string[]; // 关键查询键
  
  // 离线操作队列
  enableOfflineQueue: boolean;
  maxQueueSize: number;
  syncOnReconnect: boolean;
}

interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data: any;
  timestamp: number;
  retries: number;
}

class MobileNetworkAdapter {
  private static instance: MobileNetworkAdapter;
  private queryClient: QueryClient;
  private preloader: DataPreloader;
  private networkStrategies: Map<string, NetworkStrategy> = new Map();
  private currentStrategy: NetworkStrategy;
  private offlineQueue: OfflineOperation[] = [];
  private offlineConfig: OfflineConfig;
  
  // 性能指标
  private performanceMetrics = {
    dataUsage: 0,
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
  };
  
  // 数据使用量统计
  private dataUsageTracker = new Map<string, number>();
  
  private constructor(queryClient: QueryClient, offlineConfig: OfflineConfig) {
    this.queryClient = queryClient;
    this.offlineConfig = offlineConfig;
    this.preloader = DataPreloader.getInstance(queryClient);
    
    // 初始化网络策略
    this.initializeNetworkStrategies();
    this.currentStrategy = this.getStrategyForNetwork('unknown');
    
    // 设置网络监听
    this.setupNetworkListeners();
    
    // 设置离线队列处理
    if (offlineConfig.enableOfflineQueue) {
      this.setupOfflineQueue();
    }
    
    // 定期清理
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  static getInstance(
    queryClient?: QueryClient, 
    offlineConfig?: OfflineConfig
  ): MobileNetworkAdapter {
    if (!MobileNetworkAdapter.instance && queryClient && offlineConfig) {
      MobileNetworkAdapter.instance = new MobileNetworkAdapter(queryClient, offlineConfig);
    }
    return MobileNetworkAdapter.instance;
  }

  /**
   * 初始化网络策略
   */
  private initializeNetworkStrategies(): void {
    // 优秀网络策略
    this.networkStrategies.set('excellent', {
      cacheStrategy: {
        staleTime: 2 * 60 * 1000,     // 2分钟
        gcTime: 10 * 60 * 1000,      // 10分钟
        maxRetries: 2,
        retryDelay: 500,
      },
      preloadStrategy: {
        enabled: true,
        priority: 'normal',
        maxConcurrent: 3,
      },
      compressionStrategy: {
        enabled: false,
        imageQuality: 90,
        compressText: false,
      },
      uiStrategy: {
        reducedAnimations: false,
        lazyLoading: false,
        virtualScrolling: false,
        imageOptimization: false,
      },
    });

    // 良好网络策略
    this.networkStrategies.set('good', {
      cacheStrategy: {
        staleTime: 5 * 60 * 1000,     // 5分钟
        gcTime: 15 * 60 * 1000,      // 15分钟
        maxRetries: 3,
        retryDelay: 1000,
      },
      preloadStrategy: {
        enabled: true,
        priority: 'normal',
        maxConcurrent: 2,
      },
      compressionStrategy: {
        enabled: true,
        imageQuality: 80,
        compressText: false,
      },
      uiStrategy: {
        reducedAnimations: false,
        lazyLoading: true,
        virtualScrolling: false,
        imageOptimization: true,
      },
    });

    // 一般网络策略
    this.networkStrategies.set('fair', {
      cacheStrategy: {
        staleTime: 10 * 60 * 1000,    // 10分钟
        gcTime: 30 * 60 * 1000,      // 30分钟
        maxRetries: 3,
        retryDelay: 2000,
      },
      preloadStrategy: {
        enabled: true,
        priority: 'critical',
        maxConcurrent: 1,
      },
      compressionStrategy: {
        enabled: true,
        imageQuality: 70,
        compressText: true,
      },
      uiStrategy: {
        reducedAnimations: true,
        lazyLoading: true,
        virtualScrolling: true,
        imageOptimization: true,
      },
    });

    // 差网络策略
    this.networkStrategies.set('poor', {
      cacheStrategy: {
        staleTime: 20 * 60 * 1000,    // 20分钟
        gcTime: 60 * 60 * 1000,      // 60分钟
        maxRetries: 4,
        retryDelay: 3000,
      },
      preloadStrategy: {
        enabled: false,
        priority: 'disabled',
        maxConcurrent: 0,
      },
      compressionStrategy: {
        enabled: true,
        imageQuality: 60,
        compressText: true,
      },
      uiStrategy: {
        reducedAnimations: true,
        lazyLoading: true,
        virtualScrolling: true,
        imageOptimization: true,
      },
    });

    // 离线策略
    this.networkStrategies.set('offline', {
      cacheStrategy: {
        staleTime: Infinity,          // 永不过期
        gcTime: Infinity,            // 永不清理
        maxRetries: 0,
        retryDelay: 0,
      },
      preloadStrategy: {
        enabled: false,
        priority: 'disabled',
        maxConcurrent: 0,
      },
      compressionStrategy: {
        enabled: false,
        imageQuality: 60,
        compressText: false,
      },
      uiStrategy: {
        reducedAnimations: true,
        lazyLoading: false,
        virtualScrolling: false,
        imageOptimization: false,
      },
    });
  }

  /**
   * 获取网络策略
   */
  private getStrategyForNetwork(connectionQuality: string): NetworkStrategy {
    return this.networkStrategies.get(connectionQuality) || 
           this.networkStrategies.get('fair')!;
  }

  /**
   * 设置网络监听器
   */
  private setupNetworkListeners(): void {
    networkRequestManager.addNetworkListener((networkInfo: NetworkInfo) => {
      this.adaptToNetworkChange(networkInfo);
    });

    // 页面可见性变化监听
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.handleAppForeground();
        } else {
          this.handleAppBackground();
        }
      });
    }
  }

  /**
   * 网络变化适配
   */
  private adaptToNetworkChange(networkInfo: NetworkInfo): void {
    console.log(`🌐 [MobileNetworkAdapter] 网络状态变化`, {
      quality: networkInfo.connectionQuality,
      type: networkInfo.effectiveType,
      online: networkInfo.isOnline
    });

    // 更新当前策略
    const newStrategy = this.getStrategyForNetwork(
      networkInfo.isOnline ? networkInfo.connectionQuality : 'offline'
    );
    
    this.currentStrategy = newStrategy;

    // 应用UI策略
    this.applyUIStrategy(newStrategy.uiStrategy);

    // 更新查询客户端默认配置
    this.updateQueryClientDefaults(newStrategy.cacheStrategy);

    // 处理网络恢复
    if (networkInfo.isOnline) {
      this.handleNetworkRecovery();
    }

    // 通知UI更新
    this.notifyNetworkStrategyChange(networkInfo, newStrategy);
  }

  /**
   * 应用UI策略
   */
  private applyUIStrategy(uiStrategy: NetworkStrategy['uiStrategy']): void {
    const root = document.documentElement;
    
    // 动画优化
    if (uiStrategy.reducedAnimations) {
      root.style.setProperty('--animation-duration', '0.1s');
      root.style.setProperty('--transition-duration', '0.1s');
      root.classList.add('reduced-motion');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
      root.classList.remove('reduced-motion');
    }

    // 图片优化标记
    if (uiStrategy.imageOptimization) {
      root.classList.add('optimize-images');
    } else {
      root.classList.remove('optimize-images');
    }

    console.log(`🎨 [MobileNetworkAdapter] 应用UI策略`, uiStrategy);
  }

  /**
   * 更新 QueryClient 默认配置
   */
  private updateQueryClientDefaults(cacheStrategy: NetworkStrategy['cacheStrategy']): void {
    // 注意：这里只是演示，实际上 QueryClient 的默认配置在创建后不能动态修改
    // 实际应用中，应该在每个查询中使用当前策略
    console.log(`💾 [MobileNetworkAdapter] 缓存策略更新`, cacheStrategy);
  }

  /**
   * 处理网络恢复
   */
  private handleNetworkRecovery(): void {
    console.log(`🔄 [MobileNetworkAdapter] 网络恢复，处理离线操作`);

    // 恢复查询
    this.queryClient.resumePausedMutations();
    
    // 刷新关键数据
    if (this.offlineConfig.criticalData.length > 0) {
      this.offlineConfig.criticalData.forEach(queryKey => {
        this.queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
    }

    // 处理离线队列
    this.processOfflineQueue();
  }

  /**
   * 应用进入前台
   */
  private handleAppForeground(): void {
    const networkInfo = networkRequestManager.getNetworkInfo();
    
    if (networkInfo.isOnline && networkInfo.connectionQuality !== 'poor') {
      // 刷新数据
      console.log(`📱 [MobileNetworkAdapter] 应用回到前台，刷新数据`);
      this.queryClient.invalidateQueries();
    }
  }

  /**
   * 应用进入后台
   */
  private handleAppBackground(): void {
    console.log(`📱 [MobileNetworkAdapter] 应用进入后台，暂停非关键操作`);
    
    // 暂停非关键查询
    // 这里可以添加暂停逻辑
  }

  /**
   * 设置离线队列
   */
  private setupOfflineQueue(): void {
    // 从本地存储恢复队列
    this.loadOfflineQueue();
    
    // 监听网络状态，在线时处理队列
    networkRequestManager.addNetworkListener((networkInfo) => {
      if (networkInfo.isOnline && this.offlineQueue.length > 0) {
        this.processOfflineQueue();
      }
    });
  }

  /**
   * 添加到离线队列
   */
  addToOfflineQueue(
    type: OfflineOperation['type'],
    endpoint: string,
    data: any
  ): string {
    const operation: OfflineOperation = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      endpoint,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.offlineQueue.push(operation);
    
    // 保存到本地存储
    this.saveOfflineQueue();
    
    console.log(`📥 [MobileNetworkAdapter] 添加离线操作: ${operation.id}`, { type, endpoint });
    
    return operation.id;
  }

  /**
   * 处理离线队列
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    console.log(`🔄 [MobileNetworkAdapter] 处理离线队列 (${this.offlineQueue.length} 个操作)`);

    const operations = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const operation of operations) {
      try {
        await this.executeOfflineOperation(operation);
        console.log(`✅ [MobileNetworkAdapter] 离线操作成功: ${operation.id}`);
      } catch (error) {
        console.error(`❌ [MobileNetworkAdapter] 离线操作失败: ${operation.id}`, error);
        
        // 重试逻辑
        operation.retries++;
        if (operation.retries < 3) {
          this.offlineQueue.push(operation);
        }
      }
    }

    // 保存更新后的队列
    this.saveOfflineQueue();
  }

  /**
   * 执行离线操作
   */
  private async executeOfflineOperation(operation: OfflineOperation): Promise<void> {
    // 这里应该实现实际的API调用逻辑
    // 示例实现
    const response = await fetch(operation.endpoint, {
      method: operation.type === 'create' ? 'POST' : 
              operation.type === 'update' ? 'PUT' : 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: operation.type !== 'delete' ? JSON.stringify(operation.data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * 保存离线队列到本地存储
   */
  private saveOfflineQueue(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('offline-queue', JSON.stringify(this.offlineQueue));
      } catch (error) {
        console.warn('无法保存离线队列到本地存储:', error);
      }
    }
  }

  /**
   * 从本地存储加载离线队列
   */
  private loadOfflineQueue(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('offline-queue');
        if (saved) {
          this.offlineQueue = JSON.parse(saved);
        }
      } catch (error) {
        console.warn('无法从本地存储加载离线队列:', error);
      }
    }
  }

  /**
   * 通知网络策略变化
   */
  private notifyNetworkStrategyChange(
    networkInfo: NetworkInfo, 
    strategy: NetworkStrategy
  ): void {
    // 发送自定义事件通知UI组件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('networkStrategyChange', {
        detail: { networkInfo, strategy }
      }));
    }
  }

  /**
   * 获取当前网络策略
   */
  getCurrentStrategy(): NetworkStrategy {
    return this.currentStrategy;
  }

  /**
   * 获取数据使用量统计
   */
  getDataUsageStats(): Record<string, any> {
    const totalUsage = Array.from(this.dataUsageTracker.values())
      .reduce((sum, usage) => sum + usage, 0);

    return {
      totalDataUsage: totalUsage,
      breakdown: Object.fromEntries(this.dataUsageTracker),
      averagePerRequest: totalUsage / (this.performanceMetrics.requestCount || 1),
      ...this.performanceMetrics
    };
  }

  /**
   * 记录数据使用量
   */
  recordDataUsage(endpoint: string, bytes: number): void {
    this.dataUsageTracker.set(endpoint, 
      (this.dataUsageTracker.get(endpoint) || 0) + bytes
    );
    this.performanceMetrics.dataUsage += bytes;
  }

  /**
   * 清理过期数据
   */
  private cleanup(): void {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // 清理过期离线操作
    this.offlineQueue = this.offlineQueue.filter(
      op => now - op.timestamp < oneDay
    );

    // 清理预加载器
    this.preloader.cleanup();

    console.log(`🧹 [MobileNetworkAdapter] 清理完成`);
  }

  /**
   * 导出配置和统计数据
   */
  export(): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      currentStrategy: this.currentStrategy,
      offlineQueue: this.offlineQueue.length,
      dataUsage: this.getDataUsageStats(),
      preloaderStats: this.preloader.getStats(),
      networkStats: networkRequestManager.getPerformanceStats(),
    };
  }
}

// 默认离线配置
export const defaultOfflineConfig: OfflineConfig = {
  enableOfflineCache: true,
  maxOfflineSize: 50, // 50MB
  criticalData: ['invoices', 'dashboard-stats', 'user-profile'],
  enableOfflineQueue: true,
  maxQueueSize: 100,
  syncOnReconnect: true,
};

export default MobileNetworkAdapter;