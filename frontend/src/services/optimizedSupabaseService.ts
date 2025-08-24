/**
 * 优化的 Supabase 服务
 * 提供网络优化的查询、批量操作、连接管理功能
 */

import { supabase } from '../lib/supabase';
import { networkRequestManager } from '../utils/networkRequestManager';

export interface OptimizedQueryOptions {
  // 查询优化
  batchSize?: number;
  enablePagination?: boolean;
  selectFields?: string;
  
  // 网络优化
  enableCompression?: boolean;
  timeout?: number;
  priority?: 'high' | 'medium' | 'low';
  
  // 缓存策略
  enableCache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
}

export interface BatchOperation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data?: any;
  filters?: Record<string, any>;
  timestamp: number;
}

interface QueryCache {
  data: any;
  timestamp: number;
  ttl: number;
}

class OptimizedSupabaseService {
  private static instance: OptimizedSupabaseService;
  private queryCache = new Map<string, QueryCache>();
  private batchOperations: BatchOperation[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private connectionPool: Map<string, any> = new Map();
  
  // 性能指标
  private queryMetrics = {
    totalQueries: 0,
    cachedQueries: 0,
    batchedOperations: 0,
    averageQueryTime: 0,
    networkSavings: 0, // 通过优化节省的数据量(KB)
  };

  private constructor() {
    this.setupBatchProcessor();
    this.setupCacheCleanup();
  }

  static getInstance(): OptimizedSupabaseService {
    if (!OptimizedSupabaseService.instance) {
      OptimizedSupabaseService.instance = new OptimizedSupabaseService();
    }
    return OptimizedSupabaseService.instance;
  }

  /**
   * 优化的查询方法
   */
  async optimizedQuery<T = any>(
    table: string,
    options: OptimizedQueryOptions & {
      select?: string;
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      range?: { from: number; to: number };
    } = {}
  ): Promise<{ data: T[] | null; error: any; fromCache?: boolean; metrics?: any }> {
    const startTime = performance.now();
    const networkInfo = networkRequestManager.getNetworkInfo();
    
    const {
      batchSize = 50,
      selectFields = '*',
      enableCache = true,
      cacheKey,
      cacheTTL = 5 * 60 * 1000, // 5分钟默认缓存
      enableCompression = networkInfo.isSlowNetwork,
      timeout = networkInfo.isSlowNetwork ? 30000 : 15000,
      select = selectFields,
      filters = {},
      orderBy,
      range,
    } = options;

    // 生成缓存键
    const finalCacheKey = cacheKey || this.generateCacheKey(table, { select, filters, orderBy, range });
    
    // 检查缓存
    if (enableCache) {
      const cached = this.getFromCache<T[]>(finalCacheKey);
      if (cached) {
        this.queryMetrics.cachedQueries++;
        console.log(`💾 [OptimizedSupabaseService] 缓存命中: ${table}`, { cacheKey: finalCacheKey });
        
        return {
          data: cached,
          error: null,
          fromCache: true,
          metrics: { duration: performance.now() - startTime, fromCache: true }
        };
      }
    }

    try {
      // 构建查询
      let query = supabase.from(table).select(select);

      // 应用过滤器
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'object' && value !== null) {
          // 支持复杂查询条件
          if (value.gte !== undefined) query = query.gte(key, value.gte);
          if (value.lte !== undefined) query = query.lte(key, value.lte);
          if (value.eq !== undefined) query = query.eq(key, value.eq);
          if (value.neq !== undefined) query = query.neq(key, value.neq);
          if (value.like !== undefined) query = query.like(key, value.like);
          if (value.ilike !== undefined) query = query.ilike(key, value.ilike);
        } else {
          query = query.eq(key, value);
        }
      });

      // 排序
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      // 分页
      if (range) {
        query = query.range(range.from, range.to);
      }

