# 移动端网络请求优化系统 - 使用指南

## 概述

这是一套为移动端应用量身定制的网络请求优化系统，提供了智能缓存、自动重试、数据预加载、网络适配等功能，确保应用在各种网络环境下都能提供良好的用户体验。

## 🚀 核心功能

### 1. 智能缓存策略
- **网络自适应缓存时间**：根据网络质量动态调整缓存过期时间
- **优先级缓存**：关键数据优先保留，非关键数据及时清理
- **内存优化**：智能垃圾回收，避免内存泄漏

### 2. 智能重试机制
- **指数退避算法**：避免服务器过载
- **网络状态感知**：根据网络质量调整重试策略
- **错误分类处理**：区分不同类型错误的重试策略

### 3. 数据预加载优化
- **用户行为预测**：基于历史数据预测用户需求
- **智能预取**：在空闲时间预加载可能需要的数据
- **后台同步**：应用后台时的数据同步策略

### 4. 移动端网络适配
- **网络类型检测**：自动识别WiFi/4G/5G/慢速网络
- **策略调整**：根据网络质量调整请求策略
- **离线支持**：离线操作队列和数据缓存

### 5. 性能监控
- **实时监控**：API响应时间、错误率、网络质量
- **性能分析**：请求性能统计和优化建议
- **数据导出**：性能数据导出和分析

## 📦 组件架构

```
NetworkOptimization/
├── providers/
│   └── NetworkOptimizationProvider.tsx  # 主提供者组件
├── hooks/
│   ├── useNetworkRequest.ts             # 网络请求Hooks
│   └── useNetworkStatus.ts              # 网络状态Hook
├── utils/
│   ├── networkRequestManager.ts         # 网络请求管理器
│   ├── dataPreloader.ts                # 数据预加载器
│   └── mobileNetworkAdapter.ts          # 移动端网络适配器
├── services/
│   └── optimizedSupabaseService.ts      # 优化的Supabase服务
└── components/
    └── debug/
        ├── NetworkPerformancePanel.tsx  # 性能监控面板
        └── NetworkOptimizationPanel.tsx # 优化控制面板
```

## 🛠 快速开始

### 1. 安装和初始化

在应用根组件中集成网络优化提供者：

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkOptimizationProvider } from './components/providers/NetworkOptimizationProvider';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkOptimizationProvider
        queryClient={queryClient}
        options={{
          enableByDefault: true,
          enableDebugMode: process.env.NODE_ENV === 'development',
          enablePerformanceLogging: true,
        }}
      >
        {/* 你的应用组件 */}
        <YourAppComponents />
      </NetworkOptimizationProvider>
    </QueryClientProvider>
  );
}
```

### 2. 使用优化的查询Hook

```tsx
import { useNetworkQuery, useNetworkMutation } from '../hooks/useNetworkRequest';

function InvoiceList() {
  // 使用网络优化的查询
  const { data, isLoading, error } = useNetworkQuery(
    ['invoices', 'list'],
    async () => {
      const response = await fetch('/api/invoices');
      return response.json();
    },
    {
      // 网络优化选项
      skipOnSlowNetwork: false,  // 重要数据即使慢网络也加载
      enableMetrics: true,       // 启用性能监控
      retryConfig: {
        maxAttempts: 3,
        baseDelay: 1000,
      },
      onRetry: (attempt, error) => {
        console.log(`重试第${attempt}次:`, error.message);
      },
      onNetworkChange: (networkInfo) => {
        if (networkInfo.connectionQuality === 'poor') {
          showNetworkWarning();
        }
      }
    }
  );

  // 使用网络优化的变更
  const updateMutation = useNetworkMutation(
    async (data) => {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    },
    {
      skipOnOffline: true,  // 离线时不执行
      onNetworkChange: (networkInfo) => {
        if (!networkInfo.isOnline) {
          showOfflineMessage();
        }
      }
    }
  );

  return (
    <div>
      {/* 你的组件内容 */}
    </div>
  );
}
```

### 3. 使用优化的Supabase服务

```tsx
import { optimizedSupabaseService } from '../services/optimizedSupabaseService';

