# 手势操作系统使用指南

## 概述

本项目实现了完整的手势操作支持系统，为移动端应用提供现代化的触摸交互体验。系统包含滑动操作、下拉刷新、双指缩放、手势冲突管理、性能监控和无障碍支持等功能。

## 核心组件

### 1. 滑动操作 (SwipeableItem)

**功能**: 支持左右滑动显示快捷操作菜单

```typescript
import { SwipeableItem } from '@/components/mobile';

const leftActions = [
  {
    id: 'favorite',
    icon: <Star className="w-5 h-5" />,
    label: '收藏',
    backgroundColor: '#f59e0b',
    onAction: () => handleFavorite(),
  }
];

<SwipeableItem 
  leftActions={leftActions}
  rightActions={rightActions}
  enableHaptics={true}
>
  <YourContent />
</SwipeableItem>
```

**特性**:
- 支持左右滑动动作
- 可配置动作图标、颜色和回调
- 内置确认机制（危险操作）
- 触觉反馈支持
- 无障碍兼容

### 2. 增强下拉刷新 (EnhancedPullToRefresh)

**功能**: 提供高度可定制的下拉刷新体验

```typescript
import { EnhancedPullToRefresh } from '@/components/mobile';

<EnhancedPullToRefresh
  onRefresh={handleRefresh}
  indicator={{
    theme: 'gradient',
    size: 'medium',
    showProgress: true,
    animation: 'bounce'
  }}
>
  <YourScrollableContent />
</EnhancedPullToRefresh>
```

**特性**:
- 多种视觉主题（默认、简约、渐变、玻璃、霓虹）
- 自定义刷新指示器
- 进度显示和状态消息
- 手势冲突智能处理
- 性能优化

### 3. 双指缩放容器 (PinchZoomContainer)

**功能**: 支持双指缩放和旋转操作

```typescript
import { PinchZoomContainer } from '@/components/mobile';

<PinchZoomContainer
  minScale={0.5}
  maxScale={3}
  enableRotation={true}
  showControls={true}
  onZoomChange={(scale, rotation) => console.log(scale, rotation)}
>
  <YourZoomableContent />
</PinchZoomContainer>
```

**特性**:
- 双指缩放和旋转
- 边界约束和回弹
- 可选的控制按钮
- 双击缩放支持
- 辅助功能友好

### 4. 图片缩放查看器 (ZoomableView)

**功能**: 专门用于图片缩放查看

```typescript
import { ZoomableView } from '@/components/mobile';

<ZoomableView
  minScale={0.5}
  maxScale={4}
  resetOnDoubleTap={true}
  showZoomControls={true}
  enablePanOnZoom={true}
>
  <img src="your-image.jpg" alt="Zoomable image" />
</ZoomableView>
```

**特性**:
- 专为图片优化
- 智能边界约束
- 键盘快捷键支持
- 缩放指示器
- 流畅的动画效果

## 系统架构

### 手势冲突管理 (useGestureConflictManager)

**功能**: 智能处理多个手势间的冲突

```typescript
import { useGestureConflictManager } from '@/hooks/useGestureConflictManager';

const {
  registerGesture,
  unregisterGesture,
  isGestureActive
} = useGestureConflictManager({
  strategy: 'priority', // 优先级策略
  debugMode: false
});
```

**冲突解决策略**:
- **priority**: 基于优先级（推荐）
- **firstWins**: 先到先得
- **lastWins**: 后来居上
- **compatible**: 兼容模式
- **contextual**: 上下文感知

**手势优先级**（数字越小优先级越高）:
1. **pinch** - 双指缩放
2. **rotate** - 旋转
3. **pullToRefresh** - 下拉刷新
4. **drag** - 拖拽
5. **swipe** - 滑动
6. **longPress** - 长按
7. **tap** - 点击
8. **scroll** - 滚动

### 性能监控 (GesturePerformanceMonitor)

**功能**: 实时监控手势操作的性能表现

```typescript
import { useGesturePerformanceMonitor } from '@/utils/gesturePerformanceMonitor';

const { 
  startGesture, 
  updateGesture, 
  endGesture,
  getHealthScore 
} = useGesturePerformanceMonitor();

// 开始监控
startGesture('gesture-123', 'swipe', 1);

// 更新数据
updateGesture('gesture-123', { distance: 50, velocity: 0.8 });

// 结束监控
endGesture('gesture-123');

// 获取性能评分
const score = getHealthScore(); // 0-100分
```

**监控指标**:
- **帧率 (FPS)**: 目标60fps
- **内存使用**: 监控JS堆内存
- **手势持续时间**: 响应性能
- **掉帧统计**: 流畅度评估
- **错误率**: 稳定性指标

### 无障碍支持 (GestureAccessibilityHelper)

**功能**: 为所有手势提供无障碍访问

