/**
 * 统一日志工具
 * 提供结构化日志记录和调试功能
 */

import type { EdgeFunctionContext } from '../types/index.ts'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: string
  level: string
  message: string
  context?: any
  request_id?: string
  user_id?: string
  function_name?: string
}

export class Logger {
  private context: EdgeFunctionContext
  private functionName: string
  private minLevel: LogLevel

  constructor(functionName: string, context: EdgeFunctionContext) {
    this.functionName = functionName
    this.context = context
    this.minLevel = this.getLogLevel(context.config.log_level || 'info')
  }

  private getLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.DEBUG
      case 'info': return LogLevel.INFO
      case 'warn': return LogLevel.WARN
      case 'error': return LogLevel.ERROR
      default: return LogLevel.INFO
    }
  }

  private createLogEntry(level: string, message: string, context?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      request_id: this.context.request_id,
      user_id: this.context.user_id,
      function_name: this.functionName
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel
  }

  debug(message: string, context?: any) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.createLogEntry('DEBUG', message, context)
      console.log(`🔍 [${this.functionName}] ${message}`, context ? JSON.stringify(context, null, 2) : '')
    }
  }

  info(message: string, context?: any) {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.createLogEntry('INFO', message, context)
      console.log(`ℹ️ [${this.functionName}] ${message}`, context ? JSON.stringify(context, null, 2) : '')
    }
  }

  warn(message: string, context?: any) {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.createLogEntry('WARN', message, context)
      console.warn(`⚠️ [${this.functionName}] ${message}`, context ? JSON.stringify(context, null, 2) : '')
    }
  }

  error(message: string, context?: any) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.createLogEntry('ERROR', message, context)
      console.error(`❌ [${this.functionName}] ${message}`, context ? JSON.stringify(context, null, 2) : '')
    }
  }

  /**
   * 记录性能指标
   */
  performance(operation: string, duration: number, details?: any) {
    this.info(`性能指标: ${operation}`, {
      duration_ms: duration,
      ...details
    })
  }

  /**
   * 记录处理步骤
   */
  step(stepName: string, status: 'start' | 'complete' | 'error', details?: any) {
    const emoji = status === 'start' ? '🚀' : status === 'complete' ? '✅' : '❌'
    this.info(`${emoji} 步骤: ${stepName} - ${status}`, details)
  }

  /**
   * 记录API调用
   */
  apiCall(service: string, endpoint: string, status: 'start' | 'success' | 'error', details?: any) {
    const prefix = status === 'start' ? '📤' : status === 'success' ? '📥' : '🚨'
    this.info(`${prefix} API调用: ${service}/${endpoint} - ${status}`, details)
  }
}

/**
 * 创建Logger实例的工厂函数
 */
export function createLogger(functionName: string, context: EdgeFunctionContext): Logger {
  return new Logger(functionName, context)
}