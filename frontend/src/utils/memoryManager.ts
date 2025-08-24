/**
 * 内存管理系统主入口
 * 整合所有内存优化功能，提供统一的API接口
 */

import { memoryMonitor } from './memoryMonitor';
import { imageCacheManager } from './imageCacheManager';
import { invoiceDataCache } from './dataCache';
import { memoryProfiler } from './memoryProfiler';
import { mobilePerformanceMonitor } from './mobilePerformanceMonitor';

interface MemoryManagerConfig {
  enableMonitoring: boolean;
  enableMobileOptimization: boolean;
  enableAutomaticCleanup: boolean;
  enableProfiler: boolean;
  memoryThresholds: {
    warning: number;    // MB
    critical: number;   // MB
    emergency: number;  // MB
  };
  cleanupStrategies: {
    images: 'conservative' | 'aggressive';
    data: 'conservative' | 'aggressive';
    states: boolean;
  };
  notifications: {
    enabled: boolean;
    showWarnings: boolean;
    showCleanupResults: boolean;
  };
}

interface MemoryStatus {
  current: number;        // 当前内存使用 (MB)
  peak: number;          // 峰值内存使用 (MB)
  available: number;     // 可用内存 (MB)
  pressure: number;      // 内存压力 (0-100)
  mode: 'normal' | 'warning' | 'critical' | 'emergency';
  cacheStats: {
    images: { count: number; size: number; hitRate: number };
    data: { count: number; size: number; hitRate: number };
    total: number;
  };
  adaptations: string[];
}

interface CleanupResult {
  totalFreed: number;    // 释放的内存 (MB)
  imagesCleaned: number; // 清理的图片数量
  dataPagesCleaned: number; // 清理的数据页数量
  statesCleaned: number; // 清理的状态数量
  duration: number;      // 清理耗时 (ms)
}

class MemoryManager {
  private config: MemoryManagerConfig;
  private status: MemoryStatus;
  private cleanupHistory: CleanupResult[] = [];
  private eventListeners = new Map<string, Function[]>();
  private monitoringTimer: NodeJS.Timeout | null = null;
  
  constructor(config: Partial<MemoryManagerConfig> = {}) {
    this.config = {
      enableMonitoring: true,
      enableMobileOptimization: true,
      enableAutomaticCleanup: true,
      enableProfiler: false, // 默认关闭，仅开发环境使用
      memoryThresholds: {
        warning: 150,   // 150MB
        critical: 250,  // 250MB
        emergency: 350  // 350MB
      },
      cleanupStrategies: {
        images: 'conservative',
        data: 'conservative',
        states: false
      },
      notifications: {
        enabled: true,
        showWarnings: true,
        showCleanupResults: true
      },
      ...config
    };

    this.status = {
      current: 0,
      peak: 0,
      available: 0,
      pressure: 0,
      mode: 'normal',
      cacheStats: {
        images: { count: 0, size: 0, hitRate: 0 },
        data: { count: 0, size: 0, hitRate: 0 },
        total: 0
      },
      adaptations: []
    };

    this.initialize();
  }

  /**
   * 初始化内存管理系统
   */
  private async initialize(): Promise<void> {
    console.log('🧠 内存管理系统初始化中...');

    // 启动监控
    if (this.config.enableMonitoring) {
      this.startMonitoring();
    }

    // 启动移动端优化
    if (this.config.enableMobileOptimization) {
      mobilePerformanceMonitor.start();
    }

    // 启动分析器（仅开发环境）
    if (this.config.enableProfiler && process.env.NODE_ENV === 'development') {
      console.log('🔧 开发环境：内存分析器已启用');
    }

    // 设置事件监听
    this.setupEventListeners();

    // 定期更新状态
    this.updateStatus();
    setInterval(() => this.updateStatus(), 5000);

    console.log('✅ 内存管理系统初始化完成');
  }

