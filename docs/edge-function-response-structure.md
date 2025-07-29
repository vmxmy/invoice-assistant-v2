# Edge Function OCR 响应结构详解

## 📋 完整响应格式

### 成功响应 (HTTP 200)
```json
{
  "success": boolean,           // 字段验证是否完全通过
  "invoice_type": string,       // 发票类型
  "fields": {                   // 提取的结构化字段
    "invoice_number": string,     // 发票号码
    "invoice_code": string,       // 发票代码  
    "invoice_date": string,       // 开票日期 (YYYY-MM-DD格式)
    "seller_name": string,        // 销售方名称
    "seller_tax_number": string,  // 销售方纳税人识别号
    "buyer_name": string,         // 购买方名称
    "buyer_tax_number": string,   // 购买方纳税人识别号
    "total_amount": number,       // 价税合计(小写)
    "total_amount_chinese": string, // 价税合计(大写)
    "amount": number,             // 金额
    "tax_amount": number,         // 税额
    "tax_rate": number,           // 税率(百分比)
    "goods_name": string,         // 商品名称/发票标题
    
    // 火车票专用字段
    "train_number": string,       // 车次
    "departure_station": string,  // 出发站
    "arrival_station": string,    // 到达站
    "departure_time": string,     // 出发时间
    "seat_type": string,          // 座位类型
    
    // 商品明细(如果有)
    "invoice_details": [          // 发票明细列表
      {
        "goods_name": string,     // 商品名称
        "specification": string,  // 规格型号
        "unit": string,          // 单位
        "quantity": number,      // 数量
        "unit_price": number,    // 单价
        "amount": number         // 金额
      }
    ]
  },
  "confidence": {                 // 置信度信息
    "overall": number,            // 整体置信度 (0-1)
    "fields": {                   // 各字段置信度
      "invoice_number": number,   // 发票号码置信度
      "invoice_date": number,     // 日期置信度
      "seller_name": number,      // 销售方置信度
      // ... 其他字段置信度
    }
  },
  "validation": {                 // 字段验证结果
    "is_valid": boolean,          // 是否通过验证
    "field_results": {},          // 字段验证详情
    "overall_errors": [           // 整体错误列表
      "缺少必填字段: total_amount"
    ],
    "overall_warnings": [         // 警告列表
      "发票日期格式可能不正确"
    ],
    "completeness_score": number  // 完整性评分 (0-100)
  },
  "raw_ocr_data": {              // 阿里云OCR原始响应
    "Data": string,               // JSON字符串格式的原始数据
    "RequestId": string           // 阿里云请求ID
  },
  "processing_steps": [           // 处理步骤记录
    "文件验证: 通过 (filename.pdf, 71.6KB)",
    "OCR识别: 增值税发票 (置信度: 99.9%)",
    "数据解析: 完成 (14个字段)",
    "字段验证: 发现问题 (完整性: 50%)"
  ],
  "metadata": {                   // 元数据信息
    "total_processing_time": number,  // 总处理时间(ms)
    "step_timings": {                 // 各步骤耗时
      "file_processing": number,      // 文件处理耗时
      "ocr_recognition": number,      // OCR识别耗时
      "data_parsing": number,         // 数据解析耗时
      "field_validation": number      // 字段验证耗时
    },
    "timestamp": string,              // 处理时间戳
    "region": string                  // 阿里云区域
  }
}
```

## 📊 实际响应示例

