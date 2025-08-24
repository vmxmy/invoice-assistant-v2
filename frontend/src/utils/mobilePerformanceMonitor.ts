/**
 * 移动端性能监控工具
 * 专门针对发票管理页面的性能监控和优化
 */

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  scrollingFPS: number;
  renderTime: number;
  listItemCount: number;
  viewMode: 'table' | 'grid';
  deviceType: string;
}

interface PerformanceConfig {
  enableFPSMonitoring?: boolean;
  enableMemoryMonitoring?: boolean;
  enableScrollMonitoring?: boolean;
  targetFPS?: number;
  reportingInterval?: number;
  onPerformanceAlert?: (metrics: PerformanceMetrics) => void;
}

class MobilePerformanceMonitor {
  private isMonitoring = false;
  private config: Required<PerformanceConfig>;
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 0;
  private scrollingFPS = 0;
  private isScrolling = false;
  private scrollFrameCount = 0;
  private scrollStartTime = 0;

  constructor(config: PerformanceConfig = {}) {
    this.config = {
      enableFPSMonitoring: true,
      enableMemoryMonitoring: true,
      enableScrollMonitoring: true,
      targetFPS: 55, // 移动端目标FPS
      reportingInterval: 5000, // 5秒报告一次
      onPerformanceAlert: () => {},
      ...config,
    };
  }

  /**
   * 开始性能监控
   */
  start(): void {
    if (this.isMonitoring) return;
    
    // 检查是否为移动设备，如果不是则不启动监控
    const deviceType = this.getDeviceType();
    if (deviceType === 'Desktop') {
      console.log('📊 检测到桌面环境，跳过移动端性能监控');
      return;
    }
    
    this.isMonitoring = true;
    console.log('📊 启动移动端性能监控');

    if (this.config.enableFPSMonitoring) {
      this.startFPSMonitoring();
    }

    if (this.config.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }

    if (this.config.enableScrollMonitoring) {
      this.startScrollMonitoring();
    }

    this.startPerformanceObserver();
    this.startReporting();
  }

