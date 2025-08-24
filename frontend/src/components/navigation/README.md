# 移动端导航系统

一个完整的响应式移动端导航解决方案，支持多种导航模式、手势交互和智能适配。

## 📱 核心特性

### 🚀 多导航模式
- **底部标签导航** - 适合移动端快速切换
- **抽屉侧滑导航** - 适合复杂导航结构
- **智能混合模式** - 根据设备自动选择

### 👆 手势支持
- **边缘滑动返回** - 从左边缘右滑返回上一页
- **下拉刷新** - 在页面顶部下拉刷新内容
- **侧滑抽屉** - 从边缘滑动打开抽屉菜单
- **触觉反馈** - 提供丰富的触觉反馈体验

### 🎨 高度定制
- **3种标签变体** - 极简/标准/增强
- **用户偏好保存** - 设置自动持久化
- **主题适配** - 支持明暗主题切换
- **安全区域适配** - 完美支持刘海屏

## 🛠️ 快速开始

### 基础用法

```tsx
import { NavigationProvider, ResponsiveNavigationSystem } from './components/navigation';

function App() {
  return (
    <NavigationProvider>
      <ResponsiveNavigationSystem>
        <YourPageContent />
      </ResponsiveNavigationSystem>
    </NavigationProvider>
  );
}
```

### 自定义配置

```tsx
<ResponsiveNavigationSystem
  pageTitle="我的页面"
  showBackButton={true}
  showSearch={true}
  showActions={true}
  customTopNavbar={<CustomNavbar />}
>
  <YourPageContent />
</ResponsiveNavigationSystem>
```

## 📋 组件API

### NavigationProvider

导航系统的上下文提供者，必须包裹在应用的根部。

```tsx
<NavigationProvider>
  {/* 你的应用 */}
</NavigationProvider>
```

### ResponsiveNavigationSystem

主要的导航系统组件，自动根据设备选择合适的导航模式。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `children` | `ReactNode` | - | 页面内容 |
| `pageTitle` | `string` | - | 页面标题 |
| `showBackButton` | `boolean` | `true` | 显示返回按钮 |
| `showSearch` | `boolean` | `true` | 显示搜索按钮 |
| `showActions` | `boolean` | `true` | 显示操作按钮 |
| `customTopNavbar` | `ReactNode` | - | 自定义顶部导航栏 |

### MobileTabsNavigation

底部标签导航组件。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `showLabels` | `boolean` | `true` | 显示标签文字 |
| `variant` | `'minimal' \| 'standard' \| 'enhanced'` | `'standard'` | 标签样式变体 |

### MobileDrawerNavigation

侧滑抽屉导航组件。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `isOpen` | `boolean` | - | 抽屉是否打开 |
| `onClose` | `() => void` | - | 关闭回调 |

### NavigationSettings

导航设置面板组件。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `isOpen` | `boolean` | - | 设置面板是否打开 |
| `onClose` | `() => void` | - | 关闭回调 |

## 🎣 Hooks API

### useNavigation

获取完整的导航上下文。

```tsx
const { preferences, state, controls, deviceInfo, updatePreferences } = useNavigation();
```

### useNavigationState

获取导航状态和控制方法。

```tsx
const { state, controls } = useNavigationState();

// 可用方法
controls.openDrawer();     // 打开抽屉
controls.closeDrawer();    // 关闭抽屉
controls.toggleDrawer();   // 切换抽屉
controls.goBack();         // 返回上一页
controls.setActiveTab();   // 设置活跃标签
```

### useNavigationPreferences

管理导航偏好设置。

```tsx
const { preferences, updatePreferences } = useNavigationPreferences();

// 更新设置
updatePreferences({
  mobileNavType: 'tabs',
  showLabels: true,
  compactMode: false
});
```

### useResponsiveNavigation

获取响应式导航状态。

```tsx
const { 
  shouldShowTabs, 
  shouldShowDrawer, 
  shouldShowDesktopNav,
  navVariant,
  compactMode 
} = useResponsiveNavigation();
```

### useNavigationGestures

添加导航手势支持。

```tsx
const { 
  isGesturing, 
  swipeProgress, 
  gestureType,
  triggerGesture 
} = useNavigationGestures({
  enableSwipeBack: true,
  enableSwipeToDrawer: true,
  enablePullToRefresh: true
});
```

### usePullToRefresh

