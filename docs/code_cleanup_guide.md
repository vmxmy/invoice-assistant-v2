# 代码清理和废弃模块指南

## 概述

在完成统一发票处理流程后，需要清理不再使用的代码和标记废弃的模块，以保持代码库的整洁性。

## 最新更新（2025-07-22）

### 已完成的清理工作

1. **标记废弃端点**
   - ✅ `/create-with-file` 端点已标记为 `deprecated`
   - ✅ 添加了废弃警告日志

2. **移除冗余函数**
   - ✅ 移除了 `email_processing.py` 中的 `create_invoice_from_email_pdf` 函数
   - ✅ 清理了相关的导入语句

3. **创建废弃管理工具**
   - ✅ 创建了 `app/utils/deprecation.py` 模块
   - ✅ 提供了 `@deprecated` 装饰器
   - ✅ 实现了废弃代码使用监控

4. **文档更新**
   - ✅ 创建了统一处理器采用情况分析文档
   - ✅ 更新了架构文档记录最新修复

5. **修复 UnifiedInvoiceProcessor OCR 调用问题**
   - ✅ 修复了错误调用不存在的 `process_batch_files` 方法
   - ✅ 改为使用 AliyunOCRService 的 `recognize_mixed_invoices` 方法
   - ✅ 确保了 OCR 服务的正确集成

## 待清理的代码清单

### 1. AutomatedInvoiceProcessor 中的废弃方法

**文件**: `backend/app/services/automated_invoice_processor.py`

需要删除或标记为废弃的方法：
- `_batch_ocr_processing()` - 已被 `_batch_processing_unified()` 替代
- `_batch_invoice_creation()` - 已被统一处理器替代
- 其他直接调用 OCR 服务的私有方法

**建议操作**:
```python
# 在方法上添加废弃装饰器
import warnings
from functools import wraps

def deprecated(reason):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            warnings.warn(
                f"{func.__name__} is deprecated. {reason}",
                DeprecationWarning,
                stacklevel=2
            )
            return func(*args, **kwargs)
        return wrapper
    return decorator

# 应用到废弃方法
@deprecated("使用 _batch_processing_unified 替代")
async def _batch_ocr_processing(self, ...):
    pass
```

### 2. 重复的 OCR 调用逻辑

**涉及文件**:
- `backend/app/api/v1/endpoints/files.py`
- `backend/app/api/v1/endpoints/email_processing.py`

**清理内容**:
- 直接调用 OCR 服务的代码片段
- 手动构建发票数据的逻辑
- 重复的错误处理代码

### 3. 旧的 API 端点

**文件**: `backend/app/api/v1/router.py`

**待处理端点**:
- 保留 `/invoices/create-with-file` 用于向后兼容
- 添加重定向或废弃通知
- 在文档中标记为废弃

### 4. 未使用的辅助函数

**文件**: `backend/app/utils/`

**清理方法**:
```bash
# 查找未使用的函数
grep -r "function_name" backend/ --include="*.py"

# 使用工具检测死代码
pip install vulture
vulture backend/app/utils/
```

## 代码清理步骤

### 第一阶段：标记废弃（当前）

1. **添加废弃警告**
   ```python
   # 在 __init__.py 中添加废弃通知
   __deprecated__ = [
       'old_function',
       'OldClass',
   ]
   ```

2. **更新文档字符串**
   ```python
   def old_method():
       """
       处理发票的旧方法。
       
       .. deprecated:: 2.0
          使用 :func:`UnifiedInvoiceProcessor.process_single_file` 替代
       """
       pass
   ```

3. **日志警告**
   ```python
   logger.warning(
       "使用了废弃的方法 %s，请迁移到统一处理器",
       method_name
   )
   ```

### 第二阶段：逐步移除（下个版本）

1. **创建迁移指南**
2. **提供代码迁移工具**
3. **在主要版本更新时删除**

## 具体清理任务

### 1. 清理 AutomatedInvoiceProcessor

```python
# backend/app/services/automated_invoice_processor.py

class AutomatedInvoiceProcessor:
    # 保留的方法
    - process_scan_job()
    - _get_scan_job()
    - _get_downloaded_pdfs()
    - _batch_processing_unified()  # 新方法
    - _update_job_status()
    - _update_final_statistics()
    
    # 标记为废弃的方法
    - _batch_ocr_processing()  # @deprecated
    - _batch_invoice_creation()  # @deprecated
    - _process_single_pdf()  # @deprecated
```

### 2. 清理文件处理端点

```python
# backend/app/api/v1/endpoints/files.py

# 移除或重构以下部分：
- 直接调用 OCR 服务的代码
- 手动构建 invoice_data 的逻辑
- 替换为调用 UnifiedInvoiceProcessor
```

### 3. 统一错误处理

移除分散的错误处理，使用统一的异常类：
- `ProcessingError`
- `OCRError`
- `DataParsingError`
- `DuplicateInvoiceError`

### 4. 清理测试代码

```bash
# 移除过时的测试
rm backend/tests/test_old_ocr_service.py
rm backend/tests/test_manual_invoice_creation.py

# 更新集成测试
# 确保所有测试都使用新的统一处理流程
```

## 保留代码列表

以下代码需要保留以确保向后兼容：

1. **API 端点**
   - `/api/v1/invoices/create-with-file` - 标记为废弃但保留功能
   
2. **数据模型**
   - 所有现有的数据库模型保持不变
   - extracted_data 字段结构保持兼容

3. **前端接口**
   - 保持响应格式不变
   - 确保字段名映射正确

## 验证清理结果

### 1. 运行测试套件
```bash
pytest backend/tests/ -v
```

### 2. 检查代码覆盖率
```bash
pytest --cov=backend/app backend/tests/
```

### 3. 运行代码质量检查
```bash
# 代码格式
black backend/app/

# 代码风格
flake8 backend/app/

# 类型检查
mypy backend/app/
```

### 4. 检查导入依赖
```bash
# 查找循环导入
python -m pyflakes backend/app/

# 查找未使用的导入
autoflake --remove-all-unused-imports --check backend/app/
```

## 清理后的项目结构

```
backend/app/
├── services/
│   ├── unified_invoice_processor.py  # ✅ 核心服务
│   ├── invoice_service.py           # ✅ 更新后的服务
│   ├── automated_invoice_processor.py # ⚠️  部分方法废弃
│   ├── ocr_service.py               # ✅ 保留但不直接调用
│   └── performance_monitor.py       # ✅ 新增监控
├── api/v1/endpoints/
│   ├── invoices_enhanced.py         # ✅ 新的统一端点
│   ├── invoices.py                  # ✅ 保留原有查询端点
│   └── files.py                     # ⚠️  需要重构
└── utils/
    └── field_mapping.py             # ✅ 字段映射工具
```

## 时间线

- **第 1 周**: 标记所有废弃代码
- **第 2-3 周**: 监控废弃代码使用情况
- **第 4 周**: 发布迁移指南
- **下个主版本**: 移除废弃代码

## 注意事项

1. **保持向后兼容**: 至少一个版本周期
2. **充分测试**: 每次清理后运行完整测试
3. **文档更新**: 同步更新 API 文档
4. **通知用户**: 提前通知 API 变更
5. **保留日志**: 记录所有清理操作