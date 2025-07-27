import { BaseSupabaseService } from './base.service'
import { supabase } from '../supabase'
import { Invoice, InvoiceStatus, InvoiceSource } from '../../types/invoice'

export interface SearchParams {
  query?: string
  dateFrom?: string
  dateTo?: string
  amountMin?: number
  amountMax?: number
  status?: InvoiceStatus[]
  invoiceType?: string[]
  limit?: number
  offset?: number
  // 支持传统分页参数
  page?: number
  page_size?: number
  // 其他筛选参数
  seller_name?: string
  buyer_name?: string
  invoice_number?: string
  source?: string[]
}

export interface InvoiceStats {
  dashboard: any
  monthlyTrend: any[]
  categoryAnalysis: any[]
}

export interface CategoryStats {
  expense_category: string
  invoice_count: number
  total_amount: number
  average_amount: number
  primary_category_name?: string
  secondary_category_name?: string
  category_full_path?: string
  category_info?: any
}

export class InvoiceSupabaseService extends BaseSupabaseService<Invoice> {
  constructor() {
    super('invoices', 'v_invoice_detail')
  }

  // 高级搜索（使用数据库函数）
  async search(params: SearchParams) {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) throw new Error('未登录')

    console.log('🔍 [InvoiceService] 搜索参数:', params)

    // 处理分页参数
    const limit = params.limit || params.page_size || 20
    const offset = params.offset || ((params.page || 1) - 1) * limit

    const { data, error } = await supabase
      .rpc('search_invoices', {
        p_user_id: session.session.user.id,
        p_query: params.query || params.invoice_number || params.seller_name || params.buyer_name || null,
        p_date_from: params.dateFrom || null,
        p_date_to: params.dateTo || null,
        p_amount_min: params.amountMin || null,
        p_amount_max: params.amountMax || null,
        p_status: params.status || null,
        p_invoice_type: params.invoiceType || null,
        p_limit: limit,
        p_offset: offset
      })
    
    if (error) {
      console.error('❌ [InvoiceService] 搜索错误:', error)
      throw error
    }
    
    console.log('📊 [InvoiceService] 搜索返回原始数据:', data)
    
    // 解析返回的数据
    const invoices = data?.map((item: any) => item.invoice) || []
    
    // 调试：检查返回的发票数据
    if (invoices.length > 0) {
      console.log('📋 [InvoiceService] 第一条发票数据示例:', {
        id: invoices[0].id,
        invoice_number: invoices[0].invoice_number,
        expense_category: invoices[0].expense_category,
        primary_category_name: invoices[0].primary_category_name,
        secondary_category_name: invoices[0].secondary_category_name,
        category_full_path: invoices[0].category_full_path,
        has_category_info: !!invoices[0].category_info
      })
      
      // 额外调试：检查所有分类相关字段
      console.log('🔍 [InvoiceService] 完整的分类字段:', {
        expense_category: invoices[0].expense_category,
        primary_category_name: invoices[0].primary_category_name,
        secondary_category_name: invoices[0].secondary_category_name,
        category_full_path: invoices[0].category_full_path,
        category_info: invoices[0].category_info,
        所有字段: Object.keys(invoices[0]).filter(key => key.includes('category'))
      })
    }
    