下拉刷新功能。

```tsx
const { 
  isRefreshing, 
  pullDistance, 
  showRefreshIndicator 
} = usePullToRefresh(async () => {
  // 刷新逻辑
  await refreshData();
});
```

## 🎨 样式定制

### CSS 变量

```css
:root {
  /* 导航高度 */
  --nav-height-mobile: 56px;
  --nav-height-tablet: 64px;
  --nav-height-desktop: 72px;
  
  /* 标签导航 */
  --tabs-height-minimal: 56px;
  --tabs-height-standard: 64px;
  --tabs-height-enhanced: 80px;
  
  /* 抽屉宽度 */
  --drawer-width: 320px;
  --drawer-width-tablet: 360px;
}
```

### 自定义样式类

```css
/* 导航容器 */
.mobile-tabs-nav { /* 底部标签导航样式 */ }
.drawer-backdrop { /* 抽屉背景遮罩 */ }
.mobile-top-navbar { /* 顶部导航栏 */ }

/* 手势反馈 */
.nav-gesture-feedback { /* 手势反馈指示器 */ }
.back-gesture-indicator { /* 返回手势指示器 */ }
.pull-refresh-indicator { /* 下拉刷新指示器 */ }

/* 动画效果 */
.tab-active-indicator { /* 标签激活动画 */ }
.nav-ripple { /* 波纹点击效果 */ }
.nav-transition { /* 导航切换动画 */ }
```

## 🔧 高级用法

### 自定义导航项

```tsx
// 在 NavigationProvider 中自定义导航项
const customNavigation = [
  { name: '首页', href: '/home', icon: Home },
  { name: '设置', href: '/settings', icon: Settings }
];
```

### 导航拦截器

```tsx
// 使用 useEffect 监听路由变化
useEffect(() => {
  const handleRouteChange = (url: string) => {
    // 自定义路由变化逻辑
    analytics.track('page_view', { url });
  };

  // 监听路由变化
  router.events.on('routeChangeComplete', handleRouteChange);
  
  return () => {
    router.events.off('routeChangeComplete', handleRouteChange);
  };
}, []);
```

### 性能优化

```tsx
// 懒加载导航组件
const NavigationSettings = lazy(() => import('./NavigationSettings'));

// 使用 Suspense 包装
<Suspense fallback={<LoadingSpinner />}>
  <NavigationSettings isOpen={showSettings} onClose={closeSettings} />
</Suspense>
```

## 📱 设备适配

### 移动设备
- **iPhone**: 完整支持 Face ID 安全区域
- **Android**: 支持手势导航和导航栏
- **小屏设备**: 自动启用紧凑模式

### 平板设备
- **iPad**: 混合导航模式（顶部+侧边）
- **Android 平板**: 响应式标签/抽屉切换
- **横屏模式**: 自动调整布局

### 桌面设备
- **鼠标交互**: 悬停效果和右键菜单
- **键盘导航**: 完整的 Tab 键导航支持
- **大屏优化**: 多列布局和扩展功能

## ♿ 无障碍支持

### 键盘导航
- `Tab` - 在导航项之间切换
- `Enter/Space` - 激活选中的导航项
- `Escape` - 关闭抽屉菜单
- `Arrow Keys` - 在标签之间移动

### 屏幕阅读器
- 完整的 ARIA 标签支持
- 语义化 HTML 结构
- 状态变化通知
- 页面标题自动更新

### 高对比度模式
- 自动检测系统设置
- 增强边框和颜色对比
- 去除装饰性动画

## 🐛 常见问题

### Q: 如何自定义导航项？
A: 修改 `NavigationProvider` 中的 `navigation` 数组，或使用自定义组件替换默认导航。

### Q: 如何禁用某些手势？
A: 使用 `useNavigationGestures` hook 的配置参数：
```tsx
useNavigationGestures({
  enableSwipeBack: false,
  enablePullToRefresh: false
});
```

### Q: 如何在 PWA 中使用？
A: 导航系统已内置 PWA 支持，包括安装提示和离线状态指示。

### Q: 性能考虑？
A: 组件使用了以下优化策略：
- 虚拟化长列表
- 懒加载非关键组件
- GPU 加速动画
- 防抖处理手势事件

## 📄 许可证

MIT License - 详见 LICENSE 文件。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

*此导航系统基于现代移动端设计原则，提供了完整的导航解决方案。*