/**
 * 智能图片缓存管理系统
 * 使用LRU算法和内存压力感知的图片缓存策略
 */

interface CachedImage {
  url: string;
  blob: Blob;
  size: number;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  priority: 'high' | 'medium' | 'low';
  dimensions?: { width: number; height: number };
  objectUrl?: string;
}

interface ImageCacheConfig {
  maxSize: number;           // 最大缓存大小（MB）
  maxImages: number;         // 最大图片数量
  imageTTL: number;          // 图片生存时间（毫秒）
  qualitySettings: {
    high: number;            // 高质量压缩比例
    medium: number;          // 中等质量压缩比例
    low: number;             // 低质量压缩比例
  };
  enableCompression: boolean;
  enableWebP: boolean;
  preloadStrategy: 'aggressive' | 'conservative' | 'none';
  memoryPressureThreshold: number; // 内存压力阈值（%）
}

interface CacheStats {
  totalImages: number;
  totalSize: number;
  hitRate: number;
  compressionSavings: number;
  averageAccessTime: number;
  memoryPressureEvents: number;
}

interface ImageLoadOptions {
  priority?: 'high' | 'medium' | 'low';
  quality?: 'high' | 'medium' | 'low';
  maxWidth?: number;
  maxHeight?: number;
  format?: 'original' | 'webp' | 'jpeg';
}

class ImageCacheManager {
  private cache = new Map<string, CachedImage>();
  private accessOrder: string[] = []; // LRU队列
  private config: ImageCacheConfig;
  private loadingPromises = new Map<string, Promise<string>>();
  private stats = {
    hits: 0,
    misses: 0,
    loads: 0,
    compressions: 0,
    memoryPressureEvents: 0,
    totalLoadTime: 0
  };
  
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private observer?: IntersectionObserver;

  constructor(config: Partial<ImageCacheConfig> = {}) {
    this.config = {
      maxSize: 100, // 100MB
      maxImages: 500,
      imageTTL: 1800000, // 30分钟
      qualitySettings: {
        high: 0.9,
        medium: 0.7,
        low: 0.5
      },
      enableCompression: true,
      enableWebP: this.supportsWebP(),
      preloadStrategy: 'conservative',
      memoryPressureThreshold: 80,
      ...config
    };

    // 创建Canvas用于图片处理
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    
    this.setupMemoryPressureListener();
    this.setupPeriodicCleanup();
    this.setupIntersectionObserver();
    
    console.log('🖼️ 图片缓存管理器已初始化');
  }

  /**
   * 加载图片
   */
  async loadImage(url: string, options: ImageLoadOptions = {}): Promise<string> {
    const cacheKey = this.generateCacheKey(url, options);
    
    // 检查缓存
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.updateAccessInfo(cacheKey);
      return cached.objectUrl || URL.createObjectURL(cached.blob);
    }
    
