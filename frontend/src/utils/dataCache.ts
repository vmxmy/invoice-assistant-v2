/**
 * 大数据集分页缓存管理系统
 * 专为发票数据优化的智能缓存策略
 */

interface CacheConfig {
  maxPages: number;          // 最大缓存页数
  pageTTL: number;           // 页面生存时间（毫秒）
  maxMemoryUsage: number;    // 最大内存使用量（MB）
  evictionStrategy: 'LRU' | 'FIFO' | 'LFU';
  compressionEnabled: boolean;
  persistToStorage: boolean;
}

interface CachePage<T> {
  data: T[];
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  size: number; // 估算的内存大小（bytes）
  compressed?: string;
  metadata: {
    pageNumber: number;
    pageSize: number;
    totalCount?: number;
    query?: string;
    sortBy?: string;
    filterHash?: string;
  };
}

interface CacheStats {
  totalPages: number;
  totalMemoryUsage: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  compressionRate: number;
}

interface DataQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  searchText?: string;
}

class DataCacheManager<T = any> {
  private cache = new Map<string, CachePage<T>>();
  private accessOrder: string[] = []; // LRU 顺序
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxPages: 20,
      pageTTL: 300000, // 5分钟
      maxMemoryUsage: 50, // 50MB
      evictionStrategy: 'LRU',
      compressionEnabled: true,
      persistToStorage: false,
      ...config
    };

    // 定期清理过期数据
    setInterval(() => this.cleanupExpiredPages(), 60000); // 每分钟清理一次
    
    // 监听内存压力
    this.setupMemoryPressureListener();
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(query: DataQuery): string {
    const { page, pageSize, sortBy, sortOrder, filters, searchText } = query;
    
    // 创建过滤器哈希
    const filterHash = filters ? this.hashObject(filters) : '';
    const searchHash = searchText ? this.simpleHash(searchText) : '';
    
    return `page_${page}_size_${pageSize}_sort_${sortBy}_${sortOrder}_filter_${filterHash}_search_${searchHash}`;
  }

  /**
   * 获取缓存数据
   */
  async getCachedData(query: DataQuery): Promise<T[] | null> {
    this.stats.totalRequests++;
    
    const key = this.generateCacheKey(query);
    const cachedPage = this.cache.get(key);
    
    if (!cachedPage) {
      this.stats.misses++;
      return null;
    }
    
    // 检查是否过期
    if (this.isExpired(cachedPage)) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.misses++;
      return null;
    }
    
    // 更新访问信息
    cachedPage.accessCount++;
    cachedPage.lastAccess = Date.now();
    this.updateAccessOrder(key);
    
    this.stats.hits++;
    
    // 返回解压缩的数据
    return cachedPage.compressed 
      ? this.decompressData(cachedPage.compressed)
      : cachedPage.data;
  }

  /**
   * 缓存数据
   */
  async setCachedData(query: DataQuery, data: T[], totalCount?: number): Promise<void> {
    const key = this.generateCacheKey(query);
    
    // 计算数据大小
    const dataSize = this.estimateDataSize(data);
    
    // 检查是否需要清理空间
    await this.ensureMemorySpace(dataSize);
    
    // 创建缓存页
    const cachedPage: CachePage<T> = {
      data: [],
      timestamp: Date.now(),
      accessCount: 1,
      lastAccess: Date.now(),
      size: dataSize,
      metadata: {
        pageNumber: query.page,
        pageSize: query.pageSize,
        totalCount,
        query: query.searchText,
        sortBy: query.sortBy,
        filterHash: query.filters ? this.hashObject(query.filters) : undefined
      }
    };
    
    // 压缩数据（如果启用）
    if (this.config.compressionEnabled && dataSize > 10240) { // 超过10KB才压缩
      cachedPage.compressed = this.compressData(data);
    } else {
      cachedPage.data = data;
    }
    
    // 添加到缓存
    this.cache.set(key, cachedPage);
    this.updateAccessOrder(key);
    
    // 如果启用持久化存储
    if (this.config.persistToStorage) {
      await this.persistToStorage(key, cachedPage);
    }
    
    console.log(`📄 缓存页面: ${key} (${this.formatBytes(dataSize)})`);
  }

  /**
   * 清理过期页面
   */
  private cleanupExpiredPages(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.cache.forEach((page, key) => {
      if (this.isExpired(page)) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    });
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 清理了 ${expiredKeys.length} 个过期页面`);
    }
  }

  /**
   * 确保内存空间
   */
  private async ensureMemorySpace(requiredSize: number): Promise<void> {
    const currentMemoryUsage = this.getCurrentMemoryUsage();
    const maxUsageBytes = this.config.maxMemoryUsage * 1024 * 1024;
    
    if (currentMemoryUsage + requiredSize > maxUsageBytes || this.cache.size >= this.config.maxPages) {
      await this.evictPages(requiredSize);
    }
  }

  /**
   * 驱逐页面
   */
  private async evictPages(requiredSize: number): Promise<void> {
    let freedSpace = 0;
    const evictedKeys: string[] = [];
    
    while ((freedSpace < requiredSize || this.cache.size >= this.config.maxPages) && this.cache.size > 0) {
      const keyToEvict = this.selectPageToEvict();
      
      if (!keyToEvict) break;
      
      const page = this.cache.get(keyToEvict);
      if (page) {
        freedSpace += page.size;
        evictedKeys.push(keyToEvict);
        
        // 如果启用持久化，保存到存储
        if (this.config.persistToStorage && page.accessCount > 1) {
          await this.persistToStorage(keyToEvict, page);
        }
        
        this.cache.delete(keyToEvict);
        this.removeFromAccessOrder(keyToEvict);
        this.stats.evictions++;
      }
    }
    
    if (evictedKeys.length > 0) {
      console.log(`🗑️ 驱逐了 ${evictedKeys.length} 个页面，释放 ${this.formatBytes(freedSpace)}`);
    }
  }

  /**
   * 选择要驱逐的页面
   */
  private selectPageToEvict(): string | null {
    if (this.cache.size === 0) return null;
    
    switch (this.config.evictionStrategy) {
      case 'LRU':
        return this.accessOrder[0] || null;
      
      case 'FIFO':
        // 选择最早添加的页面
        let oldestKey: string | null = null;
        let oldestTime = Date.now();
        
        this.cache.forEach((page, key) => {
          if (page.timestamp < oldestTime) {
            oldestTime = page.timestamp;
            oldestKey = key;
          }
        });
        
        return oldestKey;
      
      case 'LFU':
        // 选择访问次数最少的页面
        let leastUsedKey: string | null = null;
        let leastCount = Infinity;
        
        this.cache.forEach((page, key) => {
          if (page.accessCount < leastCount) {
            leastCount = page.accessCount;
            leastUsedKey = key;
          }
        });
        
        return leastUsedKey;
      
      default:
        return this.accessOrder[0] || null;
    }
  }

  /**
   * 更新访问顺序
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * 从访问顺序中移除
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * 检查页面是否过期
   */
  private isExpired(page: CachePage<T>): boolean {
    return Date.now() - page.timestamp > this.config.pageTTL;
  }

  /**
   * 估算数据大小
   */
  private estimateDataSize(data: T[]): number {
    if (data.length === 0) return 0;
    
    try {
      // 使用JSON序列化估算大小
      const sample = data.slice(0, Math.min(5, data.length));
      const sampleSize = JSON.stringify(sample).length * 2; // UTF-16编码
      return Math.round((sampleSize / sample.length) * data.length);
    } catch (error) {
      // 降级估算：假设每个对象平均1KB
      return data.length * 1024;
    }
  }

  /**
   * 获取当前内存使用量
   */
  private getCurrentMemoryUsage(): number {
    let totalSize = 0;
    this.cache.forEach(page => {
      totalSize += page.size;
    });
    return totalSize;
  }

  /**
   * 压缩数据
   */
  private compressData(data: T[]): string {
    try {
      const jsonString = JSON.stringify(data);
      // 简单的压缩：移除多余空白和重复模式
      return jsonString.replace(/\s+/g, ' ').trim();
    } catch (error) {
      console.warn('数据压缩失败:', error);
      return JSON.stringify(data);
    }
  }

  /**
   * 解压缩数据
   */
  private decompressData(compressedData: string): T[] {
    try {
      return JSON.parse(compressedData);
    } catch (error) {
      console.error('数据解压缩失败:', error);
      return [];
    }
  }

  /**
   * 持久化到存储
   */
  private async persistToStorage(key: string, page: CachePage<T>): Promise<void> {
    try {
      const storageKey = `cache_${key}`;
      const data = {
        ...page,
        data: page.compressed || JSON.stringify(page.data)
      };
      
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('持久化存储失败:', error);
    }
  }

  /**
   * 从存储恢复
   */
  private async restoreFromStorage(key: string): Promise<CachePage<T> | null> {
    try {
      const storageKey = `cache_${key}`;
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      
      // 检查是否过期
      if (this.isExpired(data)) {
        localStorage.removeItem(storageKey);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('从存储恢复失败:', error);
      return null;
    }
  }

  /**
   * 设置内存压力监听器
   */
  private setupMemoryPressureListener(): void {
    // 监听内存压力事件
    if ('memory' in navigator) {
      // @ts-ignore
      navigator.memory?.addEventListener?.('warning', () => {
        console.warn('⚠️ 内存压力警告，开始清理缓存');
        this.clearLowPriorityPages();
      });
    }
    
    // 定期检查内存使用情况
    setInterval(() => {
      const usage = this.getCurrentMemoryUsage();
      const limit = this.config.maxMemoryUsage * 1024 * 1024;
      
      if (usage > limit * 0.8) {
        console.warn('⚠️ 缓存内存使用接近限制，开始预清理');
        this.clearLowPriorityPages(0.3); // 清理30%的低优先级页面
      }
    }, 30000); // 每30秒检查一次
  }

  /**
   * 清理低优先级页面
   */
  private clearLowPriorityPages(ratio: number = 0.5): void {
    const pages = Array.from(this.cache.entries());
    
    // 按优先级排序（访问次数少、时间久的优先清理）
    pages.sort(([, a], [, b]) => {
      const scoreA = a.accessCount * (Date.now() - a.lastAccess);
      const scoreB = b.accessCount * (Date.now() - b.lastAccess);
      return scoreA - scoreB;
    });
    
    const countToRemove = Math.floor(pages.length * ratio);
    const toRemove = pages.slice(0, countToRemove);
    
    toRemove.forEach(([key]) => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    });
    
    console.log(`🧹 清理了 ${toRemove.length} 个低优先级页面`);
  }

  /**
   * 哈希对象
   */
  private hashObject(obj: any): string {
    return this.simpleHash(JSON.stringify(obj));
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const totalMemory = this.getCurrentMemoryUsage();
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0;
    
    return {
      totalPages: this.cache.size,
      totalMemoryUsage: totalMemory,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round((100 - hitRate) * 100) / 100,
      evictionCount: this.stats.evictions,
      compressionRate: this.calculateCompressionRate()
    };
  }

  /**
   * 计算压缩率
   */
  private calculateCompressionRate(): number {
    let compressedCount = 0;
    let totalCount = 0;
    
    this.cache.forEach(page => {
      totalCount++;
      if (page.compressed) {
        compressedCount++;
      }
    });
    
    return totalCount > 0 ? (compressedCount / totalCount) * 100 : 0;
  }

  /**
   * 预取相关页面
   */
  async prefetchAdjacentPages(query: DataQuery, fetcher: (q: DataQuery) => Promise<{ data: T[], totalCount?: number }>): Promise<void> {
    // 预取下一页
    if (query.page > 0) {
      const nextPageQuery = { ...query, page: query.page + 1 };
      const nextKey = this.generateCacheKey(nextPageQuery);
      
      if (!this.cache.has(nextKey)) {
        try {
          const result = await fetcher(nextPageQuery);
          await this.setCachedData(nextPageQuery, result.data, result.totalCount);
        } catch (error) {
          console.warn('预取下一页失败:', error);
        }
      }
    }
    
    // 预取上一页
    if (query.page > 1) {
      const prevPageQuery = { ...query, page: query.page - 1 };
      const prevKey = this.generateCacheKey(prevPageQuery);
      
      if (!this.cache.has(prevKey)) {
        try {
          const result = await fetcher(prevPageQuery);
          await this.setCachedData(prevPageQuery, result.data, result.totalCount);
        } catch (error) {
          console.warn('预取上一页失败:', error);
        }
      }
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.length = 0;
    this.stats = { hits: 0, misses: 0, evictions: 0, totalRequests: 0 };
    
    // 清理本地存储
    if (this.config.persistToStorage) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    console.log('🧹 缓存已完全清空');
  }

  /**
   * 更新缓存配置
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 如果减少了最大页数，立即清理
    if (this.cache.size > this.config.maxPages) {
      this.evictPages(0);
    }
  }
}

// 创建发票数据专用缓存管理器
export const invoiceDataCache = new DataCacheManager({
  maxPages: 25,
  pageTTL: 600000, // 10分钟
  maxMemoryUsage: 30, // 30MB
  evictionStrategy: 'LRU',
  compressionEnabled: true,
  persistToStorage: true
});

export default DataCacheManager;