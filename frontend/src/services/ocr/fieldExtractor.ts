/**
 * OCR字段提取器 - 智能字段识别和提取
 */
import { DEFAULT_FIELD_CONFIG, type FieldExtractionConfig, type OCRFieldMapping, type TransformationWarning } from '../../types/ocrTypes'
import { DataValidator } from './dataValidator'

export class FieldExtractor {
  private config: FieldExtractionConfig
  private validator: DataValidator
  private warnings: TransformationWarning[] = []

  constructor(config: FieldExtractionConfig = DEFAULT_FIELD_CONFIG) {
    this.config = config
    this.validator = new DataValidator(config)
  }

  /**
   * 从OCR结果中提取所有标准字段
   */
  extractAllFields(ocrFields: Record<string, any>): OCRFieldMapping {
    this.warnings = [] // 重置警告列表

    const extracted: OCRFieldMapping = {
      // 必填字段
      invoice_number: this.extractInvoiceNumber(ocrFields),
      seller_name: this.extractSellerName(ocrFields),
      total_amount: this.extractAmount(ocrFields, 'total'),
      amount_without_tax: this.extractAmount(ocrFields, 'without_tax'),
      tax_amount: this.extractAmount(ocrFields, 'tax'),
      currency: this.extractCurrency(ocrFields),
      invoice_date: this.extractDate(ocrFields, 'invoice_date'),
      
      // 可选字段
      invoice_code: this.extractInvoiceCode(ocrFields),
      seller_tax_number: this.extractSellerTaxNumber(ocrFields),
      buyer_name: this.extractBuyerName(ocrFields),
      buyer_tax_number: this.extractBuyerTaxNumber(ocrFields),
      consumption_date: this.extractDate(ocrFields, 'consumption_date'),
      invoice_type: this.extractInvoiceType(ocrFields),
      remarks: this.extractRemarks(ocrFields)
    }

    return extracted
  }

  /**
   * 获取提取过程中的警告信息
   */
  getWarnings(): TransformationWarning[] {
    return this.warnings
  }

  /**
   * 发票号码提取 (支持多种命名方式)
   */
  extractInvoiceNumber(fields: Record<string, any>): string {
    const possibleKeys = this.config.fieldNameMappings.invoice_number
    
    for (const key of possibleKeys) {
      const value = this.findFieldValue(fields, key)
      if (value && this.validator.isValidInvoiceNumber(value)) {
        const cleaned = this.validator.cleanInvoiceNumber(value)
        return cleaned
      }
    }
    
    // 如果没找到有效的发票号码，尝试模糊匹配
    const fuzzyResult = this.fuzzyExtractInvoiceNumber(fields)
    if (fuzzyResult) {
      this.addWarning('invoice_number', '使用模糊匹配提取发票号码', fields, fuzzyResult)
      return fuzzyResult
    }
    
    throw new Error('未找到有效的发票号码')
  }

  /**
   * 销售方名称提取
   */
  extractSellerName(fields: Record<string, any>): string {
    const possibleKeys = this.config.fieldNameMappings.seller_name
    
    for (const key of possibleKeys) {
      const value = this.findFieldValue(fields, key)
      if (value && typeof value === 'string' && value.trim().length > 0) {
        return this.validator.cleanCompanyName(value)
      }
    }
    
    throw new Error('未找到销售方名称')
  }

  /**
   * 金额提取和转换 (处理各种格式)
   */
  extractAmount(fields: Record<string, any>, type: 'total' | 'without_tax' | 'tax'): number {
    const amountKeys = this.config.fieldNameMappings
    let possibleKeys: string[] = []
    
    switch (type) {
      case 'total':
        possibleKeys = amountKeys.total_amount || []
        break
      case 'without_tax':
        possibleKeys = amountKeys.amount_without_tax || []
        break
      case 'tax':
        possibleKeys = amountKeys.tax_amount || []
        break
    }
    
    for (const key of possibleKeys) {
      const value = this.findFieldValue(fields, key)
      if (value !== undefined && value !== null && value !== '') {
        const parsed = this.validator.parseAmount(value)
        if (parsed > 0 || type === 'tax') { // 税额可以为0
          return parsed
        }
      }
    }
    
    // 如果没找到对应金额，尝试从其他金额推算
    if (type === 'without_tax') {
      const total = this.extractAmount(fields, 'total')
      const tax = this.extractAmount(fields, 'tax')
      if (total > 0 && tax >= 0) {
        const calculated = total - tax
        if (calculated > 0) {
          this.addWarning('amount_without_tax', '通过价税合计减去税额计算得出', null, calculated)
          return calculated
        }
      }
    }
    
    return 0 // 默认值
  }

  /**
   * 日期提取和标准化
   */
  extractDate(fields: Record<string, any>, dateType: 'invoice_date' | 'consumption_date'): string {
    const dateKeys = dateType === 'invoice_date' 
      ? this.config.fieldNameMappings.invoice_date || []
      : this.config.fieldNameMappings.consumption_date || []
    
    for (const key of dateKeys) {
      const value = this.findFieldValue(fields, key)
      if (value) {
        try {
          const standardized = this.validator.standardizeDate(value)
          if (this.validator.isValidDate(standardized)) {
            return standardized
          }
        } catch (error) {
          this.addWarning(dateType, `日期解析失败: ${error}`, value, null)
        }
      }
    }
    
    // 如果是发票日期且没找到，使用当前日期
    if (dateType === 'invoice_date') {
      const currentDate = new Date().toISOString().split('T')[0]
      this.addWarning('invoice_date', '未找到发票日期，使用当前日期', null, currentDate)
      return currentDate
    }
    
    return '' // 消费日期可以为空
  }