      // 网络优化设置
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeout);

      // 执行查询
      console.log(`🔍 [OptimizedSupabaseService] 执行查询: ${table}`, {
        filters: Object.keys(filters),
        network: networkInfo.effectiveType,
        timeout,
        compression: enableCompression
      });

      const { data, error } = await query.abortSignal(abortController.signal);
      clearTimeout(timeoutId);

      const duration = performance.now() - startTime;
      this.queryMetrics.totalQueries++;
      this.queryMetrics.averageQueryTime = 
        (this.queryMetrics.averageQueryTime * (this.queryMetrics.totalQueries - 1) + duration) / this.queryMetrics.totalQueries;

      if (error) {
        console.error(`❌ [OptimizedSupabaseService] 查询失败: ${table}`, error);
        return { data: null, error, metrics: { duration } };
      }

      // 缓存结果
      if (enableCache && data) {
        this.setCache(finalCacheKey, data, cacheTTL);
        
        // 计算网络节省
        const dataSize = this.estimateDataSize(data);
        console.log(`💾 [OptimizedSupabaseService] 缓存数据: ${table} (${dataSize}KB)`, { cacheKey: finalCacheKey });
      }

      return { 
        data, 
        error: null, 
        fromCache: false,
        metrics: { duration, networkType: networkInfo.effectiveType }
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ [OptimizedSupabaseService] 查询异常: ${table}`, error);
      
      return { 
        data: null, 
        error, 
        metrics: { duration, error: true }
      };
    }
  }

  /**
   * 批量操作
   */
  async batchOperations(
    operations: Array<{
      table: string;
      operation: 'insert' | 'update' | 'delete';
      data?: any;
      filters?: Record<string, any>;
    }>,
    options: {
      immediate?: boolean;
      maxBatchSize?: number;
      timeout?: number;
    } = {}
  ): Promise<{ success: boolean; results: any[]; errors: any[] }> {
    const { immediate = false, maxBatchSize = 20, timeout = 30000 } = options;
    const networkInfo = networkRequestManager.getNetworkInfo();

    console.log(`🔄 [OptimizedSupabaseService] 批量操作`, {
      count: operations.length,
      immediate,
      network: networkInfo.effectiveType
    });

    if (immediate || operations.length >= maxBatchSize || networkInfo.connectionQuality === 'poor') {
      return this.executeBatchOperations(operations, timeout);
    } else {
      // 添加到批处理队列
      operations.forEach(op => {
        this.batchOperations.push({
          id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          ...op
        });
      });

      this.scheduleBatchExecution();
      return { success: true, results: [], errors: [] };
    }
  }

  /**
   * 实时订阅优化
   */
  createOptimizedSubscription<T = any>(
    table: string,
    options: {
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      filter?: string;
      callback: (payload: any) => void;
      errorCallback?: (error: any) => void;
      throttleMs?: number;
      enableOfflineQueue?: boolean;
    }
  ) {
    const {
      event = '*',
      filter,
      callback,
      errorCallback,
      throttleMs = 100,
      enableOfflineQueue = true
    } = options;

    const networkInfo = networkRequestManager.getNetworkInfo();
    
    // 慢网络下增加节流时间
    const finalThrottleMs = networkInfo.isSlowNetwork ? Math.max(throttleMs * 2, 500) : throttleMs;

    let throttleTimer: NodeJS.Timeout | null = null;
    let offlineQueue: any[] = [];

    const throttledCallback = (payload: any) => {
      if (throttleTimer) {
        clearTimeout(throttleTimer);
      }

      throttleTimer = setTimeout(() => {
        // 检查网络状态
        const currentNetworkInfo = networkRequestManager.getNetworkInfo();
        
        if (!currentNetworkInfo.isOnline && enableOfflineQueue) {
          offlineQueue.push(payload);
          console.log(`📥 [OptimizedSupabaseService] 订阅事件离线缓存: ${table}`, payload);
          return;
        }

        // 处理离线队列
        if (offlineQueue.length > 0) {
          console.log(`🔄 [OptimizedSupabaseService] 处理订阅离线队列: ${table} (${offlineQueue.length}个)`);
          offlineQueue.forEach(queuedPayload => callback(queuedPayload));
          offlineQueue = [];
        }

        callback(payload);
      }, finalThrottleMs);
    };

    console.log(`🔗 [OptimizedSupabaseService] 创建优化订阅: ${table}`, {
      event,
      throttle: finalThrottleMs,
      network: networkInfo.effectiveType
    });

    // 创建订阅
    const subscription = supabase
      .channel(`optimized-${table}-${Date.now()}`)
      .on('postgres_changes', {
        event,
        schema: 'public',
        table,
        filter
      }, throttledCallback)
      .subscribe((status) => {
        console.log(`📡 [OptimizedSupabaseService] 订阅状态: ${table} - ${status}`);
        
        if (status === 'SUBSCRIPTION_ERROR' && errorCallback) {
          errorCallback(new Error(`Subscription error for table: ${table}`));
        }
      });

    // 网络状态监听
    const networkListener = (networkInfo: any) => {
      if (networkInfo.isOnline && offlineQueue.length > 0) {
        console.log(`📶 [OptimizedSupabaseService] 网络恢复，处理订阅队列: ${table}`);
        offlineQueue.forEach(payload => callback(payload));
        offlineQueue = [];
      }
    };

    networkRequestManager.addNetworkListener(networkListener);

    // 返回增强的订阅对象
    return {
      unsubscribe: () => {
        subscription.unsubscribe();
        networkRequestManager.removeNetworkListener(networkListener);
        if (throttleTimer) clearTimeout(throttleTimer);
        console.log(`🚫 [OptimizedSupabaseService] 取消订阅: ${table}`);
      },
      getOfflineQueue: () => offlineQueue,
      clearOfflineQueue: () => { offlineQueue = []; }
    };
  }

  /**
   * 连接健康检查
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    networkInfo: any;
    cacheStats: any;
  }> {
    const startTime = performance.now();
    const networkInfo = networkRequestManager.getNetworkInfo();

    try {
      // 执行简单查询测试连接
      const { error } = await supabase
        .from('invoices')
        .select('id')
        .limit(1)
        .abortSignal(AbortSignal.timeout(5000));

      const latency = performance.now() - startTime;
      const healthy = !error;

      return {
        healthy,
        latency,
        networkInfo,
        cacheStats: this.getCacheStats()
      };
    } catch (error) {
      return {
        healthy: false,
        latency: performance.now() - startTime,
        networkInfo,
        cacheStats: this.getCacheStats()
      };
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(table: string, params: any): string {
    return `supabase:${table}:${JSON.stringify(params)}`;
  }

  /**
   * 缓存操作
   */
  private setCache<T>(key: string, data: T, ttl: number): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 估算数据大小
   */
  private estimateDataSize(data: any): number {
    const jsonString = JSON.stringify(data);
    return Math.round(new Blob([jsonString]).size / 1024); // KB
  }

  /**
   * 设置批处理器
   */
  private setupBatchProcessor(): void {
    // 定期处理批操作
    setInterval(() => {
      if (this.batchOperations.length > 0) {
        const operations = [...this.batchOperations];
        this.batchOperations = [];
        this.executeBatchOperations(operations);
      }
    }, 5000); // 每5秒处理一次
  }

  /**
   * 调度批处理执行
   */
  private scheduleBatchExecution(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      if (this.batchOperations.length > 0) {
        const operations = [...this.batchOperations];
        this.batchOperations = [];
        this.executeBatchOperations(operations);
      }
      this.batchTimer = null;
    }, 2000); // 2秒延迟批处理
  }

  /**
   * 执行批操作
   */
  private async executeBatchOperations(
    operations: any[],
    timeout: number = 30000
  ): Promise<{ success: boolean; results: any[]; errors: any[] }> {
    const results: any[] = [];
    const errors: any[] = [];
    
    console.log(`⚡ [OptimizedSupabaseService] 执行批操作 (${operations.length}个)`);
    
    // 按表分组操作
    const operationsByTable = operations.reduce((acc, op) => {
      if (!acc[op.table]) acc[op.table] = [];
      acc[op.table].push(op);
      return acc;
    }, {} as Record<string, any[]>);

    // 并行处理每个表的操作
    await Promise.allSettled(
      Object.entries(operationsByTable).map(async ([table, tableOps]) => {
        try {
          const tableResults = await this.executeBatchForTable(table, tableOps, timeout);
          results.push(...tableResults.results);
          errors.push(...tableResults.errors);
        } catch (error) {
          console.error(`❌ [OptimizedSupabaseService] 批操作失败: ${table}`, error);
          errors.push({ table, error });
        }
      })
    );

    this.queryMetrics.batchedOperations += operations.length;
    
    return {
      success: errors.length === 0,
      results,
      errors
    };
  }

  /**
   * 为单个表执行批操作
   */
  private async executeBatchForTable(
    table: string,
    operations: any[],
    timeout: number
  ): Promise<{ results: any[]; errors: any[] }> {
    const results: any[] = [];
    const errors: any[] = [];

    // 分组不同类型的操作
    const inserts = operations.filter(op => op.operation === 'insert');
    const updates = operations.filter(op => op.operation === 'update');
    const deletes = operations.filter(op => op.operation === 'delete');

    // 批量插入
    if (inserts.length > 0) {
      try {
        const { data, error } = await supabase
          .from(table)
          .insert(inserts.map(op => op.data))
          .abortSignal(AbortSignal.timeout(timeout));
          
        if (error) {
          errors.push({ operation: 'batch_insert', table, error });
        } else {
          results.push({ operation: 'batch_insert', table, count: inserts.length, data });
        }
      } catch (error) {
        errors.push({ operation: 'batch_insert', table, error });
      }
    }

    // 批量更新和删除需要逐个处理（Supabase限制）
    for (const op of [...updates, ...deletes]) {
      try {
        let query = supabase.from(table);
        
        if (op.operation === 'update') {
          query = query.update(op.data);
        } else {
          query = query.delete();
        }

        // 应用过滤器
        Object.entries(op.filters || {}).forEach(([key, value]) => {
          query = query.eq(key, value);
        });

        const { data, error } = await query.abortSignal(AbortSignal.timeout(timeout));
        
        if (error) {
          errors.push({ operation: op.operation, table, id: op.id, error });
        } else {
          results.push({ operation: op.operation, table, id: op.id, data });
        }
      } catch (error) {
        errors.push({ operation: op.operation, table, id: op.id, error });
      }
    }

    return { results, errors };
  }

  /**
   * 设置缓存清理
   */
  private setupCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      this.queryCache.forEach((cache, key) => {
        if (now - cache.timestamp > cache.ttl) {
          this.queryCache.delete(key);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        console.log(`🧹 [OptimizedSupabaseService] 清理过期缓存: ${cleanedCount}个`);
      }
    }, 60000); // 每分钟清理一次
  }

  /**
   * 获取缓存统计
   */
  private getCacheStats() {
    const totalSize = this.estimateDataSize(Array.from(this.queryCache.values()));
    
    return {
      entryCount: this.queryCache.size,
      estimatedSize: `${totalSize}KB`,
      hitRate: this.queryMetrics.totalQueries > 0 
        ? (this.queryMetrics.cachedQueries / this.queryMetrics.totalQueries * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    return {
      ...this.queryMetrics,
      cacheStats: this.getCacheStats(),
      batchQueue: this.batchOperations.length,
    };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.queryCache.clear();
    console.log(`🧹 [OptimizedSupabaseService] 清空所有缓存`);
  }

  /**
   * 导出诊断信息
   */
  exportDiagnostics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      networkInfo: networkRequestManager.getNetworkInfo(),
      cacheEntries: Array.from(this.queryCache.keys()),
      batchOperations: this.batchOperations.length,
    };
  }
}

// 导出单例
export const optimizedSupabaseService = OptimizedSupabaseService.getInstance();
export default optimizedSupabaseService;