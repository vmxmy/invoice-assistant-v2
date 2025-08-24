/**
 * 移动端网络请求管理器
 * 提供智能重试、网络适配、错误处理、性能监控功能
 */

export interface NetworkInfo {
  isOnline: boolean;
  effectiveType: string;
  isSlowNetwork: boolean;
  isMobile: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  estimatedBandwidth?: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitterRange: number;
}

export interface RequestMetrics {
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  success: boolean;
  error?: string;
  retryCount: number;
  networkType?: string;
  fromCache?: boolean;
}

class NetworkRequestManager {
  private static instance: NetworkRequestManager;
  private metricsStore: RequestMetrics[] = [];
  private maxMetricsHistory = 100;
  private listeners: Set<(info: NetworkInfo) => void> = new Set();

  private constructor() {
    this.setupNetworkListeners();
  }

  static getInstance(): NetworkRequestManager {
    if (!NetworkRequestManager.instance) {
      NetworkRequestManager.instance = new NetworkRequestManager();
    }
    return NetworkRequestManager.instance;
  }

  /**
   * 获取网络信息
   */
  getNetworkInfo(): NetworkInfo {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    // 在开发环境下，始终假设网络状态良好
    if (process.env.NODE_ENV === 'development') {
      return {
        isOnline: true,
        effectiveType: '4g',
        isSlowNetwork: false,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        connectionQuality: 'excellent',
        estimatedBandwidth: 10
      };
    }
    
    const isOnline = navigator.onLine;
    const effectiveType = connection?.effectiveType || '4g'; // 默认假设4g
    const downlink = connection?.downlink || 10; // 默认假设10Mbps
    const rtt = connection?.rtt || 0;
    
    const isSlowNetwork = ['slow-2g', '2g'].includes(effectiveType);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // 评估连接质量
    let connectionQuality: NetworkInfo['connectionQuality'] = 'offline';
    if (isOnline) {
      if (effectiveType === '4g' && downlink > 10) {
        connectionQuality = 'excellent';
      } else if (effectiveType === '4g' || (effectiveType === '3g' && downlink > 2)) {
        connectionQuality = 'good';
      } else if (effectiveType === '3g' || effectiveType === '2g') {
        connectionQuality = 'fair';
      } else {
        connectionQuality = 'poor';
      }
    }

    return {
      isOnline,
      effectiveType,
      isSlowNetwork,
      isMobile,
      connectionQuality,
      estimatedBandwidth: downlink
    };
  }

  /**
   * 创建适配网络条件的重试配置
   */
  createRetryConfig(networkInfo?: NetworkInfo): RetryConfig {
    const info = networkInfo || this.getNetworkInfo();
    
    // 基于网络质量调整重试策略
    switch (info.connectionQuality) {
      case 'excellent':
        return {
          maxAttempts: 2,
          baseDelay: 500,
          maxDelay: 5000,
          backoffFactor: 2,
          jitterRange: 100
        };
      
      case 'good':
        return {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 8000,
          backoffFactor: 2,
          jitterRange: 200
        };
      
      case 'fair':
        return {
          maxAttempts: 3,
          baseDelay: 2000,
          maxDelay: 15000,
          backoffFactor: 2.5,
          jitterRange: 500
        };
      
      case 'poor':
        return {
          maxAttempts: 4,
          baseDelay: 3000,
          maxDelay: 20000,
          backoffFactor: 3,
          jitterRange: 1000
        };
      
      default:
        return {
          maxAttempts: 1,
          baseDelay: 1000,
          maxDelay: 5000,
          backoffFactor: 2,
          jitterRange: 100
        };
    }
  }