    return {
      data: invoices,
      relevance: data?.map((item: any) => item.relevance) || []
    }
  }
  
  // 获取发票列表（兼容 API 格式）
  async list(params: SearchParams) {
    const { data: invoices, relevance } = await this.search(params)
    
    // 计算总数
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) throw new Error('未登录')
    
    const { count, error } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.session.user.id)
      .is('deleted_at', null)
    
    if (error) {
      console.error('❌ [InvoiceService] 计算总数错误:', error)
      throw error
    }
    
    const total = count || 0
    const page = params.page || 1
    const pageSize = params.page_size || 20
    
    return {
      items: invoices,
      total,
      page,
      page_size: pageSize,
      has_next: page * pageSize < total,
      has_prev: page > 1
    }
  }

  // 获取详情（使用详情视图，包含分类信息）
  async getDetail(id: string) {
    console.log('📋 [InvoiceService] 获取发票详情，ID:', id)
    
    // 检查用户是否登录
    const { data: session } = await supabase.auth.getSession()
    console.log('🔐 [InvoiceService] 用户会话状态:', {
      hasSession: !!session?.session,
      userId: session?.session?.user?.id
    })
    
    const { data, error } = await supabase
      .from('v_invoice_detail')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('❌ [InvoiceService] 获取发票详情失败:', error)
      throw error
    }
    
    console.log('📋 [InvoiceService] 发票详情数据:', {
      id: data?.id,
      invoice_number: data?.invoice_number,
      file_url: data?.file_url,
      file_name: data?.file_name,
      has_file_url: !!data?.file_url
    })
    
    // 分类信息已由视图提供，无需额外解析
    // data.category_info 已由 v_invoice_detail 视图直接提供
    
    return data
  }

  // 创建发票（使用数据库函数）
  async createWithValidation(invoiceData: Partial<Invoice>) {
    const { data, error } = await supabase
      .rpc('create_invoice', {
        p_invoice_data: invoiceData
      })
    
    if (error) throw error
    return data
  }

  // 批量更新
  async batchUpdate(ids: string[], updates: any) {
    const { data, error } = await supabase
      .rpc('batch_update_invoices', {
        p_invoice_ids: ids,
        p_updates: updates
      })
    
    if (error) throw error
    return data
  }

  // 获取统计数据
  async getStats(): Promise<InvoiceStats> {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) throw new Error('未登录')

    const userId = session.session.user.id

    const [dashboard, monthlyTrend, categoryAnalysis] = await Promise.all([
      supabase
        .from('v_dashboard_realtime')
        .select('*')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('v_invoice_monthly_trend')
        .select('*')
        .eq('user_id', userId)
        .order('month', { ascending: true })  // 从早到晚排序
        .limit(12),  // 只显示最近12个月
      supabase
        .from('v_expense_category_analysis')
        .select('*')
        .eq('user_id', userId)
        .order('invoice_count', { ascending: false })
    ])

    if (dashboard.error) console.error('Dashboard error:', dashboard.error)
    if (monthlyTrend.error) console.error('Monthly trend error:', monthlyTrend.error)
    if (categoryAnalysis.error) console.error('Category analysis error:', categoryAnalysis.error)

    return {
      dashboard: dashboard.data,
      monthlyTrend: monthlyTrend.data || [],
      categoryAnalysis: categoryAnalysis.data || []
    }
  }

  // 获取月度统计（使用已有视图）
  async getMonthlyStats() {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) throw new Error('未登录')

    const { data, error } = await supabase
      .from('invoice_monthly_stats')
      .select('*')
      .eq('user_id', session.session.user.id)
      .order('month', { ascending: true })  // 改为升序，从早到晚
      .limit(12)

    if (error) throw error
    return data || []
  }

  // 获取类型统计（使用已有视图）
  async getTypeStats() {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) throw new Error('未登录')

    const { data, error } = await supabase
      .from('invoice_type_stats')
      .select('*')
      .eq('user_id', session.session.user.id)
      .order('count', { ascending: false })

    if (error) throw error
    return data || []
  }

  // 实时订阅用户的发票变化
  subscribeToUserInvoices(callback: (payload: any) => void) {
    const channel = supabase.channel('user_invoices_realtime')
    
    // 订阅插入事件
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'invoices'
      },
      (payload) => {
        console.log('新发票创建:', payload)
        callback({ type: 'INSERT', data: payload.new })
      }
    )
    
    // 订阅更新事件
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'invoices'
      },
      (payload) => {
        console.log('发票更新:', payload)
        callback({ type: 'UPDATE', data: payload.new, old: payload.old })
      }
    )
    
    // 订阅删除事件
    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'invoices'
      },
      (payload) => {
        console.log('发票删除:', payload)
        callback({ type: 'DELETE', data: payload.old })
      }
    )
    
    return channel.subscribe()
  }

  // 导出发票数据（包含分类信息）
  async exportInvoices(ids?: string[]) {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) throw new Error('未登录')

    let query = supabase
      .from('v_invoice_detail')
      .select('*')
      .eq('user_id', session.session.user.id)
      .order('invoice_date', { ascending: false })

    if (ids && ids.length > 0) {
      query = query.in('id', ids)
    }

    const { data, error } = await query
    if (error) throw error

    // 分类信息已由 v_invoice_detail 视图提供
    return data || []
  }

  // 获取分类的辅助方法（用于筛选等操作）
  getAvailableCategories() {
    return {
      primary: ['交通', '住宿', '餐饮', '办公', '其他'],
      secondary: {
        '交通': ['高铁', '飞机', '出租车'],
        '住宿': ['酒店', '民宿'],
        '餐饮': [],
        '办公': ['咨询', '印章'],
        '其他': []
      }
    }
  }

  // 获取分层分类统计（包含子分类详情）
  async getHierarchicalCategoryStats() {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) throw new Error('未登录')

    const { data, error } = await supabase
      .from('v_hierarchical_category_stats')
      .select('*')
      .eq('user_id', session.session.user.id)
      .order('primary_count', { ascending: false })

    if (error) throw error

    // 转换数据格式
    return data?.map(item => ({
      name: item.primary_category,
      value: item.primary_count,
      amount: parseFloat(item.primary_amount),
      percentage: parseFloat(item.primary_percentage),
      subcategories: item.subcategories || []
    })) || []
  }

  // 获取分类统计
  async getCategoryStats() {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) throw new Error('未登录')

    const { data, error } = await supabase
      .from('v_expense_category_analysis')
      .select('*')
      .eq('user_id', session.session.user.id)
      .order('invoice_count', { ascending: false })

    if (error) throw error

    // 分类信息已由视图提供
    return data || []
  }

  // 删除发票（软删除）
  async delete(id: string) {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) throw new Error('未登录')

    const { error } = await supabase
      .from('invoices')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', session.session.user.id)
    
    if (error) throw error
  }
  
  // 更新发票
  async update(id: string, data: Partial<Invoice>) {
    console.log('💾 [InvoiceSupabaseService] 开始更新发票:', { id, data })
    
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) {
      console.error('❌ [InvoiceSupabaseService] 用户未登录')
      throw new Error('未登录')
    }

    console.log('👤 [InvoiceSupabaseService] 用户ID:', session.session.user.id)

    const { data: result, error } = await supabase
      .from('invoices')
      .update(data)
      .eq('id', id)
      .eq('user_id', session.session.user.id)
      .select()
      .single()
    
    if (error) {
      console.error('❌ [InvoiceSupabaseService] 更新失败:', error)
      throw error
    }

    console.log('✅ [InvoiceSupabaseService] 更新成功:', result)
    return result
  }
  
  // 创建发票（带文件上传）
  async createWithFile(formData: FormData) {
    // TODO: 实现文件上传到 Supabase Storage
    // 目前暂时返回错误，提示使用后端 API
    throw new Error('文件上传功能暂未迁移到 Supabase，请使用后端 API')
  }
  
  // 获取下载 URL
  async getDownloadUrl(id: string) {
    console.log('🔗 [InvoiceService] 获取下载URL，发票ID:', id)
    try {
      const invoice = await this.getDetail(id)
      
      console.log('🔗 [InvoiceService] getDetail 返回的数据:', {
        hasInvoice: !!invoice,
        invoiceId: invoice?.id,
        hasFileUrl: !!invoice?.file_url,
        fileUrl: invoice?.file_url?.substring(0, 50) + '...'
      })
      
      if (!invoice) {
        throw new Error('发票不存在')
      }
      
      if (!invoice.file_url) {
        console.error('❌ [InvoiceService] 发票文件URL不存在，发票数据:', invoice)
        throw new Error('发票文件不存在')
      }
      
      const result = {
        download_url: invoice.file_url,
        filename: invoice.file_name || `invoice_${invoice.invoice_number}.pdf`
      }
      
      console.log('✅ [InvoiceService] 返回下载URL数据:', result)
      return result
    } catch (error: any) {
      console.error('❌ [InvoiceService] 获取下载URL失败:', error)
      throw error
    }
  }
  
  // 批量获取下载 URL
  async getBatchDownloadUrls(invoiceIds: string[]) {
    const { data: invoices, error } = await supabase
      .from('v_invoice_detail')
      .select('id, file_url, file_name, invoice_number')
      .in('id', invoiceIds)
    
    if (error) throw error
    
    return {
      files: invoices?.map(inv => ({
        invoice_id: inv.id,
        download_url: inv.file_url,
        filename: inv.file_name || `invoice_${inv.invoice_number}.pdf`
      })) || []
    }
  }

  // 按分类筛选发票
  async getInvoicesByCategory(primaryCategory?: string, secondaryCategory?: string, limit = 20, offset = 0) {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) throw new Error('未登录')

    let query = supabase
      .from('v_invoice_detail')
      .select('*')
      .eq('user_id', session.session.user.id)

    // 根据分类筛选
    if (secondaryCategory) {
      // 如果指定了二级分类，直接按二级分类筛选
      query = query.eq('expense_category', secondaryCategory)
    } else if (primaryCategory) {
      // 如果只指定了一级分类，需要获取该一级分类下的所有二级分类
      const subcategories = this.getSubcategoriesByPrimary(primaryCategory)
      if (subcategories.length > 0) {
        query = query.in('expense_category', subcategories)
      } else {
        // 如果没有子分类，直接按一级分类筛选
        query = query.eq('expense_category', primaryCategory)
      }
    }

    query = query
      .order('invoice_date', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error } = await query
    if (error) throw error

    // 分类信息已由 v_invoice_detail 视图提供
    return data || []
  }

  // 获取一级分类下的所有二级分类  
  private getSubcategoriesByPrimary(primaryCategory: string): string[] {
    const categories = this.getAvailableCategories()
    return (categories.secondary as any)[primaryCategory] || []
  }
}

// 导出实例
export const invoiceSupabaseService = new InvoiceSupabaseService()

// 默认导出
export default invoiceSupabaseService