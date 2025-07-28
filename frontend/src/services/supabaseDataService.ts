/**
 * 纯Supabase数据服务层
 * 完全基于Supabase设计，替代所有FastAPI调用
 */
import { supabase } from '../lib/supabase'
import type { Tables } from '../lib/supabase'

// 类型定义
export type Invoice = Tables<'invoices'>
export type EmailAccount = Tables<'email_accounts'>
export type EmailScanJob = Tables<'email_scan_jobs'>
export type UserProfile = Tables<'profiles'>

// 通用响应类型
export interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  error: string | null
}

// OCR 相关类型
export interface OCRResult {
  success: boolean
  extracted_data?: {
    invoice_date: string
    seller_name: string
    total_amount: string
    invoice_number: string
    project_name?: string
  }
  error?: string
}

export interface OCRRequest {
  file: File
  filename: string
}

/**
 * 发票数据服务
 */
export class InvoiceService {
  /**
   * 获取用户的发票列表
   */
  static async getInvoices(
    userId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      seller_name?: string
      invoice_number?: string
      date_from?: string
      date_to?: string
      amount_min?: number
      amount_max?: number
    }
  ): Promise<PaginatedResponse<Invoice>> {
    try {
      let query = supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .neq('status', 'deleted')  // 过滤已删除的发票
        .order('created_at', { ascending: false })

      // 应用筛选条件
      if (filters) {
        if (filters.seller_name) {
          query = query.ilike('seller_name', `%${filters.seller_name}%`)
        }
        if (filters.invoice_number) {
          query = query.ilike('invoice_number', `%${filters.invoice_number}%`)
        }
        if (filters.date_from) {
          query = query.gte('invoice_date', filters.date_from)
        }
        if (filters.date_to) {
          query = query.lte('invoice_date', filters.date_to)
        }
        if (filters.amount_min !== undefined) {
          query = query.gte('total_amount', filters.amount_min)
        }
        if (filters.amount_max !== undefined) {
          query = query.lte('total_amount', filters.amount_max)
        }
      }

      // 分页
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        return { data: [], total: 0, error: error.message }
      }

      return {
        data: data || [],
        total: count || 0,
        error: null
      }
    } catch (error) {
      console.error('获取发票列表失败:', error)
      return {
        data: [],
        total: 0,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 创建新发票
   */
  static async createInvoice(
    userId: string,
    invoiceData: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<ServiceResponse<Invoice>> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert([{ ...invoiceData, user_id: userId }])
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      console.error('创建发票失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 更新发票
   */
  static async updateInvoice(
    invoiceId: string,
    userId: string,
    updates: Partial<Omit<Invoice, 'id' | 'user_id' | 'created_at'>>
  ): Promise<ServiceResponse<Invoice>> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      console.error('更新发票失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 软删除发票（移至回收站）
   */
  static async deleteInvoice(invoiceId: string, userId: string): Promise<ServiceResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .eq('user_id', userId)

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: true, error: null }
    } catch (error) {
      console.error('删除发票失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 恢复已删除的发票
   */
  static async restoreInvoice(invoiceId: string, userId: string): Promise<ServiceResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'active',
          deleted_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .eq('user_id', userId)

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: true, error: null }
    } catch (error) {
      console.error('恢复发票失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 获取已删除的发票列表（回收站）- 使用v_deleted_invoices视图优化
   */
  static async getDeletedInvoices(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<Invoice & { days_since_deleted: number; days_remaining: number }>> {
    try {
      let query = supabase
        .from('v_deleted_invoices')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('deleted_at', { ascending: false })

      // 分页
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        return { data: [], total: 0, error: error.message }
      }

      return {
        data: data || [],
        total: count || 0,
        error: null
      }
    } catch (error) {
      console.error('获取已删除发票列表失败:', error)
      return {
        data: [],
        total: 0,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 永久删除发票（硬删除）
   */
  static async permanentlyDeleteInvoice(invoiceId: string, userId: string): Promise<ServiceResponse<boolean>> {
    try {
      // 先获取发票信息，包含文件路径和哈希
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('file_path, file_hash')
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .single()

      if (fetchError || !invoice) {
        return { data: null, error: '发票不存在' }
      }

      // 删除数据库记录
      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('user_id', userId)

      if (deleteError) {
        return { data: null, error: deleteError.message }
      }

      // 删除存储桶中的文件
      if (invoice.file_path) {
        const { error: storageError } = await supabase.storage
          .from('invoice-files')
          .remove([invoice.file_path])
        
        if (storageError) {
          console.warn('删除存储文件失败:', storageError)
          // 不返回错误，因为数据库已删除成功
        }
      }

      // 删除哈希记录（如果存在）
      if (invoice.file_hash) {
        try {
          await supabase.rpc('delete_file_hash', {
            p_file_hash: invoice.file_hash,
            p_user_id: userId
          })
        } catch (hashError) {
          console.warn('删除哈希记录失败:', hashError)
          // 不返回错误，因为数据库已删除成功
        }
      }

      return { data: true, error: null }
    } catch (error) {
      console.error('永久删除发票失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * OCR 处理发票
   */
  static async processInvoiceOCR(request: OCRRequest): Promise<ServiceResponse<OCRResult>> {
    try {
      // 创建 FormData
      const formData = new FormData()
      formData.append('file', request.file)
      formData.append('filename', request.filename)

      // 调用 Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('ocr-invoice', {
        body: formData,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      console.error('OCR处理失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
}

/**
 * 邮箱账户服务
 */
export class EmailAccountService {
  /**
   * 获取用户的邮箱账户列表
   */
  static async getEmailAccounts(userId: string): Promise<ServiceResponse<EmailAccount[]>> {
    try {
      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data || [], error: null }
    } catch (error) {
      console.error('获取邮箱账户失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 创建邮箱账户
   */
  static async createEmailAccount(
    userId: string,
    accountData: Omit<EmailAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<ServiceResponse<EmailAccount>> {
    try {
      const { data, error } = await supabase
        .from('email_accounts')
        .insert([{ ...accountData, user_id: userId }])
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      console.error('创建邮箱账户失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 更新邮箱账户
   */
  static async updateEmailAccount(
    accountId: string,
    userId: string,
    updates: Partial<Omit<EmailAccount, 'id' | 'user_id' | 'created_at'>>
  ): Promise<ServiceResponse<EmailAccount>> {
    try {
      const { data, error } = await supabase
        .from('email_accounts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', accountId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      console.error('更新邮箱账户失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 删除邮箱账户
   */
  static async deleteEmailAccount(accountId: string, userId: string): Promise<ServiceResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', userId)

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: true, error: null }
    } catch (error) {
      console.error('删除邮箱账户失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 测试邮箱连接
   */
  static async testEmailConnection(accountId: string, userId: string): Promise<ServiceResponse<boolean>> {
    try {
      // 调用 Edge Function 测试邮箱连接
      const { data, error } = await supabase.functions.invoke('test-email-connection', {
        body: { account_id: accountId, user_id: userId }
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data.success || false, error: data.error || null }
    } catch (error) {
      console.error('测试邮箱连接失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
}

/**
 * 邮箱扫描任务服务
 */
export class EmailScanJobService {
  /**
   * 获取扫描任务列表
   */
  static async getScanJobs(userId: string): Promise<ServiceResponse<EmailScanJob[]>> {
    try {
      const { data, error } = await supabase
        .from('email_scan_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data || [], error: null }
    } catch (error) {
      console.error('获取扫描任务失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 创建扫描任务
   */
  static async createScanJob(
    userId: string,
    emailAccountId: string,
    scanConfig: {
      date_from?: string
      date_to?: string
      subject_keywords?: string[]
    }
  ): Promise<ServiceResponse<EmailScanJob>> {
    try {
      // 调用 Edge Function 创建扫描任务
      const { data, error } = await supabase.functions.invoke('create-email-scan-job', {
        body: {
          user_id: userId,
          email_account_id: emailAccountId,
          ...scanConfig
        }
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      console.error('创建扫描任务失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 取消扫描任务
   */
  static async cancelScanJob(jobId: string, userId: string): Promise<ServiceResponse<boolean>> {
    try {
      const { data, error } = await supabase.functions.invoke('cancel-email-scan-job', {
        body: { job_id: jobId, user_id: userId }
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data.success || false, error: data.error || null }
    } catch (error) {
      console.error('取消扫描任务失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
}

/**
 * 用户配置服务
 */
export class UserConfigService {
  /**
   * 获取用户配置
   */
  static async getUserConfig(userId: string): Promise<ServiceResponse<Record<string, any>>> {
    try {
      // 从 localStorage 读取配置
      const configKey = `user_config_${userId}`
      const savedConfig = localStorage.getItem(configKey)
      
      const defaultConfig = {
        theme: 'light',
        language: 'zh-CN',
        notifications: {
          email_scan_complete: true,
          ocr_processing_complete: true
        },
        display: {
          items_per_page: 20,
          default_date_range: 30
        }
      }

      const config = savedConfig ? { ...defaultConfig, ...JSON.parse(savedConfig) } : defaultConfig

      return { data: config, error: null }
    } catch (error) {
      console.error('获取用户配置失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 更新用户配置
   */
  static async updateUserConfig(
    userId: string,
    updates: Record<string, any>
  ): Promise<ServiceResponse<Record<string, any>>> {
    try {
      const configKey = `user_config_${userId}`
      const currentConfig = await this.getUserConfig(userId)
      
      if (currentConfig.error) {
        return currentConfig
      }

      const newConfig = { ...currentConfig.data, ...updates }
      localStorage.setItem(configKey, JSON.stringify(newConfig))

      return { data: newConfig, error: null }
    } catch (error) {
      console.error('更新用户配置失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
}

// 所有服务已通过class关键字导出