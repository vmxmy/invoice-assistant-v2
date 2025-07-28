/**
 * OCR数据转换服务主入口
 * 统一处理OCR结果到数据库记录的转换
 */
import { 
  type EdgeFunctionOCRResponse 
} from '../edgeFunctionOCR'
import { 
  type OCRFieldMapping, 
  type DatabaseInvoiceRecord, 
  type FileMetadata, 
  type TransformationResult,
  type TransformationWarning,
  type TransformationError
} from '../../types/ocrTypes'
import { FieldExtractor } from './fieldExtractor'
import { DataValidator } from './dataValidator'
import { BusinessRuleProcessor } from './businessRuleProcessor'

export class OCRDataTransformer {
  private fieldExtractor: FieldExtractor
  private dataValidator: DataValidator
  private businessRuleProcessor: BusinessRuleProcessor

  constructor() {
    this.fieldExtractor = new FieldExtractor()
    this.dataValidator = new DataValidator()
    this.businessRuleProcessor = new BusinessRuleProcessor()
  }

  /**
   * 主转换方法：OCR结果 → 数据库记录
   */
  async transformOCRToInvoice(
    ocrResult: EdgeFunctionOCRResponse,
    fileMetadata: FileMetadata
  ): Promise<TransformationResult> {
    const startTime = performance.now()
    
    try {
      // 1. 验证OCR结果基本结构
      this.validateOCRResult(ocrResult)
      
      // 2. 提取和清理字段数据
      const extractedFields = this.fieldExtractor.extractAllFields(ocrResult.fields)
      
      // 3. 应用业务规则处理
      const processedFields = this.businessRuleProcessor.applyBusinessRules(extractedFields)
      
      // 4. 最终数据验证
      const validationResult = this.dataValidator.validateAllFields(processedFields)
      
      // 5. 构造数据库记录
      const databaseRecord = this.buildDatabaseRecord(
        ocrResult, 
        processedFields, 
        fileMetadata
      )
      
      // 6. 收集所有警告和错误
      const allWarnings = [
        ...this.fieldExtractor.getWarnings(),
        ...this.businessRuleProcessor.getWarnings(),
        ...validationResult.warnings.map(w => ({
          field: w.field,
          message: w.message,
          originalValue: w.value,
          correctedValue: null,
          severity: 'medium' as const
        }))
      ]
      
      const allErrors = [
        ...this.businessRuleProcessor.getErrors(),
        ...validationResult.errors.map(e => ({
          field: e.field,
          message: e.message,
          code: 'VALIDATION_ERROR',
          value: e.value,
          recoverable: true
        }))
      ]
      
      // 7. 计算数据质量评分
      const qualityScore = this.businessRuleProcessor.calculateDataQualityScore(processedFields)
      const processingTime = performance.now() - startTime
      
      return {
        success: allErrors.length === 0,
        data: databaseRecord,
        warnings: allWarnings,
        errors: allErrors,
        processingInfo: {
          fieldsExtracted: Object.keys(processedFields).filter(key => 
            processedFields[key as keyof OCRFieldMapping] !== undefined && 
            processedFields[key as keyof OCRFieldMapping] !== ''
          ).length,
          confidence: Math.min(ocrResult.confidence.overall, qualityScore),
          processingTime: processingTime
        }
      }
      
    } catch (error) {
      const processingTime = performance.now() - startTime
      
      return {
        success: false,
        warnings: [],
        errors: [{
          field: 'general',
          message: error instanceof Error ? error.message : '转换过程发生未知错误',
          code: 'TRANSFORMATION_ERROR',
          value: null,
          recoverable: false
        }],
        processingInfo: {
          fieldsExtracted: 0,
          confidence: 0,
          processingTime: processingTime
        }
      }
    }
  }

  /**
   * 验证OCR结果基本结构
   */
  private validateOCRResult(ocrResult: EdgeFunctionOCRResponse): void {
    if (!ocrResult) {
      throw new Error('OCR结果为空')
    }
    
    if (!ocrResult.success) {
      throw new Error(`OCR处理失败: ${ocrResult.validation?.overall_errors?.join(', ') || '未知错误'}`)
    }
    
    if (!ocrResult.fields || typeof ocrResult.fields !== 'object') {
      throw new Error('OCR结果中缺少字段数据')
    }
    
    if (!ocrResult.confidence || typeof ocrResult.confidence.overall !== 'number') {
      throw new Error('OCR结果中缺少置信度信息')
    }
  }

