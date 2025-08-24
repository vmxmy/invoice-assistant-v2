/**
 * 手势性能监控器
 * 监控手势操作的性能，提供RAF优化和性能建议
 */

export interface PerformanceMetrics {
  gestureType: string;
  startTime: number;
  endTime: number;
  duration: number;
  frameCount: number;
  droppedFrames: number;
  averageFPS: number;
  memoryUsage: number;
  touchEventCount: number;
  rafCallbacks: number;
  jankFrames: number;
  interactionScore: number;
}

export interface PerformanceConfig {
  enableMonitoring: boolean;
  enableRAF: boolean;
  targetFPS: number;
  jankThreshold: number; // ms
  memoryWarningThreshold: number; // MB
  maxHistoryEntries: number;
  enablePerformanceWarnings: boolean;
  warningCallback?: (warning: PerformanceWarning) => void;
}

export interface PerformanceWarning {
  type: 'fps' | 'memory' | 'jank' | 'touch-events';
  severity: 'low' | 'medium' | 'high';
  message: string;
  metrics: Partial<PerformanceMetrics>;
  suggestions: string[];
}

export interface RAFManager {
  schedule: (callback: () => void, priority?: number) => number;
  cancel: (id: number) => void;
  flush: () => void;
  getQueueLength: () => number;
}

class GesturePerformanceMonitor {
  private config: PerformanceConfig = {
    enableMonitoring: true,
    enableRAF: true,
    targetFPS: 60,
    jankThreshold: 16.67, // ~60fps
    memoryWarningThreshold: 50, // MB
    maxHistoryEntries: 100,
    enablePerformanceWarnings: true,
  };

  private metricsHistory: PerformanceMetrics[] = [];
  private currentGesture: Partial<PerformanceMetrics> | null = null;
  private frameTimestamps: number[] = [];
  private rafCallbacks = new Map<number, { callback: () => void; priority: number }>();
  private rafQueueId = 0;
  private rafScheduled = false;
  private touchEventBuffer: Array<{ timestamp: number; type: string }> = [];

