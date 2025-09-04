/**
 * 优化版仪表板统计数据Hook
 * 使用React Query内置功能，移除复杂轮询逻辑，提升性能
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../contexts/AuthContext'
import { QueryKeys, QueryOptions, NetworkOptions } from '../utils/queryKeys'
import type { DashboardStats, DashboardStatsResponse } from '../types/dashboard.types'

/**
 * 转换统计数据的辅助函数
 */
function transformStatsData(statsData: any, userId: string, email: string): DashboardStats {
  // 如果没有数据，返回默认统计数据
  if (!statsData) {
    console.log('用户暂无发票数据，使用默认统计值')
    return {
      user_id: userId,
      profile_id: userId,
      display_name: email,
      
      // 发票统计 - 全部设为0
      total_invoices: 0,
      total_amount: 0,
      monthly_invoices: 0,
      monthly_amount: 0,
      verified_invoices: 0,
      last_invoice_date: null,
      
      // 报销状态统计
      unreimbursed_count: 0,
      reimbursed_count: 0,
      unreimbursed_amount: 0,
      reimbursed_amount: 0,
      
      // 临期和超期统计
      due_soon_unreimbursed_count: 0,
      due_soon_unreimbursed_amount: 0,
      overdue_unreimbursed_count: 0,
      overdue_unreimbursed_amount: 0,
      oldest_unreimbursed_date: null,
      
      // 本月报销统计
      monthly_reimbursed_count: 0,
      monthly_reimbursed_amount: 0,
      
      // 邮箱和扫描统计
      total_email_accounts: 0,
      active_email_accounts: 0,
      total_scan_jobs: 0,
      completed_scan_jobs: 0,
      monthly_processed: 0,
      last_scan_at: null,
      
      // 活动统计
      weekly_invoices: 0,
      daily_invoices: 0,
      
      // 增长率
      invoice_growth_rate: 0,
      amount_growth_rate: 0,
      
      // 用户状态
      is_active: true,
      is_premium: false,
      premium_expires_at: null,
      
      // 时间戳
      updated_at: new Date().toISOString()
    }
  }

  // 处理有数据的情况，映射字段名
  return {
    user_id: statsData.user_id,
    profile_id: statsData.user_id,
    display_name: email,
    
    // 发票统计
    total_invoices: statsData.total_invoices || 0,
    total_amount: statsData.total_amount || 0,
    monthly_invoices: statsData.monthly_invoices || 0,
    monthly_amount: statsData.monthly_amount || 0,
    verified_invoices: statsData.verified_count || 0,
    last_invoice_date: statsData.latest_invoice_date || null,
    
    // 报销状态统计
    unreimbursed_count: statsData.unreimbursed_count || 0,
    reimbursed_count: statsData.reimbursed_count || 0,
    unreimbursed_amount: statsData.unreimbursed_amount || 0,
    reimbursed_amount: statsData.reimbursed_amount || 0,
    
    // 临期和超期统计
    due_soon_unreimbursed_count: statsData.due_soon_unreimbursed_count || 0,
    due_soon_unreimbursed_amount: statsData.due_soon_unreimbursed_amount || 0,
    overdue_unreimbursed_count: statsData.overdue_unreimbursed_count || 0,
    overdue_unreimbursed_amount: statsData.overdue_unreimbursed_amount || 0,
    oldest_unreimbursed_date: statsData.oldest_unreimbursed_date || null,
    
    // 本月报销统计
    monthly_reimbursed_count: statsData.monthly_reimbursed_count || 0,
    monthly_reimbursed_amount: statsData.monthly_reimbursed_amount || 0,
    
    // 邮箱统计 - 新视图不包含这些字段，设置默认值
    total_email_accounts: 0,
    active_email_accounts: 0,
    
    // 扫描统计 - 新视图不包含这些字段，设置默认值
    total_scan_jobs: 0,
    completed_scan_jobs: 0,
    monthly_processed: 0,
    last_scan_at: null,
    
    // 活动统计 - 新视图不包含这些字段，设置默认值
    weekly_invoices: 0,
    daily_invoices: 0,
    
    // 增长率
    invoice_growth_rate: statsData.invoice_growth_rate || 0,
    amount_growth_rate: statsData.amount_growth_rate || 0,
    
    // 用户状态 - 新视图不包含这些字段，设置默认值
    is_active: true,
    is_premium: false,
    premium_expires_at: null,
    
    // 时间戳
    updated_at: new Date().toISOString()
  }
}

