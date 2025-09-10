/**
 * 统计数据管理Hook
 * 使用React Query获取和缓存统计数据，为ECharts图表提供数据支持
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../contexts/AuthContext'
import type { StatisticsFilters } from '../pages/StatisticsPage'

// 数据接口定义
export interface OverviewStats {
  total_invoices: number
  total_amount: number
  avg_amount: number
  unreimbursed_count: number
  unreimbursed_amount: number
  reimbursed_count: number  
  reimbursed_amount: number
  monthly_invoices: number
  monthly_amount: number
  amount_growth_rate: number
  invoice_growth_rate: number
  reimbursement_rate: number
  updated_at: string
}

export interface MonthlyTrend {
  month_str: string
  invoice_count: number
  total_amount: number
  count_growth_rate: number
  amount_growth_rate: number
  avg_amount: number
  is_recent: boolean
}

export interface CategoryStat {
  category_name: string
  invoice_count: number
  total_amount: number
  avg_amount: number
  count_percentage: number
  amount_percentage: number
  first_consumption: string
  last_consumption: string
}

export interface HierarchicalStat {
  primary_category: string
  primary_count: number
  primary_amount: number
  primary_percentage: number
  subcategories: Array<{
    name: string
    count: number
    amount: number
    percentage: number
  }>
}

export interface InvoiceTypeStat {
  invoice_type: string
  count: number
  total_amount: number
  avg_amount: number
  count_percentage: number
  amount_percentage: number
}

export interface RegionalStat {
  region_name: string
  region_code: string
  province_name: string
  invoice_count: number
  total_amount: number
  avg_amount: number
}

export interface ReimbursementStat {
  total_count: number
  reimbursed_count: number
  unreimbursed_count: number
  overdue_count: number
  due_soon_count: number
  reimbursement_rate: number
  avg_processing_days: number
  monthly_progress: Array<{
    month: string
    reimbursed: number
    submitted: number
  }>
}

export interface DetailedDataItem {
  month_str: string
  category_name: string
  invoice_count: number
  total_amount: number
  avg_amount: number
  growth_rate: number
}

/**
 * 构建日期范围查询条件
 */
const buildDateRangeFilter = (dateRange: StatisticsFilters['dateRange']) => {
  const now = new Date()
  let startDate: string | undefined
  let endDate: string | undefined

  if (dateRange.preset) {
    switch (dateRange.preset) {
      case 'currentyear':
        // 当年数据: 从1月1日开始
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
        break
      case 'lastyear':
        // 去年数据
        startDate = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0]
        break
      case 'all':
        // 不设置日期限制
        break
    }
  } else {
    startDate = dateRange.startDate
    endDate = dateRange.endDate
  }

  return { startDate, endDate }
}

/**
 * 获取概览统计数据
 */
const fetchOverviewStats = async (userId: string, filters: StatisticsFilters): Promise<OverviewStats> => {
  const { startDate, endDate } = buildDateRangeFilter(filters.dateRange)
  
  let query = supabase
    .from('v_invoice_aggregates')
    .select('*')
    .eq('user_id', userId)
    .single()

  const { data, error } = await query

  if (error) throw error
  
  // 计算报销完成率
  const reimbursementRate = data.total_invoices > 0 ? 
    data.reimbursed_count / data.total_invoices : 0
  
  // 如果有日期筛选，需要重新计算部分统计
  if (startDate || endDate) {
    let invoiceQuery = supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)

    if (startDate) {
      invoiceQuery = invoiceQuery.gte('consumption_date', startDate)
    }
    if (endDate) {
      invoiceQuery = invoiceQuery.lte('consumption_date', endDate)
    }

    const { data: filteredInvoices, error: invoiceError } = await invoiceQuery
    if (invoiceError) throw invoiceError

    // 重新计算筛选后的统计
    const totalInvoices = filteredInvoices.length
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const avgAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0
    const unreimbursedInvoices = filteredInvoices.filter(inv => inv.status === 'unreimbursed')
    const reimbursedInvoices = filteredInvoices.filter(inv => inv.status === 'reimbursed')

    return {
      ...data,
      total_invoices: totalInvoices,
      total_amount: totalAmount,
      avg_amount: avgAmount,
      unreimbursed_count: unreimbursedInvoices.length,
      unreimbursed_amount: unreimbursedInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
      reimbursed_count: reimbursedInvoices.length,
      reimbursed_amount: reimbursedInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
      reimbursement_rate: totalInvoices > 0 ? reimbursedInvoices.length / totalInvoices : 0,
      updated_at: new Date().toISOString()
    }
  }

  return {
    ...data,
    reimbursement_rate: reimbursementRate,
    updated_at: new Date().toISOString()
  }
}

