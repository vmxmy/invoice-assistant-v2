# OCR 数据流监测指南

## 概述

本文档描述了如何监测OCR数据在整个系统中的流转过程，确保数据完整性和一致性。

## 监测点设置

### 1. 后端监测点

#### 1.1 OCR Combined API (`/api/v1/ocr/combined/full`)

**位置**: `app/api/v1/endpoints/ocr_combined.py`

```python
# 步骤1: OCR原始响应
logger.info(f"OCR原始响应 - RequestId: {ocr_result.get('RequestId', 'N/A')}")
logger.info(f"OCR原始响应 - 处理时间: {ocr_result.get('processing_time', 'N/A')}秒")

# 步骤2: 数据解析
logger.info(f"解析结果 - 发票类型: {invoice_type}, 字段数: {len(parsed_fields)}")
logger.info(f"解析后原始字段: {list(raw_fields_dict.keys())}")
logger.debug(f"解析后字段详情: {raw_fields_dict}")

# 步骤3: 字段适配
logger.info(f"适配后字段: {list(fields_dict.keys())}")
logger.debug(f"适配后字段详情: {fields_dict}")

# 最终响应
logger.info(f"构建响应 - 发票类型: {invoice_type}")
logger.info(f"构建响应 - 字段数: {len(fields_dict)}")
```

#### 1.2 字段适配器

**位置**: `app/adapters/ocr_field_adapter.py`

```python
logger.info(f"开始适配字段，发票类型: {invoice_type}, 原始字段数: {len(ocr_fields)}")
logger.info(f"原始字段列表: {list(ocr_fields.keys())}")
logger.info(f"标准化后字段: {list(normalized_fields.keys())}")
logger.info(f"特殊处理添加的字段: {list(added_fields)}")
logger.info(f"最终字段列表: {list(final_fields.keys())}")
```

### 2. 前端监测点

#### 2.1 API 响应拦截器

**位置**: `src/services/apiClient.ts`

```javascript
// OCR响应详情
logger.log('📊 OCR响应详情:', {
  url: response.config.url,
  status: response.status,
  success: response.data?.success,
  invoice_type: response.data?.invoice_type,
  fields_count: response.data?.fields ? Object.keys(response.data.fields).length : 0,
  fields: response.data?.fields ? Object.keys(response.data.fields) : [],
  has_raw_ocr: !!response.data?.raw_ocr_data,
  has_validation: !!response.data?.validation,
  has_confidence: !!response.data?.confidence,
  processing_time: response.data?.processing_time
})
```

#### 2.2 InvoiceUploadPage

**位置**: `src/pages/InvoiceUploadPage.tsx`

```javascript
// OCR响应接收
console.log('✅ [recognizeFile] OCR API 响应:', ocrResponse);
console.log('🔍 [recognizeFile] 数据完整性检查:');
console.log('  - success:', ocrResponse?.success);
console.log('  - invoice_type:', ocrResponse?.invoice_type);
console.log('  - fields 存在:', !!ocrResponse?.fields);
console.log('  - fields 字段数:', Object.keys(ocrResponse?.fields || {}).length);

// 字段详情
console.log('📋 [recognizeFile] 字段详情:');
Object.entries(ocrResponse.fields || {}).forEach(([key, value]) => {
  console.log(`  - ${key}:`, value);
});

// 编辑模态框数据
console.log('🔧 [editOcrData] 提取的字段数据:', fields);
console.log('🔧 [editOcrData] 字段列表:', Object.keys(fields));
console.log('🔧 [editOcrData] 初始表单数据:', initialFormData);
```

## 数据流程图

```
用户上传PDF
    ↓
后端OCR服务 (recognize_mixed_invoices)
    ↓
[LOG] OCR原始响应
    ↓
数据解析服务 (parse_invoice_data)
    ↓
[LOG] 解析后原始字段
    ↓
字段适配器 (adapt_fields)
    ↓
[LOG] 适配前后字段对比
    ↓
API响应构建
    ↓
[LOG] 最终响应数据
    ↓
前端接收响应
    ↓
[LOG] API响应拦截器
    ↓
页面处理数据
    ↓
[LOG] 数据完整性检查
    ↓
编辑模态框
    ↓
[LOG] 表单数据映射
```

## 关键检查点

### 1. 火车票特殊字段映射

- `ticket_number` → `invoice_number`
- `passenger_name` → `buyer_name`
- `fare` → `total_amount`
- `departure_time` → `invoice_date` (提取日期部分)

### 2. 数据完整性验证

后端日志应显示：
```
解析后原始字段: ['ticket_number', 'train_number', 'departure_station', ...]
适配后字段: ['invoice_number', 'train_number', 'departure_station', ..., 'buyer_name', 'seller_name', 'total_amount']
特殊处理添加的字段: ['invoice_number', 'buyer_name', 'seller_name', 'total_amount', 'invoice_date', 'consumption_date']
```

前端日志应显示：
```
fields 字段数: 15+
fields: ['invoice_number', 'train_number', 'departure_station', ...]
```

### 3. 常见问题排查

1. **字段缺失**
   - 检查后端"解析后原始字段"日志
   - 确认字段适配器是否正确处理

2. **字段命名不一致**
   - 检查"标准化后字段"日志
   - 验证 snake_case 转换是否正确

3. **特殊字段未生成**
   - 检查"特殊处理添加的字段"日志
   - 确认发票类型判断是否正确

## 使用方法

1. 打开浏览器开发者工具控制台
2. 打开后端日志监控
3. 上传一个PDF文件
4. 观察日志输出，对比各个阶段的数据
5. 确认数据在每个阶段都完整且一致

## 日志级别配置

```python
# 后端配置 (开发环境)
logging.getLogger("app.api.v1.endpoints.ocr_combined").setLevel(logging.DEBUG)
logging.getLogger("app.adapters.ocr_field_adapter").setLevel(logging.DEBUG)
```

```javascript
// 前端配置
localStorage.setItem('debug', 'true'); // 启用调试日志
```