  /**
   * 计算重试延迟（指数退避 + 抖动）
   */
  calculateRetryDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
    const jitter = Math.random() * config.jitterRange;
    const delay = Math.min(exponentialDelay + jitter, config.maxDelay);
    return Math.max(delay, config.baseDelay);
  }

  /**
   * 智能重试函数
   */
  shouldRetry(
    error: any, 
    attempt: number, 
    config: RetryConfig,
    networkInfo?: NetworkInfo
  ): boolean {
    const info = networkInfo || this.getNetworkInfo();
    
    // 离线时不重试
    if (!info.isOnline) {
      return false;
    }
    
    // 超过最大重试次数
    if (attempt >= config.maxAttempts) {
      return false;
    }

    // 检查错误类型
    const status = error?.status || error?.response?.status;
    const errorType = error?.name || error?.type;

    // 不重试的错误类型
    const nonRetriableErrors = [
      'AbortError',        // 请求被取消
      'SecurityError',     // 安全错误
      'SyntaxError',       // 语法错误
      'TypeError'          // 类型错误（通常是代码问题）
    ];

    if (nonRetriableErrors.includes(errorType)) {
      return false;
    }

    // HTTP 状态码重试策略
    if (status) {
      // 2xx 成功，不需要重试
      if (status >= 200 && status < 300) {
        return false;
      }
      
      // 4xx 客户端错误，只重试特定状态码
      if (status >= 400 && status < 500) {
        const retriableClientErrors = [408, 409, 429]; // 超时、冲突、限流
        return retriableClientErrors.includes(status);
      }
      
      // 5xx 服务器错误，可以重试
      if (status >= 500) {
        return true;
      }
    }

    // 网络错误重试
    const networkErrors = [
      'NetworkError',
      'TimeoutError',
      'AbortError',
      'fetch',
      'NETWORK_ERROR',
      'CONNECTION_ERROR'
    ];

    return networkErrors.some(errorName => 
      errorType?.includes(errorName) || 
      error?.message?.includes(errorName) ||
      error?.code?.includes(errorName)
    );
  }

  /**
   * 带重试的请求执行
   */
  async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    options: {
      url?: string;
      method?: string;
      retryConfig?: Partial<RetryConfig>;
      onRetry?: (attempt: number, error: any) => void;
      onSuccess?: (result: T, metrics: RequestMetrics) => void;
      onError?: (error: any, metrics: RequestMetrics) => void;
    } = {}
  ): Promise<T> {
    const {
      url = 'unknown',
      method = 'GET',
      retryConfig = {},
      onRetry,
      onSuccess,
      onError
    } = options;

    const networkInfo = this.getNetworkInfo();
    const config = { ...this.createRetryConfig(networkInfo), ...retryConfig };
    
    const metrics: RequestMetrics = {
      url,
      method,
      startTime: performance.now(),
      success: false,
      retryCount: 0,
      networkType: networkInfo.effectiveType
    };

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        // 记录重试次数
        metrics.retryCount = attempt - 1;
        
        const result = await requestFn();
        
        // 成功执行
        metrics.endTime = performance.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        metrics.success = true;
        metrics.status = 200;
        
        this.recordMetrics(metrics);
        onSuccess?.(result, metrics);
        
        return result;
      } catch (error) {
        const shouldRetryAgain = this.shouldRetry(error, attempt, config, networkInfo);
        
        if (!shouldRetryAgain) {
          // 不再重试，记录失败
          metrics.endTime = performance.now();
          metrics.duration = metrics.endTime - metrics.startTime;
          metrics.error = error?.message || 'Unknown error';
          metrics.status = error?.status || error?.response?.status;
          
          this.recordMetrics(metrics);
          onError?.(error, metrics);
          
          throw error;
        }
        
        // 准备重试
        if (attempt < config.maxAttempts) {
          const delay = this.calculateRetryDelay(attempt, config);
          
          console.warn(
            `🔄 [NetworkRequestManager] 请求失败，${delay}ms后重试 (${attempt}/${config.maxAttempts})`,
            { url, error: error?.message, networkType: networkInfo.effectiveType }
          );
          
          onRetry?.(attempt, error);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // 重新检查网络状态
          const currentNetworkInfo = this.getNetworkInfo();
          if (!currentNetworkInfo.isOnline) {
            throw new Error('Network is offline');
          }
        }
      }
    }

    // 这里理论上不会执行到，但为了类型安全
    throw new Error('Max retry attempts exceeded');
  }

  /**
   * 记录请求性能指标
   */
  private recordMetrics(metrics: RequestMetrics) {
    this.metricsStore.push(metrics);
    
    // 保持历史记录在限制范围内
    if (this.metricsStore.length > this.maxMetricsHistory) {
      this.metricsStore = this.metricsStore.slice(-this.maxMetricsHistory);
    }
    
    // 输出性能日志
    if (metrics.success) {
      console.log(
        `📊 [NetworkRequestManager] 请求成功: ${metrics.method} ${metrics.url}`,
        {
          duration: `${metrics.duration?.toFixed(0)}ms`,
          retries: metrics.retryCount,
          network: metrics.networkType,
          fromCache: metrics.fromCache
        }
      );
    } else {
      console.error(
        `📊 [NetworkRequestManager] 请求失败: ${metrics.method} ${metrics.url}`,
        {
          duration: `${metrics.duration?.toFixed(0)}ms`,
          retries: metrics.retryCount,
          error: metrics.error,
          status: metrics.status,
          network: metrics.networkType
        }
      );
    }
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    const total = this.metricsStore.length;
    if (total === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        networkTypeDistribution: {},
        errorDistribution: {}
      };
    }

    const successful = this.metricsStore.filter(m => m.success).length;
    const successRate = (successful / total) * 100;
    
    const durations = this.metricsStore
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!);
    const averageResponseTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    // 网络类型分布
    const networkTypeDistribution = this.metricsStore.reduce((acc, m) => {
      const type = m.networkType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 错误分布
    const errorDistribution = this.metricsStore
      .filter(m => !m.success && m.error)
      .reduce((acc, m) => {
        const error = m.error || 'unknown';
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalRequests: total,
      successRate,
      averageResponseTime,
      networkTypeDistribution,
      errorDistribution,
      recentRequests: this.metricsStore.slice(-10) // 最近10个请求
    };
  }

  /**
   * 添加网络状态变化监听器
   */
  addNetworkListener(callback: (info: NetworkInfo) => void) {
    this.listeners.add(callback);
  }

  /**
   * 移除网络状态变化监听器
   */
  removeNetworkListener(callback: (info: NetworkInfo) => void) {
    this.listeners.delete(callback);
  }

  /**
   * 设置网络监听
   */
  private setupNetworkListeners() {
    if (typeof window === 'undefined') return;

    const notifyListeners = () => {
      const networkInfo = this.getNetworkInfo();
      this.listeners.forEach(callback => {
        try {
          callback(networkInfo);
        } catch (error) {
          console.error('Network listener error:', error);
        }
      });
    };

    // 监听在线/离线状态
    window.addEventListener('online', notifyListeners);
    window.addEventListener('offline', notifyListeners);

    // 监听连接变化（如果支持）
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', notifyListeners);
    }
  }

  /**
   * 清理性能数据
   */
  clearMetrics() {
    this.metricsStore = [];
  }

  /**
   * 导出性能数据
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      networkInfo: this.getNetworkInfo(),
      stats: this.getPerformanceStats(),
      rawMetrics: this.metricsStore
    };
  }
}

// 导出单例实例
export const networkRequestManager = NetworkRequestManager.getInstance();

// 默认导出
export default networkRequestManager;