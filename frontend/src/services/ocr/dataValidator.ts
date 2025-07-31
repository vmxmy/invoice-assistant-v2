/**
 * OCR数据验证和清理工具
 */
import { DEFAULT_FIELD_CONFIG, type FieldExtractionConfig } from '../../types/ocrTypes'

export class DataValidator {
  private config: FieldExtractionConfig

  constructor(config: FieldExtractionConfig = DEFAULT_FIELD_CONFIG) {
    this.config = config
  }

  /**
   * 发票号码验证和清理
   */
  isValidInvoiceNumber(value: any): boolean {
    if (typeof value !== 'string' && typeof value !== 'number') return false
    
    const cleaned = this.cleanInvoiceNumber(value)
    return this.config.validationRules.invoiceNumberPattern.test(cleaned)
  }

  cleanInvoiceNumber(value: any): string {
    if (typeof value === 'number') return value.toString()
    if (typeof value !== 'string') return ''
    
    // 移除所有非数字字符
    return value.replace(/\D/g, '')
  }

  /**
   * 金额解析和验证 (支持中文、英文、符号)
   */
  parseAmount(value: any): number {
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : Math.round(value * 100) / 100 // 保留2位小数
    }
    
    if (typeof value !== 'string') return 0
    
    // 移除货币符号和空格
    let cleanValue = value
    
    // 移除货币符号
    for (const symbol of this.config.typeConversions.amountFormats.currencySymbols) {
      cleanValue = cleanValue.replace(new RegExp(`\\${symbol}`, 'g'), '')
    }
    
    // 移除千位分隔符
    for (const separator of this.config.typeConversions.amountFormats.thousandSeparators) {
      cleanValue = cleanValue.replace(new RegExp(`\\${separator}`, 'g'), '')
    }
    
    // 处理小数分隔符 (统一为英文句点)
    for (const separator of this.config.typeConversions.amountFormats.decimalSeparators) {
      if (separator !== '.') {
        cleanValue = cleanValue.replace(new RegExp(`\\${separator}`, 'g'), '.')
      }
    }
    
    // 移除其他非数字字符 (保留小数点和负号)
    cleanValue = cleanValue.replace(/[^\d.-]/g, '')
    
    // 处理中文数字
    cleanValue = this.convertChineseNumbers(cleanValue)
    
