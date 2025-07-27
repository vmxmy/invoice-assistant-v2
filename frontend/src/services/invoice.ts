/**
 * 统一的发票服务接口
 * 提供从传统 API 到 Supabase 的平滑迁移
 */

import { invoiceSupabaseService } from './supabase/invoice.service'
import { api } from './apiClient'
import { adaptSupabaseInvoiceData, adaptSupabaseInvoiceList } from '../utils/invoiceDataAdapter'

export interface InvoiceListParams {
  page?: number
  page_size?: number
  query?: string
  seller_name?: string
  buyer_name?: string
  invoice_number?: string
  amount_min?: number
  amount_max?: number
  date_from?: string
  date_to?: string
  status?: string[]
  source?: string[]
}

export interface InvoiceListResponse {
  items: any[]
  total: number
  page: number
  page_size: number
  has_next: boolean
  has_prev: boolean
}

class InvoiceService {
  private useSupabase = true // 开关：是否使用 Supabase

  // 获取发票列表
  async list(params: InvoiceListParams): Promise<{ data: InvoiceListResponse }> {
    if (this.useSupabase) {
      console.log('📊 [InvoiceService] 使用 Supabase 获取发票列表')
      try {
        const result = await invoiceSupabaseService.list({
          page: params.page,
          page_size: params.page_size,
          query: params.query,
          seller_name: params.seller_name,
          buyer_name: params.buyer_name,
          invoice_number: params.invoice_number,
          amountMin: params.amount_min,
          amountMax: params.amount_max,
          dateFrom: params.date_from,
          dateTo: params.date_to,
          status: params.status as any,
          source: params.source
        })
        
        // 适配数据格式
        const adaptedResult = {
          ...result,
          items: adaptSupabaseInvoiceList(result.items)
        }
        
        return { data: adaptedResult }
      } catch (error) {
        console.error('❌ [InvoiceService] Supabase 错误:', error)
        throw error
      }
    } else {
      console.log('📊 [InvoiceService] 使用传统 API 获取发票列表')
      return api.invoices.list(params)
    }
  }

  // 获取发票详情
  async get(id: string): Promise<{ data: any }> {
    if (this.useSupabase) {
      const data = await invoiceSupabaseService.getDetail(id)
      // 适配数据格式
      const adaptedData = adaptSupabaseInvoiceData(data)
      console.log('📊 [InvoiceService] 适配后的发票详情数据:', adaptedData)
      return { data: adaptedData }
    } else {
      return api.invoices.get(id)
    }
  }

  // 更新发票
  async update(id: string, data: any): Promise<{ data: any }> {
    if (this.useSupabase) {
      const result = await invoiceSupabaseService.update(id, data)
      return { data: result }
    } else {
      return api.invoices.update(id, data)
    }
  }

  // 删除发票
  async delete(id: string): Promise<void> {
    if (this.useSupabase) {
      await invoiceSupabaseService.delete(id)
    } else {
      await api.invoices.delete(id)
    }
  }

  // 创建发票（带文件）
  async createWithFile(formData: FormData): Promise<{ data: any }> {
    // 文件上传暂时只支持后端 API
    return api.invoices.createWithFile(formData)
  }

  // 获取统计数据
  async stats(): Promise<{ data: any }> {
    if (this.useSupabase) {
      const stats = await invoiceSupabaseService.getStats()
      return { data: stats }
    } else {
      return api.invoices.stats()
    }
  }

  // 获取下载 URL
  async getDownloadUrl(id: string): Promise<{ data: any }> {
    if (this.useSupabase) {
      const result = await invoiceSupabaseService.getDownloadUrl(id)
      return { data: result }
    } else {
      return api.invoices.getDownloadUrl(id)
    }
  }

  // 批量获取下载 URL
  async getBatchDownloadUrls(invoiceIds: string[]): Promise<{ data: any }> {
    if (this.useSupabase) {
      const result = await invoiceSupabaseService.getBatchDownloadUrls(invoiceIds)
      return { data: result }
    } else {
      return api.invoices.getBatchDownloadUrls({ invoice_ids: invoiceIds })
    }
  }

  // 切换到 Supabase
  enableSupabase() {
    this.useSupabase = true
    console.log('✅ [InvoiceService] 已切换到 Supabase')
  }

  // 切换到传统 API
  enableAPI() {
    this.useSupabase = false
    console.log('✅ [InvoiceService] 已切换到传统 API')
  }

  // 获取当前使用的服务
  isUsingSupabase() {
    return this.useSupabase
  }
}

// 导出单例
export const invoiceService = new InvoiceService()

// 导出 Supabase 服务，方便直接使用
export { invoiceSupabaseService } from './supabase/invoice.service'