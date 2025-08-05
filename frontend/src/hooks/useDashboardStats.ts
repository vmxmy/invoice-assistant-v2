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

      // 从视图获取统计数据
      const { data: statsData, error: statsError } = await supabase
        .from('v_dashboard_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (statsError) {
        throw new Error(`获取统计数据失败: ${statsError.message}`)
      }

      if (!statsData) {
        throw new Error('未找到统计数据')
      }

      // 直接使用视图返回的数据
      const data: DashboardStats = {
        user_id: statsData.user_id,
        profile_id: statsData.profile_id,
        display_name: statsData.display_name,
        
        // 发票统计
        total_invoices: statsData.total_invoices,
        total_amount: statsData.total_amount,
        monthly_invoices: statsData.monthly_invoices,
        monthly_amount: statsData.monthly_amount,
        verified_invoices: statsData.verified_invoices,
        last_invoice_date: statsData.last_invoice_date,
        
        // 邮箱统计
        total_email_accounts: statsData.total_email_accounts,
        active_email_accounts: statsData.active_email_accounts,
        
        // 扫描统计
        total_scan_jobs: statsData.total_scan_jobs,
        completed_scan_jobs: statsData.completed_scan_jobs,
        monthly_processed: statsData.monthly_processed,
        last_scan_at: statsData.last_scan_at,
        
        // 活动统计
        weekly_invoices: statsData.weekly_invoices,
        daily_invoices: statsData.daily_invoices,
        
        // 增长率
        invoice_growth_rate: statsData.invoice_growth_rate,
        amount_growth_rate: statsData.amount_growth_rate,
        
        // 用户状态
        is_active: statsData.is_active,
        is_premium: statsData.is_premium,
        premium_expires_at: statsData.premium_expires_at,
        
        // 时间戳
        updated_at: statsData.updated_at
      }

      console.log('✅ [DashboardStats] 统计数据获取成功', {
        totalInvoices: data.total_invoices,
        monthlyInvoices: data.monthly_invoices,
        monthlyAmount: data.monthly_amount
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

  // 使用轮询替代实时订阅 - 避免WebSocket连接问题
  useEffect(() => {
    if (!user?.id) return

    console.log('⏰ [DashboardStats] 设置定时刷新', user.id)

    // 每60秒自动刷新统计数据
    const interval = setInterval(() => {
      console.log('🔄 [DashboardStats] 定时刷新统计数据')
      fetchStats()
    }, 60000) // 60秒

    // 清理定时器
    return () => {
      console.log('🧹 [DashboardStats] 清理定时刷新')
      clearInterval(interval)
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
      title: '收件箱',
      value: stats.total_email_accounts || 0,
      icon: '📨',
      description: stats.active_email_accounts > 0 
        ? `${stats.active_email_accounts} 封未读邮件`
        : stats.total_email_accounts > 0 
          ? '没有未读邮件'
          : '暂无邮件',
      color: 'accent' as const,
      change: stats.active_email_accounts > 0 ? {
        value: stats.active_email_accounts,
        trend: 'up' as const,
        period: '未读'
      } : undefined
    },
    {
      title: '本月发票',
      value: stats.monthly_invoices,
      icon: '📋',
      description: `新增 ${stats.monthly_invoices} 张发票`,
      color: 'info' as const
    }
  ]
}