/**
 * 业务规则处理器
 * 应用发票业务逻辑和数据修正规则
 */
import { DEFAULT_BUSINESS_RULES, type BusinessRulesConfig, type OCRFieldMapping, type TransformationWarning, type TransformationError } from '../../types/ocrTypes'

export class BusinessRuleProcessor {
  private config: BusinessRulesConfig
  private warnings: TransformationWarning[] = []
  private errors: TransformationError[] = []

  constructor(config: BusinessRulesConfig = DEFAULT_BUSINESS_RULES) {
    this.config = config
  }

  /**
   * 应用所有业务规则
   */
  applyBusinessRules(fields: OCRFieldMapping): OCRFieldMapping {
    this.warnings = []
    this.errors = []

    // 创建副本以避免修改原始数据
    const processedFields = { ...fields }

    // 1. 验证必填字段
    this.validateRequiredFields(processedFields)

    // 2. 金额一致性检查和修正
    this.validateAndCorrectAmounts(processedFields)

    // 3. 税率计算和验证
    this.calculateAndValidateTax(processedFields)

    // 4. 发票类型推断
    this.inferInvoiceType(processedFields)

    // 5. 数据完整性检查
    this.validateDataIntegrity(processedFields)

    // 6. 业务逻辑修正
    this.applyBusinessCorrections(processedFields)

    return processedFields
  }

  /**
   * 获取处理过程中的警告
   */
  getWarnings(): TransformationWarning[] {
    return this.warnings
  }

  /**
   * 获取处理过程中的错误
   */
  getErrors(): TransformationError[] {
    return this.errors
  }

  /**
   * 验证必填字段
   */
  private validateRequiredFields(fields: OCRFieldMapping): void {
    for (const requiredField of this.config.requiredFields) {
      const value = (fields as any)[requiredField]
      
      if (value === undefined || value === null || value === '') {
        this.addError(
          requiredField,
          `必填字段 ${requiredField} 缺失`,
          'REQUIRED_FIELD_MISSING',
          value,
          false
        )
      }
    }
  }

  /**
   * 金额一致性验证和修正
   */
  private validateAndCorrectAmounts(fields: OCRFieldMapping): void {
    const { total_amount, amount_without_tax, tax_amount } = fields
    const tolerance = this.config.amountValidation.tolerance

    // 如果所有金额都存在，检查一致性
    if (total_amount > 0 && amount_without_tax > 0 && tax_amount >= 0) {
      const calculated = amount_without_tax + tax_amount
      const difference = Math.abs(calculated - total_amount)

      if (difference > tolerance) {
        if (this.config.amountValidation.autoCorrection) {
          // 自动修正策略：以价税合计为准
          this.correctAmountsBasedOnTotal(fields)
          
          this.addWarning(
            'total_amount',
            `金额不一致已自动修正，差额: ${difference.toFixed(2)}`,
            { total: total_amount, calculated },
            { total: fields.total_amount, without_tax: fields.amount_without_tax, tax: fields.tax_amount },
            'medium'
          )
        } else {
          this.addError(
            'total_amount',
            `金额不一致，差额: ${difference.toFixed(2)}`,
            'AMOUNT_INCONSISTENT',
            { total: total_amount, calculated },
            true
          )
        }
      }
    }
    // 如果只有部分金额，尝试计算缺失的
    else if (total_amount > 0 && amount_without_tax > 0 && tax_amount === 0) {
      // 计算税额
      fields.tax_amount = total_amount - amount_without_tax
      this.addWarning(
        'tax_amount',
        '税额通过价税合计减去不含税金额计算得出',
        0,
        fields.tax_amount,
        'low'
      )
    }
    else if (total_amount > 0 && tax_amount > 0 && amount_without_tax === 0) {
      // 计算不含税金额
      fields.amount_without_tax = total_amount - tax_amount
      this.addWarning(
        'amount_without_tax',
        '不含税金额通过价税合计减去税额计算得出',
        0,
        fields.amount_without_tax,
        'low'
      )
    }
  }

