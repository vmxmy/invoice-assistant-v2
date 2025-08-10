import { supabase } from '../lib/supabase'

export interface MonthlyStats {
  month: string
  invoice_count: number
  total_amount: number
  avg_amount: number
}

export interface TypeStats {
  invoice_type: string
  count: number
  total_amount: number
  avg_amount: number
}

export interface UserSummary {
  total_invoices: number
  total_amount: number
  avg_amount: number
  max_amount: number
  min_amount: number
  active_months: number
  invoice_types: number
  latest_invoice_date: string | null
  earliest_invoice_date: string | null
}

export interface RecentMonthlyStats {
  month: string
  invoice_count: number
  total_amount: number
}

export const supabaseStats = {
  /**
   * 获取用户的月度发票统计
   */
  async getMonthlyStats(userId: string): Promise<MonthlyStats[]> {
    // 确保 userId 是有效的 UUID 格式
    const { data, error } = await supabase
      .from('v_invoice_monthly_analysis')
      .select('*')
      .eq('user_id', userId)
      .eq('is_recent', true) // 只获取最近12个月
      .order('month', { ascending: false })
      .limit(12)

    if (error) {
      console.error('获取月度统计失败:', error)
      throw error
    }

    return data || []
  },

  /**
   * 获取用户的发票类型统计
   */
  async getTypeStats(userId: string): Promise<TypeStats[]> {
    const { data, error } = await supabase
      .from('v_category_statistics')
      .select('invoice_type, invoice_count:invoice_count, total_amount, avg_amount')
      .eq('user_id', userId)
      .not('invoice_type', 'is', null)
      .order('invoice_count', { ascending: false })

    if (error) {
      console.error('获取类型统计失败:', error)
      throw error
    }

    return data || []
  },

  /**
   * 获取用户发票汇总
   */
  async getUserSummary(userId: string): Promise<UserSummary | null> {
    const { data, error } = await supabase
      .from('v_invoice_aggregates')
      .select('total_invoices, total_amount, avg_amount, max_amount, min_amount, active_months, invoice_types, latest_invoice_date, earliest_invoice_date')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('获取用户汇总失败:', error)
      throw error
    }

    return data
  },

  /**
   * 获取最近12个月的统计数据
   */
  async getRecentMonthlyStats(userId: string): Promise<RecentMonthlyStats[]> {
    const { data, error } = await supabase
      .from('v_invoice_monthly_analysis')
      .select('month:month_str, invoice_count, total_amount')
      .eq('user_id', userId)
      .eq('is_recent', true)
      .order('month', { ascending: true })

    if (error) {
      console.error('获取最近月度统计失败:', error)
      throw error
    }

    return data || []
  },

  /**
   * 获取实时发票列表（最新的N条）
   */
  async getRecentInvoices(userId: string, limit: number = 10) {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, consumption_date, seller_name, total_amount, invoice_type, created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('consumption_date', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('获取最近发票失败:', error)
      throw error
    }

    return data || []
  },

  /**
   * 获取发票状态分布
   */
  async getStatusDistribution(userId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('status')
      .eq('user_id', userId)
      .is('deleted_at', null)

    if (error) {
      console.error('获取状态分布失败:', error)
      throw error
    }

    // 在客户端统计
    const distribution: Record<string, number> = {}
    data?.forEach(invoice => {
      const status = invoice.status || 'unknown'
      distribution[status] = (distribution[status] || 0) + 1
    })

    return distribution
  },

  /**
   * 获取综合统计数据（用于仪表盘）
   */
  async getDashboardStats(userId: string) {
    try {
      // 并行获取所有需要的数据
      const [summary, monthlyStats, typeStats, recentInvoices, statusDist] = await Promise.all([
        this.getUserSummary(userId),
        this.getRecentMonthlyStats(userId),
        this.getTypeStats(userId),
        this.getRecentInvoices(userId, 5),
        this.getStatusDistribution(userId)
      ])

      // 处理月度数据为图表格式
      const monthlyData = monthlyStats.map(item => ({
        month: item.month,
        invoices: item.invoice_count,
        amount: item.total_amount
      }))

      // 处理分类数据为图表格式
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
      const categoryData = typeStats.map((item, index) => ({
        name: item.invoice_type,
        value: item.invoice_count || item.count,
        amount: item.total_amount,
        color: colors[index % colors.length]
      }))

      return {
        summary: {
          totalInvoices: summary?.total_invoices || 0,
          totalAmount: summary?.total_amount || 0,
          avgAmount: summary?.avg_amount || 0,
          maxAmount: summary?.max_amount || 0,
          minAmount: summary?.min_amount || 0,
          activeMonths: summary?.active_months || 0,
          invoiceTypes: summary?.invoice_types || 0
        },
        monthlyData,
        categoryData,
        recentActivity: recentInvoices,
        statusDistribution: statusDist,
        // 计算未报销和已报销的数量
        unreimbursedInvoices: statusDist['unreimbursed'] || 0,
        reimbursedInvoices: statusDist['reimbursed'] || 0
      }
    } catch (error) {
      console.error('获取仪表盘统计数据失败:', error)
      throw error
    }
  }
}