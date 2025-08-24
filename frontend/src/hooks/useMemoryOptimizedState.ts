import { useState, useCallback, useRef, useEffect } from 'react';
import { memoryMonitor } from '../utils/memoryMonitor';

/**
 * 内存优化的状态管理Hook
 * 提供自动清理、状态持久化和内存使用优化
 */

interface StateOptions<T> {
  /** 状态键，用于持久化存储 */
  key?: string;
  /** 是否启用持久化存储 */
  persistToStorage?: boolean;
  /** 状态生存时间（毫秒），0表示永不过期 */
  ttl?: number;
  /** 最大状态大小（字节），超过时触发清理 */
  maxSize?: number;
  /** 是否启用压缩存储 */
  enableCompression?: boolean;
  /** 状态清理策略 */
  cleanupStrategy?: 'manual' | 'auto' | 'memory-pressure';
  /** 序列化函数 */
  serializer?: {
    serialize: (value: T) => string;
    deserialize: (value: string) => T;
  };
  /** 状态变化回调 */
  onChange?: (newState: T, oldState: T) => void;
  /** 清理回调 */
  onCleanup?: () => void;
}

interface StoredState<T> {
  data: T;
  timestamp: number;
  size: number;
  accessCount: number;
}

interface StateStats {
  size: number;
  accessCount: number;
  age: number;
  compressionRatio?: number;
}

// 全局状态存储管理器
class StateStorageManager {
  private storage = new Map<string, any>();
  private sizes = new Map<string, number>();
  private accessCounts = new Map<string, number>();
  private timestamps = new Map<string, number>();
  private totalSize = 0;
  private maxTotalSize = 50 * 1024 * 1024; // 50MB

  set<T>(key: string, value: T, options: StateOptions<T> = {}): void {
    const serialized = options.serializer?.serialize(value) || JSON.stringify(value);
    const compressed = options.enableCompression ? this.compress(serialized) : serialized;
    const size = new Blob([compressed]).size;

    // 检查是否需要清理空间
    this.ensureSpace(size);

    // 更新存储
    const oldSize = this.sizes.get(key) || 0;
    this.storage.set(key, compressed);
    this.sizes.set(key, size);
    this.timestamps.set(key, Date.now());
    this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);

    // 更新总大小
    this.totalSize = this.totalSize - oldSize + size;

    // 持久化到localStorage（如果启用）
    if (options.persistToStorage) {
      try {
        localStorage.setItem(`state_${key}`, compressed);
        localStorage.setItem(`state_meta_${key}`, JSON.stringify({
          timestamp: Date.now(),
          size,
          ttl: options.ttl,
          compressed: options.enableCompression
        }));
      } catch (error) {
        console.warn(`状态持久化失败: ${key}`, error);
      }
    }