  /**
   * 基于价税合计修正其他金额
   */
  private correctAmountsBasedOnTotal(fields: OCRFieldMapping): void {
    const { total_amount, invoice_type } = fields
    
    // 根据发票类型获取标准税率
    const standardTaxRate = this.getStandardTaxRate(invoice_type)
    
    if (standardTaxRate > 0) {
      // 使用标准税率反推金额
      fields.amount_without_tax = total_amount / (1 + standardTaxRate)
      fields.tax_amount = total_amount - fields.amount_without_tax
      
      // 保留2位小数
      fields.amount_without_tax = Math.round(fields.amount_without_tax * 100) / 100
      fields.tax_amount = Math.round(fields.tax_amount * 100) / 100
    } else {
      // 如果没有标准税率，假设13%的税率
      const assumedTaxRate = 0.13
      fields.amount_without_tax = total_amount / (1 + assumedTaxRate)
      fields.tax_amount = total_amount - fields.amount_without_tax
      
      fields.amount_without_tax = Math.round(fields.amount_without_tax * 100) / 100
      fields.tax_amount = Math.round(fields.tax_amount * 100) / 100
      
      this.addWarning(
        'tax_amount',
        `使用假设税率 ${(assumedTaxRate * 100)}% 计算金额`,
        null,
        { tax_rate: assumedTaxRate },
        'medium'
      )
    }
  }

  /**
   * 税率计算和验证
   */
  private calculateAndValidateTax(fields: OCRFieldMapping): void {
    const { amount_without_tax, tax_amount, invoice_type } = fields
    
    if (amount_without_tax > 0 && tax_amount > 0) {
      const actualTaxRate = tax_amount / amount_without_tax
      const standardTaxRate = this.getStandardTaxRate(invoice_type)
      
      if (standardTaxRate > 0) {
        const rateDifference = Math.abs(actualTaxRate - standardTaxRate)
        
        // 如果税率差异超过1%，发出警告
        if (rateDifference > 0.01) {
          this.addWarning(
            'tax_amount',
            `税率异常：实际 ${(actualTaxRate * 100).toFixed(2)}%，标准 ${(standardTaxRate * 100).toFixed(2)}%`,
            actualTaxRate,
            standardTaxRate,
            'high'
          )
        }
      }
    }
  }

  /**
   * 获取标准税率
   */
  private getStandardTaxRate(invoiceType?: string): number {
    if (!invoiceType) return 0
    
    return this.config.taxRates[invoiceType] || 0
  }

  /**
   * 发票类型推断
   */
  private inferInvoiceType(fields: OCRFieldMapping): void {
    // 如果已有发票类型，不需要推断
    if (fields.invoice_type && fields.invoice_type.trim().length > 0) {
      return
    }

    // 基于发票号码和代码推断类型
    const { invoice_number, invoice_code } = fields
    
    let inferredType = ''
    
    // 根据发票号码长度和格式推断
    if (invoice_number) {
      if (invoice_number.length === 8) {
        inferredType = '增值税普通发票'
      } else if (invoice_number.length === 12) {
        inferredType = '增值税专用发票'
      }
    }
    
    // 根据发票代码进一步细化
    if (invoice_code && invoice_code.startsWith('01')) {
      inferredType = '增值税电子发票'
    }
    
    if (inferredType) {
      fields.invoice_type = inferredType
      this.addWarning(
        'invoice_type',
        `发票类型已自动推断`,
        null,
        inferredType,
        'low'
      )
    }
  }