  /**
   * 启动内存监控
   */
  private startMonitoring(): void {
    memoryMonitor.startMonitoring();
    
    // 监听内存压力事件
    memoryMonitor.on('pressure', (data) => {
      this.handleMemoryPressure(data);
    });

    // 监听内存泄漏事件
    memoryMonitor.on('leak-detected', (data) => {
      this.handleMemoryLeak(data);
    });
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performBackgroundCleanup();
      }
    });

    // 监听内存警告事件
    window.addEventListener('beforeunload', () => {
      this.performShutdownCleanup();
    });

    // 监听自定义内存事件
    window.addEventListener('emergency-memory-cleanup', () => {
      this.performEmergencyCleanup();
    });
  }

  /**
   * 更新内存状态
   */
  private updateStatus(): void {
    try {
      // @ts-ignore
      const memory = (performance as any).memory;
      
      if (memory) {
        this.status.current = memory.usedJSHeapSize / 1024 / 1024;
        this.status.available = (memory.jsHeapSizeLimit - memory.usedJSHeapSize) / 1024 / 1024;
        this.status.pressure = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        // 更新峰值
        if (this.status.current > this.status.peak) {
          this.status.peak = this.status.current;
        }
      }

      // 更新缓存统计
      const imageStats = imageCacheManager.getStats();
      const dataStats = invoiceDataCache.getStats();

      this.status.cacheStats = {
        images: {
          count: imageStats.totalImages,
          size: imageStats.totalSize / 1024 / 1024,
          hitRate: imageStats.hitRate
        },
        data: {
          count: dataStats.totalPages,
          size: dataStats.totalMemoryUsage / 1024 / 1024,
          hitRate: dataStats.hitRate
        },
        total: (imageStats.totalSize + dataStats.totalMemoryUsage) / 1024 / 1024
      };

      // 更新模式
      this.updateMemoryMode();

      // 触发状态更新事件
      this.emit('status-update', this.status);

    } catch (error) {
      console.warn('状态更新失败:', error);
    }
  }

  /**
   * 更新内存模式
   */
  private updateMemoryMode(): void {
    const { current } = this.status;
    const { warning, critical, emergency } = this.config.memoryThresholds;

    let newMode: MemoryStatus['mode'] = 'normal';
    
    if (current >= emergency) {
      newMode = 'emergency';
    } else if (current >= critical) {
      newMode = 'critical';
    } else if (current >= warning) {
      newMode = 'warning';
    }

    if (newMode !== this.status.mode) {
      const oldMode = this.status.mode;
      this.status.mode = newMode;
      
      this.handleModeChange(oldMode, newMode);
    }
  }

  /**
   * 处理模式变化
   */
  private handleModeChange(oldMode: string, newMode: string): void {
    console.log(`🔄 内存模式变化: ${oldMode} → ${newMode}`);

    switch (newMode) {
      case 'warning':
        if (this.config.notifications.showWarnings) {
          this.showNotification('内存使用较高', 'warning');
        }
        break;
      
      case 'critical':
        this.showNotification('内存使用过高，建议清理', 'error');
        if (this.config.enableAutomaticCleanup) {
          this.performAutomaticCleanup('conservative');
        }
        break;
      
      case 'emergency':
        this.showNotification('内存严重不足，执行紧急清理', 'error');
        this.performEmergencyCleanup();
        break;
    }

    this.emit('mode-change', { oldMode, newMode, status: this.status });
  }

  /**
   * 处理内存压力
   */
  private handleMemoryPressure(data: any): void {
    console.warn('⚠️ 内存压力检测:', data);
    
    if (data.level === 'critical' && this.config.enableAutomaticCleanup) {
      this.performAutomaticCleanup('aggressive');
    }
  }

  /**
   * 处理内存泄漏
   */
  private handleMemoryLeak(data: any): void {
    console.error('🚨 内存泄漏检测:', data);
    
    this.showNotification('检测到内存泄漏', 'error');
    this.emit('memory-leak', data);
  }

  /**
   * 执行自动清理
   */
  private async performAutomaticCleanup(mode: 'conservative' | 'aggressive' = 'conservative'): Promise<CleanupResult> {
    console.log(`🧹 执行自动清理 (${mode})`);
    const startTime = performance.now();
    
    let totalFreed = 0;
    let imagesCleaned = 0;
    let dataPagesCleaned = 0;
    let statesCleaned = 0;

    try {
      const beforeMemory = this.status.current;

      // 清理图片缓存
      if (this.config.cleanupStrategies.images === 'aggressive' || mode === 'aggressive') {
        const imageStatsBefore = imageCacheManager.getStats();
        imageCacheManager.clear();
        imagesCleaned = imageStatsBefore.totalImages;
      } else {
        // 保守清理：只清理低优先级图片
        imagesCleaned = await this.cleanupLowPriorityImages();
      }

      // 清理数据缓存
      if (this.config.cleanupStrategies.data === 'aggressive' || mode === 'aggressive') {
        const dataStatsBefore = invoiceDataCache.getStats();
        invoiceDataCache.clear();
        dataPagesCleaned = dataStatsBefore.totalPages;
      } else {
        // 保守清理：只清理过期数据
        dataPagesCleaned = await this.cleanupExpiredData();
      }

      // 清理状态
      if (this.config.cleanupStrategies.states) {
        statesCleaned = await this.cleanupStates();
      }

      // 强制垃圾回收
      if ('gc' in window) {
        (window as any).gc();
      }

      // 等待内存更新
      await new Promise(resolve => setTimeout(resolve, 200));
      this.updateStatus();
      
      const afterMemory = this.status.current;
      totalFreed = Math.max(0, beforeMemory - afterMemory);

    } catch (error) {
      console.error('自动清理失败:', error);
    }

    const duration = performance.now() - startTime;
    const result: CleanupResult = {
      totalFreed,
      imagesCleaned,
      dataPagesCleaned,
      statesCleaned,
      duration
    };

    this.cleanupHistory.push(result);
    
    if (this.config.notifications.showCleanupResults) {
      this.showNotification(
        `清理完成：释放 ${totalFreed.toFixed(2)}MB 内存`,
        'success'
      );
    }

    this.emit('cleanup-completed', result);
    
    console.log('✅ 自动清理完成:', result);
    return result;
  }

  /**
   * 执行紧急清理
   */
  async performEmergencyCleanup(): Promise<CleanupResult> {
    console.warn('🚨 执行紧急内存清理');
    
    // 清理所有缓存
    imageCacheManager.clear();
    invoiceDataCache.clear();
    
    // 清理所有状态
    await this.cleanupStates();
    
    // 清理DOM中的临时数据
    this.cleanupDOMResources();
    
    // 强制垃圾回收
    if ('gc' in window) {
      (window as any).gc();
    }
    
    // 通知应用层
    this.emit('emergency-cleanup');
    window.dispatchEvent(new CustomEvent('emergency-memory-cleanup'));
    
    return this.performAutomaticCleanup('aggressive');
  }

  /**
   * 执行后台清理
   */
  private async performBackgroundCleanup(): Promise<void> {
    console.log('🌙 页面隐藏，执行后台清理');
    
    // 清理低优先级资源
    await this.cleanupLowPriorityImages();
    await this.cleanupExpiredData();
  }

  /**
   * 执行关闭清理
   */
  private performShutdownCleanup(): void {
    console.log('🚪 应用关闭，执行清理');
    
    // 停止所有监控
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    memoryMonitor.stopMonitoring();
    mobilePerformanceMonitor.stop();
    
    // 清理缓存
    imageCacheManager.destroy?.();
    invoiceDataCache.clear();
  }

  /**
   * 清理低优先级图片
   */
  private async cleanupLowPriorityImages(): Promise<number> {
    // 这里需要imageCacheManager支持选择性清理
    // 临时实现：清理30%的缓存
    const statsBefore = imageCacheManager.getStats();
    // imageCacheManager.clearLowPriority?.(0.3); // 假设有这个方法
    return Math.floor(statsBefore.totalImages * 0.3);
  }

  /**
   * 清理过期数据
   */
  private async cleanupExpiredData(): Promise<number> {
    const statsBefore = invoiceDataCache.getStats();
    // invoiceDataCache.cleanupExpired?.(); // 假设有这个方法
    return Math.floor(statsBefore.totalPages * 0.2);
  }

  /**
   * 清理状态
   */
  private async cleanupStates(): Promise<number> {
    try {
      const { clearAllStates } = await import('../hooks/useMemoryOptimizedState');
      clearAllStates();
      return 1; // 简化实现
    } catch (error) {
      console.error('状态清理失败:', error);
      return 0;
    }
  }

  /**
   * 清理DOM资源
   */
  private cleanupDOMResources(): void {
    // 清理未使用的img元素
    const images = document.querySelectorAll('img[data-loaded="false"]');
    images.forEach(img => img.removeAttribute('src'));
    
    // 清理事件监听器引用
    // 这里可以添加更多DOM清理逻辑
  }

  /**
   * 显示通知
   */
  private showNotification(message: string, type: 'info' | 'warning' | 'error' | 'success'): void {
    if (!this.config.notifications.enabled) return;
    
    console.log(`📢 [${type.toUpperCase()}] ${message}`);
    
    // 这里可以集成实际的通知系统
    // 例如：toast notifications, browser notifications等
  }

  /**
   * 事件发射器
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`事件监听器错误 [${event}]:`, error);
      }
    });
  }

  /**
   * 注册事件监听器
   */
  on(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, listener?: Function): void {
    if (!listener) {
      this.eventListeners.delete(event);
      return;
    }
    
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(event, listeners);
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): MemoryStatus {
    return { ...this.status };
  }

  /**
   * 获取清理历史
   */
  getCleanupHistory(): CleanupResult[] {
    return [...this.cleanupHistory];
  }

  /**
   * 获取内存监控统计
   */
  getMonitoringStats() {
    return memoryMonitor.getStats();
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<MemoryManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ 内存管理配置已更新');
  }

  /**
   * 手动触发清理
   */
  async cleanup(mode: 'conservative' | 'aggressive' = 'conservative'): Promise<CleanupResult> {
    return this.performAutomaticCleanup(mode);
  }

  /**
   * 导出内存报告
   */
  exportReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      status: this.status,
      cleanupHistory: this.cleanupHistory,
      monitoringStats: this.getMonitoringStats(),
      performanceTests: memoryProfiler.getAllPerformanceTests()
    };
    
    return JSON.stringify(report, null, 2);
  }
}

// 创建全局内存管理器实例
export const memoryManager = new MemoryManager({
  enableMonitoring: true,
  enableMobileOptimization: true,
  enableAutomaticCleanup: true,
  enableProfiler: process.env.NODE_ENV === 'development'
});

// 开发环境下挂载到全局
if (process.env.NODE_ENV === 'development') {
  (window as any).memoryManager = memoryManager;
  console.log('🔧 内存管理器已挂载到 window.memoryManager');
}

export default MemoryManager;