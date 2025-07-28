/**
 * OCR数据转换服务入口
 * 统一导出所有OCR相关的服务和类型
 */

// 主要服务类
export { OCRDataTransformer } from './ocrDataTransformer'
export { FieldExtractor } from './fieldExtractor'
export { DataValidator } from './dataValidator'
export { BusinessRuleProcessor } from './businessRuleProcessor'

// 类型定义
export type {
  OCRFieldMapping,
  DatabaseInvoiceRecord,
  FileMetadata,
  TransformationResult,
  TransformationWarning,
  TransformationError,
  FieldExtractionConfig,
  BusinessRulesConfig
} from '../../types/ocrTypes'

// 默认配置
export {
  DEFAULT_FIELD_CONFIG,
  DEFAULT_BUSINESS_RULES
} from '../../types/ocrTypes'

// 便捷函数
import { OCRDataTransformer } from './ocrDataTransformer'
import type { EdgeFunctionOCRResponse } from '../edgeFunctionOCR'
import type { FileMetadata, TransformationResult } from '../../types/ocrTypes'

/**
 * 创建默认的OCR数据转换实例
 */
export function createOCRTransformer(): OCRDataTransformer {
  return new OCRDataTransformer()
}

/**
 * 快速转换单个OCR结果
 */
export async function quickTransformOCR(
  ocrResult: EdgeFunctionOCRResponse,
  fileMetadata: FileMetadata
): Promise<TransformationResult> {
  const transformer = createOCRTransformer()
  return await transformer.transformOCRToInvoice(ocrResult, fileMetadata)
}

/**
 * 快速批量转换多个OCR结果
 */
export async function quickTransformMultipleOCR(
  ocrResults: Array<{ ocrResult: EdgeFunctionOCRResponse; fileMetadata: FileMetadata }>
): Promise<TransformationResult[]> {
  const transformer = createOCRTransformer()
  return await transformer.transformMultipleOCRResults(ocrResults)
}