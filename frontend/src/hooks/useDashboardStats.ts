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

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    if (!user?.id) {
      setData(null)
      setLoading(false)
      return
    }

    try {
      setError(null)
      console.log('🔍 [DashboardStats] 获取统计数据', user.id)

      const { data: statsData, error: statsError } = await supabase
        .from('dashboard_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (statsError) {
        throw new Error(`获取统计数据失败: ${statsError.message}`)
      }

      console.log('✅ [DashboardStats] 统计数据获取成功', statsData)
      setData(statsData)
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

  // 设置实时订阅
  useEffect(() => {
    if (!user?.id) return

    console.log('👂 [DashboardStats] 设置实时订阅', user.id)

    // 订阅PostgreSQL通知
    const channel = supabase.channel('dashboard-stats-changes')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📊 [DashboardStats] 发票数据变化', payload)
          // 延迟刷新，确保数据库更新完成
          setTimeout(() => fetchStats(), 500)
        }
      )
      .on('postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'email_accounts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📧 [DashboardStats] 邮箱账号变化', payload)
          setTimeout(() => fetchStats(), 500)
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'email_scan_jobs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 [DashboardStats] 扫描任务变化', payload)
          setTimeout(() => fetchStats(), 500)
        }
      )
      .subscribe((status) => {
        console.log('📡 [DashboardStats] 订阅状态:', status)
      })

    // 清理订阅
    return () => {
      console.log('🧹 [DashboardStats] 清理实时订阅')
      supabase.removeChannel(channel)
    }
  }, [user?.id]) // 移除fetchStats依赖，直接在回调中调用

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
        description: '本月统计',
        color: 'secondary' as const
      },
      {
        title: '邮箱账号',
        value: 0,
        icon: '📧',
        description: '未配置',
        color: 'accent' as const
      },
      {
        title: '本月处理',
        value: 0,
        icon: '🔍',
        description: '份发票',
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
      description: `本月 ${formatStatValue(stats.monthly_amount, 'currency')}`,
      color: 'secondary' as const
    },
    {
      title: '邮箱账号',
      value: stats.total_email_accounts,
      icon: '📧',
      description: `其中 ${stats.active_email_accounts} 个活跃`,
      color: 'accent' as const
    },
    {
      title: '本月处理',
      value: stats.monthly_processed,
      icon: '🔍',
      description: `总共处理 ${stats.completed_scan_jobs} 个任务`,
      color: 'info' as const
    }
  ]
}