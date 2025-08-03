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

  // 获取统计数据 - 改为直接从invoices表计算
  const fetchStats = useCallback(async () => {
    if (!user?.id) {
      setData(null)
      setLoading(false)
      return
    }

    try {
      setError(null)
      console.log('🔍 [DashboardStats] 获取统计数据', user.id)

      // 获取所有发票数据进行统计计算
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)

      if (invoicesError) {
        throw new Error(`获取发票数据失败: ${invoicesError.message}`)
      }

      // 获取邮箱账户数据
      const { data: emailAccountsData, error: emailError } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', user.id)

      if (emailError) {
        console.warn('获取邮箱账户失败:', emailError.message)
      }

      // 获取扫描任务数据
      const { data: scanJobsData, error: scanError } = await supabase
        .from('email_scan_jobs')
        .select('*')
        .eq('user_id', user.id)

      if (scanError) {
        console.warn('获取扫描任务失败:', scanError.message)
      }

      // 计算统计数据
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      
      const invoices = invoicesData || []
      const emailAccounts = emailAccountsData || []
      const scanJobs = scanJobsData || []

      // 总发票数和总金额
      const totalInvoices = invoices.length
      const totalAmount = invoices.reduce((sum, invoice) => {
        const amount = invoice.total_amount || invoice.amount || 0
        return sum + amount
      }, 0)

      // 本月发票统计（按消费日期created_at）
      const monthlyInvoices = invoices.filter(invoice => {
        if (!invoice.created_at) return false
        const targetDate = new Date(invoice.created_at)
        return targetDate.getMonth() === currentMonth && 
               targetDate.getFullYear() === currentYear
      })

      const monthlyAmount = monthlyInvoices.reduce((sum, invoice) => {
        const amount = invoice.total_amount || invoice.amount || 0
        return sum + amount
      }, 0)

      // 已验证发票数
      const verifiedInvoices = invoices.filter(invoice => invoice.is_verified).length

      // 邮箱账户统计
      const totalEmailAccounts = emailAccounts.length
      const activeEmailAccounts = emailAccounts.filter(account => account.is_active).length

      // 扫描任务统计
      const totalScanJobs = scanJobs.length
      const completedScanJobs = scanJobs.filter(job => job.status === 'completed').length
      const monthlyProcessed = scanJobs.filter(job => {
        if (!job.created_at) return false
        const targetDate = new Date(job.created_at)
        return targetDate.getMonth() === currentMonth && 
               targetDate.getFullYear() === currentYear
      }).length

      // 构造统计数据对象
      const statsData: DashboardStats = {
        user_id: user.id,
        profile_id: user.id,
        display_name: user.email?.split('@')[0] || null,
        
        // 发票统计
        total_invoices: totalInvoices,
        total_amount: totalAmount,
        monthly_invoices: monthlyInvoices.length,
        monthly_amount: monthlyAmount,
        verified_invoices: verifiedInvoices,
        last_invoice_date: invoices.length > 0 ? invoices.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0].created_at : null,
        
        // 邮箱统计
        total_email_accounts: totalEmailAccounts,
        active_email_accounts: activeEmailAccounts,
        
        // 扫描统计
        total_scan_jobs: totalScanJobs,
        completed_scan_jobs: completedScanJobs,
        monthly_processed: monthlyProcessed,
        last_scan_at: scanJobs.length > 0 ? scanJobs.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0].created_at : null,
        
        // 活动统计 - 简化版本
        weekly_invoices: monthlyInvoices.length, // 暂时用月度数据
        daily_invoices: Math.round(monthlyInvoices.length / 30), // 估算
        
        // 增长率 - 简化计算
        invoice_growth_rate: totalInvoices > 0 ? Math.round((monthlyInvoices.length / totalInvoices) * 100) : 0,
        amount_growth_rate: totalAmount > 0 ? Math.round((monthlyAmount / totalAmount) * 100) : 0,
        
        // 用户状态
        is_active: true,
        is_premium: false,
        premium_expires_at: null,
        
        // 时间戳
        updated_at: new Date().toISOString()
      }

      console.log('✅ [DashboardStats] 统计数据计算成功', {
        totalInvoices,
        monthlyInvoices: monthlyInvoices.length,
        monthlyAmount,
        currentMonth: currentMonth + 1,
        currentYear
      })
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
        description: '本月新增 ¥0',
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
      title: '邮箱账号',
      value: stats.total_email_accounts,
      icon: '📧',
      description: `其中 ${stats.active_email_accounts} 个活跃`,
      color: 'accent' as const
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