  // Performance observers
  private observer: PerformanceObserver | null = null;
  private memoryMonitorInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = { ...this.config, ...config };
    this.setupPerformanceObserver();
    this.startMemoryMonitoring();
  }

  /**
   * 开始监控手势性能
   */
  startGestureTracking(gestureType: string): void {
    if (!this.config.enableMonitoring) return;

    this.currentGesture = {
      gestureType,
      startTime: performance.now(),
      frameCount: 0,
      droppedFrames: 0,
      touchEventCount: 0,
      rafCallbacks: 0,
      jankFrames: 0,
    };

    this.frameTimestamps = [performance.now()];
    this.touchEventBuffer = [];
  }

  /**
   * 更新手势性能指标
   */
  updateGestureMetrics(): void {
    if (!this.currentGesture || !this.config.enableMonitoring) return;

    const now = performance.now();
    this.frameTimestamps.push(now);

    // 保持最近的帧时间戳（最多保留100帧）
    if (this.frameTimestamps.length > 100) {
      this.frameTimestamps = this.frameTimestamps.slice(-50);
    }

    this.currentGesture.frameCount = (this.currentGesture.frameCount || 0) + 1;

    // 检查是否有掉帧
    if (this.frameTimestamps.length > 1) {
      const lastFrameTime = this.frameTimestamps[this.frameTimestamps.length - 2];
      const frameTime = now - lastFrameTime;
      
      if (frameTime > this.config.jankThreshold * 2) {
        this.currentGesture.droppedFrames = (this.currentGesture.droppedFrames || 0) + 1;
      }
      
      if (frameTime > this.config.jankThreshold * 1.5) {
        this.currentGesture.jankFrames = (this.currentGesture.jankFrames || 0) + 1;
      }
    }
  }

  /**
   * 记录触摸事件
   */
  recordTouchEvent(type: string): void {
    if (!this.currentGesture || !this.config.enableMonitoring) return;

    const timestamp = performance.now();
    this.touchEventBuffer.push({ timestamp, type });

    // 清理旧的触摸事件记录
    const cutoff = timestamp - 1000; // 保留1秒内的事件
    this.touchEventBuffer = this.touchEventBuffer.filter(event => event.timestamp >= cutoff);

    this.currentGesture.touchEventCount = (this.currentGesture.touchEventCount || 0) + 1;
  }

  /**
   * 结束手势跟踪
   */
  endGestureTracking(): PerformanceMetrics | null {
    if (!this.currentGesture || !this.config.enableMonitoring) return null;

    const endTime = performance.now();
    const duration = endTime - (this.currentGesture.startTime || 0);
    
    const metrics: PerformanceMetrics = {
      ...this.currentGesture,
      endTime,
      duration,
      averageFPS: this.calculateAverageFPS(),
      memoryUsage: this.getCurrentMemoryUsage(),
      interactionScore: this.calculateInteractionScore(),
    } as PerformanceMetrics;

    // 添加到历史记录
    this.metricsHistory.push(metrics);
    
    // 限制历史记录大小
    if (this.metricsHistory.length > this.config.maxHistoryEntries) {
      this.metricsHistory = this.metricsHistory.slice(-this.config.maxHistoryEntries / 2);
    }

    // 检查性能警告
    this.checkPerformanceWarnings(metrics);

    this.currentGesture = null;
    this.frameTimestamps = [];

    return metrics;
  }

  /**
   * RAF管理器
   */
  createRAFManager(): RAFManager {
    return {
      schedule: (callback: () => void, priority: number = 0) => {
        if (!this.config.enableRAF) {
          callback();
          return 0;
        }

        const id = ++this.rafQueueId;
        this.rafCallbacks.set(id, { callback, priority });
        
        if (this.currentGesture) {
          this.currentGesture.rafCallbacks = (this.currentGesture.rafCallbacks || 0) + 1;
        }

        this.scheduleRAF();
        return id;
      },
      
      cancel: (id: number) => {
        this.rafCallbacks.delete(id);
      },
      
      flush: () => {
        this.flushRAFQueue();
      },
      
      getQueueLength: () => {
        return this.rafCallbacks.size;
      },
    };
  }

  /**
   * 调度RAF执行
   */
  private scheduleRAF(): void {
    if (this.rafScheduled || this.rafCallbacks.size === 0) return;

    this.rafScheduled = true;
    requestAnimationFrame(() => {
      this.flushRAFQueue();
      this.rafScheduled = false;
    });
  }

  /**
   * 执行RAF队列
   */
  private flushRAFQueue(): void {
    if (this.rafCallbacks.size === 0) return;

    const startTime = performance.now();
    
    // 按优先级排序执行
    const sortedCallbacks = Array.from(this.rafCallbacks.entries())
      .sort(([, a], [, b]) => a.priority - b.priority);

    for (const [id, { callback }] of sortedCallbacks) {
      try {
        callback();
        this.rafCallbacks.delete(id);
        
        // 如果单帧执行时间过长，延迟剩余回调到下一帧
        if (performance.now() - startTime > this.config.jankThreshold / 2) {
          this.scheduleRAF();
          break;
        }
      } catch (error) {
        console.error('RAF callback error:', error);
        this.rafCallbacks.delete(id);
      }
    }
  }

  /**
   * 计算平均FPS
   */
  private calculateAverageFPS(): number {
    if (this.frameTimestamps.length < 2) return 0;

    const totalTime = this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
    const frameCount = this.frameTimestamps.length - 1;
    
    return totalTime > 0 ? (frameCount * 1000) / totalTime : 0;
  }

  /**
   * 获取当前内存使用量
   */
  private getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  }

  /**
   * 计算交互分数
   */
  private calculateInteractionScore(): number {
    if (!this.currentGesture) return 0;

    const fps = this.calculateAverageFPS();
    const targetFPS = this.config.targetFPS;
    const jankRatio = (this.currentGesture.jankFrames || 0) / (this.currentGesture.frameCount || 1);
    const dropRatio = (this.currentGesture.droppedFrames || 0) / (this.currentGesture.frameCount || 1);

    // 综合评分 (0-100)
    const fpsScore = Math.min(100, (fps / targetFPS) * 100);
    const smoothnessScore = Math.max(0, 100 - (jankRatio * 100));
    const responsiveScore = Math.max(0, 100 - (dropRatio * 150));

    return (fpsScore * 0.4 + smoothnessScore * 0.3 + responsiveScore * 0.3);
  }

  /**
   * 检查性能警告
   */
  private checkPerformanceWarnings(metrics: PerformanceMetrics): void {
    if (!this.config.enablePerformanceWarnings) return;

    const warnings: PerformanceWarning[] = [];

    // FPS警告
    if (metrics.averageFPS < this.config.targetFPS * 0.8) {
      warnings.push({
        type: 'fps',
        severity: metrics.averageFPS < this.config.targetFPS * 0.5 ? 'high' : 'medium',
        message: `Low FPS detected: ${metrics.averageFPS.toFixed(1)} fps`,
        metrics: { averageFPS: metrics.averageFPS },
        suggestions: [
          '考虑减少同时执行的动画数量',
          '使用CSS transform代替改变layout属性',
          '启用will-change提示浏览器优化',
          '减少复杂的CSS选择器使用',
        ],
      });
    }

    // 内存警告
    if (metrics.memoryUsage > this.config.memoryWarningThreshold) {
      warnings.push({
        type: 'memory',
        severity: metrics.memoryUsage > this.config.memoryWarningThreshold * 2 ? 'high' : 'medium',
        message: `High memory usage: ${metrics.memoryUsage.toFixed(1)} MB`,
        metrics: { memoryUsage: metrics.memoryUsage },
        suggestions: [
          '检查是否有内存泄漏',
          '及时清理不必要的DOM引用',
          '考虑使用对象池复用',
          '优化图片和资源大小',
        ],
      });
    }

    // 卡顿警告
    const jankRatio = metrics.jankFrames / metrics.frameCount;
    if (jankRatio > 0.1) {
      warnings.push({
        type: 'jank',
        severity: jankRatio > 0.3 ? 'high' : 'medium',
        message: `High jank ratio: ${(jankRatio * 100).toFixed(1)}%`,
        metrics: { jankFrames: metrics.jankFrames, frameCount: metrics.frameCount },
        suggestions: [
          '避免在手势处理中进行重布局操作',
          '使用requestAnimationFrame优化动画',
          '考虑使用Web Workers处理复杂计算',
          '减少DOM操作频率',
        ],
      });
    }

    // 触摸事件频率警告
    const touchEventRate = metrics.touchEventCount / (metrics.duration / 1000);
    if (touchEventRate > 200) { // 每秒超过200个触摸事件
      warnings.push({
        type: 'touch-events',
        severity: touchEventRate > 500 ? 'high' : 'medium',
        message: `High touch event rate: ${touchEventRate.toFixed(1)} events/sec`,
        metrics: { touchEventCount: metrics.touchEventCount, duration: metrics.duration },
        suggestions: [
          '考虑节流触摸事件处理',
          '使用passive事件监听器',
          '减少不必要的事件监听器',
          '批量处理连续的触摸事件',
        ],
      });
    }

    // 发送警告
    warnings.forEach(warning => {
      console.warn(`[GesturePerformance] ${warning.message}`, warning);
      this.config.warningCallback?.(warning);
    });
  }

  /**
   * 设置性能观察器
   */
  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach(entry => {
          if (entry.entryType === 'measure' && entry.name.startsWith('gesture-')) {
            // 处理手势相关的性能条目
            this.handlePerformanceEntry(entry);
          }
        });
      });

      this.observer.observe({ 
        entryTypes: ['measure', 'navigation', 'paint'],
        buffered: true 
      });
    } catch (error) {
      console.warn('Failed to setup PerformanceObserver:', error);
    }
  }

  /**
   * 处理性能条目
   */
  private handlePerformanceEntry(entry: PerformanceEntry): void {
    if (this.config.enableMonitoring) {
      console.log(`[Performance] ${entry.name}: ${entry.duration.toFixed(2)}ms`);
    }
  }

  /**
   * 开始内存监控
   */
  private startMemoryMonitoring(): void {
    if (!('memory' in performance)) return;

    this.memoryMonitorInterval = setInterval(() => {
      const memoryUsage = this.getCurrentMemoryUsage();
      
      if (memoryUsage > this.config.memoryWarningThreshold && this.config.enablePerformanceWarnings) {
        const warning: PerformanceWarning = {
          type: 'memory',
          severity: memoryUsage > this.config.memoryWarningThreshold * 2 ? 'high' : 'medium',
          message: `Memory usage warning: ${memoryUsage.toFixed(1)} MB`,
          metrics: { memoryUsage },
          suggestions: [
            '检查内存泄漏',
            '清理不必要的对象引用',
            '考虑分页加载大量数据',
          ],
        };
        
        this.config.warningCallback?.(warning);
      }
    }, 10000); // 每10秒检查一次
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    averageInteractionScore: number;
    averageFPS: number;
    totalGestures: number;
    performanceIssues: number;
    memoryTrend: number[];
    gestureTypeStats: Record<string, {
      count: number;
      averageScore: number;
      averageDuration: number;
    }>;
  } {
    if (this.metricsHistory.length === 0) {
      return {
        averageInteractionScore: 0,
        averageFPS: 0,
        totalGestures: 0,
        performanceIssues: 0,
        memoryTrend: [],
        gestureTypeStats: {},
      };
    }

    const totalScore = this.metricsHistory.reduce((sum, m) => sum + m.interactionScore, 0);
    const totalFPS = this.metricsHistory.reduce((sum, m) => sum + m.averageFPS, 0);
    const performanceIssues = this.metricsHistory.filter(m => m.interactionScore < 70).length;
    
    const memoryTrend = this.metricsHistory.slice(-10).map(m => m.memoryUsage);
    
    const gestureTypeStats: Record<string, any> = {};
    this.metricsHistory.forEach(metrics => {
      const type = metrics.gestureType;
      if (!gestureTypeStats[type]) {
        gestureTypeStats[type] = {
          count: 0,
          totalScore: 0,
          totalDuration: 0,
        };
      }
      
      gestureTypeStats[type].count++;
      gestureTypeStats[type].totalScore += metrics.interactionScore;
      gestureTypeStats[type].totalDuration += metrics.duration;
    });

    // 计算平均值
    Object.keys(gestureTypeStats).forEach(type => {
      const stats = gestureTypeStats[type];
      gestureTypeStats[type] = {
        count: stats.count,
        averageScore: stats.totalScore / stats.count,
        averageDuration: stats.totalDuration / stats.count,
      };
    });

    return {
      averageInteractionScore: totalScore / this.metricsHistory.length,
      averageFPS: totalFPS / this.metricsHistory.length,
      totalGestures: this.metricsHistory.length,
      performanceIssues,
      memoryTrend,
      gestureTypeStats,
    };
  }

  /**
   * 清除性能历史
   */
  clearHistory(): void {
    this.metricsHistory = [];
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
    
    this.rafCallbacks.clear();
    this.metricsHistory = [];
    this.currentGesture = null;
  }
}

export default GesturePerformanceMonitor;