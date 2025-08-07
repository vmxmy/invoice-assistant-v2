# 紧凑设计系统指南

发票助手应用的统一组件设计系统，专注于提供紧凑、高效、一致的用户界面体验。

## 🎯 设计理念

### 核心原则
1. **紧凑高效** - 最大化信息密度，减少空白浪费
2. **视觉一致** - 统一的组件尺寸、间距、配色方案
3. **移动优先** - 优先考虑移动端体验，桌面端增强
4. **可访问性** - 满足WCAG 2.1 AA标准，支持键盘导航
5. **渐进增强** - 基础功能稳定，高级功能锦上添花

### 设计语言特征
- **现代圆角** - 16px、12px、8px的圆角层级
- **柔和阴影** - 提供深度感但不过度突出  
- **渐变背景** - 微妙的渐变增加视觉层次
- **动效过渡** - 300ms ease-out标准过渡

## 📏 设计令牌 (Design Tokens)

### 间距系统
```css
--spacing-compact-xs: 4px   /* 最小间距 */
--spacing-compact-sm: 6px   /* 小间距 */
--spacing-compact-md: 8px   /* 标准间距 */
--spacing-compact-lg: 12px  /* 大间距 */
--spacing-compact-xl: 16px  /* 加大间距 */
--spacing-compact-2xl: 20px /* 超大间距 */
--spacing-compact-3xl: 24px /* 最大间距 */
--spacing-compact-4xl: 32px /* 区域间距 */
```

### 字体大小层级
```css
--text-xs-compact: 11px    /* 辅助文本 */
--text-sm-compact: 12px    /* 小号文本 */
--text-base-compact: 13px  /* 基础文本 */
--text-lg-compact: 14px    /* 强调文本 */
--text-xl-compact: 16px    /* 大号文本 */
```

### 组件高度标准
```css
--height-compact-xs: 24px   /* 超小组件 */
--height-compact-sm: 28px   /* 小组件 */
--height-compact-md: 32px   /* 标准组件 */
--height-compact-lg: 36px   /* 大组件 */
--height-compact-xl: 40px   /* 加大组件 */
--height-compact-2xl: 44px  /* 移动端触控优化 */
--height-compact-3xl: 48px  /* 最大组件 */
```

### 阴影层级
```css
--shadow-compact-sm: 0 1px 3px rgba(0, 0, 0, 0.06)     /* 轻微阴影 */
--shadow-compact-md: 0 2px 8px rgba(0, 0, 0, 0.08)     /* 标准阴影 */
--shadow-compact-lg: 0 4px 12px rgba(0, 0, 0, 0.1)     /* 明显阴影 */
--shadow-compact-hover: 0 6px 20px rgba(0, 0, 0, 0.12) /* 悬停阴影 */
```

## 🔧 组件系统

### 按钮系统

#### 紧凑按钮
```css
.btn-compact-xs   /* 24px高度，用于表格内嵌按钮 */
.btn-compact-sm   /* 28px高度，用于紧凑工具栏 */
.btn-compact-md   /* 32px高度，标准紧凑按钮 */
.btn-compact-lg   /* 36px高度，强调按钮 */
.btn-compact-touch /* 44px高度，移动端触控优化 */
```

#### 使用示例
```tsx
<button className="btn btn-compact-sm btn-primary">
  保存
</button>

<button className="btn btn-compact-touch btn-success">
  提交报销
</button>
```

### 徽章系统

#### 紧凑徽章
```css
.badge-compact-xs  /* 16px高度，最小徽章 */
.badge-compact-sm  /* 20px高度，标准小徽章 */  
.badge-compact-md  /* 24px高度，标准徽章 */
```

#### 状态徽章
```css
.status-badge-compact      /* 基础状态徽章 */
.status-badge-interactive  /* 可交互状态徽章 */
```

#### 使用示例
```tsx
<div className="badge badge-compact-sm badge-success">
  已报销
</div>

<div className="status-badge-compact status-badge-interactive badge-warning">
  待处理
</div>
```

### 卡片系统

#### 基础卡片
```css
.card-compact       /* 基础紧凑卡片 */
.card-compact-sm    /* 小卡片 (12px内边距) */
.card-compact-md    /* 标准卡片 (16px内边距) */
.card-compact-lg    /* 大卡片 (20px内边距) */
```

#### 发票专用卡片
```css
.invoice-card-compact  /* 发票卡片专用样式 */
.invoice-info-compact  /* 发票信息区域 */
.invoice-field-compact /* 发票字段行 */
```

#### 卡片结构组件
```css
.card-compact-header   /* 卡片头部 */
.card-compact-body     /* 卡片主体 */
.card-compact-footer   /* 卡片底部 */
```

### 输入框系统

#### 紧凑输入框
```css
.input-compact-sm  /* 32px高度小输入框 */
.input-compact-md  /* 36px高度标准输入框 */
.input-compact-lg  /* 40px高度大输入框 */
```

### 选择框系统

#### 紧凑选择框
```css
.invoice-checkbox-compact  /* 桌面端发票选择框 */
.invoice-checkbox-mobile   /* 移动端发票选择框 */
```

