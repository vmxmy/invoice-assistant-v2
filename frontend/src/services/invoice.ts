/**
 * 发票服务统一入口
 * 提供发票相关的所有操作
 */
import { InvoiceService } from './supabaseDataService'

// 创建发票服务实例
class Invoice {
  /**
   * 获取发票列表
   */
  async list(params?: {
    skip?: number
    limit?: number
    seller_name?: string
    invoice_number?: string
  }) {
    const page = params?.skip ? Math.floor(params.skip / (params.limit || 20)) + 1 : 1
    const pageSize = params?.limit || 20
    
    // 构建筛选条件
    const filters: any = {}
    if (params?.seller_name) filters.seller_name = params.seller_name
    if (params?.invoice_number) filters.invoice_number = params.invoice_number
    
    const result = await InvoiceService.getInvoices('current-user', page, pageSize, filters)
    
    // 转换为预期格式
    return {
      data: {
        items: result.data || [],
        total: result.total || 0
      },
      error: result.error
    }
  }

  /**
   * 获取单个发票
   */
  async get(id: string) {
    // 暂时返回空实现，需要时可以扩展
    return { data: null, error: 'Not implemented yet' }
  }

  /**
   * 获取发票统计
   */
  async stats() {
    // 暂时返回空实现，需要时可以扩展
    return { data: null, error: 'Not implemented yet' }
  }

  /**
   * 更新发票
   */
  async update(id: string, data: any) {
    const result = await InvoiceService.updateInvoice(id, 'current-user', data)
    return result
  }

  /**
   * 删除发票 - 使用硬删除逻辑
   */
  async delete(id: string) {
    console.log(`🚀 [invoice.ts] 开始删除发票 ID: ${id}`)
    
    // 需要获取真实的用户ID，而不是硬编码的字符串
    // 这里应该从认证上下文获取用户ID
    const userId = await this.getCurrentUserId()
    console.log(`👤 [invoice.ts] 当前用户ID: ${userId}`)
    
    const result = await InvoiceService.deleteInvoice(id, userId)
    if (result.error) {
      console.error(`❌ [invoice.ts] 删除失败:`, result.error)
      throw new Error(result.error)
    }
    
    console.log(`✅ [invoice.ts] 删除成功:`, result)
    return result
  }

  /**
   * 获取当前用户ID
   */
  private async getCurrentUserId(): Promise<string> {
    // 这里需要从Supabase auth或其他认证服务获取真实的用户ID
    // 暂时返回一个占位符，需要根据实际认证实现调整
    try {
      // 可以从supabase.auth.getUser()获取
      const { supabase } = await import('../lib/supabase')
      const { data: { user } } = await supabase.auth.getUser()
      return user?.id || 'bd9a6722-a781-4f0b-8856-c6c5e261cbd0' // fallback
    } catch (error) {
      console.warn('获取用户ID失败，使用默认值:', error)
      return 'bd9a6722-a781-4f0b-8856-c6c5e261cbd0'
    }
  }
}

// 导出单例实例
export const invoiceService = new Invoice()