    console.log(`💾 状态已存储: ${key} (${this.formatBytes(size)})`);
  }

  get<T>(key: string, options: StateOptions<T> = {}): T | null {
    // 更新访问计数
    this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);

    let compressed = this.storage.get(key);
    
    // 如果内存中没有，尝试从localStorage恢复
    if (!compressed && options.persistToStorage) {
      compressed = this.restoreFromStorage(key, options);
    }

    if (!compressed) return null;

    // 检查TTL
    const timestamp = this.timestamps.get(key);
    if (timestamp && options.ttl && Date.now() - timestamp > options.ttl) {
      this.delete(key);
      return null;
    }

    try {
      const decompressed = options.enableCompression ? this.decompress(compressed) : compressed;
      return options.serializer?.deserialize(decompressed) || JSON.parse(decompressed);
    } catch (error) {
      console.error(`状态反序列化失败: ${key}`, error);
      this.delete(key);
      return null;
    }
  }

  delete(key: string): void {
    const size = this.sizes.get(key) || 0;
    
    this.storage.delete(key);
    this.sizes.delete(key);
    this.timestamps.delete(key);
    this.accessCounts.delete(key);
    
    this.totalSize -= size;

    // 从localStorage删除
    localStorage.removeItem(`state_${key}`);
    localStorage.removeItem(`state_meta_${key}`);

    console.log(`🗑️ 状态已删除: ${key}`);
  }

  private ensureSpace(requiredSize: number): void {
    while (this.totalSize + requiredSize > this.maxTotalSize && this.storage.size > 0) {
      const keyToEvict = this.selectKeyToEvict();
      if (keyToEvict) {
        this.delete(keyToEvict);
      } else {
        break;
      }
    }
  }

  private selectKeyToEvict(): string | null {
    if (this.storage.size === 0) return null;

    // 选择最久未访问且访问次数最少的状态
    let selectedKey: string | null = null;
    let minScore = Infinity;

    this.storage.forEach((_, key) => {
      const accessCount = this.accessCounts.get(key) || 0;
      const timestamp = this.timestamps.get(key) || Date.now();
      const age = Date.now() - timestamp;
      
      // 计算清理分数：访问次数越少、越久远的分数越低
      const score = accessCount * 1000 - age;
      
      if (score < minScore) {
        minScore = score;
        selectedKey = key;
      }
    });

    return selectedKey;
  }

  private restoreFromStorage<T>(key: string, options: StateOptions<T>): string | null {
    try {
      const metaData = localStorage.getItem(`state_meta_${key}`);
      if (!metaData) return null;

      const meta = JSON.parse(metaData);
      
      // 检查TTL
      if (meta.ttl && Date.now() - meta.timestamp > meta.ttl) {
        localStorage.removeItem(`state_${key}`);
        localStorage.removeItem(`state_meta_${key}`);
        return null;
      }

      const data = localStorage.getItem(`state_${key}`);
      if (!data) return null;

      // 恢复到内存中
      this.storage.set(key, data);
      this.sizes.set(key, meta.size);
      this.timestamps.set(key, meta.timestamp);
      this.accessCounts.set(key, 1);
      this.totalSize += meta.size;

      console.log(`💾 状态已从存储恢复: ${key}`);
      return data;
    } catch (error) {
      console.error(`状态恢复失败: ${key}`, error);
      return null;
    }
  }

  private compress(data: string): string {
    // 简单的压缩实现（实际项目中可以使用更好的压缩算法）
    return data.replace(/\s+/g, ' ').trim();
  }

  private decompress(data: string): string {
    return data;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStats(): { totalSize: number; itemCount: number; items: Array<{ key: string; size: number; accessCount: number; age: number }> } {
    const items: Array<{ key: string; size: number; accessCount: number; age: number }> = [];
    
    this.storage.forEach((_, key) => {
      items.push({
        key,
        size: this.sizes.get(key) || 0,
        accessCount: this.accessCounts.get(key) || 0,
        age: Date.now() - (this.timestamps.get(key) || Date.now())
      });
    });

    return {
      totalSize: this.totalSize,
      itemCount: this.storage.size,
      items
    };
  }

  clear(): void {
    this.storage.clear();
    this.sizes.clear();
    this.accessCounts.clear();
    this.timestamps.clear();
    this.totalSize = 0;

    // 清理localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('state_')) {
        localStorage.removeItem(key);
      }
    });

    console.log('🧹 所有状态已清空');
  }
}

// 全局状态存储管理器实例
const stateStorageManager = new StateStorageManager();

