/**
 * 统计数据管理Hook
 * 使用React Query获取和缓存统计数据
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
  
  // 如果有日期筛选，需要重新计算部分统计
  if (startDate || endDate) {
    let invoiceQuery = supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)

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
      updated_at: new Date().toISOString()
    }
  }

  return {
    ...data,
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
    .order('month', { ascending: false })

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

  // 注意：视图可能不支持日期筛选，需要在应用层处理
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

  const loading = overviewLoading || trendsLoading || categoryLoading || hierarchicalLoading || detailedLoading
  const error = overviewError || trendsError || categoryError || hierarchicalError || detailedError

  return {
    overviewStats,
    monthlyTrends,
    categoryStats,
    hierarchicalStats,
    detailedData,
    loading,
    error
  }
}