### 图标容器系统

#### 标准化图标容器
```css
.icon-container-compact-xs  /* 24px × 24px */
.icon-container-compact-sm  /* 28px × 28px */
.icon-container-compact-md  /* 32px × 32px */
.icon-container-compact-lg  /* 40px × 40px */
```

## 📱 响应式规则

### 移动端优化 (≤768px)
- 卡片内边距增大到16px
- 字体大小提升一级
- 徽章统一使用中等尺寸
- 选择框使用44px触控优化版本

### 桌面端优化 (≥1024px)
- 悬停效果增强
- 可以使用更紧凑的间距
- 支持更多交互状态

### 超大屏幕 (≥1920px)
- 卡片内边距可适当增大
- 字体大小保持可读性

## 🎨 主题颜色

### 状态色彩
```css
/* 成功状态 */
.text-success, .bg-success/10, .border-success/20

/* 警告状态 */
.text-warning, .bg-warning/10, .border-warning/20

/* 错误状态 */  
.text-error, .bg-error/10, .border-error/20

/* 信息状态 */
.text-info, .bg-info/10, .border-info/20

/* 主色调 */
.text-primary, .bg-primary/10, .border-primary/20
```

### 背景渐变
```css
/* 主题渐变 */
from-primary/10 to-primary/5

/* 成功渐变 */
from-success/10 to-success/5

/* 警告渐变 */
from-warning/10 to-warning/5

/* 错误渐变 */
from-error/10 to-error/5
```

## 🌟 动效系统

### 基础动效类
```css
.compact-hover-lift    /* 悬停上升效果 */
.compact-scale-press   /* 按压缩放效果 */
.compact-fade-in       /* 淡入动画 */
```

### 过渡时间
- **快速**: 150ms - 按钮按下、小交互
- **标准**: 300ms - 悬停状态、卡片切换  
- **缓慢**: 500ms - 页面转场、复杂动画

## ♿ 可访问性

### 焦点管理
```css
.compact-focus-ring  /* 统一的焦点环样式 */
```

### 触控目标
- 移动端最小触控目标44px × 44px
- 桌面端最小可点击区域32px × 32px
- 重要操作按钮建议48px × 48px

### 色彩对比
- 正文文本对比度 ≥ 4.5:1
- 大号文本对比度 ≥ 3:1  
- 图形元素对比度 ≥ 3:1

### 屏幕阅读器支持
- 合理的语义结构
- 有意义的alt文本
- 适当的ARIA标签

## 🛠️ 使用指南

### 1. 导入设计系统
```css
@import './styles/compact-design-system.css';
```

### 2. 基础卡片结构
```tsx
<div className="card-compact card-compact-md">
  <div className="card-compact-header">
    <h3>标题</h3>
    <button className="btn btn-compact-sm">操作</button>
  </div>
  
  <div className="card-compact-body">
    <p>内容区域</p>
  </div>
  
  <div className="card-compact-footer">
    <span>底部信息</span>
  </div>
</div>
```

### 3. 发票卡片结构  
```tsx
<div className="invoice-card-compact">
  <div className="invoice-info-compact">
    <div className="invoice-field-compact">
      <span className="field-label">发票号码</span>
      <span className="field-value">12345678</span>
    </div>
  </div>
</div>
```

### 4. 响应式按钮
```tsx
<button className={`
  btn btn-primary
  ${device.isMobile ? 'btn-compact-touch' : 'btn-compact-md'}
`}>
  提交
</button>
```

## 📋 最佳实践

### DO ✅
- 使用统一的间距令牌
- 遵循组件尺寸标准
- 保持视觉层次一致
- 优先考虑移动端体验
- 提供清晰的视觉反馈

### DON'T ❌ 
- 不要使用任意的自定义间距
- 不要混合不同的设计风格
- 不要忽略可访问性要求
- 不要在移动端使用过小的触控目标
- 不要使用过于复杂的动画

## 📦 组件清单

### 基础组件
- [x] 紧凑按钮系统
- [x] 紧凑徽章系统  
- [x] 紧凑卡片系统
- [x] 紧凑输入框系统
- [x] 图标容器系统

### 专用组件
- [x] 发票卡片组件
- [x] 响应式指标卡
- [x] 状态徽章组件
- [x] 操作菜单组件

### 布局组件
- [x] 响应式网格
- [x] 移动端指标网格
- [x] 紧凑布局容器

## 📈 未来规划

### 近期 (1-2周)
- [ ] 表格组件紧凑化
- [ ] 模态框组件优化
- [ ] 表单组件统一

### 中期 (1个月)
- [ ] 暗色主题支持
- [ ] 更多动效细节
- [ ] 组件文档完善

### 长期 (3个月)
- [ ] 设计令牌自动化
- [ ] 组件库独立化
- [ ] 性能优化专项

---

## 📞 支持

如有疑问或建议，请参考：
- 组件使用示例: `/src/components/invoice/`
- 样式文件: `/src/styles/compact-design-system.css`
- 设计规范讨论: 项目issue或团队沟通群