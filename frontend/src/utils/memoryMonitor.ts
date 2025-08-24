/**
 * 全面的内存监控和泄漏检测系统
 * 专为移动端优化的内存管理工具
 */

interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercent: number;
  components?: ComponentMemoryInfo[];
  listeners?: ListenerInfo[];
  timers?: TimerInfo[];
}

interface ComponentMemoryInfo {
  name: string;
  instanceCount: number;
  memoryEstimate: number;
}

interface ListenerInfo {
  type: string;
  target: string;
  count: number;
}

interface TimerInfo {
  type: 'timeout' | 'interval';
  count: number;
  totalDelay: number;
}

interface MemoryLeakDetection {
  isLeaking: boolean;
  trend: 'increasing' | 'stable' | 'decreasing';
  growthRate: number; // MB per minute
  confidence: number; // 0-100
  suggestions: string[];
}

interface MemoryPressureLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  actions: string[];
}

class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots = 50; // 保持最近50个快照
  private monitoringInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Function> = new Map();
  private isMonitoring = false;
  
  // 内存压力阈值配置
  private pressureThresholds = {
    low: 60,      // < 60%
    medium: 75,   // 60-75%
    high: 85,     // 75-85%
    critical: 95  // > 85%
  };

  // 组件实例追踪（用于检测组件泄漏）
  private componentInstances = new Map<string, number>();
  
  // 事件监听器追踪
  private eventListeners = new Map<string, number>();
  
  // 定时器追踪
  private timerTracking = {
    timeouts: new Set<number>(),
    intervals: new Set<number>()
  };

  constructor() {
    this.initializePerformanceObserver();
    this.overrideTimerMethods();
    this.overrideEventListenerMethods();
  }

  /**
   * 开始内存监控
   */
  startMonitoring(interval: number = 5000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 内存监控已启动');
    
    // 立即创建一个快照
    this.createMemorySnapshot();
    
    // 设置定期监控
    this.monitoringInterval = setInterval(() => {
      this.createMemorySnapshot();
      this.analyzeMemoryTrend();
      this.detectMemoryLeaks();
      this.checkMemoryPressure();
    }, interval);
  }

  /**
   * 停止内存监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('🔍 内存监控已停止');
  }

  /**
   * 创建内存快照
   */
  private createMemorySnapshot(): MemorySnapshot | null {
    try {
      // @ts-ignore - performance.memory 在某些浏览器中可用
      const memory = (performance as any).memory;
      
      if (!memory) {
        console.warn('当前浏览器不支持内存监控');
        return null;
      }
      
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        components: this.getComponentMemoryInfo(),
        listeners: this.getListenerInfo(),
        timers: this.getTimerInfo()
      };
      
      // 添加到快照队列
      this.snapshots.push(snapshot);
      
      // 保持队列大小
      if (this.snapshots.length > this.maxSnapshots) {
        this.snapshots.shift();
      }
      
      // 触发快照事件
      this.emit('snapshot', snapshot);
      
      return snapshot;
    } catch (error) {
      console.error('创建内存快照失败:', error);
      return null;
    }
  }

  /**
   * 分析内存趋势
   */
  private analyzeMemoryTrend(): void {
    if (this.snapshots.length < 3) return;
    
    const recent = this.snapshots.slice(-10); // 最近10个快照
    const memoryValues = recent.map(s => s.usedJSHeapSize);
    
    // 计算平均增长率
    let totalGrowth = 0;
    let growthPoints = 0;
    
    for (let i = 1; i < memoryValues.length; i++) {
      const growth = memoryValues[i] - memoryValues[i - 1];
      totalGrowth += growth;
      growthPoints++;
    }
    
    const averageGrowth = totalGrowth / growthPoints;
    const timeSpan = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 1000 / 60; // 分钟
    const growthRate = (averageGrowth / 1024 / 1024) / timeSpan; // MB per minute
    
    if (Math.abs(growthRate) > 0.1) { // 增长率 > 0.1MB/min 才报告
      this.emit('trend', {
        growthRate,
        trend: growthRate > 0 ? 'increasing' : 'decreasing',
        timeSpan,
        samples: recent.length
      });
    }
  }

  /**
   * 检测内存泄漏
   */
  private detectMemoryLeaks(): MemoryLeakDetection {
    if (this.snapshots.length < 5) {
      return {
        isLeaking: false,
        trend: 'stable',
        growthRate: 0,
        confidence: 0,
        suggestions: []
      };
    }
    
    const recentSnapshots = this.snapshots.slice(-10);
    const memoryValues = recentSnapshots.map(s => s.usedJSHeapSize);
    
    // 线性回归分析趋势
    const n = memoryValues.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = memoryValues;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // 计算相关系数（置信度）
    const meanY = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * i + intercept), 2), 0);
    const rSquared = 1 - (ssRes / ssTotal);
    
    const timeSpan = (recentSnapshots[recentSnapshots.length - 1].timestamp - recentSnapshots[0].timestamp) / 1000 / 60;
    const growthRate = (slope / 1024 / 1024) / (timeSpan / n); // MB per minute
    
    const isLeaking = growthRate > 0.05 && rSquared > 0.7; // 增长率 > 0.05MB/min 且相关度 > 0.7
    
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (growthRate > 0.01) trend = 'increasing';
    else if (growthRate < -0.01) trend = 'decreasing';
    
    const suggestions = this.generateLeakSuggestions(recentSnapshots);
    
    const result: MemoryLeakDetection = {
      isLeaking,
      trend,
      growthRate,
      confidence: Math.round(rSquared * 100),
      suggestions
    };
    
    if (isLeaking) {
      console.warn('🚨 检测到潜在内存泄漏:', result);
      this.emit('leak-detected', result);
    }
    
    return result;
  }

  /**
   * 检查内存压力
   */
  private checkMemoryPressure(): MemoryPressureLevel | null {
    const latest = this.snapshots[this.snapshots.length - 1];
    if (!latest) return null;
    
    const usage = latest.usagePercent;
    let level: MemoryPressureLevel['level'] = 'low';
    let actions: string[] = [];
    
    if (usage >= this.pressureThresholds.critical) {
      level = 'critical';
      actions = [
        '立即清理未使用的组件',
        '清除图片缓存',
        '停止非必要的后台任务',
        '触发垃圾回收'
      ];
    } else if (usage >= this.pressureThresholds.high) {
      level = 'high';
      actions = [
        '清理过期数据',
        '减少DOM操作',
        '延迟非关键资源加载'
      ];
    } else if (usage >= this.pressureThresholds.medium) {
      level = 'medium';
      actions = [
        '监控内存增长',
        '准备清理策略'
      ];
    }
    
    const pressure: MemoryPressureLevel = {
      level,
      threshold: usage,
      actions
    };
    
    if (level !== 'low') {
      console.warn(`⚠️ 内存压力: ${level} (${usage.toFixed(2)}%)`, actions);
      this.emit('pressure', pressure);
    }
    
    return pressure;
  }

  /**
   * 生成泄漏建议
   */
  private generateLeakSuggestions(snapshots: MemorySnapshot[]): string[] {
    const suggestions = [];
    const latest = snapshots[snapshots.length - 1];
    
    if (!latest) return suggestions;
    
    // 检查组件数量增长
    const componentGrowth = this.analyzeComponentGrowth(snapshots);
    if (componentGrowth.length > 0) {
      suggestions.push(`检查组件清理: ${componentGrowth.join(', ')}`);
    }
    
    // 检查事件监听器增长
    if (latest.listeners && latest.listeners.length > 0) {
      const highCountListeners = latest.listeners.filter(l => l.count > 10);
      if (highCountListeners.length > 0) {
        suggestions.push(`检查事件监听器: ${highCountListeners.map(l => l.type).join(', ')}`);
      }
    }
    
    // 检查定时器
    if (latest.timers) {
      const totalTimers = latest.timers.reduce((sum, t) => sum + t.count, 0);
      if (totalTimers > 20) {
        suggestions.push('检查定时器清理，当前活跃定时器较多');
      }
    }
    
    // 通用建议
    suggestions.push(
      '检查 useEffect 清理函数',
      '确保组件卸载时清理订阅',
      '检查闭包中的引用'
    );
    
    return suggestions;
  }

  /**
   * 分析组件增长情况
   */
  private analyzeComponentGrowth(snapshots: MemorySnapshot[]): string[] {
    if (snapshots.length < 2) return [];
    
    const growthComponents = [];
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    
    if (first.components && last.components) {
      const firstMap = new Map(first.components.map(c => [c.name, c.instanceCount]));
      
      for (const component of last.components) {
        const firstCount = firstMap.get(component.name) || 0;
        if (component.instanceCount > firstCount + 5) { // 增长超过5个实例
          growthComponents.push(`${component.name}(+${component.instanceCount - firstCount})`);
        }
      }
    }
    
    return growthComponents;
  }

  /**
   * 获取组件内存信息
   */
  private getComponentMemoryInfo(): ComponentMemoryInfo[] {
    const components: ComponentMemoryInfo[] = [];
    
    // 从React Fiber获取组件信息（如果可用）
    try {
      // 这是一个简化的实现，实际情况下可能需要更复杂的React内部访问
      const reactFiberNode = document.getElementById('root')?._reactInternalFiber;
      if (reactFiberNode) {
        // 遍历React组件树并统计组件实例
        // 这里仅作示例，实际实现需要更多的React内部知识
      }
    } catch (error) {
      // React组件分析失败时的降级处理
    }
    
    // 基于已追踪的组件实例返回信息
    this.componentInstances.forEach((count, name) => {
      components.push({
        name,
        instanceCount: count,
        memoryEstimate: count * 1024 // 简化估算，每个实例1KB
      });
    });
    
    return components;
  }

  /**
   * 获取事件监听器信息
   */
  private getListenerInfo(): ListenerInfo[] {
    const listeners: ListenerInfo[] = [];
    
    this.eventListeners.forEach((count, key) => {
      const [type, target] = key.split('@');
      listeners.push({
        type,
        target: target || 'unknown',
        count
      });
    });
    
    return listeners;
  }

  /**
   * 获取定时器信息
   */
  private getTimerInfo(): TimerInfo[] {
    return [
      {
        type: 'timeout',
        count: this.timerTracking.timeouts.size,
        totalDelay: 0 // 这里可以添加更详细的延迟统计
      },
      {
        type: 'interval',
        count: this.timerTracking.intervals.size,
        totalDelay: 0
      }
    ];
  }

  /**
   * 初始化Performance Observer
   */
  private initializePerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return;
    
    try {
      // 监控长任务
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            this.emit('long-task', {
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        }
      });
      
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      
      // 监控内存相关指标
      const measureObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('memory')) {
            this.emit('performance-measure', entry);
          }
        }
      });
      
      measureObserver.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('Performance Observer 初始化失败:', error);
    }
  }

  /**
   * 重写定时器方法以追踪使用情况
   */
  private overrideTimerMethods(): void {
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    const originalClearTimeout = window.clearTimeout;
    const originalClearInterval = window.clearInterval;
    
    window.setTimeout = ((callback: Function, delay?: number, ...args: any[]) => {
      const id = originalSetTimeout(() => {
        this.timerTracking.timeouts.delete(id);
        callback.apply(null, args);
      }, delay);
      
      this.timerTracking.timeouts.add(id);
      return id;
    }) as typeof setTimeout;
    
    window.setInterval = ((callback: Function, delay?: number, ...args: any[]) => {
      const id = originalSetInterval(callback, delay, ...args);
      this.timerTracking.intervals.add(id);
      return id;
    }) as typeof setInterval;
    
    window.clearTimeout = (id?: number) => {
      if (id) this.timerTracking.timeouts.delete(id);
      return originalClearTimeout(id);
    };
    
    window.clearInterval = (id?: number) => {
      if (id) this.timerTracking.intervals.delete(id);
      return originalClearInterval(id);
    };
  }

  /**
   * 重写事件监听器方法以追踪使用情况
   */
  private overrideEventListenerMethods(): void {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    
    EventTarget.prototype.addEventListener = function(type: string, listener: any, options?: any) {
      const key = `${type}@${this.constructor.name}`;
      const current = memoryMonitor.eventListeners.get(key) || 0;
      memoryMonitor.eventListeners.set(key, current + 1);
      
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    EventTarget.prototype.removeEventListener = function(type: string, listener: any, options?: any) {
      const key = `${type}@${this.constructor.name}`;
      const current = memoryMonitor.eventListeners.get(key) || 0;
      if (current > 0) {
        memoryMonitor.eventListeners.set(key, current - 1);
      }
      
      return originalRemoveEventListener.call(this, type, listener, options);
    };
  }

  /**
   * 事件发射器
   */
  private emit(event: string, data: any): void {
    const listener = this.listeners.get(event);
    if (listener) {
      try {
        listener(data);
      } catch (error) {
        console.error(`事件监听器错误 [${event}]:`, error);
      }
    }
  }

  /**
   * 注册事件监听器
   */
  on(event: string, listener: Function): void {
    this.listeners.set(event, listener);
  }

  /**
   * 移除事件监听器
   */
  off(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * 手动触发内存清理
   */
  forceGarbageCollection(): boolean {
    try {
      if ('gc' in window) {
        (window as any).gc();
        console.log('🗑️ 已触发垃圾回收');
        return true;
      }
    } catch (error) {
      console.warn('垃圾回收触发失败:', error);
    }
    
    return false;
  }

  /**
   * 获取内存统计信息
   */
  getStats() {
    const latest = this.snapshots[this.snapshots.length - 1];
    
    return {
      currentUsage: latest ? latest.usagePercent : 0,
      totalSnapshots: this.snapshots.length,
      componentInstances: this.componentInstances.size,
      eventListeners: this.eventListeners.size,
      activeTimers: this.timerTracking.timeouts.size + this.timerTracking.intervals.size,
      isMonitoring: this.isMonitoring,
      snapshots: this.snapshots.slice(-5) // 返回最近5个快照
    };
  }

  /**
   * 注册组件实例
   */
  registerComponent(componentName: string): void {
    const count = this.componentInstances.get(componentName) || 0;
    this.componentInstances.set(componentName, count + 1);
  }

  /**
   * 注销组件实例
   */
  unregisterComponent(componentName: string): void {
    const count = this.componentInstances.get(componentName) || 0;
    if (count > 0) {
      this.componentInstances.set(componentName, count - 1);
    }
  }

  /**
   * 清空所有监控数据
   */
  clearData(): void {
    this.snapshots.length = 0;
    this.componentInstances.clear();
    this.eventListeners.clear();
    this.timerTracking.timeouts.clear();
    this.timerTracking.intervals.clear();
    console.log('🧹 监控数据已清空');
  }
}

// 创建全局实例
export const memoryMonitor = new MemoryMonitor();

// 开发环境自动启动
if (process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    memoryMonitor.startMonitoring();
    console.log('🔍 开发环境内存监控已自动启动');
  }, 3000);
}

export default MemoryMonitor;