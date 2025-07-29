/**
 * 共享类型定义
 * 定义所有Edge Functions使用的通用数据类型
 */

export interface ProcessingResult<T = any> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    processing_time?: number
    confidence?: number
    step?: string
    timestamp?: string
  }
}

export interface FileValidationResult {
  valid: boolean
  file_info: {
    name: string
    size: number
    type: string
    extension: string
  }
  security_check: 'passed' | 'failed'
  errors: string[]
  warnings: string[]
}

export interface OCRRecognitionResult {
  raw_ocr_data: any
  invoice_type: string
  processing_time: number
  confidence: number
  api_response: any
}

export interface ParsedInvoiceData {
  invoice_type: string
  fields: Record<string, any>
  field_confidences: Record<string, number>
  structured_data: any
  validation_ready: boolean
}

export interface FieldValidationResult {
  is_valid: boolean
  field_results: Record<string, {
    valid: boolean
    errors: string[]
    warnings: string[]
    confidence: number
  }>
  overall_errors: string[]
  overall_warnings: string[]
  completeness_score: number
}

export interface OCRCompleteResponse {
  success: boolean
  invoice_type: string
  fields: Record<string, any>
  confidence: {
    overall: number
    fields: Record<string, number>
  }
  validation: FieldValidationResult
  raw_ocr_data: any
  processing_steps: string[]
  metadata: {
    total_processing_time: number
    step_timings: Record<string, number>
    timestamp: string
  }
}

export interface FunctionConfig {
  timeout?: number
  retries?: number
  cache_enabled?: boolean
  log_level?: 'debug' | 'info' | 'warn' | 'error'
}

export interface EdgeFunctionContext {
  user_id?: string
  request_id: string
  config: FunctionConfig
  supabase_client?: any
}