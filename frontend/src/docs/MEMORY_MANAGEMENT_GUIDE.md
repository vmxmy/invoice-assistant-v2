# 移动端内存管理系统完整指南

本文档介绍了为发票助手应用开发的全面移动端内存管理优化方案。

## 🎯 目标

- 防止内存泄漏，确保长时间使用后内存稳定
- 优化移动设备内存使用，适配不同性能设备
- 提供智能缓存策略，平衡性能和内存使用
- 实现自动内存清理和压力响应机制
- 提供开发调试工具，帮助识别和解决内存问题

## 📋 系统架构

### 核心组件

1. **内存监控系统** (`memoryMonitor.ts`)
   - 实时内存使用监控
   - 内存泄漏检测和预防
   - 性能指标收集和分析

2. **缓存管理系统**
   - 图片缓存管理器 (`imageCacheManager.ts`)
   - 数据分页缓存 (`dataCache.ts`)
   - 状态管理优化 (`useMemoryOptimizedState.ts`)

3. **移动端适配系统** (`useMobileMemoryAdaptation.ts`)
   - 设备内存检测
   - 低内存模式实现
   - 自动性能调整

4. **内存清理系统** (`useMemoryCleanup.ts`)
   - Hook资源清理
   - 事件监听器管理
   - 定时器和动画清理

5. **调试分析工具**
   - 内存分析器 (`memoryProfiler.ts`)
   - 调试面板 (`MemoryDebugPanel.tsx`)
   - 性能测试工具

6. **统一管理接口** (`memoryManager.ts`)
   - 整合所有功能
   - 提供统一API
   - 自动配置和优化

## 🚀 快速开始

### 1. 基本集成

在应用根组件中集成内存管理：

```tsx
import React from 'react';
import MemoryManagerProvider from './components/MemoryManagerProvider';
import App from './App';

function Root() {
  return (
    <MemoryManagerProvider 
      enableDebugPanel={process.env.NODE_ENV === 'development'}
      enableMobileAdaptation={true}
      config={{
        memoryThresholds: {
          warning: 150,   // 150MB
          critical: 250,  // 250MB
          emergency: 350  // 350MB
        },
        enableAutomaticCleanup: true
      }}
    >
      <App />
    </MemoryManagerProvider>
  );
}

export default Root;
```

### 2. 在组件中使用内存管理

```tsx
import React from 'react';
import { useMemoryContext } from './components/MemoryManagerProvider';
import useMemoryCleanup from './hooks/useMemoryCleanup';

function MyComponent() {
  const memory = useMemoryContext();
  const cleanup = useMemoryCleanup();

  // 注册定时器（自动清理）
  const timerId = cleanup.registerTimer(() => {
    console.log('定时任务');
  }, 1000, 'interval');

  // 注册事件监听器（自动清理）
  const listenerId = cleanup.registerEventListener(
    window, 
    'resize', 
    handleResize
  );

  // 手动清理内存
  const handleCleanup = async () => {
    await memory.cleanup('aggressive');
  };

  return (
    <div>
      <p>内存状态: {memory.status.mode}</p>
      <p>当前使用: {memory.status.current.toFixed(2)}MB</p>
      
      {memory.isLowMemoryMode && (
        <div className="alert alert-warning">
          设备内存不足，已启用优化模式
        </div>
      )}
      
      <button onClick={handleCleanup}>清理内存</button>
    </div>
  );
}
```

### 3. 使用优化的状态管理

```tsx
import useMemoryOptimizedState from './hooks/useMemoryOptimizedState';

function DataComponent() {
  // 基本用法
  const [data, setData] = useMemoryOptimizedState([], {
    key: 'my-data',
    persistToStorage: true,
    ttl: 300000, // 5分钟过期
    enableCompression: true
  });

  // 批量状态管理
  const [state, updateState] = useBatchMemoryOptimizedState({
    users: [],
    settings: {},
    cache: new Map()
  }, {
    key: 'app-state',
    maxSize: 10 * 1024 * 1024, // 10MB限制
    cleanupStrategy: 'memory-pressure'
  });

  // 临时状态（自动清理）
  const [tempData, setTempData] = useTemporaryState({}, 60000); // 1分钟

  return (
    <div>
      {/* 组件内容 */}
    </div>
  );
}
```

### 4. 图片缓存优化

```tsx
import { imageCacheManager } from './utils/imageCacheManager';

function ImageComponent({ src, alt }) {
  const [imageSrc, setImageSrc] = useState('');

  useEffect(() => {
    const loadImage = async () => {
      try {
        const cachedSrc = await imageCacheManager.loadImage(src, {
          priority: 'medium',
          quality: 'medium',
          maxWidth: 800,
          maxHeight: 600
        });
        setImageSrc(cachedSrc);
      } catch (error) {
        console.error('图片加载失败:', error);
        setImageSrc(src); // 降级到原始URL
      }
    };

    loadImage();
  }, [src]);

  return (
    <img 
      src={imageSrc} 
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}
```

### 5. 数据缓存使用

```tsx
import { invoiceDataCache } from './utils/dataCache';

async function loadInvoiceData(query) {
  // 检查缓存
  const cached = await invoiceDataCache.getCachedData(query);
  if (cached) {
    return cached;
  }

  // 从API获取数据
  const data = await fetchInvoiceData(query);
  
  // 缓存数据
  await invoiceDataCache.setCachedData(query, data.items, data.total);
  
  // 预取相邻页面
  await invoiceDataCache.prefetchAdjacentPages(query, fetchInvoiceData);
  
  return data.items;
}
```

## 🔧 配置选项

### 内存管理器配置

