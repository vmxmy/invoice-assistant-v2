# 高性能移动端动画系统

一套完整的React动画系统，专为移动设备优化，提供60fps流畅体验，支持用户偏好和无障碍访问。

## 🚀 特性

- **60fps流畅动画** - GPU加速的高性能动画
- **自适应性能** - 根据设备性能自动调整
- **用户偏好支持** - 遵循`prefers-reduced-motion`设置
- **无障碍访问** - 完整的无障碍访问支持
- **移动端优化** - 专为触摸设备设计
- **性能监控** - 实时监控动画性能
- **TypeScript支持** - 完整的类型定义

## 📦 安装

```bash
# 确保已安装依赖
npm install framer-motion react react-dom
```

## 🎯 快速开始

### 1. 设置动画提供者

```tsx
import { AnimationProvider } from './animations/AnimationProvider';

function App() {
  return (
    <AnimationProvider fallbackToCSS={true} debugMode={false}>
      <YourApp />
    </AnimationProvider>
  );
}
```

### 2. 使用动画组件

```tsx
import { 
  AnimatedButton, 
  AnimatedCard, 
  PageTransitions 
} from './animations';

function MyComponent() {
  return (
    <PageTransitions config={{ type: 'slideHorizontal' }}>
      <AnimatedCard interactive elevated>
        <h3>交互式卡片</h3>
        <AnimatedButton variant="primary" onClick={handleClick}>
          点击我
        </AnimatedButton>
      </AnimatedCard>
    </PageTransitions>
  );
}
```

## 🎨 动画组件

### 页面切换动画

```tsx
import { PageTransitions, usePageTransition } from './animations';

// 基本使用
<PageTransitions config={{ type: 'slideHorizontal' }}>
  {children}
</PageTransitions>

// 编程式导航
const { navigateWithTransition } = usePageTransition();
navigateWithTransition('/dashboard', 'forward');
```

支持的切换类型：
- `slideHorizontal` - iOS风格水平滑动
- `slideVertical` - Material Design风格垂直滑动
- `fade` - 淡入淡出
- `scale` - 缩放切换

### 列表动画

```tsx
import { AnimatedList, AddItemAnimation } from './animations';

const items = [
  { id: '1', content: <div>项目 1</div> },
  { id: '2', content: <div>项目 2</div> }
];

<AnimatedList
  items={items}
  config={{
    type: 'staggered',
    enableReordering: true
  }}
  onItemRemove={handleRemove}
  renderItem={(item, index) => <div>{item.content}</div>}
/>
```

### 按钮和微交互

```tsx
import { AnimatedButton, RippleButton } from './animations';

// 基础动画按钮
<AnimatedButton 
  variant="primary" 
  loading={loading}
  hapticFeedback={true}
  onClick={handleClick}
>
  确认操作
</AnimatedButton>

// 水波纹按钮
<RippleButton onClick={handleClick}>
  点击产生波纹
</RippleButton>
```

### 加载状态动画

```tsx
import { 
  LoadingIndicator, 
  Skeleton, 
  LoadingState 
} from './animations';

// 加载指示器
<LoadingIndicator type="spinner" size="large" />
<LoadingIndicator type="dots" size="medium" />
<LoadingIndicator type="wave" size="small" />

// 骨架屏
<Skeleton config={{
  lines: 4,
  avatar: true,
  showShimmer: true
}} />

// 状态管理
<LoadingState
  state={loadingState}
  loadingText="正在处理..."
  successText="处理成功"
  errorText="处理失败"
  onRetry={handleRetry}
>
  <YourContent />
</LoadingState>
```

### 表单动画

```tsx
import { 
  AnimatedInput, 
  AnimatedToggle, 
  FeedbackToast 
} from './animations';

<AnimatedInput
  placeholder="请输入姓名"
  value={name}
  onChange={setName}
  error={nameError}
  success={nameValid}
/>

<AnimatedToggle
  checked={enabled}
  onChange={setEnabled}
  size="medium"
/>

<FeedbackToast
  type="success"
  message="操作成功"
  visible={showToast}
  onClose={() => setShowToast(false)}
/>
```

## ⚙️ 配置和偏好

