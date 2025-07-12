# 发票详情页和编辑模态框更新记录

## 更新时间
2025-07-12

## 更新内容

### 1. 发票详情模态框 (InvoiceDetailModal.tsx)

新增显示的发票核心信息字段：

#### 增值税发票专有字段
- **发票代码** (invoice_code) - 显示在发票号码旁边
- **销售方纳税人识别号** (seller_tax_number) - 显示在销售方名称下方
- **购买方纳税人识别号** (buyer_tax_number) - 显示在购买方名称下方
- **不含税金额** (amount_without_tax) - 显示在发票金额下方
- **税额** (tax_amount) - 显示在不含税金额下方

#### 通用附加信息
- **发票备注** (remarks) - 来自OCR识别的发票备注信息
- **文件名** (file_name) - 上传的文件名
- **OCR置信度** (ocr_confidence_score) - 以百分比形式显示
- **验证状态** (is_verified) - 显示"已验证"或"未验证"
- **更新时间** (updated_at) - 显示最后更新时间

### 2. 发票编辑模态框 (InvoiceEditModal.tsx)

新增可编辑的字段：

#### 增值税发票专有字段（仅在invoice_type !== '火车票'时显示）
- **发票代码** (invoice_code)
- **销售方纳税人识别号** (seller_tax_number)
- **购买方纳税人识别号** (buyer_tax_number)
- **不含税金额** (amount_without_tax)
- **税额** (tax_amount)
- **发票备注** (remarks)

### 3. 类型定义更新 (types/index.ts)

在Invoice接口中新增字段：
```typescript
export interface Invoice {
  // ... 原有字段
  invoice_code?: string            // 发票代码
  seller_tax_number?: string       // 销售方纳税人识别号
  buyer_tax_number?: string        // 购买方纳税人识别号
  amount_without_tax?: number      // 不含税金额
  tax_amount?: number              // 税额
  remarks?: string                 // 发票备注（来自OCR）
  file_name?: string               // 文件名
  file_path?: string               // 文件路径
  ocr_confidence_score?: number    // OCR置信度分数
  is_verified?: boolean            // 是否已验证
  verified_at?: string             // 验证时间
}
```

### 4. 后端API更新 (invoices.py)

#### InvoiceUpdateRequest 新增字段
- amount_without_tax
- notes
- remarks

#### InvoiceDetail 响应模型新增字段
- amount_without_tax
- file_name
- ocr_confidence_score
- notes
- remarks

## 功能特点

### 1. 发票类型自适应
- 根据 `invoice.invoice_type` 自动显示/隐藏相应字段
- 火车票不显示税务相关字段（发票代码、纳税人识别号、税额等）
- 增值税发票显示完整的税务信息

### 2. 条件渲染
- 所有可选字段都使用条件渲染，只在有值时显示
- OCR置信度以百分比形式显示，保留一位小数
- 验证状态使用不同颜色标识（已验证为绿色，未验证为黄色）

### 3. 表单验证
- 编辑模态框保留原有的必填字段验证
- 新增字段均为可选字段，不影响原有验证逻辑
- 金额字段支持两位小数输入

## 使用说明

1. **查看发票详情**
   - 点击发票列表中的某个发票，打开详情模态框
   - 可以看到所有核心信息，包括OCR识别的完整数据
   - 支持下载和编辑操作

2. **编辑发票**
   - 在详情模态框中点击"编辑"按钮
   - 根据发票类型显示相应的可编辑字段
   - 保存后会更新到数据库

3. **数据完整性**
   - 前端会自动处理空值，避免显示undefined
   - 后端API支持部分更新，只更新提供的字段