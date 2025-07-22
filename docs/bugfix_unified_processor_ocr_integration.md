# UnifiedInvoiceProcessor OCR 集成修复

## 问题描述

在将邮件处理和其他模块迁移到 UnifiedInvoiceProcessor 后，系统报错：
```
AttributeError: 'AliyunOCRService' object has no attribute 'process_batch_files'
```

## 根本原因

UnifiedInvoiceProcessor 的 `_call_ocr_service` 方法尝试调用 AliyunOCRService 的 `process_batch_files` 方法，但该方法实际上不存在。AliyunOCRService 只提供了以下方法：
- `recognize_mixed_invoices(file_content: bytes)`
- `recognize_invoice_raw(file_content: bytes)`

## 解决方案

修改 UnifiedInvoiceProcessor 的 `_call_ocr_service` 方法，使其正确调用 AliyunOCRService 的接口：

### 第一次修复（不完整）
```python
# 读取文件内容
with open(file_path, 'rb') as f:
    file_content = f.read()

# 调用 AliyunOCRService 的 recognize_mixed_invoices 方法
ocr_result = await self.ocr_service.recognize_mixed_invoices(file_content)

if ocr_result.get('success'):  # 错误：阿里云不返回 success 字段
    ...
```

### 最终修复
```python
# 读取文件内容
with open(file_path, 'rb') as f:
    file_content = f.read()

# 调用 AliyunOCRService 的 recognize_mixed_invoices 方法
ocr_result = await self.ocr_service.recognize_mixed_invoices(file_content)

# AliyunOCRService 成功时直接返回数据，不包含 success 字段
# 阿里云的响应包含 'Data' 字段（JSON字符串）
if ocr_result and isinstance(ocr_result, dict) and 'Data' in ocr_result:
    # 成功识别，返回原始数据供后续解析
    return {
        'success': True,
        'data': ocr_result,  # 保持原始格式，让 parser_service 处理
        'invoice_type': None,  # 类型将由 parser 提取
        'validation': None,
        'confidence': None,
        'raw_response': ocr_result
    }
```

## 关键发现

1. AliyunOCRService 的 `recognize_mixed_invoices` 方法返回阿里云原始响应
2. 成功的响应包含 `Data` 字段，其中是 JSON 字符串格式的识别数据
3. 不应该在 OCR 调用层尝试解析数据，应该保持原始格式传递给 parser_service
4. AdapterFactory 使用 `create_adapter` 方法而不是 `get_adapter`

## 额外修复

### 1. 适配器工厂方法调用错误
```python
# 错误
adapter = self.adapter_factory.get_adapter(invoice_type)

# 正确
adapter = self.adapter_factory.create_adapter(invoice_type)
```

### 2. 解析器调用和降级处理
- 在 OCR 调用后立即提取发票类型
- 改进降级处理逻辑，正确解析阿里云响应的 Data 字段
- 添加 `_extract_basic_fields` 方法处理必要字段提取

```python
# 提取发票类型
try:
    invoice_type = self.parser_service.extract_invoice_type(ocr_result)
except Exception as e:
    logger.warning(f"提取发票类型失败: {str(e)}")
    invoice_type = None

# 降级处理时解析 Data 字段
if raw_response and 'Data' in raw_response:
    data_str = raw_response.get('Data', '')
    if data_str:
        data_json = json.loads(data_str)
        # 提取基本字段
        fallback_data.update(self._extract_basic_fields(result, invoice_type))
```

## 影响范围

这个修复影响所有使用 UnifiedInvoiceProcessor 的模块：
1. 邮件处理 (`email_processing.py`)
2. 自动化发票处理器 (`automated_invoice_processor.py`)
3. 统一上传端点 (`/create-with-file-unified`)

## 验证步骤

1. 测试邮件处理火车票功能
2. 测试手动上传发票功能
3. 确认 OCR 识别正常工作
4. 验证错误处理和重试机制

## 未来改进建议

1. **接口标准化**：考虑为 OCR 服务定义统一的接口协议
2. **批量处理支持**：如果需要真正的批量处理，可以在 AliyunOCRService 中实现 `process_batch_files` 方法
3. **类型检查**：使用 Protocol 或 ABC 来定义 OCR 服务接口，确保编译时类型安全

## 相关文件

- `/backend/app/services/unified_invoice_processor.py` - 第 344-366 行
- `/backend/app/services/aliyun_ocr_service.py` - OCR 服务实现