  /**
   * 停止性能监控
   */
  stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    console.log('📊 停止移动端性能监控');

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }

  /**
   * FPS监控
   */
  private startFPSMonitoring(): void {
    let lastTime = performance.now();
    let frameCount = 0;
    let initialized = false;

    const tick = (currentTime: number) => {
      if (!this.isMonitoring) return;

      frameCount++;
      
      // 等待至少3秒后再开始检查FPS，避免初始化阶段的误报
      const elapsed = currentTime - lastTime;
      if (elapsed >= 1000) {
        this.fps = Math.round((frameCount * 1000) / elapsed);
        this.metrics.fps = this.fps;
        
        // 只在初始化完成且FPS真的很低时才报警
        if (initialized && this.fps < this.config.targetFPS && this.fps < 30) {
          this.handlePerformanceAlert('FPS过低', { fps: this.fps });
        }
        
        frameCount = 0;
        lastTime = currentTime;
        initialized = true;
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  /**
   * 内存使用监控
   */
  private startMemoryMonitoring(): void {
    const checkMemory = () => {
      if (!this.isMonitoring) return;

      // @ts-ignore - performance.memory 在某些浏览器中可用
      if (performance.memory) {
        // @ts-ignore
        const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
        const memoryUsage = (usedJSHeapSize / jsHeapSizeLimit) * 100;
        
        this.metrics.memoryUsage = Math.round(memoryUsage);
        
        // 检查内存使用是否过高
        if (memoryUsage > 80) {
          this.handlePerformanceAlert('内存使用过高', { memoryUsage });
        }
      }

      setTimeout(checkMemory, 2000);
    };

    checkMemory();
  }

  /**
   * 滚动性能监控
   */
  private startScrollMonitoring(): void {
    let scrollTimeout: NodeJS.Timeout;
    let scrollFrameCount = 0;
    let scrollStartTime = 0;

    const handleScrollStart = () => {
      if (this.isScrolling) return;
      
      this.isScrolling = true;
      scrollFrameCount = 0;
      scrollStartTime = performance.now();
    };

    const handleScrollEnd = () => {
      if (!this.isScrolling) return;
      
      this.isScrolling = false;
      const duration = performance.now() - scrollStartTime;
      
      if (duration > 0 && scrollFrameCount > 0) {
        this.scrollingFPS = Math.round((scrollFrameCount * 1000) / duration);
        this.metrics.scrollingFPS = this.scrollingFPS;
        
        // 检查滚动FPS是否达标
        if (this.scrollingFPS < this.config.targetFPS) {
          this.handlePerformanceAlert('滚动性能不佳', { 
            scrollingFPS: this.scrollingFPS 
          });
        }
      }
    };

    const trackScrollFrame = () => {
      if (this.isScrolling) {
        scrollFrameCount++;
      }
      requestAnimationFrame(trackScrollFrame);
    };

    // 监听滚动事件
    document.addEventListener('scroll', () => {
      handleScrollStart();
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScrollEnd, 100);
    }, { passive: true });

    trackScrollFrame();
  }

  /**
   * Performance Observer监控
   */
  private startPerformanceObserver(): void {
    // 监控长任务
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // 长任务阈值：50ms
            console.warn(`⚠️ 长任务检测: ${entry.duration}ms`, entry);
            this.handlePerformanceAlert('长任务检测', { 
              taskDuration: entry.duration 
            });
          }
        }
      });

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        console.warn('不支持长任务监控', e);
      }
    }

    // 监控布局抖动
    if ('PerformanceObserver' in window) {
      const layoutShiftObserver = new PerformanceObserver((list) => {
        let totalShift = 0;
        for (const entry of list.getEntries()) {
          // @ts-ignore
          if (entry.value) {
            // @ts-ignore
            totalShift += entry.value;
          }
        }
        
        if (totalShift > 0.1) { // CLS阈值
          this.handlePerformanceAlert('布局抖动', { 
            cumulativeLayoutShift: totalShift 
          });
        }
      });

      try {
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('layout-shift', layoutShiftObserver);
      } catch (e) {
        console.warn('不支持布局抖动监控', e);
      }
    }
  }

  /**
   * 定期报告性能指标
   */
  private startReporting(): void {
    const report = () => {
      if (!this.isMonitoring) return;

      const currentMetrics: PerformanceMetrics = {
        fps: this.fps,
        memoryUsage: this.metrics.memoryUsage || 0,
        scrollingFPS: this.scrollingFPS,
        renderTime: 0, // 可以通过其他方式获取
        listItemCount: 0, // 需要外部设置
        viewMode: 'grid', // 需要外部设置
        deviceType: this.getDeviceType(),
      };

      // 在开发环境中输出详细日志
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 性能指标:', currentMetrics);
      }

      // 检查整体性能
      this.checkOverallPerformance(currentMetrics);

      setTimeout(report, this.config.reportingInterval);
    };

    setTimeout(report, this.config.reportingInterval);
  }

  /**
   * 处理性能警告
   */
  private handlePerformanceAlert(type: string, data: any): void {
    console.warn(`⚠️ 性能警告 - ${type}:`, data);
    
    if (this.config.onPerformanceAlert) {
      this.config.onPerformanceAlert({
        ...this.metrics,
        ...data,
        deviceType: this.getDeviceType(),
      } as PerformanceMetrics);
    }
  }

  /**
   * 检查整体性能
   */
  private checkOverallPerformance(metrics: PerformanceMetrics): void {
    const issues: string[] = [];

    if (metrics.fps < this.config.targetFPS) {
      issues.push(`FPS过低: ${metrics.fps}`);
    }

    if (metrics.memoryUsage > 80) {
      issues.push(`内存使用过高: ${metrics.memoryUsage}%`);
    }

    if (metrics.scrollingFPS > 0 && metrics.scrollingFPS < this.config.targetFPS) {
      issues.push(`滚动性能不佳: ${metrics.scrollingFPS}FPS`);
    }

    if (issues.length > 0) {
      console.warn('📱 移动端性能问题:', issues.join(', '));
      
      // 提供优化建议
      this.providePerfOptimizationSuggestions(metrics);
    }
  }

  /**
   * 提供性能优化建议
   */
  private providePerfOptimizationSuggestions(metrics: PerformanceMetrics): void {
    const suggestions: string[] = [];

    if (metrics.fps < this.config.targetFPS) {
      suggestions.push('建议: 减少DOM操作，使用CSS动画替代JS动画');
    }

    if (metrics.memoryUsage > 80) {
      suggestions.push('建议: 清理未使用的组件，使用React.memo优化重渲染');
    }

    if (metrics.listItemCount > 100) {
      suggestions.push('建议: 使用虚拟滚动优化长列表性能');
    }

    if (metrics.viewMode === 'table' && metrics.fps < this.config.targetFPS) {
      suggestions.push('建议: 在移动端优先使用卡片视图，减少DOM复杂度');
    }

    if (suggestions.length > 0) {
      console.info('💡 性能优化建议:', suggestions);
    }
  }

  /**
   * 获取设备类型
   */
  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    
    // 检查触摸设备
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return 'iOS';
    } else if (/Android/i.test(userAgent)) {
      return 'Android';
    } else if (/Mobile/i.test(userAgent) || isTouchDevice) {
      return 'Mobile';
    } else {
      return 'Desktop';
    }
  }

  /**
   * 手动设置指标
   */
  setMetric(key: keyof PerformanceMetrics, value: any): void {
    this.metrics[key] = value;
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics, fps: this.fps, scrollingFPS: this.scrollingFPS };
  }
}

// 创建全局实例
export const mobilePerformanceMonitor = new MobilePerformanceMonitor();

// 开发环境自动启动
if (process.env.NODE_ENV === 'development') {
  // 延迟启动，避免影响初始加载
  setTimeout(() => {
    mobilePerformanceMonitor.start();
  }, 2000);
}

export default MobilePerformanceMonitor;