    // 检查是否正在加载
    const existingPromise = this.loadingPromises.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }
    
    // 开始加载
    const loadPromise = this.fetchAndProcessImage(url, options);
    this.loadingPromises.set(cacheKey, loadPromise);
    
    try {
      const result = await loadPromise;
      this.loadingPromises.delete(cacheKey);
      return result;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  /**
   * 预加载图片
   */
  async preloadImages(urls: string[], options: ImageLoadOptions = {}): Promise<void> {
    if (this.config.preloadStrategy === 'none') return;
    
    const preloadOptions = {
      ...options,
      priority: 'low' as const
    };
    
    const batchSize = this.config.preloadStrategy === 'aggressive' ? 5 : 2;
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      const promises = batch.map(url => 
        this.loadImage(url, preloadOptions).catch(error => {
          console.warn(`预加载图片失败: ${url}`, error);
        })
      );
      
      await Promise.allSettled(promises);
      
      // 在批次之间添加小延迟，避免阻塞主线程
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  /**
   * 获取缓存的图片
   */
  private getFromCache(key: string): CachedImage | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.stats.misses++;
      return null;
    }
    
    // 检查是否过期
    if (this.isExpired(cached)) {
      this.removeFromCache(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return cached;
  }

  /**
   * 获取并处理图片
   */
  private async fetchAndProcessImage(url: string, options: ImageLoadOptions): Promise<string> {
    const startTime = performance.now();
    
    try {
      // 检查内存压力
      await this.checkMemoryPressure();
      
      // 获取图片
      const response = await fetch(url, {
        headers: this.getOptimalHeaders(options)
      });
      
      if (!response.ok) {
        throw new Error(`图片加载失败: ${response.status}`);
      }
      
      let blob = await response.blob();
      
      // 处理图片
      if (this.shouldProcessImage(blob, options)) {
        blob = await this.processImage(blob, options);
      }
      
      // 创建缓存条目
      const cacheKey = this.generateCacheKey(url, options);
      const cachedImage: CachedImage = {
        url,
        blob,
        size: blob.size,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccess: Date.now(),
        priority: options.priority || 'medium',
        objectUrl: URL.createObjectURL(blob)
      };
      
      // 获取图片尺寸
      cachedImage.dimensions = await this.getImageDimensions(cachedImage.objectUrl);
      
      // 确保有足够空间
      await this.ensureCacheSpace(cachedImage.size);
      
      // 添加到缓存
      this.addToCache(cacheKey, cachedImage);
      
      // 更新统计
      const loadTime = performance.now() - startTime;
      this.stats.loads++;
      this.stats.totalLoadTime += loadTime;
      
      console.log(`🖼️ 图片已缓存: ${url} (${this.formatBytes(blob.size)}, ${loadTime.toFixed(2)}ms)`);
      
      return cachedImage.objectUrl;
    } catch (error) {
      console.error(`图片加载失败: ${url}`, error);
      throw error;
    }
  }

  /**
   * 处理图片
   */
  private async processImage(blob: Blob, options: ImageLoadOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const processed = this.resizeAndCompressImage(img, options);
          resolve(processed);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * 调整大小并压缩图片
   */
  private resizeAndCompressImage(img: HTMLImageElement, options: ImageLoadOptions): Blob {
    const { maxWidth, maxHeight, quality = 'medium', format = 'original' } = options;
    
    // 计算新尺寸
    let { width, height } = this.calculateOptimalSize(
      img.width, 
      img.height, 
      maxWidth, 
      maxHeight
    );
    
    // 移动设备优化：限制最大尺寸以节省内存
    if (this.isMobileDevice()) {
      const maxMobileSize = 1200;
      if (width > maxMobileSize || height > maxMobileSize) {
        const ratio = Math.min(maxMobileSize / width, maxMobileSize / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
    }
    
    // 设置Canvas尺寸
    this.canvas.width = width;
    this.canvas.height = height;
    
    // 清空并绘制图片
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(img, 0, 0, width, height);
    
    // 确定输出格式和质量
    let mimeType = img.src.includes('data:') ? 'image/jpeg' : 'image/jpeg';
    const compressionQuality = this.config.qualitySettings[quality];
    
    if (format === 'webp' && this.config.enableWebP) {
      mimeType = 'image/webp';
    } else if (format === 'jpeg') {
      mimeType = 'image/jpeg';
    }
    
    // 转换为Blob
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        if (blob) {
          this.stats.compressions++;
          resolve(blob);
        } else {
          // 降级处理
          resolve(new Blob());
        }
      }, mimeType, compressionQuality);
    });
  }

  /**
   * 计算最佳尺寸
   */
  private calculateOptimalSize(
    originalWidth: number, 
    originalHeight: number, 
    maxWidth?: number, 
    maxHeight?: number
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;
    
    if (maxWidth && width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }
    
    if (maxHeight && height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }
    
    return { width: Math.floor(width), height: Math.floor(height) };
  }

  /**
   * 获取图片尺寸
   */
  private async getImageDimensions(objectUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(objectUrl);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = objectUrl;
    });
  }

  /**
   * 添加到缓存
   */
  private addToCache(key: string, image: CachedImage): void {
    this.cache.set(key, image);
    this.updateAccessOrder(key);
  }

  /**
   * 从缓存移除
   */
  private removeFromCache(key: string): void {
    const cached = this.cache.get(key);
    if (cached && cached.objectUrl) {
      URL.revokeObjectURL(cached.objectUrl);
    }
    
    this.cache.delete(key);
    this.removeFromAccessOrder(key);
  }

  /**
   * 确保缓存空间
   */
  private async ensureCacheSpace(requiredSize: number): Promise<void> {
    const currentSize = this.getCurrentCacheSize();
    const maxSizeBytes = this.config.maxSize * 1024 * 1024;
    
    // 检查是否需要清理
    while (
      (currentSize + requiredSize > maxSizeBytes || this.cache.size >= this.config.maxImages) &&
      this.cache.size > 0
    ) {
      const keyToEvict = this.selectImageToEvict();
      if (keyToEvict) {
        this.removeFromCache(keyToEvict);
      } else {
        break;
      }
    }
  }

  /**
   * 选择要驱逐的图片
   */
  private selectImageToEvict(): string | null {
    if (this.cache.size === 0) return null;
    
    // 优先驱逐低优先级的图片
    const lowPriorityImages = Array.from(this.cache.entries())
      .filter(([, img]) => img.priority === 'low');
    
    if (lowPriorityImages.length > 0) {
      // 在低优先级图片中选择最久未访问的
      lowPriorityImages.sort(([, a], [, b]) => a.lastAccess - b.lastAccess);
      return lowPriorityImages[0][0];
    }
    
    // 否则使用LRU策略
    return this.accessOrder[0] || null;
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
   * 更新访问信息
   */
  private updateAccessInfo(key: string): void {
    const cached = this.cache.get(key);
    if (cached) {
      cached.accessCount++;
      cached.lastAccess = Date.now();
      this.updateAccessOrder(key);
    }
  }

  /**
   * 检查图片是否过期
   */
  private isExpired(image: CachedImage): boolean {
    return Date.now() - image.timestamp > this.config.imageTTL;
  }

  /**
   * 获取当前缓存大小
   */
  private getCurrentCacheSize(): number {
    let totalSize = 0;
    this.cache.forEach(image => {
      totalSize += image.size;
    });
    return totalSize;
  }

  /**
   * 检查内存压力
   */
  private async checkMemoryPressure(): Promise<void> {
    try {
      // @ts-ignore
      const memory = (performance as any).memory;
      if (memory) {
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        if (usagePercent > this.config.memoryPressureThreshold) {
          console.warn('⚠️ 内存压力过高，开始清理图片缓存');
          await this.clearLowPriorityImages();
          this.stats.memoryPressureEvents++;
        }
      }
    } catch (error) {
      // 内存检测不可用时忽略
    }
  }

  /**
   * 清理低优先级图片
   */
  private async clearLowPriorityImages(ratio: number = 0.3): Promise<void> {
    const images = Array.from(this.cache.entries());
    
    // 按优先级和访问时间排序
    images.sort(([, a], [, b]) => {
      const priorityScore = { low: 1, medium: 2, high: 3 };
      const scoreA = priorityScore[a.priority] * a.accessCount;
      const scoreB = priorityScore[b.priority] * b.accessCount;
      return scoreA - scoreB;
    });
    
    const countToRemove = Math.floor(images.length * ratio);
    const toRemove = images.slice(0, countToRemove);
    
    toRemove.forEach(([key]) => {
      this.removeFromCache(key);
    });
    
    console.log(`🧹 清理了 ${toRemove.length} 个低优先级图片`);
  }

  /**
   * 设置内存压力监听器
   */
  private setupMemoryPressureListener(): void {
    // 定期检查内存压力
    setInterval(() => {
      this.checkMemoryPressure();
    }, 30000); // 每30秒检查一次
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // 页面隐藏时清理部分缓存
        this.clearLowPriorityImages(0.2);
      }
    });
  }

  /**
   * 设置定期清理
   */
  private setupPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredImages();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 清理过期图片
   */
  private cleanupExpiredImages(): void {
    const expiredKeys: string[] = [];
    
    this.cache.forEach((image, key) => {
      if (this.isExpired(image)) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => {
      this.removeFromCache(key);
    });
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 清理了 ${expiredKeys.length} 个过期图片`);
    }
  }

  /**
   * 设置交集观察器
   */
  private setupIntersectionObserver(): void {
    if (!('IntersectionObserver' in window)) return;
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const img = entry.target as HTMLImageElement;
        const url = img.dataset.src || img.src;
        
        if (entry.isIntersecting && url) {
          // 图片进入视口时提高优先级
          this.upgradePriority(url);
        }
      });
    }, {
      rootMargin: '50px 0px', // 提前50px开始加载
      threshold: 0.1
    });
  }

  /**
   * 提升图片优先级
   */
  private upgradePriority(url: string): void {
    this.cache.forEach((image, key) => {
      if (image.url === url && image.priority === 'low') {
        image.priority = 'medium';
      }
    });
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(url: string, options: ImageLoadOptions): string {
    const { priority, quality, maxWidth, maxHeight, format } = options;
    return `${url}_${priority || 'medium'}_${quality || 'medium'}_${maxWidth || 'auto'}_${maxHeight || 'auto'}_${format || 'original'}`;
  }

  /**
   * 获取最优请求头
   */
  private getOptimalHeaders(options: ImageLoadOptions): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (this.config.enableWebP && this.supportsWebP()) {
      headers['Accept'] = 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';
    }
    
    return headers;
  }

  /**
   * 检查是否应该处理图片
   */
  private shouldProcessImage(blob: Blob, options: ImageLoadOptions): boolean {
    if (!this.config.enableCompression) return false;
    
    const { maxWidth, maxHeight, quality } = options;
    
    // 大于1MB的图片或指定了尺寸/质量参数时处理
    return blob.size > 1024 * 1024 || maxWidth || maxHeight || quality !== 'high';
  }

  /**
   * 检查WebP支持
   */
  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
  }

  /**
   * 检查是否为移动设备
   */
  private isMobileDevice(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    const averageLoadTime = this.stats.loads > 0 ? this.stats.totalLoadTime / this.stats.loads : 0;
    
    return {
      totalImages: this.cache.size,
      totalSize: this.getCurrentCacheSize(),
      hitRate: Math.round(hitRate * 100) / 100,
      compressionSavings: this.calculateCompressionSavings(),
      averageAccessTime: averageLoadTime,
      memoryPressureEvents: this.stats.memoryPressureEvents
    };
  }

  /**
   * 计算压缩节省的空间
   */
  private calculateCompressionSavings(): number {
    // 这是一个简化的估算
    return this.stats.compressions * 0.3; // 假设平均节省30%
  }

  /**
   * 监听图片元素
   */
  observeImage(img: HTMLImageElement): void {
    if (this.observer) {
      this.observer.observe(img);
    }
  }

  /**
   * 停止监听图片元素
   */
  unobserveImage(img: HTMLImageElement): void {
    if (this.observer) {
      this.observer.unobserve(img);
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    // 清理所有Object URLs
    this.cache.forEach((image) => {
      if (image.objectUrl) {
        URL.revokeObjectURL(image.objectUrl);
      }
    });
    
    this.cache.clear();
    this.accessOrder.length = 0;
    this.loadingPromises.clear();
    
    // 重置统计
    this.stats = {
      hits: 0,
      misses: 0,
      loads: 0,
      compressions: 0,
      memoryPressureEvents: 0,
      totalLoadTime: 0
    };
    
    console.log('🧹 图片缓存已完全清空');
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    this.clear();
    
    if (this.observer) {
      this.observer.disconnect();
    }
    
    console.log('🗑️ 图片缓存管理器已销毁');
  }
}

// 创建全局图片缓存管理器
export const imageCacheManager = new ImageCacheManager({
  maxSize: 50, // 50MB for mobile
  maxImages: 200,
  imageTTL: 1800000, // 30分钟
  enableCompression: true,
  enableWebP: true,
  preloadStrategy: 'conservative',
  memoryPressureThreshold: 75
});

export default ImageCacheManager;