async function loadInvoiceData() {
  const { data, error, fromCache, metrics } = await optimizedSupabaseService.optimizedQuery(
    'invoices',
    {
      select: 'id,invoice_number,total_amount,status',
      filters: { status: 'active' },
      orderBy: { column: 'created_at', ascending: false },
      range: { from: 0, to: 19 },
      enableCache: true,
      cacheTTL: 5 * 60 * 1000,  // 5分钟缓存
      priority: 'high'
    }
  );

  if (fromCache) {
    console.log('数据来自缓存，耗时:', metrics.duration);
  }

  return data;
}
```

### 4. 配置数据预加载

```tsx
import { useResourcePreloader } from '../hooks/useNetworkRequest';

function Dashboard() {
  const { preloadQuery, preloadResource } = useResourcePreloader();

  useEffect(() => {
    // 预加载关键数据
    preloadQuery(
      ['dashboard', 'stats'],
      () => fetch('/api/dashboard/stats').then(r => r.json()),
      { priority: 'high' }
    );

    // 预加载资源文件
    preloadResource('/images/critical-icon.png', 'image');
    preloadResource('/fonts/app-font.woff2', 'font');
  }, [preloadQuery, preloadResource]);

  return <div>Dashboard Content</div>;
}
```

## 🎛 调试和监控

### 开发环境调试

在开发环境中，你可以启用调试面板：

```tsx
// 在需要的地方添加调试组件
import NetworkOptimizationPanel from '../components/debug/NetworkOptimizationPanel';

function DebugTools() {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <>
      <button onClick={() => setShowPanel(true)}>
        打开网络优化面板
      </button>
      
      <NetworkOptimizationPanel
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
      />
    </>
  );
}
```

### 性能监控

```tsx
import { useNetworkPerformance } from '../hooks/useNetworkRequest';

function PerformanceMonitor() {
  const { stats, exportData, clearMetrics } = useNetworkPerformance();

  return (
    <div>
      <h3>网络性能</h3>
      <p>总请求数: {stats.totalRequests}</p>
      <p>成功率: {stats.successRate.toFixed(1)}%</p>
      <p>平均响应时间: {stats.averageResponseTime.toFixed(0)}ms</p>
      
      <button onClick={exportData}>导出性能数据</button>
      <button onClick={clearMetrics}>清空统计</button>
    </div>
  );
}
```

## ⚙️ 配置选项

### NetworkOptimizationProvider 配置

```tsx
<NetworkOptimizationProvider
  queryClient={queryClient}
  options={{
    // 基础设置
    enableByDefault: true,              // 默认启用优化
    enableDebugMode: false,             // 调试模式
    enablePerformanceLogging: true,     // 性能日志
    
    // 离线配置
    offlineConfig: {
      enableOfflineCache: true,         // 启用离线缓存
      maxOfflineSize: 50,               // 离线缓存大小限制(MB)
      criticalData: [                   // 关键数据标识
        'dashboard-stats',
        'user-profile',
        'invoices'
      ],
      enableOfflineQueue: true,         // 启用离线操作队列
      maxQueueSize: 100,               // 队列最大大小
      syncOnReconnect: true,           // 重连时同步
    }
  }}
