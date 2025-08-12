/**
 * 仪表板统计数据Hook
 * 使用Supabase Realtime订阅实时更新
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../contexts/AuthContext'
import type { DashboardStats, DashboardStatsResponse, RealtimeStatsPayload } from '../types/dashboard.types'

export function useDashboardStats(): DashboardStatsResponse {
  const { user } = useAuthContext()
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 获取统计数据 - 使用v_dashboard_stats视图
  const fetchStats = useCallback(async () => {
    if (!user?.id) {
      setData(null)
      setLoading(false)
      return
    }

    try {
      setError(null)
      console.log('🔍 [DashboardStats] 获取统计数据', user.id)

      // 优先使用物化视图（带缓存），失败时降级到普通视图
      let statsData = null
      let statsError = null
      
      try {
        // 尝试使用物化视图
        const { data: mvData, error: mvError } = await supabase
          .from('mv_invoice_aggregates')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()  // 使用 maybeSingle 处理空数据
        
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

      // 如果没有数据，创建默认统计数据
      if (!statsData) {
        console.log('用户暂无发票数据，使用默认统计值')
        const defaultStats: DashboardStats = {
          user_id: user.id,
          profile_id: user.id,
          display_name: user.email || '',
          
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
        
        setData(defaultStats)
        return
      }

      // 直接使用视图返回的数据
      const data: DashboardStats = {
        user_id: statsData.user_id,
        profile_id: statsData.user_id, // 使用user_id替代profile_id
        display_name: '', // 需要从其他地方获取
        
        // 发票统计
        total_invoices: statsData.total_invoices,
        total_amount: statsData.total_amount,
        monthly_invoices: statsData.monthly_invoices,
        monthly_amount: statsData.monthly_amount,
        verified_invoices: statsData.verified_count, // 字段名调整
        last_invoice_date: statsData.latest_invoice_date, // 字段名调整
        
        // 报销状态统计
        unreimbursed_count: statsData.unreimbursed_count,
        reimbursed_count: statsData.reimbursed_count,
        unreimbursed_amount: statsData.unreimbursed_amount,
        reimbursed_amount: statsData.reimbursed_amount,
        
        // 临期未报销统计（60天）
        due_soon_unreimbursed_count: statsData.due_soon_unreimbursed_count,
        due_soon_unreimbursed_amount: statsData.due_soon_unreimbursed_amount,
        
        // 超期未报销统计（90天）
        overdue_unreimbursed_count: statsData.overdue_unreimbursed_count,
        overdue_unreimbursed_amount: statsData.overdue_unreimbursed_amount,
        oldest_unreimbursed_date: statsData.oldest_unreimbursed_date,
        
        // 本月报销统计
        monthly_reimbursed_count: statsData.monthly_reimbursed_count,
        monthly_reimbursed_amount: statsData.monthly_reimbursed_amount,
        
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
        invoice_growth_rate: statsData.invoice_growth_rate,
        amount_growth_rate: statsData.amount_growth_rate,
        
        // 用户状态 - 新视图不包含这些字段，设置默认值
        is_active: true,
        is_premium: false,
        premium_expires_at: null,
        
        // 时间戳
        updated_at: new Date().toISOString()
      }

      console.log('✅ [DashboardStats] 统计数据获取成功', {
        totalInvoices: data.total_invoices,
        monthlyInvoices: data.monthly_invoices,
        monthlyAmount: data.monthly_amount,
        dueSoonCount: data.due_soon_unreimbursed_count,
        dueSoonAmount: data.due_soon_unreimbursed_amount,
        overdueCount: data.overdue_unreimbursed_count,
        overdueAmount: data.overdue_unreimbursed_amount
      })
      setData(data)
    } catch (err) {
      console.error('❌ [DashboardStats] 获取统计数据失败:', err)
      setError(err as Error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // 初始化数据获取
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // 优化的轮询策略 - 基于用户活动和缓存状态
  useEffect(() => {
    if (!user?.id) return

    console.log('⏰ [DashboardStats] 设置智能刷新策略', user.id)

    let refreshInterval = 60000 // 默认60秒
    let lastActivity = Date.now()
    let interval: NodeJS.Timeout

    // 检测用户活动
    const handleUserActivity = () => {
      lastActivity = Date.now()
      // 用户活跃时，加快刷新频率
      if (refreshInterval !== 30000) {
        refreshInterval = 30000 // 30秒
        clearInterval(interval)
        startPolling()
      }
    }

    // 智能轮询逻辑
    const startPolling = () => {
      interval = setInterval(async () => {
        const timeSinceActivity = Date.now() - lastActivity
        
        // 根据用户活动调整刷新频率
        if (timeSinceActivity > 300000) { // 5分钟无活动
          refreshInterval = 180000 // 3分钟
        } else if (timeSinceActivity > 120000) { // 2分钟无活动
          refreshInterval = 90000 // 90秒
        } else {
          refreshInterval = 30000 // 30秒
        }

        console.log('🔄 [DashboardStats] 智能刷新', {
          refreshInterval: refreshInterval / 1000 + '秒',
          timeSinceActivity: Math.round(timeSinceActivity / 1000) + '秒'
        })
        
        // 调用后端智能刷新函数（带缓存控制）
        try {
          const { data: refreshResult } = await supabase
            .rpc('refresh_invoice_aggregates', {
              force_refresh: false,
              max_age_minutes: 15
            })
          
          if (refreshResult?.refreshed) {
            console.log('✅ [DashboardStats] 缓存已刷新')
            fetchStats()
          } else {
            console.log('⌛ [DashboardStats] 使用缓存数据', refreshResult?.message)
          }
        } catch (error) {
          console.error('❌ [DashboardStats] 刷新失败', error)
          fetchStats() // 降级到直接查询
        }
        
        // 动态调整轮询间隔
        if (interval && refreshInterval !== 30000) {
          clearInterval(interval)
          startPolling()
        }
      }, refreshInterval)
    }

    // 监听用户活动
    document.addEventListener('mousemove', handleUserActivity)
    document.addEventListener('keypress', handleUserActivity)
    document.addEventListener('click', handleUserActivity)
    
    // 监听页面可见性
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('😴 [DashboardStats] 页面隐藏，暂停刷新')
        clearInterval(interval)
      } else {
        console.log('👀 [DashboardStats] 页面可见，恢复刷新')
        fetchStats() // 立即刷新一次
        startPolling()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 启动轮询
    startPolling()

    // 清理
    return () => {
      console.log('🧹 [DashboardStats] 清理智能刷新')
      clearInterval(interval)
      document.removeEventListener('mousemove', handleUserActivity)
      document.removeEventListener('keypress', handleUserActivity)
      document.removeEventListener('click', handleUserActivity)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id, fetchStats])

  // 手动刷新统计数据
  const refresh = useCallback(() => {
    setLoading(true)
    fetchStats()
  }, [fetchStats])

  return {
    data,
    error,
    loading,
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