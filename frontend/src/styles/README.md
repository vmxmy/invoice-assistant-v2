# 现代字体系统使用指南

## 概述

本字体系统为发票管理系统量身设计，基于现代 UI 设计最佳实践，提供优秀的中英文混排体验和数据密集型应用的可读性优化。

## 核心特性

### 🎯 专业性
- **Inter + Noto Sans SC** 无衬线字体组合，确保专业外观
- 针对数据密集型应用优化，提升长时间阅读舒适度
- 等宽数字字体，确保金额和数据对齐美观

### 🌍 国际化
- 优秀的中英文混排效果
- 字面大小(x-height)视觉平衡
- 支持多种系统字体回退方案

### 📱 响应式
- 基于 `clamp()` 函数的流式排版
- 自动适配不同屏幕尺寸
- 移动优先的设计思路

### ♿ 无障碍
- 符合 WCAG 对比度标准
- 支持系统字体偏好设置
- 高对比度模式适配

## 文件结构

```
styles/
├── typography.css    # 字体系统核心配置
└── README.md        # 使用指南 (本文件)
```

## 字体配置

### 主要字体栈
```css
--font-sans: "Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", 
             "WenQuanYi Micro Hei", system-ui, sans-serif;
```

### 等宽字体栈
```css
--font-mono: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", 
             "Consolas", monospace;
```

## 使用方法

### 1. 标题层级

```jsx
// React/JSX 示例
<h1 className="text-4xl font-bold">主标题</h1>
<h2 className="text-3xl font-semibold">副标题</h2>
<h3 className="text-2xl font-semibold">三级标题</h3>
<h4 className="text-xl font-medium">四级标题</h4>
```

### 2. 正文内容

```jsx
<p className="text-base leading-normal">
  标准正文内容，适合大部分文本场景
</p>

<p className="text-sm leading-relaxed text-base-content/80">
  次要信息，稍小的字号和更宽松的行高
</p>
```

### 3. 数字和金额

```jsx
{/* 金额显示 */}
<span className="amount text-lg">¥12,345.67</span>

{/* 发票号码 */}
<span className="invoice-number">25449165860000541164</span>

{/* 普通数字 */}
<span className="numeric">2025-07-07 15:30:45</span>
```

### 4. 表格样式

```jsx
<table className="table table-zebra">
  <thead>
    <tr className="table-header">
      <th>标题</th>
    </tr>
  </thead>
  <tbody className="table-text">
    <tr>
      <td className="amount">¥1,234.56</td>
    </tr>
  </tbody>
</table>
```

### 5. UI 组件

```jsx
{/* 标签文字 */}
<label className="label-text">销售方名称</label>

{/* 帮助提示 */}
<span className="help-text">支持中英文输入</span>

{/* 按钮文字 */}
<button className="btn btn-primary btn-text">确认操作</button>

{/* 状态徽章 */}
<span className="badge badge-success badge-text">已完成</span>
```

## 工具类参考

### 字体族
- `.font-sans` - 无衬线字体（默认）
- `.font-mono` - 等宽字体
- `.font-display` - 显示字体（标题用）

### 字体尺寸
- `.text-xs` - 超小字号 (12-13px)
- `.text-sm` - 小字号 (14-15px)
- `.text-base` - 基础字号 (16-18px)
- `.text-lg` - 大字号 (18-20px)
- `.text-xl` - 超大字号 (20-22px)
- `.text-2xl` - 二级标题 (24-29px)
- `.text-3xl` - 一级标题 (30-35px)
- `.text-4xl` - 主标题 (36-42px)

### 字重
- `.font-light` - 轻细 (300)
- `.font-normal` - 常规 (400)
- `.font-medium` - 中等 (500)
- `.font-semibold` - 半粗 (600)
- `.font-bold` - 加粗 (700)

### 行高
- `.leading-tight` - 紧密行高 (1.25)
- `.leading-snug` - 舒适行高 (1.375)
- `.leading-normal` - 标准行高 (1.5)
- `.leading-relaxed` - 宽松行高 (1.625)

### 字符间距
- `.tracking-tight` - 紧密间距 (-0.025em)
- `.tracking-normal` - 标准间距 (0)
- `.tracking-wide` - 宽松间距 (0.025em)

## 最佳实践

### ✅ 推荐做法

1. **统一使用字体变量**
   ```css
   /* 好 */
   font-family: var(--font-sans);
   
   /* 不推荐 */
   font-family: "Inter", sans-serif;
   ```

2. **数字使用等宽字体**
   ```jsx
   {/* 好 - 数字对齐美观 */}
   <td className="amount">¥1,234.56</td>
   
   {/* 不推荐 - 数字宽度不一致 */}
   <td>¥1,234.56</td>
   ```

3. **合理使用字重层级**
   ```jsx
   {/* 好 - 清晰的视觉层级 */}
   <h3 className="font-semibold">重要标题</h3>
   <p className="font-normal">正文内容</p>
   <span className="font-medium">强调文字</span>
   ```

### ❌ 避免的做法

1. **不要混用多种字体**
2. **不要在小字号使用过粗字重**
3. **不要忽略行高设置**
4. **不要使用过于紧密的字符间距**

## 性能优化

### 字体加载策略

1. **预加载关键字体**
   ```html
   <link rel="preload" href="fonts/Inter-Variable.woff2" as="font" type="font/woff2" crossorigin>
   ```

2. **字体显示策略**
   ```css
   @font-face {
     font-display: swap; /* 确保文字立即显示 */
   }
   ```

## 兼容性

### 浏览器支持
- Chrome 88+
- Firefox 75+
- Safari 14+
- Edge 88+

### 系统字体回退
- macOS: PingFang SC
- Windows: Microsoft YaHei
- Linux: WenQuanYi Micro Hei

## 演示组件

查看 `components/FontDemo.tsx` 了解完整的字体系统演示效果。

## 更新日志

### v1.0.0 (2025-07-07)
- ✨ 初始版本发布
- 🎨 建立完整的字体系统
- 📱 实现响应式字体配置
- ♿ 添加无障碍性支持
- 📚 完善使用文档