  /**
   * 数据完整性验证
   */
  private validateDataIntegrity(fields: OCRFieldMapping): void {
    // 验证日期逻辑
    if (fields.invoice_date && fields.consumption_date) {
      if (fields.consumption_date > fields.invoice_date) {
        this.addWarning(
          'consumption_date',
          '消费日期晚于开票日期，可能存在异常',
          fields.consumption_date,
          null,
          'medium'
        )
      }
    }

    // 验证公司信息一致性
    if (fields.seller_name && fields.buyer_name) {
      if (fields.seller_name === fields.buyer_name) {
        this.addWarning(
          'buyer_name',
          '销售方和购买方名称相同，请检查',
          fields.buyer_name,
          null,
          'high'
        )
      }
    }

    // 验证税号格式
    if (fields.seller_tax_number && fields.buyer_tax_number) {
      if (fields.seller_tax_number === fields.buyer_tax_number) {
        this.addError(
          'buyer_tax_number',
          '销售方和购买方税号相同',
          'DUPLICATE_TAX_NUMBER',
          fields.buyer_tax_number,
          true
        )
      }
    }
  }

  /**
   * 应用业务修正
   */
  private applyBusinessCorrections(fields: OCRFieldMapping): void {
    // 金额精度修正 (保留2位小数)
    if (fields.total_amount) {
      fields.total_amount = Math.round(fields.total_amount * 100) / 100
    }
    if (fields.amount_without_tax) {
      fields.amount_without_tax = Math.round(fields.amount_without_tax * 100) / 100
    }
    if (fields.tax_amount) {
      fields.tax_amount = Math.round(fields.tax_amount * 100) / 100
    }

    // 公司名称规范化
    if (fields.seller_name) {
      fields.seller_name = this.normalizeCompanyName(fields.seller_name)
    }
    if (fields.buyer_name) {
      fields.buyer_name = this.normalizeCompanyName(fields.buyer_name)
    }

    // 发票号码规范化
    if (fields.invoice_number) {
      fields.invoice_number = fields.invoice_number.replace(/\D/g, '')
    }
  }

  /**
   * 公司名称规范化
   */
  private normalizeCompanyName(name: string): string {
    if (!name) return name
    
    // 移除多余空格
    let normalized = name.trim().replace(/\s+/g, ' ')
    
    // 统一常见公司后缀
    const suffixMap: Record<string, string> = {
      '有限责任公司': '有限公司',
      '股份有限责任公司': '股份有限公司',
      '有限责任公司分公司': '有限公司分公司'
    }
    
    for (const [original, standard] of Object.entries(suffixMap)) {
      if (normalized.endsWith(original)) {
        normalized = normalized.slice(0, -original.length) + standard
        break
      }
    }
    
    return normalized
  }

  /**
   * 添加警告信息
   */
  private addWarning(
    field: string,
    message: string,
    originalValue: any,
    correctedValue: any,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): void {
    this.warnings.push({
      field,
      message,
      originalValue,
      correctedValue,
      severity
    })
  }

  /**
   * 添加错误信息
   */
  private addError(
    field: string,
    message: string,
    code: string,
    value: any,
    recoverable: boolean
  ): void {
    this.errors.push({
      field,
      message,
      code,
      value,
      recoverable
    })
  }

  /**
   * 数据质量评分
   */
  calculateDataQualityScore(fields: OCRFieldMapping): number {
    let score = 100
    const penalties = {
      missingRequired: -20,
      missingOptional: -5,
      warning: -2,
      error: -10
    }

    // 必填字段缺失扣分
    for (const requiredField of this.config.requiredFields) {
      const value = (fields as any)[requiredField]
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        score += penalties.missingRequired
      }
    }

    // 可选字段缺失轻微扣分
    const optionalFields = ['invoice_code', 'buyer_name', 'buyer_tax_number', 'consumption_date']
    for (const optionalField of optionalFields) {
      const value = (fields as any)[optionalField]
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        score += penalties.missingOptional
      }
    }

    // 警告扣分
    score += this.warnings.length * penalties.warning

    // 错误扣分
    score += this.errors.length * penalties.error

    return Math.max(0, Math.min(100, score))
  }
}