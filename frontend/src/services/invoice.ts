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
    const result = await InvoiceService.deleteInvoice(id, 'current-user')
    if (result.error) {
      throw new Error(result.error)
    }
    return result
  }
}

// 导出单例实例
export const invoiceService = new Invoice()