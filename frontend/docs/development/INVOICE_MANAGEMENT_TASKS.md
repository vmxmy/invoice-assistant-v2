# 发票管理系统前端开发任务文档

> 本文档详细规划了发票管理页面的功能完善任务，基于 Vite + React + DaisyUI 5.0.43 + TypeScript 技术栈。

## 目录

1. [项目概述](#项目概述)
2. [开发任务清单](#开发任务清单)
3. [阶段1：核心功能实现](#阶段1核心功能实现)
4. [阶段2：搜索筛选优化](#阶段2搜索筛选优化)
5. [阶段3：用户体验提升](#阶段3用户体验提升)
6. [阶段4：高级功能](#阶段4高级功能)
7. [验收标准](#验收标准)
8. [技术规范](#技术规范)

## 项目概述

### 技术栈
- **构建工具**: Vite 7.0.0
- **UI框架**: React 19.1.0
- **类型系统**: TypeScript 5.8.3
- **UI组件库**: DaisyUI 5.0.43 + TailwindCSS 4.1.11
- **状态管理**: React Query 5.81.5
- **路由管理**: React Router DOM 7.6.3
- **后端服务**: Supabase 2.50.3

### 项目结构
```
frontend/src/
├── components/          # 可复用组件
├── contexts/           # Context状态管理
├── hooks/             # 自定义Hook
├── pages/             # 页面组件
├── services/          # API服务
├── types/             # TypeScript类型定义
└── utils/             # 工具函数
```

## 开发任务清单

### 优先级定义
- 🔴 **高优先级 (P0)**: 核心功能，影响基本使用
- 🟡 **中优先级 (P1)**: 提升用户体验的功能
- 🟢 **低优先级 (P2)**: 锦上添花的功能

### 任务概览
| 任务ID | 任务名称 | 优先级 | 预计工时 | 依赖关系 |
|--------|---------|--------|----------|----------|
| T1.1 | 发票详情查看模态框 | 🔴 P0 | 4h | - |
| T1.2 | 发票编辑功能 | 🔴 P0 | 6h | T1.1 |
| T1.3 | 发票删除功能 | 🔴 P0 | 3h | T1.1 |
| T1.4 | Toast通知系统 | 🔴 P0 | 2h | - |
| T2.1 | 高级搜索组件 | 🟡 P1 | 5h | - |
| T2.2 | 筛选器组件 | 🟡 P1 | 4h | T2.1 |
| T3.1 | 操作反馈优化 | 🟡 P1 | 3h | T1.4 |
| T3.2 | 响应式设计完善 | 🟡 P1 | 4h | - |
| T4.1 | 导出功能 | 🟢 P2 | 5h | - |
| T4.2 | 性能优化 | 🟢 P2 | 6h | - |

## 阶段1：核心功能实现

### T1.1 发票详情查看模态框

#### 功能描述
实现点击发票列表中的"查看"按钮，弹出模态框展示发票详细信息。

#### 技术实现
```tsx
// 使用 DaisyUI 5.0 的 dialog 元素
interface InvoiceDetailModalProps {
  invoiceId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// 主要功能点：
1. 使用 useInvoice hook 获取发票详情
2. 加载状态使用 skeleton 组件
3. 错误状态展示友好提示
4. 支持键盘操作（ESC关闭）
5. 响应式设计（移动端modal-bottom）
```

#### 验收标准
- [ ] 点击查看按钮能正确打开模态框
- [ ] 发票信息完整展示（发票号、日期、金额、销售方、购买方等）
- [ ] 加载和错误状态处理正确
- [ ] ESC键能关闭模态框
- [ ] 移动端显示正常

### T1.2 发票编辑功能

#### 功能描述
实现发票信息的编辑功能，包括表单验证和提交处理。

#### 技术实现
```tsx
// 编辑表单组件结构
interface InvoiceEditModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// 表单字段：
- 发票号码 (必填，唯一性验证)
- 开票日期 (必填，日期格式验证)
- 销售方名称 (必填)
- 购买方名称 (必填)
- 发票金额 (必填，数字验证)
- 标签 (可选，多选)
```

#### 表单验证规则
1. **发票号码**: 
   - 必填
   - 格式验证（支持数字和字母）
   - 唯一性验证（调用后端API）

2. **金额验证**:
   - 必须为正数
   - 最多2位小数
   - 范围：0.01 - 9999999.99

3. **日期验证**:
   - 不能晚于当前日期
   - 格式：YYYY-MM-DD

#### 验收标准
- [ ] 表单所有字段可正常输入
- [ ] 验证规则生效并显示错误提示
- [ ] 提交成功后刷新列表数据
- [ ] 提交失败显示具体错误信息
- [ ] 表单重置功能正常

### T1.3 发票删除功能

#### 功能描述
实现单个和批量删除发票的功能，包含确认对话框。

#### 技术实现
```tsx
// 删除确认对话框
interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  invoiceCount: number;
  invoiceNumbers?: string[];
}

// 功能要点：
1. 单个删除：显示具体发票号
2. 批量删除：显示选中数量
3. 危险操作使用 btn-error 样式
4. 删除成功后刷新列表
```

#### 验收标准
- [ ] 删除确认对话框正常显示
- [ ] 确认删除后数据正确删除
- [ ] 取消操作不影响数据
- [ ] 批量删除功能正常
- [ ] 删除后列表自动刷新

### T1.4 Toast通知系统

#### 功能描述
集成 react-hot-toast 并配置 DaisyUI 样式，为所有操作提供反馈。

#### 技术实现
```tsx
// 通知工具函数
export const notify = {
  success: (message: string) => {
    toast.custom((t) => (
      <div className="alert alert-success">
        <span>{message}</span>
      </div>
    ));
  },
  error: (message: string) => {
    toast.custom((t) => (
      <div className="alert alert-error">
        <span>{message}</span>
      </div>
    ));
  },
  // ... 其他类型
};
```

#### 验收标准
- [ ] 成功操作显示绿色提示
- [ ] 失败操作显示红色提示
- [ ] 通知3秒后自动消失
- [ ] 可手动关闭通知
- [ ] 多个通知正确堆叠

## 阶段2：搜索筛选优化

### T2.1 高级搜索组件

#### 功能描述
实现支持多字段搜索的高级搜索面板。

#### 搜索字段
1. **文本搜索**
   - 发票号码（精确匹配）
   - 销售方名称（模糊匹配）
   - 购买方名称（模糊匹配）

2. **范围搜索**
   - 金额范围（最小值-最大值）
   - 日期范围（开始日期-结束日期）

3. **状态筛选**
   - 处理状态（多选）
   - 来源类型（多选）

#### 技术实现
```tsx
// 使用 Drawer 组件
interface AdvancedSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filters: SearchFilters) => void;
  currentFilters: SearchFilters;
}

// 搜索条件数据结构
interface SearchFilters {
  invoiceNumber?: string;
  sellerName?: string;
  buyerName?: string;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  source?: string[];
}
```

#### 验收标准
- [ ] 抽屉从右侧滑出动画流畅
- [ ] 所有搜索字段可正常输入
- [ ] 搜索条件可保存和清除
- [ ] 搜索结果实时更新
- [ ] 移动端适配良好

### T2.2 筛选器组件

#### 功能描述
实现快速筛选功能，筛选条件可视化展示。

#### 技术实现
```tsx
// 筛选标签展示
interface FilterPanelProps {
  filters: ActiveFilters;
  onRemoveFilter: (filterKey: string) => void;
  onClearAll: () => void;
}

// 筛选条件可视化
<div className="flex flex-wrap gap-2">
  {filters.map(filter => (
    <div className="badge badge-primary gap-2">
      <span>{filter.label}: {filter.value}</span>
      <button className="btn btn-xs btn-circle">×</button>
    </div>
  ))}
</div>
```

#### 验收标准
- [ ] 筛选条件正确显示为标签
- [ ] 可单独移除每个筛选条件
- [ ] 一键清除所有筛选
- [ ] 筛选变化实时反映到列表

## 阶段3：用户体验提升

### T3.1 操作反馈优化

#### 功能要求
1. **加载状态**
   - 使用 skeleton 加载占位
   - 按钮显示 loading 状态
   - 防止重复提交

2. **错误处理**
   - 网络错误友好提示
   - 表单验证错误定位
   - 提供重试机制

3. **成功反馈**
   - 操作成功动画
   - 自动关闭模态框
   - 列表数据实时更新

### T3.2 响应式设计完善

#### 断点设计
```scss
// DaisyUI 5.0 响应式断点
sm: 640px   // 平板竖屏
md: 768px   // 平板横屏  
lg: 1024px  // 桌面
xl: 1280px  // 大屏幕
2xl: 1536px // 超大屏幕
```

#### 移动端优化
1. **列表视图**
   - 卡片式布局
   - 关键信息优先展示
   - 滑动操作支持

2. **模态框**
   - 使用 modal-bottom
   - 全屏高度
   - 手势关闭支持

3. **操作按钮**
   - 底部固定操作栏
   - 按钮尺寸加大（btn-md）
   - 间距适当增加

## 阶段4：高级功能

### T4.1 导出功能

#### 导出格式
1. **Excel导出**
   - 包含所有字段
   - 支持筛选结果导出
   - 自定义列选择

2. **PDF导出**
   - 单个发票详情
   - 批量发票清单
   - 包含企业信息

#### 技术实现
```tsx
// 导出配置界面
interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInvoices: string[];
  filters: SearchFilters;
}

// 导出选项
interface ExportOptions {
  format: 'excel' | 'pdf';
  columns: string[];
  includeFiltered: boolean;
  dateRange?: [string, string];
}
```

### T4.2 性能优化

#### 优化策略
1. **列表虚拟化**
   ```tsx
   // 使用 react-window
   import { FixedSizeList } from 'react-window';
   
   // 保持 DaisyUI 样式
   const Row = ({ index, style }) => (
     <div style={style} className="border-b border-base-300">
       {/* 发票行内容 */}
     </div>
   );
   ```

2. **组件懒加载**
   ```tsx
   const InvoiceDetailModal = lazy(() => 
     import('./modals/InvoiceDetailModal')
   );
   ```

3. **查询优化**
   - 防抖搜索输入
   - 缓存筛选结果
   - 分页预加载

## 验收标准

### 功能验收
- [ ] 所有核心功能正常工作
- [ ] 数据展示准确无误
- [ ] 操作流程符合预期
- [ ] 错误处理机制完善

### 性能验收
- [ ] 列表加载时间 < 2秒
- [ ] 搜索响应时间 < 500ms
- [ ] 页面切换流畅无卡顿
- [ ] 内存使用稳定

### 用户体验验收
- [ ] 界面美观一致
- [ ] 交互反馈及时
- [ ] 移动端体验良好
- [ ] 无障碍支持完善

### 代码质量验收
- [ ] TypeScript类型完整
- [ ] 组件复用性高
- [ ] 代码注释清晰
- [ ] 单元测试覆盖

## 技术规范

### 代码规范
1. **命名规范**
   - 组件：PascalCase
   - 函数：camelCase
   - 常量：UPPER_SNAKE_CASE
   - 文件：组件同名

2. **TypeScript规范**
   - 严格模式启用
   - 避免使用 any
   - 接口优于类型别名
   - 导出类型定义

3. **组件规范**
   - 单一职责原则
   - Props 接口定义
   - 默认值处理
   - Memo 优化

### Git提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具
```

### 测试要求
1. **单元测试**
   - 工具函数 100% 覆盖
   - 组件核心逻辑覆盖
   - Hook 测试完整

2. **集成测试**
   - 用户流程测试
   - API 集成测试
   - 错误场景测试

---

## 下一步行动

1. 按优先级顺序开始实现任务
2. 每完成一个任务进行代码审查
3. 及时更新文档和测试用例
4. 定期与团队同步进度

> 最后更新时间：2024-01-07