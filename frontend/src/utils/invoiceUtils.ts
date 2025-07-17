/**
 * 发票管理工具函数
 * 
 * 提供发票数据处理、验证和转换的实用函数
 */

import {
  BaseInvoice,
  ParsedInvoice,
  InvoiceType,
  ValidationStatus,
  ConfidenceLevel,
  ValidationIssue,
  InvoiceSummary,
  FieldValidationResult,
  ValidationSummary,
  isBaseInvoice,
  isParsedInvoice
} from '../types/invoice';

// ===== 发票类型工具 =====

/**
 * 获取发票类型的显示名称
 */
export function getInvoiceTypeDisplayName(type: InvoiceType): string {
  const displayNames: Record<InvoiceType, string> = {
    [InvoiceType.VAT_INVOICE]: '增值税发票',
    [InvoiceType.TRAIN_TICKET]: '火车票',
    [InvoiceType.FLIGHT_TICKET]: '机票',
    [InvoiceType.TAXI_TICKET]: '出租车票',
    [InvoiceType.BUS_TICKET]: '客运车票',
    [InvoiceType.HOTEL_INVOICE]: '酒店发票',
    [InvoiceType.GENERAL_INVOICE]: '通用发票',
    [InvoiceType.UNKNOWN]: '未知类型'
  };
  return displayNames[type] || type;
}

/**
 * 获取发票类型的图标
 */
export function getInvoiceTypeIcon(type: InvoiceType): string {
  const icons: Record<InvoiceType, string> = {
    [InvoiceType.VAT_INVOICE]: '📄',
    [InvoiceType.TRAIN_TICKET]: '🚄',
    [InvoiceType.FLIGHT_TICKET]: '✈️',
    [InvoiceType.TAXI_TICKET]: '🚕',
    [InvoiceType.BUS_TICKET]: '🚌',
    [InvoiceType.HOTEL_INVOICE]: '🏨',
    [InvoiceType.GENERAL_INVOICE]: '📃',
    [InvoiceType.UNKNOWN]: '❓'
  };
  return icons[type] || '📄';
}

/**
 * 检查发票类型是否支持特定功能
 */
export function supportsFeature(type: InvoiceType, feature: string): boolean {
  const featureSupport: Record<string, InvoiceType[]> = {
    'tax_details': [InvoiceType.VAT_INVOICE],
    'passenger_info': [InvoiceType.TRAIN_TICKET, InvoiceType.FLIGHT_TICKET],
    'route_info': [InvoiceType.TRAIN_TICKET, InvoiceType.FLIGHT_TICKET, InvoiceType.TAXI_TICKET, InvoiceType.BUS_TICKET],
    'detailed_items': [InvoiceType.VAT_INVOICE, InvoiceType.HOTEL_INVOICE, InvoiceType.GENERAL_INVOICE]
  };
  
  return featureSupport[feature]?.includes(type) || false;
}

// ===== 验证状态工具 =====

/**
 * 获取验证状态的显示名称
 */
export function getValidationStatusDisplayName(status: ValidationStatus): string {
  const displayNames: Record<ValidationStatus, string> = {
    [ValidationStatus.PENDING]: '待验证',
    [ValidationStatus.VALID]: '验证通过',
    [ValidationStatus.INVALID]: '验证失败',
    [ValidationStatus.WARNING]: '有警告'
  };
  return displayNames[status] || status;
}

/**
 * 获取验证状态的颜色类
 */