### 增值税发票示例
```json
{
  "success": false,
  "invoice_type": "增值税发票",
  "fields": {
    "invoice_number": "25442000000436367034",
    "invoice_date": "2025-07-19",
    "seller_name": "广州寿司郎餐饮有限公司",
    "buyer_name": "杭州趣链科技有限公司",
    "buyer_tax_number": "91330108MA28F2XX38",
    "amount": 217.70,
    "tax_amount": 26.30,
    "total_amount_chinese": "贰佰肆拾肆元整",
    "seller_tax_number": "91440101MA5CU9XX15",
    "goods_name": "电子发票(普通发票)",
    "invoicetype": "电子普通发票",
    "invoicedetails": [
      {
        "goods_name": "*餐饮服务*餐饮费",
        "specification": "",
        "unit": "",
        "quantity": 1.0,
        "unit_price": 217.70,
        "amount": 217.70
      }
    ]
  },
  "confidence": {
    "overall": 0.9986666666666667,
    "fields": {
      "invoice_number": 1.0,
      "invoice_date": 1.0,
      "seller_name": 0.9960000000000001,
      "buyer_name": 1.0,
      "amount": 1.0,
      "tax_amount": 1.0
    }
  },
  "validation": {
    "is_valid": false,
    "field_results": {},
    "overall_errors": [
      "缺少必填字段: total_amount",
      "发票金额必须为正数"
    ],
    "overall_warnings": [],
    "completeness_score": 50
  },
  "raw_ocr_data": {
    "Data": "{\"subMsgs\":[{\"type\":\"VATInvoice\",\"result\":{...}}]}",
    "RequestId": "550C8B5A-8B7C-5D2B-A5E4-123456789ABC"
  },
  "processing_steps": [
    "文件验证: 通过 (invoice.pdf, 71.6KB)",
    "OCR识别: 增值税发票 (置信度: 99.9%)",
    "数据解析: 完成 (14个字段)",
    "字段验证: 发现问题 (完整性: 50%)"
  ],
  "metadata": {
    "total_processing_time": 2051,
    "step_timings": {
      "file_processing": 7,
      "ocr_recognition": 1485,
      "data_parsing": 1,
      "field_validation": 0
    },
    "timestamp": "2025-07-28T05:16:35.433Z",
    "region": "cn-hangzhou"
  }
}
```

### 火车票示例
```json
{
  "success": false,
  "invoice_type": "火车票",
  "fields": {
    "invoice_number": "25449165860000523079",
    "invoice_date": "2025-03-26",
    "buyer_name": "杭州趣链科技有限公司",
    "goods_name": "电子发票(铁路电子客票)",
    "train_number": "D378",
    "departure_station": "深圳北站",
    "arrival_station": "泉州站",
    "departure_time": "2025-03-26 14:25",
    "seat_type": "二等座",
    "buyer_tax_number": "91330108MA28F2XX38"
  },
  "confidence": {
    "overall": 0.999,
    "fields": {
      "train_number": 1.0,
      "departure_station": 0.998,
      "arrival_station": 0.999,
      "departure_time": 1.0
    }
  },
  "validation": {
    "is_valid": false,
    "field_results": {},
    "overall_errors": [
      "缺少必填字段: seller_name, total_amount",
      "发票金额必须为正数"
    ],
    "overall_warnings": [],
    "completeness_score": 40
  }
}
```

## ❌ 错误响应 (HTTP 500)
```json
{
  "success": false,
  "error": "阿里云OCR调用失败: 400 - {...}",
  "processing_steps": [
    "处理失败: 阿里云OCR调用失败"
  ],
  "metadata": {
    "total_processing_time": 0,
    "step_timings": {},
    "timestamp": "2025-07-28T05:16:35.433Z"
  },
  "debug": {
    "errorType": "Error",
    "stack": "Error: 阿里云OCR调用失败..."
  }
}
```

## 🔍 关键要点

### 1. success 字段含义
- `true`: 所有必填字段都提取成功且通过验证
- `false`: OCR识别成功但存在字段缺失或验证问题

### 2. 数据可用性判断
即使 `success: false`，如果有以下内容仍可正常使用：
- `fields` 对象包含提取的字段
- `confidence.overall > 0.8` 表示识别质量较高
- `validation.completeness_score > 30` 表示数据相对完整

### 3. 字段映射规则
- 英文字段名 → 标准字段名的自动转换
- 支持中英文混合字段识别
- 特殊票据类型的专用字段支持

### 4. 性能指标
- 总处理时间通常在 1.5-5 秒
- OCR识别占处理时间的 70-90%
- 置信度通常在 95% 以上