  /**
   * 构造数据库记录
   */
  private buildDatabaseRecord(
    ocrResult: EdgeFunctionOCRResponse,
    processedFields: OCRFieldMapping,
    fileMetadata: FileMetadata
  ): DatabaseInvoiceRecord {
    const now = new Date().toISOString()
    
    return {
      // 系统字段
      user_id: fileMetadata.userId,
      source: 'upload',
      status: 'active',
      is_verified: false,
      processing_status: 'completed',
      
      // 文件信息
      file_path: fileMetadata.filePath,
      file_name: fileMetadata.fileName,
      file_size: fileMetadata.fileSize,
      file_hash: fileMetadata.fileHash,
      file_url: fileMetadata.fileUrl,
      
      // 核心发票信息
      invoice_number: processedFields.invoice_number,
      invoice_code: processedFields.invoice_code,
      invoice_type: processedFields.invoice_type,
      invoice_date: processedFields.invoice_date || null,
      consumption_date: processedFields.consumption_date || null,
      
      // 金额信息
      total_amount: processedFields.total_amount,
      amount_without_tax: processedFields.amount_without_tax,
      tax_amount: processedFields.tax_amount,
      currency: processedFields.currency,
      
      // 买卖方信息
      seller_name: processedFields.seller_name,
      seller_tax_number: processedFields.seller_tax_number,
      buyer_name: processedFields.buyer_name,
      buyer_tax_number: processedFields.buyer_tax_number,
      
      // 其他信息
      title: this.generateInvoiceTitle(processedFields),
      document_number: processedFields.invoice_number, // 使用发票号码作为单据号
      remarks: processedFields.remarks,
      notes: null,
      
      // OCR元数据
      ocr_field_confidences: ocrResult.confidence.fields || {},
      ocr_overall_confidence: ocrResult.confidence.overall,
      ocr_processing_metadata: {
        processing_time: ocrResult.metadata?.total_processing_time || 0,
        processing_steps: ocrResult.processing_steps || [],
        ocr_engine: 'edge-function-ocr',
        timestamp: ocrResult.metadata?.timestamp || now
      },
      
      // 原始数据
      extracted_data: {
        original_ocr_fields: ocrResult.fields,
        processed_fields: processedFields,
        raw_ocr_data: ocrResult.raw_ocr_data,
        validation: ocrResult.validation
      },
      source_metadata: {
        upload_method: 'drag_drop_or_click',
        processing_method: 'edge_function'
      },
      extra_data: {},
      
      // 时间戳
      started_at: now,
      completed_at: now,
      last_activity_at: now
    }
  }

  /**
   * 生成发票标题
   */
  private generateInvoiceTitle(fields: OCRFieldMapping): string {
    const parts: string[] = []
    
    // 添加销售方名称（截短）
    if (fields.seller_name) {
      const shortName = fields.seller_name.length > 10 
        ? fields.seller_name.substring(0, 10) + '...'
        : fields.seller_name
      parts.push(shortName)
    }
    
    // 添加发票类型
    if (fields.invoice_type) {
      parts.push(fields.invoice_type)
    }
    
    // 添加金额
    if (fields.total_amount > 0) {
      parts.push(`¥${fields.total_amount.toFixed(2)}`)
    }
    
    // 如果没有足够信息，使用默认标题
    if (parts.length === 0) {
      return `发票-${fields.invoice_number || '未知号码'}`
    }
    
    return parts.join(' ')
  }

  /**
   * 批量转换多个OCR结果
   */
  async transformMultipleOCRResults(
    ocrResults: Array<{ ocrResult: EdgeFunctionOCRResponse; fileMetadata: FileMetadata }>
  ): Promise<TransformationResult[]> {
    const results: TransformationResult[] = []
    
    for (const { ocrResult, fileMetadata } of ocrResults) {
      try {
        const result = await this.transformOCRToInvoice(ocrResult, fileMetadata)
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          warnings: [],
          errors: [{
            field: 'general',
            message: `批量处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
            code: 'BATCH_PROCESSING_ERROR',
            value: fileMetadata.fileName,
            recoverable: false
          }],
          processingInfo: {
            fieldsExtracted: 0,
            confidence: 0,
            processingTime: 0
          }
        })
      }
    }
    
    return results
  }

  /**
   * 获取转换统计信息
   */
  getTransformationStats(results: TransformationResult[]): {
    total: number
    successful: number
    failed: number
    avgConfidence: number
    avgProcessingTime: number
    totalWarnings: number
    totalErrors: number
  } {
    const successful = results.filter(r => r.success).length
    const failed = results.length - successful
    
    const avgConfidence = results.length > 0
      ? results.reduce((sum, r) => sum + r.processingInfo.confidence, 0) / results.length
      : 0
    
    const avgProcessingTime = results.length > 0
      ? results.reduce((sum, r) => sum + r.processingInfo.processingTime, 0) / results.length
      : 0
    
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)
    
    return {
      total: results.length,
      successful,
      failed,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      avgProcessingTime: Math.round(avgProcessingTime * 100) / 100,
      totalWarnings,
      totalErrors
    }
  }

  /**
   * 重置所有处理器状态
   */
  reset(): void {
    this.fieldExtractor = new FieldExtractor()
    this.dataValidator = new DataValidator()
    this.businessRuleProcessor = new BusinessRuleProcessor()
  }
}