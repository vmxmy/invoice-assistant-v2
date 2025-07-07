# 样式系统架构文档

本目录包含发票管理系统前端的所有样式相关文件。

## 目录结构

```
styles/
├── typography.css    # 字体系统配置
├── components.css    # 组件样式模块
├── themes.css       # 主题系统（亮色/暗色）
├── animations.css   # 动画系统配置
├── print.css        # 打印样式优化
└── README.md        # 本文档
```

## 样式模块说明

### typography.css
- **功能**：完整的字体系统配置
- **特性**：
  - 响应式字体大小（使用 `clamp()`）
  - 中英文混排优化
  - 专用字体类（金额、表格、标签等）
  - 无障碍性支持

### components.css
- **功能**：模块化的组件样式
- **包含**：
  - 按钮增强样式
  - 表单组件样式
  - 卡片和表格样式
  - 状态徽章样式
  - 模态框、标签页、下拉菜单等

### themes.css
- **功能**：主题系统配置
- **特性**：
  - 亮色主题（invoice-modern）
  - 暗色主题（invoice-dark）
  - 自动主题切换支持
  - 高对比度模式适配

### animations.css
- **功能**：统一的动画和过渡效果
- **包含**：
  - 页面过渡动画
  - 模态框和下拉菜单动画
  - 加载动画（脉冲、旋转、弹跳）
  - 悬浮和点击反馈效果
  - 减少动画偏好支持

### print.css
- **功能**：发票打印优化
- **特性**：
  - A4纸张适配
  - 页眉页脚配置
  - 表格打印优化
  - 批量打印支持
  - 打印预览提示

## 使用指南

### 1. 引入样式
所有样式通过 `src/index.css` 统一引入：
```css
@import "./styles/typography.css";
@import "./styles/components.css";
@import "./styles/themes.css";
@import "./styles/animations.css";
@import "./styles/print.css";
```

### 2. 使用组件样式
```jsx
// 按钮样式
<button className="btn btn-primary btn-lg hover-lift">
  确认
</button>

// 表单样式
<div className="form-group">
  <label className="form-label form-label-required">
    发票号码
  </label>
  <input className="input input-bordered" />
  <p className="form-help">请输入10位发票号码</p>
</div>

// 状态徽章
<span className="badge badge-status badge-completed">
  已完成
</span>
```

### 3. 主题切换
```jsx
// 切换主题
const toggleTheme = () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'invoice-modern' ? 'invoice-dark' : 'invoice-modern';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
};
```

### 4. 使用动画
```jsx
// 页面进入动画
<div className="page-enter">
  {/* 页面内容 */}
</div>

// 列表交错动画
<ul className="stagger-enter">
  {items.map(item => (
    <li key={item.id}>{item.name}</li>
  ))}
</ul>

// 加载动画
<div className="flex items-center gap-2">
  <div className="loading loading-spinner"></div>
  <span>加载中...</span>
</div>
```

### 5. 打印优化
```jsx
// 打印按钮（会在打印时隐藏）
<button className="btn no-print" onClick={handlePrint}>
  打印发票
</button>

// 发票容器（打印优化）
<div className="invoice-container">
  <div className="invoice-header">
    <h1 className="invoice-title">增值税普通发票</h1>
    <div className="invoice-number">No. 2024001234</div>
  </div>
  {/* 发票内容 */}
</div>
```

## 字体系统

### 核心特性
- **专业性**：Inter + Noto Sans SC 无衬线字体组合
- **国际化**：优秀的中英文混排效果
- **响应式**：基于 `clamp()` 函数的流式排版
- **无障碍**：符合 WCAG 对比度标准

### 字体栈
```css
--font-sans: "Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
--font-mono: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Consolas", monospace;
--font-display: "Inter", "Noto Sans SC", "PingFang SC", sans-serif;
```

### 工具类参考
- **字体族**：`.font-sans`, `.font-mono`, `.font-display`
- **字体尺寸**：`.text-xs` 到 `.text-5xl`
- **字重**：`.font-light` 到 `.font-bold`
- **行高**：`.leading-tight` 到 `.leading-loose`
- **字符间距**：`.tracking-tight` 到 `.tracking-wider`

## 最佳实践

### 1. 响应式设计
- 使用 Tailwind 的响应式前缀：`sm:`, `md:`, `lg:`, `xl:`
- 移动优先原则

### 2. 性能优化
- 使用 CSS 变量实现主题切换（避免重新加载样式）
- 动画使用 `transform` 和 `opacity`（GPU加速）
- 打印样式按需加载

### 3. 可访问性
- 保持足够的颜色对比度
- 支持键盘导航
- 提供 `prefers-reduced-motion` 支持

### 4. 维护性
- 遵循 BEM 命名约定
- 组件样式模块化
- 使用语义化的类名

## 自定义扩展

### 添加新主题
在 `themes.css` 中添加新的主题定义：
```css
@plugin "daisyui/theme" {
  name: "your-theme-name";
  /* 主题配置 */
}
```

### 添加新动画
在 `animations.css` 中定义：
```css
@keyframes yourAnimation {
  /* 关键帧 */
}

.your-animation-class {
  animation: yourAnimation 0.3s ease-out;
}
```

### 添加新组件样式
在 `components.css` 中按组件分组添加：
```css
/* ===========================================
   新组件名称
   ========================================= */

.new-component {
  /* 样式定义 */
}
```

## 故障排除

### 样式未生效
1. 检查是否正确引入样式文件
2. 确认 Tailwind 配置正确
3. 清除浏览器缓存

### 主题切换问题
1. 检查 `data-theme` 属性
2. 确认 localStorage 权限
3. 检查主题名称拼写

### 打印样式问题
1. 使用浏览器打印预览功能调试
2. 检查 `@media print` 规则
3. 确认 `.no-print` 类正确应用

## 更新日志

### v2.0.0 (2025-07-07)
- ✨ 模块化样式系统重构
- 🎨 添加组件样式模块
- 🌓 实现暗色主题支持
- 🎬 创建统一动画系统
- 🖨️ 优化打印样式
- 📚 更新完整文档

### v1.0.0 (2025-07-07)
- ✨ 初始版本发布
- 🎨 建立完整的字体系统
- 📱 实现响应式字体配置
- ♿ 添加无障碍性支持