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
      buyer_name?: string
      invoice_number?: string
      invoice_type?: string
      date_from?: string
      date_to?: string
      amount_min?: number
      amount_max?: number
      status?: string[]
      source?: string[]
      global_search?: string
      overdue?: boolean
      urgent?: boolean
    },
    sortField: string = 'consumption_date',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedResponse<Invoice>> {
    try {
      let query = supabase
        .from('v_invoice_detail')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .neq('status', 'deleted')  // 过滤已删除的发票
        .order(sortField, { ascending: sortOrder === 'asc' })

      // 应用筛选条件
      if (filters) {
        // 全局搜索 - 在多个字段中搜索
        if (filters.global_search) {
          const search = `%${filters.global_search}%`
          const searchValue = filters.global_search.trim()
          
          // 构建搜索条件数组
          const searchConditions = [
            `invoice_number.ilike.${search}`,
            `seller_name.ilike.${search}`,
            `buyer_name.ilike.${search}`
          ]
          
          // 如果搜索内容是数字，则也在含税金额中搜索
          const numericValue = parseFloat(searchValue)
          if (!isNaN(numericValue) && numericValue > 0) {
            // 对于数字搜索，支持精确匹配和范围匹配
            searchConditions.push(`total_amount.eq.${numericValue}`)
            
            // 如果是整数，也允许范围匹配（比如搜索100可以匹配100-109.99）
            if (Number.isInteger(numericValue)) {
              const rangeMax = numericValue + 1
              searchConditions.push(`and(total_amount.gte.${numericValue},total_amount.lt.${rangeMax})`)
            }
          }
          
          // 对于非数字搜索，只在文本字段中搜索（发票号、销方名称、购方名称）
          query = query.or(searchConditions.join(','))
        }
        
        // 特定字段筛选
        if (filters.seller_name) {
          query = query.ilike('seller_name', `%${filters.seller_name}%`)
        }
        if (filters.buyer_name) {
          query = query.ilike('buyer_name', `%${filters.buyer_name}%`)
        }
        if (filters.invoice_number) {
          query = query.ilike('invoice_number', `%${filters.invoice_number}%`)
        }
        if (filters.invoice_type) {
          query = query.eq('invoice_type', filters.invoice_type)
        }
        // 日期范围筛选（基于消费日期）
        if (filters.date_from) {
          query = query.gte('consumption_date', filters.date_from)
        }
        if (filters.date_to) {
          query = query.lte('consumption_date', filters.date_to)
        }
        // 金额范围筛选
        if (filters.amount_min !== undefined) {
          query = query.gte('total_amount', filters.amount_min)
        }
        if (filters.amount_max !== undefined) {
          query = query.lte('total_amount', filters.amount_max)
        }
        // 状态筛选
        if (filters.status && filters.status.length > 0) {
          query = query.in('status', filters.status)
        }
        // 来源筛选
        if (filters.source && filters.source.length > 0) {
          query = query.in('source', filters.source)
        }
        // 超期筛选（>90天）
        if (filters.overdue === true) {
          // 筛选未报销且超过90天的发票
          const overdueDate = new Date()
          overdueDate.setDate(overdueDate.getDate() - 90)
          query = query
            .eq('status', 'unreimbursed')
            .lt('consumption_date', overdueDate.toISOString().split('T')[0])
        }
        
        // 紧急筛选（>60天，包括临期和逾期）
        if (filters.urgent === true) {
          // 筛选未报销且超过60天的发票
          const urgentDate = new Date()
          urgentDate.setDate(urgentDate.getDate() - 60)
          query = query
            .eq('status', 'unreimbursed')
            .lt('consumption_date', urgentDate.toISOString().split('T')[0])
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
   * 删除发票（软删除，移至回收站）
   */
  static async deleteInvoice(invoiceId: string, userId: string): Promise<ServiceResponse<boolean>> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({ 
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .neq('status', 'deleted')  // 不能重复删除

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
   * 获取已删除的发票列表（软删除）
   */
  static async getDeletedInvoices(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<Invoice>> {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'deleted')  // 只获取已删除的发票
        .order('deleted_at', { ascending: false })
        .range(from, to)

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
   * 恢复已删除的发票
   */
  static async restoreInvoice(invoiceId: string, userId: string): Promise<ServiceResponse<boolean>> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({ 
          status: 'unreimbursed',  // 恢复为未报销状态
          deleted_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .eq('status', 'deleted')  // 只能恢复已删除的发票

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
   * 永久删除发票（物理删除）
   */
  static async permanentlyDeleteInvoice(invoiceId: string, userId: string): Promise<ServiceResponse<boolean>> {
    try {
      // 先获取发票信息，包含文件路径和哈希
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('file_path, file_hash')
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .eq('status', 'deleted')  // 只能永久删除已删除的发票
        .single()

      if (fetchError || !invoice) {
        return { data: null, error: '发票不存在或未删除' }
      }

      // 删除数据库记录
      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .eq('status', 'deleted')

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
        }
      }

      // 删除哈希记录
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
   * 批量恢复发票
   */
  static async batchRestoreInvoices(invoiceIds: string[], userId: string): Promise<ServiceResponse<{successCount: number, failedIds: string[]}>> {
    try {
      const results = await Promise.allSettled(
        invoiceIds.map(id => this.restoreInvoice(id, userId))
      )

      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value.data === true
      ).length

      const failedIds = invoiceIds.filter((id, index) => 
        results[index].status === 'rejected' || 
        (results[index].status === 'fulfilled' && (results[index] as any).value.data !== true)
      )

      return {
        data: { successCount, failedIds },
        error: null
      }
    } catch (error) {
      console.error('批量恢复发票失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 批量永久删除发票
   */
  static async batchPermanentlyDeleteInvoices(invoiceIds: string[], userId: string): Promise<ServiceResponse<{successCount: number, failedIds: string[]}>> {
    try {
      const results = await Promise.allSettled(
        invoiceIds.map(id => this.permanentlyDeleteInvoice(id, userId))
      )

      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value.data === true
      ).length

      const failedIds = invoiceIds.filter((id, index) => 
        results[index].status === 'rejected' || 
        (results[index].status === 'fulfilled' && (results[index] as any).value.data !== true)
      )

      return {
        data: { successCount, failedIds },
        error: null
      }
    } catch (error) {
      console.error('批量永久删除发票失败:', error)
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