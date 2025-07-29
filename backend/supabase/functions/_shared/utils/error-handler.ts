/**
 * 统一错误处理工具
 * 提供标准化的错误处理和响应格式
 */

import type { EdgeFunctionContext, ProcessingResult } from '../types/index.ts'
import { createLogger } from './logger.ts'

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  FILE_ERROR = 'FILE_ERROR'
}

export interface ErrorDetails {
  code: ErrorCode
  message: string
  details?: any
  retryable?: boolean
  user_message?: string
}

export class EdgeFunctionError extends Error {
  code: ErrorCode
  details?: any
  retryable: boolean
  userMessage: string

  constructor(error: ErrorDetails) {
    super(error.message)
    this.name = 'EdgeFunctionError'
    this.code = error.code
    this.details = error.details
    this.retryable = error.retryable || false
    this.userMessage = error.user_message || error.message
  }
}

export class ErrorHandler {
  private logger: any
  private context: EdgeFunctionContext

  constructor(functionName: string, context: EdgeFunctionContext) {
    this.logger = createLogger(functionName, context)
    this.context = context
  }

  /**
   * 处理错误并返回标准响应
   */
  handleError(error: unknown): Response {
    let errorDetails: ErrorDetails

    if (error instanceof EdgeFunctionError) {
      errorDetails = {
        code: error.code,
        message: error.message,
        details: error.details,
        retryable: error.retryable,
        user_message: error.userMessage
      }
    } else if (error instanceof Error) {
      errorDetails = this.categorizeError(error)
    } else {
      errorDetails = {
        code: ErrorCode.INTERNAL_ERROR,
        message: '未知错误',
        details: error,
        user_message: '系统内部错误，请稍后重试'
      }
    }

    this.logger.error('函数执行失败', {
      error_code: errorDetails.code,
      error_message: errorDetails.message,
      error_details: errorDetails.details,
      stack: error instanceof Error ? error.stack : undefined
    })

    const statusCode = this.getHttpStatusCode(errorDetails.code)
    
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: errorDetails.code,
        message: errorDetails.user_message || errorDetails.message,
        retryable: errorDetails.retryable,
        request_id: this.context.request_id,
        timestamp: new Date().toISOString()
      }
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * 创建成功响应
   */
  createSuccessResponse<T>(data: T, metadata?: any): Response {
    return new Response(JSON.stringify({
      success: true,
      data,
      metadata: {
        ...metadata,
        request_id: this.context.request_id,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * 包装异步函数执行
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<Response> {
    try {
      this.logger.step(operationName || 'operation', 'start')
      const startTime = performance.now()
      
      const result = await operation()
      
      const endTime = performance.now()
      this.logger.step(operationName || 'operation', 'complete')
      this.logger.performance(operationName || 'operation', endTime - startTime)
      
      return this.createSuccessResponse(result, {
        processing_time: endTime - startTime
      })
    } catch (error) {
      this.logger.step(operationName || 'operation', 'error', { error: error.message })
      return this.handleError(error)
    }
  }

  /**
   * 分类错误类型
   */
  private categorizeError(error: Error): ErrorDetails {
    const message = error.message.toLowerCase()

    if (message.includes('timeout') || message.includes('aborted')) {
      return {
        code: ErrorCode.TIMEOUT_ERROR,
        message: error.message,
        retryable: true,
        user_message: '请求超时，请稍后重试'
      }
    }

    if (message.includes('network') || message.includes('fetch')) {
      return {
        code: ErrorCode.EXTERNAL_API_ERROR,
        message: error.message,
        retryable: true,
        user_message: '网络连接失败，请稍后重试'
      }
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: error.message,
        retryable: false,
        user_message: '输入数据格式错误'
      }
    }

    if (message.includes('unauthorized') || message.includes('auth')) {
      return {
        code: ErrorCode.AUTH_ERROR,
        message: error.message,
        retryable: false,
        user_message: '认证失败，请重新登录'
      }
    }

    if (message.includes('file') || message.includes('upload')) {
      return {
        code: ErrorCode.FILE_ERROR,
        message: error.message,
        retryable: false,
        user_message: '文件处理失败，请检查文件格式'
      }
    }

    return {
      code: ErrorCode.INTERNAL_ERROR,
      message: error.message,
      retryable: false,
      user_message: '系统内部错误，请联系管理员'
    }
  }

  /**
   * 获取HTTP状态码
   */
  private getHttpStatusCode(errorCode: ErrorCode): number {
    switch (errorCode) {
      case ErrorCode.VALIDATION_ERROR:
      case ErrorCode.FILE_ERROR:
        return 400
      case ErrorCode.AUTH_ERROR:
        return 401
      case ErrorCode.TIMEOUT_ERROR:
        return 408
      case ErrorCode.EXTERNAL_API_ERROR:
        return 502
      case ErrorCode.PROCESSING_ERROR:
      case ErrorCode.INTERNAL_ERROR:
      default:
        return 500
    }
  }
}

/**
 * 创建错误处理器的工厂函数
 */
export function createErrorHandler(functionName: string, context: EdgeFunctionContext): ErrorHandler {
  return new ErrorHandler(functionName, context)
}

/**
 * 快捷错误创建函数
 */
export function createError(code: ErrorCode, message: string, details?: any, userMessage?: string): EdgeFunctionError {
  return new EdgeFunctionError({
    code,
    message,
    details,
    user_message: userMessage
  })
}