    const parsed = parseFloat(cleanValue)
    return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100
  }

  /**
   * 验证金额范围
   */
  isValidAmount(amount: number): boolean {
    const { min, max } = this.config.validationRules.amountRange
    return amount >= min && amount <= max
  }

  /**
   * 中文数字转换为阿拉伯数字
   */
  private convertChineseNumbers(value: string): string {
    const chineseNumbers: Record<string, string> = {
      '零': '0', '一': '1', '二': '2', '三': '3', '四': '4',
      '五': '5', '六': '6', '七': '7', '八': '8', '九': '9',
      '十': '10', '百': '00', '千': '000', '万': '0000'
    }

    let result = value
    for (const [chinese, arabic] of Object.entries(chineseNumbers)) {
      result = result.replace(new RegExp(chinese, 'g'), arabic)
    }

    return result
  }

  /**
   * 日期标准化和验证 (支持多种格式)
   */
  standardizeDate(value: any): string {
    if (!value) return new Date().toISOString().split('T')[0]
    
    const valueStr = value.toString().trim()
    
    // 处理常见日期格式
    const datePatterns = [
      // 中文格式: 2024年01月15日
      { pattern: /(\d{4})[年](\d{1,2})[月](\d{1,2})[日]?/, format: 'YYYY年MM月DD日' },
      // ISO格式: 2024-01-15
      { pattern: /(\d{4})[-](\d{1,2})[-](\d{1,2})/, format: 'YYYY-MM-DD' },
      // 斜杠格式: 2024/01/15
      { pattern: /(\d{4})\/(\d{1,2})\/(\d{1,2})/, format: 'YYYY/MM/DD' },
      // 美式格式: 01/15/2024
      { pattern: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, format: 'MM/DD/YYYY' },
      // 欧式格式: 15/01/2024
      { pattern: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, format: 'DD/MM/YYYY' }
    ]
    
    for (const { pattern, format } of datePatterns) {
      const match = valueStr.match(pattern)
      if (match) {
        let year: string, month: string, day: string
        
        switch (format) {
          case 'YYYY年MM月DD日':
          case 'YYYY-MM-DD':
          case 'YYYY/MM/DD':
            [, year, month, day] = match
            break
          case 'MM/DD/YYYY':
            [, month, day, year] = match
            break
          case 'DD/MM/YYYY':
            [, day, month, year] = match
            break
          default:
            continue
        }
        
        // 格式化为标准格式
        const standardDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        
        // 验证日期有效性
        if (this.isValidDate(standardDate)) {
          return standardDate
        }
      }
    }
    
    // 如果无法解析，返回当前日期
    console.warn(`无法解析日期格式: ${valueStr}，使用当前日期`)
    return new Date().toISOString().split('T')[0]
  }

  /**
   * 验证日期格式和范围
   */
  isValidDate(dateString: string): boolean {
    // 检查基本格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false
    
    // 检查日期有效性
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return false
    
    // 检查日期范围
    const { earliest, latest } = this.config.validationRules.dateRange
    return dateString >= earliest && dateString <= latest
  }

  /**
   * 税号验证和清理
   */
  isValidTaxNumber(value: any): boolean {
    if (typeof value !== 'string') return false
    
    const cleaned = this.cleanTaxNumber(value)
    return this.config.validationRules.taxNumberPattern.test(cleaned)
  }

  cleanTaxNumber(value: any): string {
    if (typeof value !== 'string') return ''
    
    // 移除空格和特殊字符，保留字母和数字
    return value.replace(/[^A-Z0-9]/gi, '').toUpperCase()
  }

  /**
   * 公司名称清理
   */
  cleanCompanyName(value: any): string {
    if (typeof value !== 'string') return ''
    
    // 移除前后空白
    let cleaned = value.trim()
    
    // 移除常见的无效字符
    cleaned = cleaned.replace(/[\r\n\t]/g, ' ')
    
    // 多个空格合并为一个
    cleaned = cleaned.replace(/\s+/g, ' ')
    
    return cleaned
  }

  /**
   * 发票代码验证
   */
  isValidInvoiceCode(value: any): boolean {
    if (typeof value !== 'string' && typeof value !== 'number') return false
    
    const str = value.toString().replace(/\s+/g, '')
    // 发票代码通常是10-12位数字
    return /^\d{10,12}$/.test(str)
  }

  /**
   * 币种验证和标准化
   */
  standardizeCurrency(value: any): string {
    if (typeof value !== 'string') return 'CNY'
    
    const currencyMap: Record<string, string> = {
      '人民币': 'CNY',
      'RMB': 'CNY',
      '元': 'CNY',
      '美元': 'USD',
      'USD': 'USD',
      '$': 'USD',
      '欧元': 'EUR',
      'EUR': 'EUR',
      '€': 'EUR',
      '英镑': 'GBP',
      'GBP': 'GBP',
      '£': 'GBP'
    }
    
    const normalized = value.trim().toUpperCase()
    return currencyMap[normalized] || 'CNY'
  }

  /**
   * 综合数据验证
   */
  validateAllFields(fields: Record<string, any>): {
    isValid: boolean
    errors: Array<{ field: string; message: string; value: any }>
    warnings: Array<{ field: string; message: string; value: any }>
  } {
    const errors: Array<{ field: string; message: string; value: any }> = []
    const warnings: Array<{ field: string; message: string; value: any }> = []

    // 验证发票号码
    if (fields.invoice_number && !this.isValidInvoiceNumber(fields.invoice_number)) {
      errors.push({
        field: 'invoice_number',
        message: '发票号码格式不正确',
        value: fields.invoice_number
      })
    }

    // 验证金额
    if (fields.total_amount !== undefined) {
      const amount = this.parseAmount(fields.total_amount)
      if (!this.isValidAmount(amount)) {
        errors.push({
          field: 'total_amount',
          message: `金额超出有效范围 (${this.config.validationRules.amountRange.min}-${this.config.validationRules.amountRange.max})`,
          value: fields.total_amount
        })
      }
    }

    // 验证日期
    if (fields.invoice_date) {
      try {
        const standardDate = this.standardizeDate(fields.invoice_date)
        if (!this.isValidDate(standardDate)) {
          warnings.push({
            field: 'invoice_date',
            message: '日期格式可能不正确，已使用当前日期',
            value: fields.invoice_date
          })
        }
      } catch (error) {
        warnings.push({
          field: 'invoice_date',
          message: '日期解析失败，已使用当前日期',
          value: fields.invoice_date
        })
      }
    }

    // 验证税号
    if (fields.seller_tax_number && !this.isValidTaxNumber(fields.seller_tax_number)) {
      warnings.push({
        field: 'seller_tax_number',
        message: '销售方税号格式可能不正确',
        value: fields.seller_tax_number
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}