export function useMemoryOptimizedState<T>(
  initialValue: T | (() => T),
  options: StateOptions<T> = {}
): [T, (value: T | ((prev: T) => T)) => void, StateStats] {
  const {
    key,
    persistToStorage = false,
    ttl = 0,
    maxSize = 1024 * 1024, // 1MB
    enableCompression = false,
    cleanupStrategy = 'auto',
    serializer,
    onChange,
    onCleanup
  } = options;

  // 初始化状态
  const initValue = typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
  
  // 从存储恢复状态（如果有键值）
  const storedValue = key ? stateStorageManager.get(key, options) : null;
  const [state, setInternalState] = useState<T>(storedValue || initValue);
  
  // 状态统计信息
  const [stats, setStats] = useState<StateStats>({
    size: 0,
    accessCount: 0,
    age: 0
  });

  // 清理定时器引用
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateRef = useRef<T>(state);
  const mountedRef = useRef(true);

  // 计算状态大小
  const calculateSize = useCallback((value: T): number => {
    try {
      const serialized = serializer?.serialize(value) || JSON.stringify(value);
      return new Blob([serialized]).size;
    } catch {
      return 0;
    }
  }, [serializer]);

  // 更新统计信息
  const updateStats = useCallback((value: T) => {
    const size = calculateSize(value);
    setStats(prev => ({
      ...prev,
      size,
      accessCount: prev.accessCount + 1,
      age: Date.now() - (prev.age || Date.now())
    }));
  }, [calculateSize]);

  // 状态设置函数
  const setState = useCallback((value: T | ((prev: T) => T)) => {
    const newValue = typeof value === 'function' ? (value as (prev: T) => T)(lastStateRef.current) : value;
    const oldValue = lastStateRef.current;
    
    // 检查状态大小
    const size = calculateSize(newValue);
    if (size > maxSize) {
      console.warn(`状态大小超过限制: ${size} > ${maxSize}`);
      return;
    }

    // 更新状态
    setInternalState(newValue);
    lastStateRef.current = newValue;

    // 存储状态（如果有键值）
    if (key) {
      stateStorageManager.set(key, newValue, options);
    }

    // 更新统计信息
    updateStats(newValue);

    // 触发变化回调
    if (onChange) {
      onChange(newValue, oldValue);
    }

    // 设置清理定时器
    if (ttl > 0 && cleanupStrategy === 'auto') {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
      }
      
      cleanupTimerRef.current = setTimeout(() => {
        if (mountedRef.current && onCleanup) {
          onCleanup();
        }
        if (key) {
          stateStorageManager.delete(key);
        }
      }, ttl);
    }

    console.log(`🔄 状态已更新${key ? `: ${key}` : ''} (${Math.round(size / 1024 * 100) / 100}KB)`);
  }, [key, maxSize, ttl, cleanupStrategy, options, updateStats, calculateSize, onChange, onCleanup]);

  // 内存压力处理
  useEffect(() => {
    if (cleanupStrategy !== 'memory-pressure') return;

    const handleMemoryPressure = () => {
      if (onCleanup) {
        onCleanup();
      }
      if (key) {
        stateStorageManager.delete(key);
      }
    };

    memoryMonitor.on('pressure', handleMemoryPressure);
    
    return () => {
      memoryMonitor.off('pressure');
    };
  }, [cleanupStrategy, key, onCleanup]);

  // 组件卸载清理
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
      }
      
      // 如果不需要持久化，清理存储
      if (!persistToStorage && key) {
        stateStorageManager.delete(key);
      }
    };
  }, [key, persistToStorage]);

  return [state, setState, stats];
}

/**
 * 批量状态管理Hook
 */
export function useBatchMemoryOptimizedState<T extends Record<string, any>>(
  initialStates: T,
  options: StateOptions<T> = {}
): [T, (updates: Partial<T>) => void, StateStats] {
  const [state, setState, stats] = useMemoryOptimizedState(initialStates, options);

  const batchUpdate = useCallback((updates: Partial<T>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, [setState]);

  return [state, batchUpdate, stats];
}

/**
 * 临时状态Hook（自动清理）
 */
export function useTemporaryState<T>(
  initialValue: T | (() => T),
  ttl: number = 300000 // 5分钟
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useMemoryOptimizedState(initialValue, {
    ttl,
    cleanupStrategy: 'auto',
    onCleanup: () => console.log('🗑️ 临时状态已自动清理')
  });

  return [state, setState];
}

/**
 * 压缩状态Hook（适合大型对象）
 */
export function useCompressedState<T>(
  initialValue: T | (() => T),
  key?: string
): [T, (value: T | ((prev: T) => T)) => void, StateStats] {
  return useMemoryOptimizedState(initialValue, {
    key,
    enableCompression: true,
    persistToStorage: Boolean(key),
    maxSize: 10 * 1024 * 1024, // 10MB
    cleanupStrategy: 'memory-pressure'
  });
}

/**
 * 获取全局状态统计信息
 */
export function getGlobalStateStats() {
  return stateStorageManager.getStats();
}

/**
 * 清理所有状态
 */
export function clearAllStates() {
  stateStorageManager.clear();
}

export default useMemoryOptimizedState;