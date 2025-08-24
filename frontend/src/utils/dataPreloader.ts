/**
 * 智能数据预加载系统
 * 基于用户行为预测和网络状况的数据预取策略
 */

import { QueryClient } from '@tanstack/react-query';
import { networkRequestManager, type NetworkInfo } from './networkRequestManager';

export interface PreloadStrategy {
  // 预加载优先级
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  // 预加载触发条件
  trigger: 'immediate' | 'idle' | 'interaction' | 'scroll' | 'timer';
  
  // 网络条件限制
  networkRequirement?: 'any' | 'good' | 'excellent';
  
  // 缓存时间（毫秒）
  staleTime?: number;
  
  // 预加载延迟（毫秒）
  delay?: number;
  
  // 是否在后台预加载
  background?: boolean;
  
  // 条件检查函数
  condition?: () => boolean;
}

export interface PreloadTask {
  id: string;
  queryKey: any[];
  queryFn: () => Promise<any>;
  strategy: PreloadStrategy;
  status: 'pending' | 'loading' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

class DataPreloader {
  private static instance: DataPreloader;
  private queryClient: QueryClient;
  private tasks: Map<string, PreloadTask> = new Map();
  private userBehaviorData: Map<string, number> = new Map();
  private idleCallback?: number;
  private intersectionObserver?: IntersectionObserver;
  
  // 用户行为统计
  private pageViews: Map<string, number> = new Map();
  private interactionHistory: Array<{ action: string; timestamp: number; context?: any }> = [];
  private scrollBehavior: { depth: number; speed: number; direction: string } = { depth: 0, speed: 0, direction: 'down' };
  
  private constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.setupUserBehaviorTracking();
    this.setupIntersectionObserver();
  }

  static getInstance(queryClient?: QueryClient): DataPreloader {
    if (!DataPreloader.instance && queryClient) {
      DataPreloader.instance = new DataPreloader(queryClient);
    }
    return DataPreloader.instance;
  }

