/**
 * Edge Function 邮箱扫描服务
 * 基于 Supabase Edge Functions 实现 IMAP 邮箱扫描功能
 */

import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'
import type { EmailAccount, EmailScanJob, EmailScanParams, SmartScanRequest } from '../types/email'

export interface EdgeEmailScanResponse {
  success: boolean
  jobId: string
  status: 'started' | 'queued' | 'processing' | 'completed' | 'failed'
  message?: string
  progress?: {
    total_emails: number
    scanned_emails: number
    matched_emails: number
    downloaded_attachments: number
    processed_invoices: number
  }
  error?: string
}

export interface EmailScanProgress {
  jobId: string
  status: string
  progress: number
  currentStep?: string
  totalEmails: number
  scannedEmails: number
  matchedEmails: number
  downloadedAttachments: number
  processedInvoices: number
  errorMessage?: string
  startedAt?: string
  completedAt?: string
}

export class EdgeFunctionEmailService {
  private supabaseUrl: string
  private supabaseKey: string

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
    this.supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Missing Supabase configuration for Email Edge Functions')
    }
  }

  /**
   * 启动邮箱扫描任务
   */
  async startEmailScan(emailAccountId: string, scanParams: EmailScanParams): Promise<EdgeEmailScanResponse> {
    logger.log('📧 [EdgeEmailService] 启动邮箱扫描', {
      emailAccountId,
      scanParams
    })

    try {
      // 获取用户认证token
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      
      if (authError || !session?.user?.id) {
        logger.error('❌ [EdgeEmailService] 获取认证失败:', authError)
        throw new Error('认证失败，请重新登录')
      }

      // 调用 Edge Function 启动扫描
      const response = await this.callEdgeFunction('email-scan-start', {
        emailAccountId,
        userId: session.user.id,
        scanParams,
        requestId: this.generateRequestId()
      })

      logger.log('✅ [EdgeEmailService] 扫描任务已启动', {
        jobId: response.jobId,
        status: response.status
      })

      return response

    } catch (error) {
      logger.error('❌ [EdgeEmailService] 启动扫描失败:', error)
      throw new Error(error instanceof Error ? error.message : '启动扫描失败')
    }
  }

  /**
   * 智能扫描（自动配置扫描参数）
   */
  async startSmartScan(request: SmartScanRequest): Promise<EdgeEmailScanResponse> {
    logger.log('🤖 [EdgeEmailService] 启动智能扫描', request)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user?.id) {
        throw new Error('用户未登录')
      }

      // 调用智能扫描 Edge Function
      const response = await this.callEdgeFunction('email-smart-scan', {
        ...request,
        userId: session.user.id,
        requestId: this.generateRequestId()
      })

      return response

    } catch (error) {
      logger.error('❌ [EdgeEmailService] 智能扫描失败:', error)
      throw new Error(error instanceof Error ? error.message : '智能扫描失败')
    }
  }

  /**
   * 获取扫描任务进度
   */
  async getScanProgress(jobId: string): Promise<EmailScanProgress> {
    try {
      const response = await this.callEdgeFunction('email-scan-progress', { jobId })
      
      return {
        jobId,
        status: response.status,
        progress: response.progress || 0,
        currentStep: response.currentStep,
        totalEmails: response.totalEmails || 0,
        scannedEmails: response.scannedEmails || 0,
        matchedEmails: response.matchedEmails || 0,
        downloadedAttachments: response.downloadedAttachments || 0,
        processedInvoices: response.processedInvoices || 0,
        errorMessage: response.errorMessage,
        startedAt: response.startedAt,
        completedAt: response.completedAt
      }

    } catch (error) {
      logger.error('❌ [EdgeEmailService] 获取进度失败:', error)
      throw error
    }
  }

  /**
   * 取消扫描任务
   */
  async cancelScan(jobId: string, force: boolean = false): Promise<boolean> {
    logger.log('🛑 [EdgeEmailService] 取消扫描任务', { jobId, force })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user?.id) {
        throw new Error('用户未登录')
      }

      const response = await this.callEdgeFunction('email-scan-cancel', {
        jobId,
        userId: session.user.id,
        force
      })

      return response.success || false

    } catch (error) {
      logger.error('❌ [EdgeEmailService] 取消扫描失败:', error)
      throw error
    }
  }

  /**
   * 重试失败的扫描任务
   */
  async retryScan(jobId: string): Promise<EdgeEmailScanResponse> {
    logger.log('🔄 [EdgeEmailService] 重试扫描任务', { jobId })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user?.id) {
        throw new Error('用户未登录')
      }

      const response = await this.callEdgeFunction('email-scan-retry', {
        jobId,
        userId: session.user.id
      })

      return response

    } catch (error) {
      logger.error('❌ [EdgeEmailService] 重试扫描失败:', error)
      throw error
    }
  }

  /**
   * 获取扫描结果
   */
  async getScanResults(jobId: string): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user?.id) {
        throw new Error('用户未登录')
      }

      const response = await this.callEdgeFunction('email-scan-results', {
        jobId,
        userId: session.user.id
      })

      return response.results

    } catch (error) {
      logger.error('❌ [EdgeEmailService] 获取扫描结果失败:', error)
      throw error
    }
  }

  /**
   * 测试邮箱连接
   */
  async testEmailConnection(emailAccountId: string): Promise<{
    success: boolean
    message: string
    connectionDetails?: {
      imapStatus: boolean
      smtpStatus?: boolean
      folders?: string[]
      totalEmails?: number
    }
    errorDetails?: {
      errorType: string
      errorMessage: string
    }
  }> {
    logger.log('🔍 [EdgeEmailService] 测试邮箱连接', { emailAccountId })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user?.id) {
        throw new Error('用户未登录')
      }

      const response = await this.callEdgeFunction('email-test-connection', {
        emailAccountId,
        userId: session.user.id
      })

      return response

    } catch (error) {
      logger.error('❌ [EdgeEmailService] 测试连接失败:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '测试连接失败',
        errorDetails: {
          errorType: 'network_error',
          errorMessage: error instanceof Error ? error.message : '未知错误'
        }
      }
    }
  }

  /**
   * 获取邮箱文件夹列表
   */
  async getEmailFolders(emailAccountId: string): Promise<string[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user?.id) {
        throw new Error('用户未登录')
      }

      const response = await this.callEdgeFunction('email-get-folders', {
        emailAccountId,
        userId: session.user.id
      })

      return response.folders || []

    } catch (error) {
      logger.error('❌ [EdgeEmailService] 获取文件夹失败:', error)
      return []
    }
  }

  /**
   * 监听扫描进度更新（使用Supabase Realtime）
   */
  subscribeToScanProgress(jobId: string, callback: (progress: EmailScanProgress) => void) {
    logger.log('📡 [EdgeEmailService] 订阅扫描进度', { jobId })

    const channel = supabase
      .channel(`email_scan_progress_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'email_scan_jobs',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          logger.log('📊 [EdgeEmailService] 收到进度更新', payload.new)
          
          const progress: EmailScanProgress = {
            jobId,
            status: payload.new.status,
            progress: payload.new.progress || 0,
            currentStep: payload.new.current_step,
            totalEmails: payload.new.total_emails || 0,
            scannedEmails: payload.new.scanned_emails || 0,
            matchedEmails: payload.new.matched_emails || 0,
            downloadedAttachments: payload.new.downloaded_attachments || 0,
            processedInvoices: payload.new.processed_invoices || 0,
            errorMessage: payload.new.error_message,
            startedAt: payload.new.started_at,
            completedAt: payload.new.completed_at
          }

          callback(progress)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  /**
   * 调用 Edge Function
   */
  private async callEdgeFunction(functionName: string, data: any): Promise<any> {
    const startTime = performance.now()
    
    logger.log(`🔧 [EdgeEmailService] 调用函数: ${functionName}`, data)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`${this.supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || this.supabaseKey}`,
          'Content-Type': 'application/json',
          'X-User-ID': session?.user?.id || 'anonymous'
        },
        body: JSON.stringify(data)
      })

      const endTime = performance.now()

      if (!response.ok) {
        const errorText = await response.text()
        logger.error(`❌ [EdgeEmailService] 函数 ${functionName} 调用失败:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        throw new Error(`Edge Function ${functionName} failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      
      logger.log(`✅ [EdgeEmailService] 函数 ${functionName} 调用成功`, {
        processingTime: endTime - startTime,
        success: result.success
      })
      
      return result

    } catch (error) {
      logger.error(`❌ [EdgeEmailService] 函数 ${functionName} 调用失败:`, error)
      throw error
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `email_scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取Edge Functions状态
   */
  async getEdgeFunctionStatus(): Promise<{available: boolean, functions: string[]}> {
    try {
      // 尝试调用一个健康检查函数
      await this.callEdgeFunction('email-health-check', { ping: true })

      return {
        available: true,
        functions: [
          'email-scan-start',
          'email-smart-scan', 
          'email-scan-progress',
          'email-scan-cancel',
          'email-scan-retry',
          'email-scan-results',
          'email-test-connection',
          'email-get-folders',
          'email-health-check'
        ]
      }
    } catch (error) {
      logger.warn('⚠️ [EdgeEmailService] Edge Functions 不可用:', error)
      return {
        available: false,
        functions: []
      }
    }
  }
}

// 导出单例实例
export const edgeFunctionEmail = new EdgeFunctionEmailService()