export function useDashboardStats(): DashboardStatsResponse {
  const { user } = useAuthContext()

  // 使用React Query优化的统计数据获取
  const queryResult = useQuery({
    queryKey: QueryKeys.dashboardStats(user?.id || ''),
    queryFn: async (): Promise<DashboardStats> => {
      if (!user?.id) throw new Error('用户未登录')
      
      console.log('🔍 [DashboardStats] 获取统计数据', user.id)
      
      // 优先使用物化视图，失败时降级到普通视图
      let statsData = null
      let statsError = null
      
      try {
        // 尝试使用物化视图
        const { data: mvData, error: mvError } = await supabase
          .from('mv_invoice_aggregates')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (!mvError && mvData) {
          console.log('⚡ [DashboardStats] 使用物化视图缓存')
          statsData = mvData
        } else {
          // 降级到普通视图
          console.log('🔄 [DashboardStats] 降级到普通视图')
          const { data: vData, error: vError } = await supabase
            .from('v_invoice_aggregates')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()
          
          statsData = vData
          statsError = vError
        }
      } catch (error) {
        // 最后降级到普通视图
        console.log('⚠️ [DashboardStats] 物化视图查询失败，使用普通视图', error)
        const { data: vData, error: vError } = await supabase
          .from('v_invoice_aggregates')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        
        statsData = vData
        statsError = vError
      }

      if (statsError) {
        console.warn('获取统计数据失败，使用默认值:', statsError.message)
        statsData = null
      }

      // 返回处理后的数据或默认数据
      return transformStatsData(statsData, user.id, user.email || '')
    },
    enabled: !!user?.id,
    ...QueryOptions.frequent, // 使用预设的频繁更新选项
    ...NetworkOptions.optimized, // 使用网络优化选项
    
    // 智能轮询：基于页面可见性和用户活跃度
    refetchInterval: (data, query) => {
      if (!data) return 60 * 1000 // 无数据时60秒刷新
      
      // 检查数据新鲜度
      const lastUpdate = query.dataUpdatedAt || 0
      const timeSinceUpdate = Date.now() - lastUpdate
      
      // 数据较新时降低刷新频率
      if (timeSinceUpdate < 2 * 60 * 1000) return 120 * 1000 // 2分钟内的数据，2分钟后刷新
      return 60 * 1000 // 默认1分钟刷新
    },
    
    refetchIntervalInBackground: false, // 后台不刷新
    refetchOnWindowFocus: true, // 窗口获得焦点时刷新
    
    // 数据转换和错误处理
    select: (data) => data,
    onError: (err) => {
      console.error('❌ [DashboardStats] 获取统计数据失败:', err)
    },
    onSuccess: (data) => {
      console.log('✅ [DashboardStats] 统计数据获取成功', {
        totalInvoices: data.total_invoices,
        monthlyInvoices: data.monthly_invoices,
        monthlyAmount: data.monthly_amount,
        dueSoonCount: data.due_soon_unreimbursed_count,
        overdueCount: data.overdue_unreimbursed_count
      })
    }
  })

  // 提取查询结果
  const { data, error, isLoading, refetch } = queryResult

  // 手动刷新统计数据
  const refresh = () => {
    console.log('🔄 [DashboardStats] 手动刷新统计数据')
    refetch()
  }

  return {
    data,
    error,
    loading: isLoading,
    refresh
  } as DashboardStatsResponse & { refresh: () => void }
}

// 格式化统计数据的工具函数
export function formatStatValue(value: number, type: 'currency' | 'number' | 'percentage' = 'number'): string {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)
    
    case 'percentage':
      return `${value}%`
    
    case 'number':
    default:
      return new Intl.NumberFormat('zh-CN').format(value)
  }
}

// 计算趋势的工具函数
export function calculateTrend(current: number, previous: number): 'up' | 'down' | 'neutral' {
  if (current > previous) return 'up'
  if (current < previous) return 'down'
  return 'neutral'
}

// 生成统计卡片数据
export function generateStatCards(stats: DashboardStats | null) {
  if (!stats) {
    return [
      {
        title: '总发票数',
        value: 0,
        icon: '📄',
        description: '等待上传',
        color: 'primary' as const
      },
      {
        title: '总金额',
        value: '¥0',
        icon: '💰',
        description: '本月新增 ¥0',
        color: 'secondary' as const
      },
      {
        title: '已验证',
        value: 0,
        icon: '✅',
        description: '暂无验证',
        color: 'accent' as const
      },
      {
        title: '本月发票',
        value: 0,
        icon: '📋',
        description: '暂无新增',
        color: 'info' as const
      }
    ]
  }

  return [
    {
      title: '总发票数',
      value: stats.total_invoices,
      icon: '📄',
      change: {
        value: stats.invoice_growth_rate,
        trend: calculateTrend(stats.monthly_invoices, stats.total_invoices - stats.monthly_invoices),
        period: '本月'
      },
      description: `其中 ${stats.verified_invoices} 份已验证`,
      color: 'primary' as const
    },
    {
      title: '总金额',
      value: formatStatValue(stats.total_amount, 'currency'),
      icon: '💰',
      change: {
        value: stats.amount_growth_rate,
        trend: calculateTrend(stats.monthly_amount, stats.total_amount - stats.monthly_amount),
        period: '本月'
      },
      description: `本月新增 ${formatStatValue(stats.monthly_amount, 'currency')}`,
      color: 'secondary' as const
    },
    {
      title: '待报销',
      value: stats.unreimbursed_count,
      icon: '⏳',
      description: `金额 ${formatStatValue(stats.unreimbursed_amount, 'currency')}`,
      color: 'warning' as const,
      change: {
        value: Math.round((stats.unreimbursed_count / stats.total_invoices) * 100),
        trend: stats.unreimbursed_count > stats.reimbursed_count ? 'up' : 'down',
        period: '占比'
      }
    },
    {
      title: '已报销',
      value: stats.reimbursed_count,
      icon: '✅',
      description: `金额 ${formatStatValue(stats.reimbursed_amount, 'currency')}`,
      color: 'success' as const,
      change: {
        value: Math.round((stats.reimbursed_count / stats.total_invoices) * 100),
        trend: 'up' as const,
        period: '完成率'
      }
    }
  ]
}