```typescript
import GestureAccessibilityHelper from '@/utils/gestureAccessibilityHelper';

const accessibilityHelper = new GestureAccessibilityHelper({
  enableScreenReader: true,
  enableKeyboardNav: true,
  enableHighContrast: false,
  language: 'zh-CN'
});

// 语音播报
accessibilityHelper.announceAction('滑动操作完成');

// 创建键盘替代方案
accessibilityHelper.createGestureAlternativeUI('pinch', containerElement);
```

**键盘快捷键**:
- **Ctrl + 加号**: 放大
- **Ctrl + 减号**: 缩小  
- **Ctrl + 0**: 重置缩放
- **方向键**: 导航项目
- **Enter**: 激活项目
- **Shift + Enter**: 长按操作
- **Ctrl + R**: 刷新
- **Escape**: 取消/返回
- **F1**: 显示帮助

## 最佳实践

### 1. 性能优化

```typescript
// ✅ 好的做法 - 使用RAF优化动画
const { schedule } = monitor.createRAFManager();
schedule(() => {
  updateUI();
}, 1); // 高优先级

// ✅ 好的做法 - 节流手势事件
const throttledUpdate = useCallback(
  throttle((data) => updateGesture(gestureId, data), 16),
  []
);

// ❌ 避免 - 在手势处理中进行重布局
onGesture={() => {
  element.style.width = '100px'; // 会触发重布局
}}
```

### 2. 手势冲突处理

```typescript
// ✅ 好的做法 - 明确手势优先级
const { registerGesture } = useGestureConflictManager({
  strategy: 'priority',
  customPriorities: {
    pinch: { priority: 1, exclusive: true },
    swipe: { priority: 5, exclusive: true }
  }
});

// ✅ 好的做法 - 注册和注销手势
useEffect(() => {
  const gestureId = registerGesture('my-gesture', 'swipe');
  return () => unregisterGesture('my-gesture');
}, []);
```

### 3. 无障碍兼容

```typescript
// ✅ 好的做法 - 提供语音反馈
onSwipeComplete={(action) => {
  accessibilityHelper.announceAction(`${action}操作完成`);
}}

// ✅ 好的做法 - 添加ARIA标签
<SwipeableItem
  aria-label="发票项目，支持左右滑动操作"
  role="listitem"
>
  <InvoiceCard />
</SwipeableItem>

// ✅ 好的做法 - 提供键盘替代方案  
accessibilityHelper.createGestureAlternativeUI('swipe', containerRef.current);
```

### 4. 用户体验

```typescript
// ✅ 好的做法 - 提供视觉反馈
<SwipeableItem
  showActionPreview={true}
  enableHaptics={true}
>
  <Content />
</SwipeableItem>

// ✅ 好的做法 - 合理设置阈值
<PinchZoomContainer
  minScale={0.5}    // 不要过小
  maxScale={3}      // 不要过大
  threshold={10}    // 适中的触发阈值
/>

// ✅ 好的做法 - 提供重置功能
<ZoomableView
  resetOnDoubleTap={true}
  showZoomControls={true}
/>
```

## 示例和演示

查看 `GestureExamples` 组件了解完整的使用示例:

```typescript
import { GestureExamples } from '@/components/mobile';

// 在你的应用中使用
<GestureExamples />
```

## 故障排除

### 1. 手势不响应

**可能原因**:
- 手势被其他手势阻止
- 元素没有正确的触摸事件处理
- CSS `touch-action` 属性设置不当

**解决方案**:
```css
.gesture-element {
  touch-action: manipulation; /* 允许手势操作 */
}
```

### 2. 性能问题

**可能原因**:
- 手势处理函数执行时间过长
- 频繁的DOM操作
- 内存泄漏

**解决方案**:
```typescript
// 使用性能监控定位问题
const healthScore = getHealthScore();
if (healthScore < 70) {
  const suggestions = getSuggestions();
  console.log('Performance suggestions:', suggestions);
}
```

### 3. 无障碍问题

**可能原因**:
- 缺少ARIA标签
- 没有键盘替代方案
- 语音播报不工作

**解决方案**:
```typescript
// 检查无障碍状态
const accessibilityState = accessibilityHelper.getAccessibilityState();
if (!accessibilityState.isScreenReaderActive) {
  // 启用替代方案
}
```

## 更新日志

### v2.0.0 (2024-01-24)
- ✨ 新增完整的手势操作系统
- ✨ 实现手势冲突智能管理
- ✨ 添加性能监控和优化
- ✨ 完善无障碍支持
- ✨ 提供完整的示例和文档

### 下一步计划
- 🔄 支持更多手势类型（三指手势等）
- 🔄 增加手势录制和回放功能
- 🔄 提供手势统计和分析面板
- 🔄 优化内存使用和垃圾回收

---

**联系方式**: 如有问题或建议，请通过项目Issues页面反馈。