/**
 * OCR数据转换相关类型定义
 */

// OCR字段映射接口
export interface OCRFieldMapping {
  // 核心发票字段
  invoice_number: string           // 发票号码
  invoice_code?: string            // 发票代码
  seller_name: string             // 销售方名称
  seller_tax_number?: string      // 销售方税号
  buyer_name?: string             // 购买方名称
  buyer_tax_number?: string       // 购买方税号
  
  // 金额信息
  total_amount: number            // 价税合计
  amount_without_tax: number      // 不含税金额
  tax_amount: number              // 税额
  currency: string                // 币种
  
  // 日期信息
  invoice_date: string            // 开票日期 (YYYY-MM-DD格式)
  consumption_date?: string       // 消费日期
  
  // 其他信息
  invoice_type?: string           // 发票类型
  remarks?: string                // 备注
}

// 数据库发票记录接口
export interface DatabaseInvoiceRecord {
  // 系统字段
  user_id: string
  source: string
  status: string
  is_verified: boolean
  processing_status?: string
  
  // 文件信息
  file_path: string
  file_name: string
  file_size: number
  file_hash: string
  file_url?: string
  
  // 核心发票信息
  invoice_number: string
  invoice_code?: string
  invoice_type?: string
  invoice_date?: string
  consumption_date?: string
  
  // 金额信息
  total_amount: number
  amount_without_tax: number
  tax_amount: number
  currency: string
  
  // 买卖方信息
  seller_name?: string
  seller_tax_number?: string
  buyer_name?: string
  buyer_tax_number?: string
  
  // 其他信息
  title?: string
  document_number?: string
  remarks?: string
  notes?: string
  
  // OCR元数据
  ocr_field_confidences: Record<string, number>
  ocr_overall_confidence: number
  ocr_processing_metadata: {
    processing_time: number
    processing_steps: string[]
    ocr_engine: string
    timestamp: string
  }
  
  // 原始数据
  extracted_data: Record<string, any>
  source_metadata?: Record<string, any>
  extra_data?: Record<string, any>
  
  // 时间戳
  started_at: string
  completed_at: string
  last_activity_at: string
}

// 文件元数据接口
export interface FileMetadata {
  filePath: string
  fileName: string
  fileSize: number
  fileHash: string
  userId: string
  fileUrl?: string
}

// 转换结果接口
export interface TransformationResult {
  success: boolean
  data?: DatabaseInvoiceRecord
  warnings: TransformationWarning[]
  errors: TransformationError[]
  processingInfo: {
    fieldsExtracted: number
    confidence: number
    processingTime: number
  }
}

// 警告信息
export interface TransformationWarning {
  field: string
  message: string
  originalValue: any
  correctedValue: any
  severity: 'low' | 'medium' | 'high'
}

// 错误信息
export interface TransformationError {
  field: string
  message: string
  code: string
  value: any
  recoverable: boolean
}

// 字段提取配置
export interface FieldExtractionConfig {
  // 字段名映射配置
  fieldNameMappings: {
    [standardField: string]: string[]  // 标准字段名 -> 可能的OCR字段名列表
  }
  
  // 数据类型转换配置
  typeConversions: {
    dateFormats: string[]           // 支持的日期格式
    amountFormats: {
      currencySymbols: string[]     // 货币符号
      thousandSeparators: string[]  // 千位分隔符
      decimalSeparators: string[]   // 小数分隔符
    }
  }
  
  // 验证规则配置
  validationRules: {
    invoiceNumberPattern: RegExp
    taxNumberPattern: RegExp
    amountRange: { min: number; max: number }
    dateRange: { earliest: string; latest: string }
  }
}

// 业务规则配置
export interface BusinessRulesConfig {
  // 金额验证配置
  amountValidation: {
    tolerance: number              // 金额误差容忍度
    autoCorrection: boolean        // 是否自动修正
  }
  
  // 税率配置
  taxRates: {
    [invoiceType: string]: number  // 不同发票类型的标准税率
  }
  
  // 必填字段配置
  requiredFields: string[]
  
  // 数据完整性规则
  integrityRules: {
    [ruleName: string]: {
      condition: string
      action: 'warn' | 'error' | 'correct'
      message: string
    }
  }
}

// 默认配置
export const DEFAULT_FIELD_CONFIG: FieldExtractionConfig = {
  fieldNameMappings: {
    invoice_number: ['invoice_number', 'invoiceNumber', '发票号码', 'invoice_no', 'number', 'document_number'],
    invoice_code: ['invoice_code', 'invoiceCode', '发票代码', 'code'],
    seller_name: ['seller_name', 'sellerName', '销售方名称', '销售方', 'seller', 'company_name'],
    seller_tax_number: ['seller_tax_number', 'seller_tax_id', '销售方纳税人识别号', '纳税人识别号'],
    buyer_name: ['buyer_name', 'buyerName', '购买方名称', '购买方', 'buyer', 'customer_name'],
    buyer_tax_number: ['buyer_tax_number', 'buyer_tax_id', '购买方纳税人识别号'],
    total_amount: ['total_amount', 'totalAmount', '价税合计', 'total', '合计金额', '总金额'],
    amount_without_tax: ['amount_without_tax', 'subtotal', '不含税金额', '金额', 'net_amount'],
    tax_amount: ['tax_amount', 'taxAmount', '税额', 'tax', 'vat_amount'],
    invoice_date: ['invoice_date', 'invoiceDate', '开票日期', 'date', 'issue_date'],
    consumption_date: ['consumption_date', 'service_date', '消费日期', '服务日期']
  },
  
  typeConversions: {
    dateFormats: [
      'YYYY年MM月DD日',
      'YYYY-MM-DD',
      'YYYY/MM/DD',
      'MM/DD/YYYY',
      'DD/MM/YYYY'
    ],
    amountFormats: {
      currencySymbols: ['￥', '¥', '$', '€', '£'],
      thousandSeparators: [',', '，', ' '],
      decimalSeparators: ['.', '。']
    }
  },
  
  validationRules: {
    invoiceNumberPattern: /^\d{8,12}$/,
    taxNumberPattern: /^[A-Z0-9]{15,20}$/,
    amountRange: { min: 0, max: 1000000 },
    dateRange: { earliest: '2000-01-01', latest: '2030-12-31' }
  }
}

export const DEFAULT_BUSINESS_RULES: BusinessRulesConfig = {
  amountValidation: {
    tolerance: 0.01,  // 1分的误差容忍
    autoCorrection: true
  },
  
  taxRates: {
    '增值税专用发票': 0.13,
    '增值税普通发票': 0.13,
    '增值税电子发票': 0.13
  },
  
  requiredFields: ['invoice_number', 'seller_name', 'total_amount'],
  
  integrityRules: {
    amount_consistency: {
      condition: 'total_amount !== amount_without_tax + tax_amount',
      action: 'correct',
      message: '金额不一致，已自动修正'
    },
    valid_tax_rate: {
      condition: 'tax_amount / amount_without_tax not in expected_range',
      action: 'warn',
      message: '税率异常，请检查'
    }
  }
}