>
```

### 网络策略配置

系统会根据网络质量自动选择不同的策略：

- **优秀网络 (excellent)**：最小缓存时间，启用预加载，高质量资源
- **良好网络 (good)**：适中缓存时间，启用优化，压缩图片
- **一般网络 (fair)**：较长缓存时间，限制预加载，启用压缩
- **差网络 (poor)**：最长缓存时间，禁用预加载，极度压缩
- **离线状态 (offline)**：仅使用缓存，启用离线队列

## 📊 监控指标

### 关键性能指标 (KPIs)

1. **网络请求成功率**：应保持在95%以上
2. **平均响应时间**：应在3秒以下
3. **缓存命中率**：应在60%以上
4. **数据使用量**：监控和优化数据传输

### 性能阈值

```javascript
// 系统会自动监控以下阈值并发出警告
const performanceThresholds = {
  successRate: 90,        // 成功率低于90%时警告
  responseTime: 5000,     // 响应时间超过5秒时警告
  errorRate: 10,          // 错误率超过10%时警告
  cacheHitRate: 50,       // 缓存命中率低于50%时提醒
};
```

## 🚨 故障排除

### 常见问题

1. **缓存不生效**
   - 检查查询键是否正确
   - 确认缓存时间配置
   - 验证网络状态

2. **重试不工作**
   - 检查错误类型是否在重试范围内
   - 确认网络状态
   - 查看重试配置

3. **预加载失效**
   - 检查网络质量是否符合要求
   - 确认预加载条件
   - 查看空闲状态

4. **性能问题**
   - 检查缓存策略
   - 优化查询粒度
   - 减少并发请求

### 调试技巧

```javascript
// 启用详细日志
localStorage.setItem('network-optimization-debug', 'true');

// 查看网络状态
console.log('当前网络状态:', networkRequestManager.getNetworkInfo());

// 查看性能统计
console.log('性能统计:', networkRequestManager.getPerformanceStats());

// 导出诊断信息
const diagnostics = optimizedSupabaseService.exportDiagnostics();
console.log('诊断信息:', diagnostics);
```

## 🔧 高级用法

### 自定义网络策略

```typescript
// 创建自定义网络适配器实例
const customAdapter = MobileNetworkAdapter.getInstance(queryClient, {
  enableOfflineCache: true,
  maxOfflineSize: 100, // 更大的离线缓存
  criticalData: ['my-critical-data'],
  enableOfflineQueue: true,
  maxQueueSize: 200,
  syncOnReconnect: true,
});

// 监听网络变化并执行自定义逻辑
networkRequestManager.addNetworkListener((networkInfo) => {
  if (networkInfo.connectionQuality === 'poor') {
    // 执行慢网络优化
    enableSlowNetworkMode();
  }
});
```

### 批量操作优化

```typescript
// 使用优化的批量操作
const results = await optimizedSupabaseService.batchOperations([
  {
    table: 'invoices',
    operation: 'insert',
    data: { /* 数据 */ }
  },
  {
    table: 'invoices',
    operation: 'update',
    data: { /* 更新数据 */ },
    filters: { id: 'invoice-123' }
  }
], {
  immediate: false,    // 非立即执行，等待批处理
  maxBatchSize: 20,    // 批处理大小
  timeout: 30000       // 超时时间
});
```

### 实时订阅优化

```typescript
// 创建优化的实时订阅
const subscription = optimizedSupabaseService.createOptimizedSubscription(
  'invoices',
  {
    event: '*',
    filter: 'user_id=eq.123',
    callback: (payload) => {
      console.log('收到实时更新:', payload);
      // 更新本地状态
    },
    throttleMs: 1000,        // 节流时间
    enableOfflineQueue: true // 离线队列
  }
);

// 清理订阅
subscription.unsubscribe();
```

## 📈 性能优化建议

### 1. 查询优化
- 使用具体的字段选择，避免 `SELECT *`
- 合理设置分页大小
- 利用索引优化查询条件

### 2. 缓存策略
- 根据数据更新频率设置合适的缓存时间
- 区分关键数据和非关键数据的缓存策略
- 定期清理过期缓存

### 3. 网络优化
- 压缩传输数据
- 使用CDN加速静态资源
- 合并小文件请求

### 4. 移动端特殊优化
- 监听网络状态变化
- 在WiFi环境下预加载更多数据
- 在慢速网络下降低请求频率

## 🤝 贡献指南

如果你想为这个网络优化系统贡献代码或提出改进建议：

1. Fork 项目仓库
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 提交修改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果你在使用过程中遇到问题：

1. 查看本文档的故障排除部分
2. 在项目仓库中创建 Issue
3. 联系开发团队获取支持

---

**注意**：这个网络优化系统是专门为移动端应用设计的，在使用时请根据你的具体需求进行配置和调整。