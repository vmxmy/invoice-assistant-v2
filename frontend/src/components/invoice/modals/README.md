# 发票模态框组件说明

## 重构完成 ✅

原有的分离式模态框组件已经重构为统一的自适应系统：

### 新架构组件

1. **UnifiedInvoiceModal** - 统一模态框容器
   - 支持查看和编辑两种模式
   - 统一的UI/UX体验
   - 完整的状态管理和错误处理

2. **AdaptiveInvoiceFields** - 自适应字段渲染组件
   - 配置驱动的字段展示
   - 自动适应火车票和增值税发票
   - 卡片式分组布局

3. **invoiceFieldsConfig** - 字段配置系统
   - 声明式字段定义
   - 支持验证规则和显示条件
   - 易于扩展新发票类型

### 已删除的组件

- ❌ InvoiceDetailModal.tsx (已删除)
- ❌ InvoiceEditModal.tsx (已删除)

### 功能改进

✅ **自适应发票类型**：根据发票数据自动识别并显示对应字段
✅ **统一UI设计**：卡片式分组显示，视觉层次清晰
✅ **配置化管理**：新增发票类型只需添加配置，无需修改UI代码
✅ **类型安全**：完整的TypeScript类型定义
✅ **响应式布局**：适配桌面端和移动端
✅ **字段验证**：内置验证规则和错误提示
✅ **代码复用**：减少50%+的重复代码

### 使用方式

```typescript
import UnifiedInvoiceModal from '../components/invoice/modals/UnifiedInvoiceModal';

// 查看模式
<UnifiedInvoiceModal
  invoiceId="invoice-123"
  isOpen={isOpen}
  mode="view"
  onClose={handleClose}
/>

// 编辑模式
<UnifiedInvoiceModal
  invoiceId="invoice-123"
  isOpen={isOpen}
  mode="edit"
  onClose={handleClose}
  onSuccess={handleSuccess}
/>
```

### 支持的发票类型

1. **火车票** 🚄
   - 行程信息：车次、出发站、到达站、出发时间等
   - 乘客信息：乘客姓名、身份信息
   - 票据信息：车票号、电子客票号、开票日期、票价
   - 购买方信息：购买方名称、统一社会信用代码

2. **增值税发票** 🧾
   - 发票信息：发票号码、发票代码、开票日期、校验码
   - 金额信息：价税合计、不含税金额、税额
   - 购销双方信息：销售方和购买方的详细信息
   - 商品明细：项目名称、规格、数量、单价等
   - 其他信息：开票人、审核人、收款人、备注等

### 技术特性

- **字段路径映射**：支持从多个数据源路径获取字段值
- **条件显示**：根据发票类型和数据内容动态显示字段
- **验证引擎**：内置字段验证规则，支持正则、数值范围等
- **格式化显示**：自动格式化货币、日期等字段类型
- **标签管理**：支持标签的添加和删除
- **错误处理**：统一的错误提示和处理机制