  /**
   * 添加预加载任务
   */
  addPreloadTask(
    id: string,
    queryKey: any[],
    queryFn: () => Promise<any>,
    strategy: PreloadStrategy
  ): void {
    // 检查任务是否已存在
    if (this.tasks.has(id)) {
      console.warn(`[DataPreloader] 任务已存在: ${id}`);
      return;
    }

    const task: PreloadTask = {
      id,
      queryKey,
      queryFn,
      strategy,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.tasks.set(id, task);
    console.log(`📋 [DataPreloader] 添加预加载任务: ${id}`, { strategy });

    // 根据触发条件执行预加载
    this.schedulePreload(task);
  }

  /**
   * 立即预加载关键数据
   */
  preloadCriticalData(
    queryKey: any[],
    queryFn: () => Promise<any>,
    options: { staleTime?: number; force?: boolean } = {}
  ): Promise<void> {
    const { staleTime = 30 * 60 * 1000, force = false } = options;
    const networkInfo = networkRequestManager.getNetworkInfo();

    // 离线状态不预加载
    if (!networkInfo.isOnline) {
      return Promise.resolve();
    }

    console.log(`⚡ [DataPreloader] 预加载关键数据`, { queryKey });

    return this.queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime,
      ...(force && { revalidateIfStale: true })
    });
  }

  /**
   * 基于用户行为预测的预加载
   */
  predictivePreload(
    currentPage: string,
    contextData?: Record<string, any>
  ): void {
    const predictions = this.generatePredictions(currentPage, contextData);
    const networkInfo = networkRequestManager.getNetworkInfo();

    // 慢网络下只预加载高优先级预测
    const filteredPredictions = networkInfo.isSlowNetwork
      ? predictions.filter(p => p.confidence > 0.8)
      : predictions;

    filteredPredictions.forEach(prediction => {
      const taskId = `predictive-${prediction.target}-${Date.now()}`;
      
      // 根据预测生成预加载任务
      if (prediction.target.startsWith('invoice-')) {
        this.addPreloadTask(
          taskId,
          ['invoices', prediction.target.split('-')[1]],
          () => this.createInvoiceQueryFn(prediction.target.split('-')[1]),
          {
            priority: prediction.confidence > 0.9 ? 'high' : 'medium',
            trigger: 'idle',
            networkRequirement: 'good',
            background: true,
            staleTime: 5 * 60 * 1000,
          }
        );
      }
    });
  }

  /**
   * 滚动预加载
   */
  enableScrollPreloading(
    container: Element,
    options: {
      threshold?: number;
      rootMargin?: string;
      dataLoader: (offset: number) => Promise<any>;
      queryKeyGenerator: (offset: number) => any[];
    }
  ): void {
    const { threshold = 0.8, rootMargin = '100px', dataLoader, queryKeyGenerator } = options;

    // 创建滚动预加载触发器
    const triggerElement = document.createElement('div');
    triggerElement.style.height = '1px';
    triggerElement.style.position = 'absolute';
    triggerElement.style.bottom = `${(1 - threshold) * 100}%`;
    triggerElement.setAttribute('data-preload-trigger', 'true');
    
    container.appendChild(triggerElement);

    // 使用 Intersection Observer 监听
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(triggerElement);
    }
  }

  /**
   * 后台数据同步
   */
  enableBackgroundSync(
    syncTasks: Array<{
      queryKey: any[];
      queryFn: () => Promise<any>;
      interval: number;
      condition?: () => boolean;
    }>
  ): void {
    syncTasks.forEach(({ queryKey, queryFn, interval, condition }, index) => {
      const syncId = `background-sync-${index}`;
      
      // 设置定时同步
      setInterval(() => {
        const networkInfo = networkRequestManager.getNetworkInfo();
        
        // 检查条件
        if (condition && !condition()) return;
        if (!networkInfo.isOnline) return;
        if (networkInfo.isSlowNetwork) return;
        
        // 检查应用是否在前台
        if (document.visibilityState === 'visible') {
          console.log(`🔄 [DataPreloader] 后台同步: ${queryKey.join('/')}`);
          
          this.queryClient.prefetchQuery({
            queryKey,
            queryFn,
            staleTime: 0, // 强制刷新
          });
        }
      }, interval);
    });
  }

  /**
   * 调度预加载任务
   */
  private schedulePreload(task: PreloadTask): void {
    const { strategy } = task;

    switch (strategy.trigger) {
      case 'immediate':
        this.executePreload(task);
        break;
        
      case 'idle':
        this.scheduleIdlePreload(task);
        break;
        
      case 'timer':
        setTimeout(() => {
          this.executePreload(task);
        }, strategy.delay || 1000);
        break;
        
      case 'interaction':
      case 'scroll':
        // 这些由外部触发
        break;
    }
  }

  /**
   * 空闲时预加载
   */
  private scheduleIdlePreload(task: PreloadTask): void {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        this.executePreload(task);
      }, { timeout: 5000 });
    } else {
      // fallback
      setTimeout(() => {
        this.executePreload(task);
      }, 100);
    }
  }

  /**
   * 执行预加载任务
   */
  private async executePreload(task: PreloadTask): Promise<void> {
    const networkInfo = networkRequestManager.getNetworkInfo();
    
    // 检查网络条件
    if (!this.checkNetworkRequirement(networkInfo, task.strategy.networkRequirement)) {
      console.log(`🌐 [DataPreloader] 网络条件不满足，跳过: ${task.id}`);
      return;
    }

    // 检查自定义条件
    if (task.strategy.condition && !task.strategy.condition()) {
      console.log(`❌ [DataPreloader] 条件检查失败，跳过: ${task.id}`);
      return;
    }

    // 检查数据是否已缓存
    const cachedData = this.queryClient.getQueryData(task.queryKey);
    if (cachedData && task.strategy.staleTime) {
      const cacheTime = this.queryClient.getQueryState(task.queryKey)?.dataUpdatedAt || 0;
      if (Date.now() - cacheTime < task.strategy.staleTime) {
        console.log(`💾 [DataPreloader] 数据仍然新鲜，跳过: ${task.id}`);
        task.status = 'completed';
        return;
      }
    }

    // 开始预加载
    task.status = 'loading';
    task.startedAt = Date.now();
    
    console.log(`🚀 [DataPreloader] 开始预加载: ${task.id}`, {
      priority: task.strategy.priority,
      network: networkInfo.effectiveType
    });

    try {
      await this.queryClient.prefetchQuery({
        queryKey: task.queryKey,
        queryFn: task.queryFn,
        staleTime: task.strategy.staleTime || 5 * 60 * 1000,
      });

      task.status = 'completed';
      task.completedAt = Date.now();
      
      console.log(`✅ [DataPreloader] 预加载完成: ${task.id}`, {
        duration: task.completedAt - task.startedAt!
      });
      
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = Date.now();
      
      console.error(`❌ [DataPreloader] 预加载失败: ${task.id}`, error);
    }
  }

  /**
   * 检查网络要求
   */
  private checkNetworkRequirement(
    networkInfo: NetworkInfo,
    requirement?: PreloadStrategy['networkRequirement']
  ): boolean {
    if (!requirement || requirement === 'any') return networkInfo.isOnline;
    
    switch (requirement) {
      case 'good':
        return networkInfo.isOnline && ['good', 'excellent'].includes(networkInfo.connectionQuality);
      case 'excellent':
        return networkInfo.isOnline && networkInfo.connectionQuality === 'excellent';
      default:
        return networkInfo.isOnline;
    }
  }

  /**
   * 用户行为跟踪设置
   */
  private setupUserBehaviorTracking(): void {
    if (typeof window === 'undefined') return;

    // 页面访问统计
    const currentPath = window.location.pathname;
    this.pageViews.set(currentPath, (this.pageViews.get(currentPath) || 0) + 1);

    // 交互事件监听
    ['click', 'scroll', 'keydown', 'touchstart'].forEach(event => {
      document.addEventListener(event, (e) => {
        this.recordInteraction(event, { target: (e.target as Element)?.tagName });
      }, { passive: true });
    });

    // 滚动行为分析
    let lastScrollY = window.scrollY;
    let lastScrollTime = Date.now();

    document.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      const currentTime = Date.now();
      const deltaY = currentScrollY - lastScrollY;
      const deltaTime = currentTime - lastScrollTime;

      this.scrollBehavior = {
        depth: Math.max(this.scrollBehavior.depth, currentScrollY),
        speed: Math.abs(deltaY / deltaTime),
        direction: deltaY > 0 ? 'down' : 'up'
      };

      lastScrollY = currentScrollY;
      lastScrollTime = currentTime;
    }, { passive: true });
  }

  /**
   * 设置 Intersection Observer
   */
  private setupIntersectionObserver(): void {
    if (typeof window === 'undefined' || !window.IntersectionObserver) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target;
            const preloadTrigger = element.getAttribute('data-preload-trigger');
            
            if (preloadTrigger) {
              console.log(`👀 [DataPreloader] 滚动预加载触发`);
              // 触发滚动预加载逻辑
              this.triggerScrollPreload();
            }
          }
        });
      },
      { rootMargin: '100px' }
    );
  }

  /**
   * 记录用户交互
   */
  private recordInteraction(action: string, context?: any): void {
    this.interactionHistory.push({
      action,
      timestamp: Date.now(),
      context
    });

    // 保持历史记录在合理范围内
    if (this.interactionHistory.length > 50) {
      this.interactionHistory = this.interactionHistory.slice(-50);
    }
  }

  /**
   * 生成预测
   */
  private generatePredictions(
    currentPage: string,
    contextData?: Record<string, any>
  ): Array<{ target: string; confidence: number; reason: string }> {
    const predictions = [];
    
    // 基于页面访问历史的预测
    const pageHistory = Array.from(this.pageViews.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    pageHistory.forEach(([page, visits]) => {
      if (page !== currentPage && visits > 1) {
        predictions.push({
          target: page.replace('/', ''),
          confidence: Math.min(visits / 10, 0.9),
          reason: 'frequent-page-access'
        });
      }
    });

    // 基于交互行为的预测
    const recentInteractions = this.interactionHistory
      .filter(i => Date.now() - i.timestamp < 60000) // 最近1分钟
      .slice(-10);

    if (recentInteractions.some(i => i.action === 'scroll' && this.scrollBehavior.direction === 'down')) {
      predictions.push({
        target: 'invoice-list-next',
        confidence: 0.7,
        reason: 'scroll-behavior'
      });
    }

    return predictions;
  }

  /**
   * 创建发票查询函数
   */
  private createInvoiceQueryFn(invoiceId: string) {
    return async () => {
      // 这里应该返回实际的发票查询逻辑
      console.log(`[DataPreloader] 预加载发票: ${invoiceId}`);
      return { id: invoiceId, preloaded: true };
    };
  }

  /**
   * 触发滚动预加载
   */
  private triggerScrollPreload(): void {
    // 查找所有等待滚动触发的任务
    const scrollTasks = Array.from(this.tasks.values())
      .filter(task => task.strategy.trigger === 'scroll' && task.status === 'pending');

    scrollTasks.forEach(task => {
      this.executePreload(task);
    });
  }

  /**
   * 获取预加载统计
   */
  getStats() {
    const tasks = Array.from(this.tasks.values());
    const completed = tasks.filter(t => t.status === 'completed');
    const failed = tasks.filter(t => t.status === 'failed');
    const pending = tasks.filter(t => t.status === 'pending');
    
    const avgDuration = completed
      .filter(t => t.startedAt && t.completedAt)
      .reduce((sum, t) => sum + (t.completedAt! - t.startedAt!), 0) / (completed.length || 1);

    return {
      total: tasks.length,
      completed: completed.length,
      failed: failed.length,
      pending: pending.length,
      successRate: (completed.length / (tasks.length || 1)) * 100,
      averageDuration: avgDuration,
      userBehavior: {
        pageViews: Object.fromEntries(this.pageViews),
        recentInteractions: this.interactionHistory.slice(-10),
        scrollDepth: this.scrollBehavior.depth
      }
    };
  }

  /**
   * 清理完成的任务
   */
  cleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    this.tasks.forEach((task, id) => {
      if (task.status === 'completed' && now - task.createdAt > oneHour) {
        this.tasks.delete(id);
      }
    });
  }
}

export default DataPreloader;