```typescript
interface MemoryManagerConfig {
  enableMonitoring: boolean;          // 启用内存监控
  enableMobileOptimization: boolean;  // 启用移动端优化
  enableAutomaticCleanup: boolean;    // 启用自动清理
  enableProfiler: boolean;            // 启用性能分析器
  
  memoryThresholds: {
    warning: number;    // 警告阈值 (MB)
    critical: number;   // 严重阈值 (MB)
    emergency: number;  // 紧急阈值 (MB)
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
```

### 缓存管理配置

```typescript
// 图片缓存配置
const imageConfig = {
  maxSize: 50,              // 最大50MB
  maxImages: 200,           // 最多200张图片
  imageTTL: 1800000,        // 30分钟过期
  enableCompression: true,   // 启用压缩
  enableWebP: true,         // 启用WebP格式
  preloadStrategy: 'conservative'
};

// 数据缓存配置
const dataConfig = {
  maxPages: 25,             // 最多25页
  pageTTL: 600000,          // 10分钟过期
  maxMemoryUsage: 30,       // 最大30MB
  evictionStrategy: 'LRU',  // LRU算法
  compressionEnabled: true,
  persistToStorage: true
};
```

## 📱 移动端特性

### 设备适配

系统自动检测设备内存并应用相应优化：

- **低端设备** (≤2GB RAM)
  - 减少缓存大小
  - 禁用复杂动画
  - 启用积极的内存清理
  - 降低图片质量

- **中端设备** (2-6GB RAM)
  - 平衡的缓存策略
  - 减少动画效果
  - 智能内存清理

- **高端设备** (≥6GB RAM)
  - 完整功能体验
  - 最大缓存限制
  - 高质量图片处理

### 内存模式

1. **正常模式**: 全功能运行
2. **低内存模式**: 减少动画和缓存
3. **关键内存模式**: 最小化功能，积极清理
4. **紧急模式**: 立即清理所有非必要资源

### 自动适配功能

- 网络状态感知（2G/3G/4G/WiFi）
- 低功耗模式检测
- 后台运行优化
- 视窗可见性管理

## 🛠️ 开发调试

### 调试面板功能

按 `Ctrl+Shift+M` 或点击调试按钮打开内存调试面板：

1. **概览标签**
   - 实时内存使用统计
   - 内存使用趋势图表
   - 设备信息和当前模式

2. **缓存标签**
   - 图片缓存详情和清理操作
   - 数据缓存状态和管理
   - 状态存储使用情况

3. **泄漏检测标签**
   - 内存泄漏自动检测
   - 内存增长趋势分析
   - 优化建议和警告

4. **性能标签**
   - 性能指标监控
   - 已激活的内存适配
   - 紧急操作和强制清理

### 性能分析工具

```javascript
// 在浏览器控制台使用
const profiler = window.memoryProfiler;

// 开始分析
const profileId = profiler.startProfiling('MyComponent');

// 执行要分析的代码
await myExpensiveOperation();

// 停止分析并获取结果
const result = profiler.stopProfiling(profileId);
console.log(result);

// 运行性能测试
const testResult = await profiler.runPerformanceTest(
  'ComponentTest',
  async () => {
    // 测试代码
  },
  10 // 迭代次数
);

// 导出分析报告
const report = profiler.exportReport();
```

### 内存监控API

```javascript
// 获取内存管理器
const manager = window.memoryManager;

// 获取当前状态
const status = manager.getStatus();

// 手动执行清理
await manager.cleanup('aggressive');

// 监听事件
manager.on('memory-leak', (data) => {
  console.warn('内存泄漏:', data);
});

// 导出内存报告
const report = manager.exportReport();
```

## ⚠️ 注意事项

### 性能影响

1. **开发环境**: 调试功能可能影响性能，生产环境会自动禁用
2. **内存监控**: 轻量级监控，对性能影响minimal
3. **自动清理**: 可能会短暂影响用户体验，但整体提升应用稳定性

### 最佳实践

1. **组件设计**
   - 使用 `useMemoryCleanup` 管理资源
   - 避免在闭包中创建大对象
   - 及时清理事件监听器和定时器

2. **状态管理**
   - 使用优化的状态Hook
   - 设置合理的TTL和大小限制
   - 定期清理过期状态

3. **图片处理**
   - 使用适当的图片质量设置
   - 启用懒加载和渐进式加载
   - 设置合理的缓存限制

4. **数据管理**
   - 使用分页加载大数据集
   - 实现数据虚拟化
   - 清理不需要的数据引用

### 故障排除

1. **内存持续增长**
   - 检查是否有未清理的事件监听器
   - 查看闭包是否持有大对象引用
   - 使用分析工具识别泄漏源

2. **性能下降**
   - 查看缓存命中率
   - 调整内存阈值设置
   - 检查是否触发频繁清理

3. **功能异常**
   - 确认内存模式设置正确
   - 检查自动清理配置
   - 查看控制台错误信息

## 📊 监控指标

系统提供以下关键指标用于监控和优化：

- **内存使用**: 当前、峰值、可用内存
- **缓存效率**: 命中率、大小、驱逐次数
- **性能指标**: FPS、渲染时间、交互延迟
- **清理统计**: 清理次数、释放内存、持续时间
- **适配状态**: 设备类型、激活的优化、模式变化

## 🔄 版本兼容性

- **React**: 18+
- **TypeScript**: 4.5+
- **浏览器**: 支持 ES2020 的现代浏览器
- **移动设备**: iOS 12+, Android 8+

## 📚 相关文档

- [React Performance](https://react.dev/learn/render-and-commit)
- [Web Performance](https://web.dev/performance/)
- [Memory Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management)
- [Mobile Web Best Practices](https://developers.google.com/web/fundamentals/performance)

---

本内存管理系统旨在提供全面、智能的内存优化解决方案，确保发票助手应用在各种设备和使用场景下都能保持优秀的性能和稳定性。