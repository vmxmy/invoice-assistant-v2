/**
 * 配置管理服务
 * 
 * 提供前端配置的获取、缓存和同步功能
 * 支持多层缓存、ETag验证和实时更新
 */

import { apiClient } from './apiClient';
import { InvoiceType } from '../types/invoice';

// ===== 接口定义 =====

interface ConfigResponse {
  id: string;
  category: string;
  key: string;
  value: any;
  version: number;
  environment: string;
  created_at: string;
  updated_at: string;
}

interface ConfigListResponse {
  data: ConfigResponse[];
  version: string;
  cached_until?: string;
}

interface InvoiceTypeConfig {
  code: string;
  name: string;
  field_definitions: {
    core_fields: Record<string, any>;
    extended_fields: Record<string, any>;
  };
  validation_rules: {
    required_fields: string[];
    confidence_thresholds: Record<string, number>;
    validation_rules: Array<Record<string, any>>;
  };
  ocr_template?: Record<string, any>;
  is_active: boolean;
}

interface FeatureFlagConfig {
  name: string;
  enabled: boolean;
  rollout_percentage: number;
  metadata: Record<string, any>;
}

interface CachedConfig {
  data: any;
  etag: string;
  cached_at: number;
  expires_at: number;
}

// ===== 配置管理服务类 =====

class ConfigService {
  private cache: Map<string, CachedConfig> = new Map();
  private websocket: WebSocket | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5分钟
  private environment = 'production';

  constructor() {
    this.initializeWebSocket();
    this.loadFromLocalStorage();
  }

  // ===== 缓存管理 =====