/**
 * 获取月度趋势数据
 */
const fetchMonthlyTrends = async (userId: string, filters: StatisticsFilters): Promise<MonthlyTrend[]> => {
  const { startDate, endDate } = buildDateRangeFilter(filters.dateRange)
  
  let query = supabase
    .from('v_invoice_monthly_analysis')
    .select('*')
    .eq('user_id', userId)
    .order('month', { ascending: true }) // 改为升序，便于图表显示

  if (startDate) {
    query = query.gte('month', startDate)
  }
  if (endDate) {
    query = query.lte('month', endDate)
  }

  // 默认取最近12个月
  if (!startDate && !endDate) {
    query = query.limit(12)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * 获取分类统计数据
 */
const fetchCategoryStats = async (userId: string, filters: StatisticsFilters): Promise<CategoryStat[]> => {
  const { startDate, endDate } = buildDateRangeFilter(filters.dateRange)
  
  let query = supabase
    .from('v_category_statistics')
    .select('*')
    .eq('user_id', userId)
    .order('total_amount', { ascending: false })

  const { data, error } = await query

  if (error) throw error
  
  let result = data || []
  
  // 应用分类筛选
  if (filters.categories.length > 0) {
    result = result.filter(item => filters.categories.includes(item.category_name))
  }

  return result.slice(0, 10) // 限制前10个分类
}

/**
 * 获取层次化分类统计数据
 */
const fetchHierarchicalStats = async (userId: string, filters: StatisticsFilters): Promise<HierarchicalStat[]> => {
  const { data, error } = await supabase
    .from('v_hierarchical_category_stats')
    .select('*')
    .eq('user_id', userId)
    .order('primary_count', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * 获取发票类型统计数据
 */
const fetchInvoiceTypeStats = async (userId: string, filters: StatisticsFilters): Promise<InvoiceTypeStat[]> => {
  const { data, error } = await supabase
    .from('v_invoice_type_stats')
    .select('*')
    .eq('user_id', userId)
    .order('count', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * 获取地区统计数据
 */
const fetchRegionalStats = async (userId: string, filters: StatisticsFilters): Promise<RegionalStat[]> => {
  const { data, error } = await supabase
    .from('invoice_region_statistics')
    .select('*')
    .order('invoice_count', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * 计算平均处理天数
 */
const calculateAvgProcessingDays = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('consumption_date, status_changed_at, created_at')
      .eq('user_id', userId)
      .eq('status', 'reimbursed')
      .not('consumption_date', 'is', null)
      .not('status_changed_at', 'is', null)

    if (error) {
      console.error('Error calculating avg processing days:', error)
      return 15 // 默认值
    }

    if (!data || data.length === 0) {
      return 15 // 如果没有已报销数据，返回合理默认值
    }

    const totalDays = data.reduce((sum, invoice) => {
      const consumptionDate = new Date(invoice.consumption_date)
      const statusChangedDate = new Date(invoice.status_changed_at)
      const daysDiff = (statusChangedDate.getTime() - consumptionDate.getTime()) / (1000 * 3600 * 24)
      return sum + Math.max(0, daysDiff)
    }, 0)

    return Math.round(totalDays / data.length) || 15
  } catch (error) {
    console.error('Error in calculateAvgProcessingDays:', error)
    return 15 // 默认值
  }
}

/**
 * 获取报销管理统计数据
 */
const fetchReimbursementStats = async (userId: string, filters: StatisticsFilters): Promise<ReimbursementStat> => {
  try {
    // 获取基础数据
    const { data: overview, error: overviewError } = await supabase
      .from('v_invoice_aggregates')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (overviewError) {
      console.error('Error fetching overview stats:', overviewError)
      throw overviewError
    }

    // 获取逾期数据 - 简化版实现
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('consumption_date, status, total_amount')
      .eq('user_id', userId)
      .eq('status', 'unreimbursed')

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError)
      throw invoicesError
    }

    const now = new Date()
    const invoiceArray = invoices || []
    
    const overdue = invoiceArray.filter(inv => {
      if (!inv.consumption_date) return false
      const consumptionDate = new Date(inv.consumption_date)
      const daysDiff = (now.getTime() - consumptionDate.getTime()) / (1000 * 3600 * 24)
      return daysDiff > 90
    })

    const dueSoon = invoiceArray.filter(inv => {
      if (!inv.consumption_date) return false
      const consumptionDate = new Date(inv.consumption_date)
      const daysDiff = (now.getTime() - consumptionDate.getTime()) / (1000 * 3600 * 24)
      return daysDiff > 60 && daysDiff <= 90
    })

    // 获取真实的月度报销数据
    const { data: monthlyData, error: monthlyError } = await supabase.rpc('get_monthly_reimbursement_stats', {
      p_user_id: userId,
      p_months: 6
    })

    let monthlyProgress = []

    if (monthlyError) {
      console.warn('Failed to fetch monthly stats, using fallback SQL query:', monthlyError)
      
      // 备用SQL查询
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('invoices')
        .select(`
          consumption_date,
          status,
          total_amount
        `)
        .eq('user_id', userId)
          .not('consumption_date', 'is', null)
        .gte('consumption_date', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0])
        .order('consumption_date', { ascending: false })

      if (fallbackError) {
        console.error('Fallback query failed:', fallbackError)
        // 使用默认数据
        monthlyProgress = Array.from({ length: 6 }, (_, i) => ({
          month: `${12 - i}月`,
          submitted: 0,
          reimbursed: 0
        }))
      } else {
        // 手动聚合数据
        const monthGroups = (fallbackData || []).reduce((acc, invoice) => {
          const monthKey = new Date(invoice.consumption_date).toISOString().substr(0, 7) // YYYY-MM
          if (!acc[monthKey]) {
            acc[monthKey] = { submitted: 0, reimbursed: 0 }
          }
          acc[monthKey].submitted++
          if (invoice.status === 'reimbursed') {
            acc[monthKey].reimbursed++
          }
          return acc
        }, {} as Record<string, { submitted: number, reimbursed: number }>)

        // 生成最近6个月的数据
        monthlyProgress = Array.from({ length: 6 }, (_, i) => {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthKey = monthDate.toISOString().substr(0, 7)
          const monthName = monthDate.toLocaleDateString('zh-CN', { month: 'numeric' }) + '月'
          const stats = monthGroups[monthKey] || { submitted: 0, reimbursed: 0 }
          
          return {
            month: monthName,
            submitted: stats.submitted,
            reimbursed: stats.reimbursed
          }
        }).reverse()
      }
    } else {
      // 使用RPC函数返回的数据
      monthlyProgress = (monthlyData || []).map((item: any) => ({
        month: new Date(item.month).toLocaleDateString('zh-CN', { month: 'numeric' }) + '月',
        submitted: item.submitted || 0,
        reimbursed: item.reimbursed || 0
      }))
    }

    // 确保所有必需字段都存在
    const result: ReimbursementStat = {
      total_count: overview?.total_invoices || 0,
      reimbursed_count: overview?.reimbursed_count || 0,
      unreimbursed_count: overview?.unreimbursed_count || 0,
      overdue_count: overdue.length,
      due_soon_count: dueSoon.length,
      reimbursement_rate: (overview?.total_invoices || 0) > 0 ? 
        (overview?.reimbursed_count || 0) / (overview?.total_invoices || 1) : 0,
      avg_processing_days: await calculateAvgProcessingDays(userId),
      monthly_progress: monthlyProgress
    }

    return result
  } catch (error) {
    console.error('Error in fetchReimbursementStats:', error)
    
    // 返回默认数据，避免页面崩溃
    return {
      total_count: 0,
      reimbursed_count: 0,
      unreimbursed_count: 0,
      overdue_count: 0,
      due_soon_count: 0,
      reimbursement_rate: 0,
      avg_processing_days: 0,
      monthly_progress: Array.from({ length: 6 }, (_, i) => ({
        month: `${i + 1}月`,
        submitted: 0,
        reimbursed: 0
      }))
    }
  }
}

/**
 * 获取详细数据表格
 */
const fetchDetailedData = async (userId: string, filters: StatisticsFilters): Promise<DetailedDataItem[]> => {
  // 这里组合月度和分类数据来生成详细表格
  const monthlyData = await fetchMonthlyTrends(userId, filters)
  const categoryData = await fetchCategoryStats(userId, filters)

  // 简化版：返回月度数据作为详细数据
  return monthlyData.map(month => ({
    month_str: month.month_str,
    category_name: '全部分类',
    invoice_count: month.invoice_count,
    total_amount: month.total_amount,
    avg_amount: month.avg_amount,
    growth_rate: month.amount_growth_rate || 0
  }))
}

/**
 * 主Hook：统计数据管理
 */
export const useStatisticsData = (filters: StatisticsFilters) => {
  const { user } = useAuthContext()

  // 概览统计
  const {
    data: overviewStats,
    isLoading: overviewLoading,
    error: overviewError
  } = useQuery({
    queryKey: ['statistics', 'overview', user?.id, filters],
    queryFn: () => fetchOverviewStats(user!.id, filters),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  })

  // 月度趋势
  const {
    data: monthlyTrends,
    isLoading: trendsLoading,
    error: trendsError
  } = useQuery({
    queryKey: ['statistics', 'monthly', user?.id, filters],
    queryFn: () => fetchMonthlyTrends(user!.id, filters),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  // 分类统计
  const {
    data: categoryStats,
    isLoading: categoryLoading,
    error: categoryError
  } = useQuery({
    queryKey: ['statistics', 'category', user?.id, filters],
    queryFn: () => fetchCategoryStats(user!.id, filters),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  // 层次化分类统计
  const {
    data: hierarchicalStats,
    isLoading: hierarchicalLoading,
    error: hierarchicalError
  } = useQuery({
    queryKey: ['statistics', 'hierarchical', user?.id, filters],
    queryFn: () => fetchHierarchicalStats(user!.id, filters),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  // 发票类型统计
  const {
    data: invoiceTypeStats,
    isLoading: invoiceTypeLoading,
    error: invoiceTypeError
  } = useQuery({
    queryKey: ['statistics', 'invoice-type', user?.id, filters],
    queryFn: () => fetchInvoiceTypeStats(user!.id, filters),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  // 地区统计
  const {
    data: regionalStats,
    isLoading: regionalLoading,
    error: regionalError
  } = useQuery({
    queryKey: ['statistics', 'regional', user?.id, filters],
    queryFn: () => fetchRegionalStats(user!.id, filters),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  // 报销管理统计
  const {
    data: reimbursementStats,
    isLoading: reimbursementLoading,
    error: reimbursementError
  } = useQuery({
    queryKey: ['statistics', 'reimbursement', user?.id, filters],
    queryFn: () => fetchReimbursementStats(user!.id, filters),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  // 详细数据
  const {
    data: detailedData,
    isLoading: detailedLoading,
    error: detailedError
  } = useQuery({
    queryKey: ['statistics', 'detailed', user?.id, filters],
    queryFn: () => fetchDetailedData(user!.id, filters),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  const loading = overviewLoading || trendsLoading || categoryLoading || 
                  hierarchicalLoading || invoiceTypeLoading || regionalLoading || 
                  reimbursementLoading || detailedLoading
                  
  const error = overviewError || trendsError || categoryError || 
                hierarchicalError || invoiceTypeError || regionalError || 
                reimbursementError || detailedError

  return {
    // 基础数据
    overviewStats,
    monthlyTrends: monthlyTrends || [],
    categoryStats: categoryStats || [],
    hierarchicalStats: hierarchicalStats || [],
    invoiceTypeStats: invoiceTypeStats || [],
    regionalStats: regionalStats || [],
    reimbursementStats,
    detailedData: detailedData || [],
    
    // 状态
    loading,
    error,
    
    // 刷新函数
    refetch: () => {
      // 这里可以添加刷新所有查询的逻辑
    }
  }
}