export function getValidationStatusColor(status: ValidationStatus): string {
  const colors: Record<ValidationStatus, string> = {
    [ValidationStatus.PENDING]: 'text-yellow-600 bg-yellow-100',
    [ValidationStatus.VALID]: 'text-green-600 bg-green-100',
    [ValidationStatus.INVALID]: 'text-red-600 bg-red-100',
    [ValidationStatus.WARNING]: 'text-orange-600 bg-orange-100'
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

/**
 * 获取置信度等级的显示名称
 */
export function getConfidenceLevelDisplayName(level: ConfidenceLevel): string {
  const displayNames: Record<ConfidenceLevel, string> = {
    [ConfidenceLevel.LOW]: '低置信度',
    [ConfidenceLevel.MEDIUM]: '中等置信度',
    [ConfidenceLevel.HIGH]: '高置信度'
  };
  return displayNames[level] || level;
}

/**
 * 获取置信度等级的颜色类
 */
export function getConfidenceLevelColor(level: ConfidenceLevel): string {
  const colors: Record<ConfidenceLevel, string> = {
    [ConfidenceLevel.LOW]: 'text-red-600 bg-red-100',
    [ConfidenceLevel.MEDIUM]: 'text-yellow-600 bg-yellow-100',
    [ConfidenceLevel.HIGH]: 'text-green-600 bg-green-100'
  };
  return colors[level] || 'text-gray-600 bg-gray-100';
}

// ===== 发票数据工具 =====

/**
 * 格式化金额显示
 */
export function formatAmount(amount?: number): string {
  if (amount === undefined || amount === null) {
    return '-';
  }
  
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * 格式化日期显示
 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) {
    return '-';
  }
  
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * 格式化日期时间显示
 */
export function formatDateTime(dateTimeStr?: string): string {
  if (!dateTimeStr) {
    return '-';
  }
  
  try {
    const date = new Date(dateTimeStr);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  } catch {
    return dateTimeStr;
  }
}

/**
 * 获取发票的主要显示信息
 */
export function getInvoiceDisplayInfo(invoice: BaseInvoice): {
  title: string;
  subtitle: string;
  amount: string;
  date: string;
} {
  return {
    title: invoice.seller_name || '未知销售方',
    subtitle: invoice.invoice_number || '无发票号码',
    amount: formatAmount(invoice.total_amount),
    date: formatDate(invoice.invoice_date)
  };
}

/**
 * 计算置信度等级
 */
export function calculateConfidenceLevel(confidences: Record<string, number>): ConfidenceLevel {
  if (Object.keys(confidences).length === 0) {
    return ConfidenceLevel.LOW;
  }
  
  const avgConfidence = Object.values(confidences).reduce((sum, conf) => sum + conf, 0) / Object.values(confidences).length;
  
  if (avgConfidence >= 0.9) {
    return ConfidenceLevel.HIGH;
  } else if (avgConfidence >= 0.7) {
    return ConfidenceLevel.MEDIUM;
  } else {
    return ConfidenceLevel.LOW;
  }
}

/**
 * 获取低置信度字段
 */
export function getLowConfidenceFields(confidences: Record<string, number>, threshold = 0.7): string[] {
  return Object.entries(confidences)
    .filter(([_, confidence]) => confidence < threshold)
    .map(([fieldName, _]) => fieldName);
}

// ===== 数据转换工具 =====

/**
 * 将 ParsedInvoice 转换为 BaseInvoice 格式（用于显示）
 */
export function convertParsedToBaseInvoice(parsed: ParsedInvoice): Partial<BaseInvoice> {
  const baseInvoice: Partial<BaseInvoice> = {
    invoice_type: parsed.invoice_type as InvoiceType,
    invoice_number: '',
    seller_name: '',
    buyer_name: '',
    extended_fields: {},
    field_confidences: {},
    raw_ocr_fields: [],
    validation_status: ValidationStatus.PENDING,
    validation_issues: []
  };
  
  // 转换字段
  parsed.fields.forEach(field => {
    const fieldKey = field.original_key || field.name.toLowerCase().replace(/\s+/g, '_');
    
    // 映射核心字段
    switch (fieldKey) {
      case 'invoice_number':
      case 'invoiceNumber':
        baseInvoice.invoice_number = field.value;
        break;
      case 'invoice_date':
      case 'invoiceDate':
        baseInvoice.invoice_date = field.value;
        break;
      case 'total_amount':
      case 'totalAmount':
        baseInvoice.total_amount = parseFloat(field.value) || undefined;
        break;
      case 'seller_name':
      case 'sellerName':
        baseInvoice.seller_name = field.value;
        break;
      case 'buyer_name':
      case 'buyerName':
      case 'purchaser_name':
      case 'purchaserName':
        baseInvoice.buyer_name = field.value;
        break;
      default:
        // 其他字段存入扩展字段
        if (baseInvoice.extended_fields) {
          baseInvoice.extended_fields[fieldKey] = field.value;
        }
    }
    
    // 设置置信度
    if (baseInvoice.field_confidences) {
      baseInvoice.field_confidences[fieldKey] = field.confidence;
    }
  });
  
  return baseInvoice;
}

/**
 * 创建发票摘要
 */
export function createInvoiceSummary(invoice: BaseInvoice): InvoiceSummary {
  return {
    invoice_type: invoice.invoice_type,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    total_amount: invoice.total_amount,
    seller_name: invoice.seller_name,
    buyer_name: invoice.buyer_name,
    validation_status: invoice.validation_status,
    confidence_level: calculateConfidenceLevel(invoice.field_confidences),
    field_count: Object.keys(invoice.extended_fields).length + 6, // 6个核心字段
    issues_count: invoice.validation_issues.length,
    is_complete: !!(invoice.invoice_number && invoice.total_amount && invoice.seller_name)
  };
}

// ===== 验证工具 =====

/**
 * 检查发票数据完整性
 */
export function validateInvoiceCompleteness(invoice: BaseInvoice): {
  isComplete: boolean;
  missingFields: string[];
  score: number;
} {
  const requiredFields = ['invoice_number', 'total_amount', 'seller_name'];
  const missingFields: string[] = [];
  
  requiredFields.forEach(field => {
    const value = field === 'total_amount' ? invoice.total_amount : 
                  field === 'invoice_number' ? invoice.invoice_number :
                  field === 'seller_name' ? invoice.seller_name : null;
    
    if (!value) {
      missingFields.push(field);
    }
  });
  
  const score = (requiredFields.length - missingFields.length) / requiredFields.length;
  
  return {
    isComplete: missingFields.length === 0,
    missingFields,
    score
  };
}

/**
 * 分析验证摘要
 */
export function analyzeValidationSummary(summary: ValidationSummary): {
  status: 'excellent' | 'good' | 'warning' | 'poor';
  message: string;
  recommendations: string[];
} {
  const { overall_score, confidence_score, missing_required, low_confidence } = summary;
  const recommendations: string[] = [];
  
  if (missing_required > 0) {
    recommendations.push(`补充 ${missing_required} 个必填字段`);
  }
  
  if (low_confidence > 0) {
    recommendations.push(`人工复核 ${low_confidence} 个低置信度字段`);
  }
  
  if (overall_score >= 0.9 && confidence_score >= 0.9) {
    return {
      status: 'excellent',
      message: '数据质量优秀，可直接使用',
      recommendations
    };
  } else if (overall_score >= 0.8 && confidence_score >= 0.8) {
    return {
      status: 'good',
      message: '数据质量良好，建议简单复核',
      recommendations
    };
  } else if (overall_score >= 0.6 || confidence_score >= 0.6) {
    return {
      status: 'warning',
      message: '数据质量一般，需要人工复核',
      recommendations
    };
  } else {
    return {
      status: 'poor',
      message: '数据质量较差，建议重新识别',
      recommendations: [...recommendations, '重新进行OCR识别']
    };
  }
}

// ===== 排序和过滤工具 =====

/**
 * 发票排序函数
 */
export function sortInvoices(invoices: BaseInvoice[], sortBy: string, direction: 'asc' | 'desc' = 'desc'): BaseInvoice[] {
  return [...invoices].sort((a, b) => {
    let valueA: any;
    let valueB: any;
    
    switch (sortBy) {
      case 'date':
        valueA = a.invoice_date ? new Date(a.invoice_date).getTime() : 0;
        valueB = b.invoice_date ? new Date(b.invoice_date).getTime() : 0;
        break;
      case 'amount':
        valueA = a.total_amount || 0;
        valueB = b.total_amount || 0;
        break;
      case 'seller':
        valueA = a.seller_name.toLowerCase();
        valueB = b.seller_name.toLowerCase();
        break;
      case 'type':
        valueA = a.invoice_type;
        valueB = b.invoice_type;
        break;
      case 'status':
        valueA = a.validation_status;
        valueB = b.validation_status;
        break;
      default:
        valueA = a.created_at || '';
        valueB = b.created_at || '';
    }
    
    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * 发票过滤函数
 */
export function filterInvoices(invoices: BaseInvoice[], filters: {
  type?: InvoiceType;
  status?: ValidationStatus;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  searchText?: string;
}): BaseInvoice[] {
  return invoices.filter(invoice => {
    // 类型过滤
    if (filters.type && invoice.invoice_type !== filters.type) {
      return false;
    }
    
    // 状态过滤
    if (filters.status && invoice.validation_status !== filters.status) {
      return false;
    }
    
    // 日期范围过滤
    if (filters.dateFrom && invoice.invoice_date) {
      if (new Date(invoice.invoice_date) < new Date(filters.dateFrom)) {
        return false;
      }
    }
    
    if (filters.dateTo && invoice.invoice_date) {
      if (new Date(invoice.invoice_date) > new Date(filters.dateTo)) {
        return false;
      }
    }
    
    // 金额范围过滤
    if (filters.amountMin !== undefined && (invoice.total_amount || 0) < filters.amountMin) {
      return false;
    }
    
    if (filters.amountMax !== undefined && (invoice.total_amount || 0) > filters.amountMax) {
      return false;
    }
    
    // 文本搜索过滤
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const searchableText = [
        invoice.invoice_number,
        invoice.seller_name,
        invoice.buyer_name,
        ...Object.values(invoice.extended_fields).map(v => String(v))
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });
}

// ===== 导出工具 =====

/**
 * 导出发票数据为 CSV 格式
 */
export function exportInvoicesToCSV(invoices: BaseInvoice[]): string {
  const headers = [
    '发票类型', '发票号码', '开票日期', '总金额', '销售方名称', '购买方名称',
    '验证状态', '置信度等级', '字段数量', '问题数量'
  ];
  
  const rows = invoices.map(invoice => [
    getInvoiceTypeDisplayName(invoice.invoice_type),
    invoice.invoice_number,
    formatDate(invoice.invoice_date),
    invoice.total_amount?.toString() || '',
    invoice.seller_name,
    invoice.buyer_name,
    getValidationStatusDisplayName(invoice.validation_status),
    getConfidenceLevelDisplayName(calculateConfidenceLevel(invoice.field_confidences)),
    (Object.keys(invoice.extended_fields).length + 6).toString(),
    invoice.validation_issues.length.toString()
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

/**
 * 生成发票数据统计报告
 */
export function generateInvoiceStats(invoices: BaseInvoice[]): {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byConfidenceLevel: Record<string, number>;
  totalAmount: number;
  avgAmount: number;
  completionRate: number;
} {
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byConfidenceLevel: Record<string, number> = {};
  let totalAmount = 0;
  let completeCount = 0;
  
  invoices.forEach(invoice => {
    // 按类型统计
    const type = getInvoiceTypeDisplayName(invoice.invoice_type);
    byType[type] = (byType[type] || 0) + 1;
    
    // 按状态统计
    const status = getValidationStatusDisplayName(invoice.validation_status);
    byStatus[status] = (byStatus[status] || 0) + 1;
    
    // 按置信度等级统计
    const confidenceLevel = getConfidenceLevelDisplayName(calculateConfidenceLevel(invoice.field_confidences));
    byConfidenceLevel[confidenceLevel] = (byConfidenceLevel[confidenceLevel] || 0) + 1;
    
    // 金额统计
    if (invoice.total_amount) {
      totalAmount += invoice.total_amount;
    }
    
    // 完整性统计
    if (invoice.invoice_number && invoice.total_amount && invoice.seller_name) {
      completeCount++;
    }
  });
  
  return {
    total: invoices.length,
    byType,
    byStatus,
    byConfidenceLevel,
    totalAmount,
    avgAmount: invoices.length > 0 ? totalAmount / invoices.length : 0,
    completionRate: invoices.length > 0 ? completeCount / invoices.length : 0
  };
}