  /**
   * 从本地存储加载缓存
   */
  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('invoice_config_cache');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([key, value]) => {
          this.cache.set(key, value as CachedConfig);
        });
      }
    } catch (error) {
      console.warn('加载本地缓存失败:', error);
    }
  }

  /**
   * 保存缓存到本地存储
   */
  private saveToLocalStorage(): void {
    try {
      const cacheObject = Object.fromEntries(this.cache);
      localStorage.setItem('invoice_config_cache', JSON.stringify(cacheObject));
    } catch (error) {
      console.warn('保存本地缓存失败:', error);
    }
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(cached: CachedConfig): boolean {
    return Date.now() < cached.expires_at;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: any, etag?: string): void {
    const cached: CachedConfig = {
      data,
      etag: etag || '',
      cached_at: Date.now(),
      expires_at: Date.now() + this.cacheTTL
    };
    
    this.cache.set(key, cached);
    this.saveToLocalStorage();
  }

  /**
   * 获取缓存
   */
  private getCache(key: string): CachedConfig | null {
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }
    
    // 清除过期缓存
    if (cached) {
      this.cache.delete(key);
      this.saveToLocalStorage();
    }
    
    return null;
  }

  /**
   * 清除缓存
   */
  private clearCache(pattern?: string): void {
    if (pattern) {
      // 清除匹配模式的缓存
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // 清除所有缓存
      this.cache.clear();
    }
    this.saveToLocalStorage();
  }

  // ===== WebSocket 实时更新 =====

  /**
   * 初始化 WebSocket 连接
   */
  private initializeWebSocket(): void {
    // 暂时跳过 WebSocket 实现，后续可以添加
    // this.connectWebSocket();
  }

  /**
   * 连接 WebSocket
   */
  private connectWebSocket(): void {
    try {
      const wsUrl = `ws://localhost:8090/api/v1/config/subscribe`;
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('配置 WebSocket 连接已建立');
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleConfigUpdate(message);
        } catch (error) {
          console.error('处理 WebSocket 消息失败:', error);
        }
      };
      
      this.websocket.onclose = () => {
        console.log('配置 WebSocket 连接已关闭');
        // 重连逻辑
        setTimeout(() => this.connectWebSocket(), 5000);
      };
      
      this.websocket.onerror = (error) => {
        console.error('配置 WebSocket 连接错误:', error);
      };
    } catch (error) {
      console.error('创建 WebSocket 连接失败:', error);
    }
  }

  /**
   * 处理配置更新消息
   */
  private handleConfigUpdate(message: any): void {
    if (message.type === 'config_updated') {
      const { category, key } = message;
      const cacheKey = `${category}:${key}:${this.environment}`;
      
      // 清除缓存
      this.cache.delete(cacheKey);
      this.saveToLocalStorage();
      
      // 触发事件监听器
      this.emit('configUpdated', { category, key, data: message.value });
    }
  }

  // ===== 事件管理 =====

  /**
   * 添加事件监听器
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('事件监听器执行失败:', error);
        }
      });
    }
  }

  // ===== 配置获取方法 =====

  /**
   * 获取分类配置
   */
  async getCategoryConfig(category: string): Promise<ConfigListResponse> {
    const cacheKey = `category:${category}:${this.environment}`;
    const cached = this.getCache(cacheKey);
    
    try {
      const headers: Record<string, string> = {};
      if (cached?.etag) {
        headers['If-None-Match'] = cached.etag;
      }
      
      const response = await apiClient.get(
        `/config/categories/${category}`,
        {
          params: { environment: this.environment },
          headers
        }
      );
      
      // 304 Not Modified - 使用缓存
      if (response.status === 304 && cached) {
        return cached.data;
      }
      
      const data = response.data;
      const etag = response.headers.etag;
      
      // 更新缓存
      this.setCache(cacheKey, data, etag);
      
      return data;
    } catch (error: any) {
      if (error.response?.status === 304 && cached) {
        return cached.data;
      }
      
      // 网络错误时使用缓存
      if (cached) {
        console.warn('网络请求失败，使用缓存数据:', error);
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * 获取单个配置
   */
  async getConfig(category: string, key: string): Promise<ConfigResponse> {
    const cacheKey = `${category}:${key}:${this.environment}`;
    const cached = this.getCache(cacheKey);
    
    try {
      const response = await apiClient.get(
        `/config/categories/${category}/${key}`,
        {
          params: { environment: this.environment }
        }
      );
      
      const data = response.data;
      
      // 更新缓存
      this.setCache(cacheKey, data);
      
      return data;
    } catch (error: any) {
      // 网络错误时使用缓存
      if (cached && error.code === 'NETWORK_ERROR') {
        console.warn('网络请求失败，使用缓存数据:', error);
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * 获取发票类型配置
   */
  async getInvoiceTypes(): Promise<InvoiceTypeConfig[]> {
    const cacheKey = 'invoice_types:all';
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached.data;
    }
    
    try {
      const response = await apiClient.get('/config/invoice-types');
      const data = response.data;
      
      // 缓存数据
      this.setCache(cacheKey, data);
      
      return data;
    } catch (error) {
      if (cached) {
        console.warn('获取发票类型失败，使用缓存数据:', error);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * 获取指定发票类型配置
   */
  async getInvoiceTypeConfig(code: string): Promise<InvoiceTypeConfig> {
    const cacheKey = `invoice_type:${code}`;
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached.data;
    }
    
    try {
      const response = await apiClient.get(`/config/invoice-types/${code}`);
      const data = response.data;
      
      // 缓存数据
      this.setCache(cacheKey, data);
      
      return data;
    } catch (error) {
      if (cached) {
        console.warn('获取发票类型配置失败，使用缓存数据:', error);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * 获取功能开关
   */
  async getFeatureFlags(): Promise<FeatureFlagConfig[]> {
    const cacheKey = 'feature_flags:all';
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached.data;
    }
    
    try {
      const response = await apiClient.get('/config/feature-flags');
      const data = response.data;
      
      // 缓存数据（功能开关缓存时间较短）
      this.setCache(cacheKey, data);
      
      return data;
    } catch (error) {
      if (cached) {
        console.warn('获取功能开关失败，使用缓存数据:', error);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * 检查功能是否启用
   */
  async isFeatureEnabled(featureName: string): Promise<boolean> {
    const cacheKey = `feature_flag:${featureName}`;
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached.data.enabled;
    }
    
    try {
      const response = await apiClient.get(`/config/feature-flags/${featureName}`);
      const data = response.data;
      
      // 缓存数据
      this.setCache(cacheKey, data);
      
      return data.enabled;
    } catch (error) {
      if (cached) {
        console.warn('检查功能开关失败，使用缓存数据:', error);
        return cached.data.enabled;
      }
      
      // 默认返回关闭状态
      return false;
    }
  }

  // ===== 配置更新方法 =====

  /**
   * 更新配置（需要管理员权限）
   */
  async updateConfig(category: string, key: string, value: any, reason: string): Promise<ConfigResponse> {
    try {
      const response = await apiClient.put(`/config/categories/${category}/${key}`, {
        value,
        reason,
        environment: this.environment
      });
      
      const data = response.data;
      
      // 清除相关缓存
      this.clearCache(`${category}:${key}`);
      
      // 触发更新事件
      this.emit('configUpdated', { category, key, data });
      
      return data;
    } catch (error) {
      console.error('更新配置失败:', error);
      throw error;
    }
  }

  // ===== 工具方法 =====

  /**
   * 获取发票类型的字段定义
   */
  async getInvoiceFields(invoiceType: InvoiceType): Promise<Record<string, any>> {
    const config = await this.getInvoiceTypeConfig(invoiceType);
    return {
      ...config.field_definitions.core_fields,
      ...config.field_definitions.extended_fields
    };
  }

  /**
   * 获取发票类型的验证规则
   */
  async getValidationRules(invoiceType: InvoiceType): Promise<any> {
    const config = await this.getInvoiceTypeConfig(invoiceType);
    return config.validation_rules;
  }

  /**
   * 预热缓存
   */
  async warmupCache(): Promise<void> {
    try {
      await Promise.all([
        this.getInvoiceTypes(),
        this.getFeatureFlags(),
        this.getCategoryConfig('ui_settings'),
        this.getCategoryConfig('api_endpoints')
      ]);
      console.log('配置缓存预热完成');
    } catch (error) {
      console.warn('配置缓存预热失败:', error);
    }
  }

  /**
   * 手动刷新缓存
   */
  async refreshCache(): Promise<void> {
    this.clearCache();
    await this.warmupCache();
  }

  /**
   * 获取缓存状态
   */
  getCacheStats(): { total: number; valid: number; expired: number } {
    let total = 0;
    let valid = 0;
    let expired = 0;
    
    for (const cached of this.cache.values()) {
      total++;
      if (this.isCacheValid(cached)) {
        valid++;
      } else {
        expired++;
      }
    }
    
    return { total, valid, expired };
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.eventListeners.clear();
    this.cache.clear();
  }
}

// ===== 单例实例导出 =====

export const configService = new ConfigService();

// ===== 便捷函数导出 =====

export const {
  getCategoryConfig,
  getConfig,
  getInvoiceTypes,
  getInvoiceTypeConfig,
  getFeatureFlags,
  isFeatureEnabled,
  updateConfig,
  getInvoiceFields,
  getValidationRules,
  warmupCache,
  refreshCache,
  on: onConfigChange,
  off: offConfigChange
} = configService;

export default configService;