  /**
   * 发票代码提取
   */
  extractInvoiceCode(fields: Record<string, any>): string {
    const possibleKeys = this.config.fieldNameMappings.invoice_code || []
    
    for (const key of possibleKeys) {
      const value = this.findFieldValue(fields, key)
      if (value && this.validator.isValidInvoiceCode(value)) {
        return value.toString().trim()
      }
    }
    
    return '' // 发票代码可选
  }

  /**
   * 销售方税号提取
   */
  extractSellerTaxNumber(fields: Record<string, any>): string {
    const possibleKeys = this.config.fieldNameMappings.seller_tax_number || []
    
    for (const key of possibleKeys) {
      const value = this.findFieldValue(fields, key)
      if (value) {
        const cleaned = this.validator.cleanTaxNumber(value)
        if (this.validator.isValidTaxNumber(cleaned)) {
          return cleaned
        } else if (cleaned.length > 0) {
          this.addWarning('seller_tax_number', '税号格式可能不正确', value, cleaned)
          return cleaned
        }
      }
    }
    
    return '' // 税号可选
  }

  /**
   * 购买方名称提取
   */
  extractBuyerName(fields: Record<string, any>): string {
    const possibleKeys = this.config.fieldNameMappings.buyer_name || []
    
    for (const key of possibleKeys) {
      const value = this.findFieldValue(fields, key)
      if (value && typeof value === 'string' && value.trim().length > 0) {
        return this.validator.cleanCompanyName(value)
      }
    }
    
    return '' // 购买方名称可选
  }

  /**
   * 购买方税号提取
   */
  extractBuyerTaxNumber(fields: Record<string, any>): string {
    const possibleKeys = this.config.fieldNameMappings.buyer_tax_number || []
    
    for (const key of possibleKeys) {
      const value = this.findFieldValue(fields, key)
      if (value) {
        const cleaned = this.validator.cleanTaxNumber(value)
        if (this.validator.isValidTaxNumber(cleaned)) {
          return cleaned
        } else if (cleaned.length > 0) {
          this.addWarning('buyer_tax_number', '购买方税号格式可能不正确', value, cleaned)
          return cleaned
        }
      }
    }
    
    return '' // 购买方税号可选
  }

  /**
   * 币种提取
   */
  extractCurrency(fields: Record<string, any>): string {
    const possibleKeys = ['currency', 'Currency', '币种', '货币']
    
    for (const key of possibleKeys) {
      const value = this.findFieldValue(fields, key)
      if (value) {
        return this.validator.standardizeCurrency(value)
      }
    }
    
    return 'CNY' // 默认人民币
  }

  /**
   * 发票类型提取
   */
  extractInvoiceType(fields: Record<string, any>): string {
    const possibleKeys = ['invoice_type', 'type', '发票类型', '类型']
    
    for (const key of possibleKeys) {
      const value = this.findFieldValue(fields, key)
      if (value && typeof value === 'string') {
        return value.trim()
      }
    }
    
    return '' // 发票类型可选
  }

  /**
   * 备注提取
   */
  extractRemarks(fields: Record<string, any>): string {
    const possibleKeys = ['remarks', 'remark', 'notes', 'note', '备注', '说明']
    
    for (const key of possibleKeys) {
      const value = this.findFieldValue(fields, key)
      if (value && typeof value === 'string' && value.trim().length > 0) {
        return value.trim()
      }
    }
    
    return '' // 备注可选
  }

  /**
   * 在嵌套对象中查找字段值 (支持大小写不敏感和模糊匹配)
   */
  private findFieldValue(obj: Record<string, any>, targetKey: string): any {
    // 精确匹配
    if (obj.hasOwnProperty(targetKey)) {
      return obj[targetKey]
    }
    
    // 大小写不敏感匹配
    for (const [key, value] of Object.entries(obj)) {
      if (key.toLowerCase() === targetKey.toLowerCase()) {
        return value
      }
    }
    
    // 递归搜索嵌套对象
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const found = this.findFieldValue(value, targetKey)
        if (found !== undefined) return found
      }
    }
    
    return undefined
  }

  /**
   * 模糊匹配提取发票号码
   */
  private fuzzyExtractInvoiceNumber(fields: Record<string, any>): string | null {
    // 在所有字段中寻找看起来像发票号码的值
    const searchInObject = (obj: any): string | null => {
      if (typeof obj === 'string' || typeof obj === 'number') {
        const str = obj.toString().replace(/\s+/g, '')
        if (/^\d{8,12}$/.test(str)) {
          return str
        }
      }
      
      if (typeof obj === 'object' && obj !== null) {
        for (const value of Object.values(obj)) {
          const result = searchInObject(value)
          if (result) return result
        }
      }
      
      return null
    }
    
    return searchInObject(fields)
  }

  /**
   * 添加警告信息
   */
  private addWarning(field: string, message: string, originalValue: any, correctedValue: any): void {
    this.warnings.push({
      field,
      message,
      originalValue,
      correctedValue,
      severity: 'medium'
    })
  }
}