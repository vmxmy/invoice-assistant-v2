# 移动端优化组件库

本文档介绍发票管理系统的移动端优化组件库，包括PWA功能、性能优化、用户体验增强等功能。

## 组件概览

### 1. PWA功能
- `PWAManager`: PWA安装和更新管理
- Service Worker自动缓存
- 离线支持和更新提示

### 2. 性能优化组件
- `VirtualizedInvoiceList`: 虚拟滚动列表，支持大量数据渲染
- `MobileSkeletonLoader`: 多种骨架屏组件
- `LazyImage`: 图片懒加载组件

### 3. 用户交互组件
- `PullToRefresh`: 下拉刷新
- `MobileInput`: 移动端优化输入框
- `MobileSearch`: 智能搜索组件
- `MobileQuickActions`: 快捷操作面板

### 4. 手势处理
- `useGestures`: 手势处理钩子
- 支持长按、滑动、点击等手势

### 5. 综合管理组件
- `MobileInvoiceManager`: 完整的移动端发票管理界面

## 快速开始

### 基础使用

```typescript
import React from 'react';
import { MobileInvoiceManager } from '../components/mobile';

const MyMobilePage: React.FC = () => {
  return (
    <MobileInvoiceManager
      invoices={invoices}
      loading={loading}
      selectedInvoices={selectedInvoices}
      onInvoiceSelect={handleInvoiceSelect}
      onInvoiceView={handleInvoiceView}
      onInvoiceEdit={handleInvoiceEdit}
      onInvoiceDelete={handleInvoiceDelete}
      onRefresh={handleRefresh}
      onUpload={handleUpload}
    />
  );
};
```

### PWA功能

在应用根组件中添加PWA管理器：

```typescript
import React from 'react';
import { PWAManager } from '../components/mobile';

function App() {
  return (
    <div>
      {/* 你的应用内容 */}
      <PWAManager />
    </div>
  );
}
```

### 虚拟滚动

对于大量数据的列表渲染：

```typescript
import React from 'react';
import { VirtualizedInvoiceList } from '../components/mobile';

const InvoiceList: React.FC = () => {
  return (
    <VirtualizedInvoiceList
      invoices={invoices}
      selectedInvoices={selectedInvoices}
      onInvoiceSelect={handleSelect}
      onInvoiceView={handleView}
      onInvoiceEdit={handleEdit}
      onInvoiceDelete={handleDelete}
      hasNextPage={hasNextPage}
      loadNextPage={loadNextPage}
    />
  );
};
```

### 下拉刷新

包装需要下拉刷新的内容：

```typescript
import React from 'react';
import { PullToRefresh } from '../components/mobile';

const RefreshableContent: React.FC = () => {
  const handleRefresh = async () => {
    // 刷新逻辑
    await fetchData();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div>
        {/* 你的内容 */}
      </div>
    </PullToRefresh>
  );
};
```

### 移动端搜索

智能搜索组件，支持建议和历史记录：

```typescript
import React from 'react';
import { MobileSearch } from '../components/mobile';

const SearchPage: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');

  const suggestions = [
    { id: '1', text: '餐饮服务', type: 'category' },
    { id: '2', text: '交通运输', type: 'category' },
  ];

  return (
    <MobileSearch
      value={searchValue}
      onChange={setSearchValue}
      onSearch={handleSearch}
      suggestions={suggestions}
      onFilterClick={handleFilter}
      activeFiltersCount={filterCount}
    />
  );
};
```

### 手势处理

使用手势钩子增强用户交互：

```typescript
import React from 'react';
import { useGestures } from '../hooks/useGestures';

const GestureComponent: React.FC = () => {
  const { touchHandlers } = useGestures(
    {
      onSwipeLeft: () => console.log('左滑'),
      onSwipeRight: () => console.log('右滑'),
      onLongPress: () => console.log('长按'),
    },
    {
      swipeThreshold: 50,
      longPressDelay: 500,
    }
  );

  return (
    <div {...touchHandlers}>
      可交互的内容
    </div>
  );
};
```

### 性能优化

使用性能工具函数优化应用：

```typescript
import { 
  detectDevicePerformance, 
  getAnimationConfig,
  createDebounce 
} from '../utils/performanceUtils';

const MyComponent: React.FC = () => {
  const performance = detectDevicePerformance();
  const animationConfig = getAnimationConfig(performance);
  
  const debouncedSearch = createDebounce(
    (query: string) => performSearch(query),
    performance.debounceDelay
  );

  return (
    <motion.div
      animate={{ opacity: 1 }}
      transition={{ duration: animationConfig.duration }}
    >
      {/* 内容 */}
    </motion.div>
  );
};
```

## 配置选项

### PWA配置

PWA功能通过Vite插件配置，支持：
- 自动更新检测
- 离线缓存策略
- 应用快捷方式
- 安装提示

### 性能配置

性能优化会自动检测设备能力：
- **低端设备**: 减少动画、降低图片质量
- **中端设备**: 平衡性能和体验
- **高端设备**: 启用所有功能

### 主题适配

所有组件都支持DaisyUI主题系统：
- 自动适配暗色模式
- 支持所有DaisyUI主题
- 安全区域适配（iOS）

## 最佳实践

### 1. 性能优化
- 使用虚拟滚动处理大量数据
- 启用图片懒加载
- 合理使用防抖和节流
- 监控设备性能，动态调整策略

### 2. 用户体验
- 提供触觉反馈
- 遵循44px最小触控区域标准
- 支持手势操作
- 添加加载状态和骨架屏

### 3. 可访问性
- 支持减少动画偏好
- 适当的颜色对比度
- 键盘导航支持
- 屏幕阅读器友好

### 4. 移动端适配
- 使用safe-area适配异形屏
- 防止iOS自动缩放
- 优化键盘输入体验
- 支持横屏和竖屏模式

## 浏览器支持

- iOS Safari 12+
- Chrome Mobile 80+
- Firefox Mobile 75+
- Samsung Internet 12+
- 其他基于Chromium的浏览器

## 注意事项

1. **PWA功能**需要HTTPS环境
2. **虚拟滚动**适用于超过100个项目的列表
3. **手势功能**在桌面端会自动禁用
4. **性能检测**会根据设备自动调整配置
5. **Service Worker**更新需要用户确认

## 开发调试

### 启用PWA调试
```bash
npm run dev # PWA功能在开发模式下也可用
```

### 性能监控
```typescript
import { performanceMonitor } from '../utils/performanceUtils';

// 监控FPS
console.log('当前FPS:', performanceMonitor.getFPS());
console.log('性能是否良好:', performanceMonitor.isPerformanceGood());
```

### 设备模拟
使用浏览器开发者工具的设备模拟功能测试不同设备的表现。

## 更新日志

### v1.0.0
- 初始发布
- PWA基础功能
- 虚拟滚动组件
- 手势处理系统
- 性能优化工具

### 未来计划
- 添加更多手势类型支持
- 增强离线功能
- 改进性能检测算法
- 添加更多移动端专用组件