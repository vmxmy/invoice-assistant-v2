# UnifiedInvoiceProcessor 解析器集成修复

## 问题描述

在迁移到 UnifiedInvoiceProcessor 时，遗漏了原有的完整解析工作流，导致：
1. OCR 数据无法正确解析
2. 字段名称未经过适配器统一
3. 降级处理时缺少必要字段

## 原因分析

在旧的 OCR 处理流程（`ocr_combined.py`）中，完整的工作流包括：
1. OCR 识别（`ocr_service.recognize_mixed_invoices`）
2. **解析服务**（`parser_service.parse_invoice_data`）
3. **字段适配器**（`ocr_field_adapter.adapt_fields`）
4. 数据验证（可选）

而在 UnifiedInvoiceProcessor 的初始实现中，只调用了解析服务，但没有使用字段适配器。

## 解决方案

### 1. 引入字段适配器
```python
# 导入字段适配器
from app.adapters.ocr_field_adapter import ocr_field_adapter
self.ocr_field_adapter = ocr_field_adapter
```

### 2. 完整的解析流程
```python
# 步骤1: 使用 parser_service 解析原始OCR数据
invoice_type_parsed, parsed_fields = self.parser_service.parse_invoice_data(raw_response)

# 步骤2: 转换为字典格式
raw_fields_dict = {}
for field in parsed_fields:
    raw_fields_dict[field.original_key or field.name] = field.value

# 步骤3: 使用 ocr_field_adapter 适配字段名
adapted_fields = self.ocr_field_adapter.adapt_fields(raw_fields_dict, invoice_type)

# 步骤4: 使用适配器进一步转换（确保数据完整性）
adapter = self.adapter_factory.create_adapter(invoice_type)
base_invoice = adapter.from_parsed_fields(adapted_parsed_fields)
frontend_data = adapter.to_frontend_format(base_invoice)
```

### 3. 降级处理改进
```python
# 提取基本字段
basic_fields = self._extract_basic_fields(result, invoice_type)

# 使用 ocr_field_adapter 适配字段名
adapted_basic = self.ocr_field_adapter.adapt_fields(basic_fields, invoice_type)
fallback_data.update(adapted_basic)
```

## 关键改进

1. **完整的解析链**：OCR → Parser → Field Adapter → Invoice Adapter
2. **字段名统一**：通过 `ocr_field_adapter` 确保字段名称一致性
3. **降级处理增强**：即使主流程失败，也能通过字段适配器提取必要字段

## 影响范围

这个修复确保了所有使用 UnifiedInvoiceProcessor 的模块都能正确处理发票数据：
- 邮件处理
- 手动上传
- 批量处理

## 验证要点

1. 检查不同类型发票的字段是否正确提取
2. 验证火车票的票价字段是否正确映射
3. 确认降级处理能够提取必要字段