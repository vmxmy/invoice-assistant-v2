/**
 * 纯Supabase数据服务层
 * 完全基于Supabase设计，替代所有FastAPI调用
 */
import { supabase } from '../lib/supabase'
import type { Tables } from '../lib/supabase'

// 类型定义
export type Invoice = Tables<'invoices'>
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
          query = query.gte('created_at', filters.date_from)
        }
        if (filters.date_to) {
          query = query.lte('created_at', filters.date_to)
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
   * 直接删除发票（硬删除，清除所有信息包括哈希值记录）
   */
  static async deleteInvoice(invoiceId: string, userId: string): Promise<ServiceResponse<boolean>> {
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

      // 直接删除数据库记录
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

      // 删除哈希记录，根据invoice_id删除所有相关记录
      try {
        const { error: hashError } = await supabase
          .from('file_hashes')
          .delete()
          .eq('invoice_id', invoiceId)
          .eq('user_id', userId)
        
        if (hashError) {
          console.warn('删除哈希记录失败:', hashError)
        }
      } catch (hashError) {
        console.warn('删除哈希记录异常:', hashError)
        // 不返回错误，因为数据库已删除成功
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