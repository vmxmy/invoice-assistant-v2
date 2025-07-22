# 邮件处理火车票金额为0问题修复记录

## 问题描述

用户报告邮件处理火车票时，发票记录中的金额为0。后台日志显示：

```
extracted_data keys: ['raw_ocr_data', 'ocr_result', 'invoice_type', 'email_source']
未能从extracted_data中找到火车票票价，使用前端传递的值: 0
```

## 问题原因

邮件处理模块 (`email_processing.py`) 没有使用统一发票处理器 (`UnifiedInvoiceProcessor`)，而是直接处理 OCR 数据，导致：

1. OCR 数据没有经过适配器系统转换
2. 火车票的票价字段（`fare`）没有被正确映射到 `total_amount`
3. `extracted_data` 中缺少解析后的发票字段

## 解决方案

修改 `email_processing.py` 的 `process_single_pdf` 函数，使用 `UnifiedInvoiceProcessor` 处理 PDF：

1. 将 PDF 内容保存到临时文件
2. 调用 `UnifiedInvoiceProcessor.process_single_file` 处理文件
3. 从处理结果中提取发票数据，特别处理火车票的票价字段
4. 清理临时文件

## 代码修改

### 文件：`backend/app/api/v1/endpoints/email_processing.py`

```python
async def process_single_pdf(...) -> PDFProcessResult:
    """处理单个PDF - 使用统一发票处理器"""
    # 1. 保存PDF到临时文件
    with tempfile.NamedTemporaryFile(mode='wb', suffix='.pdf', delete=False) as tmp_file:
        tmp_file.write(pdf_content)
        temp_file_path = tmp_file.name
    
    try:
        # 2. 使用UnifiedInvoiceProcessor处理
        unified_processor = UnifiedInvoiceProcessor(...)
        result, is_new = await unified_processor.process_single_file(
            file_path=temp_file_path,
            user_id=current_user.id,
            source=InvoiceSource.EMAIL,
            source_metadata=source_metadata
        )
        
        # 3. 特殊处理火车票金额
        if invoice_data.get('invoice_type') == '火车票':
            fare = (
                invoice_data.get('total_amount') or
                invoice_data.get('fare') or
                invoice_data.get('ticket_price') or
                invoice_data.get('extended_fields', {}).get('fare') or
                0
            )
            display_data['票价'] = fare
            display_data['价税合计'] = fare
    finally:
        # 4. 清理临时文件
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
```

## 优势

使用统一发票处理器后：

1. **数据一致性**：邮件处理和手动上传使用相同的处理流程
2. **适配器支持**：火车票数据通过 `TrainTicketAdapter` 正确转换
3. **字段映射**：`fare` 字段被正确映射到 `total_amount`
4. **错误处理**：统一的错误处理和重试机制
5. **性能监控**：自动集成性能监控

## 验证

修复后，火车票的处理流程：

1. OCR 识别提取原始数据
2. `TrainTicketAdapter._populate_core_fields` 将 `fare` 映射到 `total_amount`
3. `UnifiedInvoiceProcessor._build_invoice_data` 构建完整的 `extracted_data`
4. `InvoiceService.create_invoice_from_processed_data` 正确保存金额到数据库

## 相关文件

- `/backend/app/api/v1/endpoints/email_processing.py` - 邮件处理端点
- `/backend/app/services/unified_invoice_processor.py` - 统一处理器
- `/backend/app/services/invoice_adapters.py` - 火车票适配器
- `/backend/app/utils/field_mapping.py` - 字段映射工具