### 使用动画上下文

```tsx
import { useAnimationContext } from './animations/AnimationProvider';

function MyComponent() {
  const {
    preferences,
    updatePreferences,
    isAnimationEnabled,
    shouldUseSimpleAnimations,
    performanceData
  } = useAnimationContext();

  // 检查特定动画是否启用
  if (!isAnimationEnabled('page')) {
    return <StaticComponent />;
  }

  // 根据性能调整
  const duration = shouldUseSimpleAnimations ? 0.2 : 0.5;

  return <AnimatedComponent duration={duration} />;
}
```

### 动画偏好设置

```tsx
import { AnimationSettings } from './components/settings/AnimationSettings';

// 提供完整的设置界面
<AnimationSettings />

// 手动更新偏好
const { updatePreferences } = useAnimationContext();

updatePreferences({
  performanceLevel: 'high',
  animationScale: 1.2,
  reduceMotion: false,
  enableHapticFeedback: true
});
```

### 性能监控

```tsx
import { useAnimationStatus } from './animations/AnimationProvider';

function PerformanceIndicator() {
  const status = useAnimationStatus();
  
  return (
    <div className={`performance-${status.level}`}>
      {status.message} (FPS: {status.fps})
    </div>
  );
}
```

## 🎛️ 高级配置

### 自定义动画变体

```tsx
import { animationSystem } from './animations/animationSystem';

const customVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 }
};

const config = animationSystem.getOptimizedConfig('button', customVariants);

<motion.div {...config}>
  自定义动画
</motion.div>
```

### 性能优化建议

```tsx
import { PerformanceRecommendations } from './animations';

const recommendations = PerformanceRecommendations.getRecommendations();
const advice = PerformanceRecommendations.getAdvice(performanceData);
```

### CSS类名使用

```css
/* 基础GPU优化类 */
.gpu-optimized {
  will-change: transform, opacity;
  backface-visibility: hidden;
  perspective: 1000px;
}

/* 过渡优化 */
.transition-optimized {
  transition-duration: calc(var(--animation-normal) * var(--animation-scale));
  transition-timing-function: var(--ease-smooth);
}

/* 按钮动画 */
.button-press:active {
  transform: scale(0.95) translateZ(0);
}

/* 卡片悬浮 */
.card-hover:hover {
  transform: translateY(-4px) scale(1.02) translateZ(0);
}
```

## 📱 移动端优化

### 触觉反馈

```tsx
// 自动检测支持并启用触觉反馈
<AnimatedButton hapticFeedback={true}>
  支持振动反馈
</AnimatedButton>
```

### 手势支持

```tsx
import { SwipeNavigation } from './animations/PageTransitions';

<SwipeNavigation
  onSwipeLeft={() => navigate('/next')}
  onSwipeRight={() => navigate('/prev')}
  threshold={50}
>
  <YourContent />
</SwipeNavigation>
```

### 性能自适应

系统会自动：
- 检测设备性能并调整动画复杂度
- 监控帧率并在性能不足时降级
- 根据电池状态优化动画
- 在后台时暂停动画

## 🔧 调试和开发

### 开发模式

```tsx
<AnimationProvider debugMode={true}>
  {/* 显示性能指标和动画边界 */}
</AnimationProvider>
```

### 性能指标

- 在开发者工具中查看动画性能
- 实时FPS监控
- GPU使用情况
- 动画降级日志

### 测试动画

```tsx
// 演示页面
import { AnimationDemoPage } from './pages/AnimationDemoPage';

// 访问 /animation-demo 查看所有动画效果
```

## 🌐 无障碍访问

系统自动支持：
- `prefers-reduced-motion` 设置
- 高对比度模式
- 屏幕阅读器友好
- 键盘导航优化

## 📋 最佳实践

1. **性能优先**：始终使用GPU加速属性（transform, opacity）
2. **渐进增强**：提供无动画的回退方案
3. **用户控制**：允许用户调整或禁用动画
4. **测试设备**：在低端设备上测试性能
5. **监控指标**：关注FPS和用户体验指标

## 🤝 贡献

1. Fork 项目
2. 创建功能分支
3. 提交变更
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License