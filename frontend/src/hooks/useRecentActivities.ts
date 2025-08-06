import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../contexts/AuthContext'

interface RecentActivity {
  id: string
  type: 'invoice_created' | 'invoice_updated' | 'status_changed' | 'invoice_deleted'
  title: string
  description: string
  timestamp: string
  icon: string
  color: string
}

export function useRecentActivities(limit: number = 5) {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: ['recent-activities', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return []

      const activities: RecentActivity[] = []

      // 获取最近创建的发票
      const { data: recentInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, vendor_name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      // 获取最近的状态变更历史
      const { data: statusHistory } = await supabase
        .from('invoice_status_history')
        .select(`
          id,
          from_status,
          to_status,
          changed_at,
          invoice:invoices!invoice_id (
            invoice_number,
            vendor_name
          )
        `)
        .eq('changed_by', user.id)
        .order('changed_at', { ascending: false })
        .limit(limit)

      // 处理最近创建的发票
      if (recentInvoices) {
        recentInvoices.forEach(invoice => {
          activities.push({
            id: `created-${invoice.id}`,
            type: 'invoice_created',
            title: '创建发票',
            description: `发票 #${invoice.invoice_number} - ${invoice.vendor_name || '未知供应商'}`,
            timestamp: invoice.created_at,
            icon: '📄',
            color: 'text-success'
          })
        })
      }

      // 处理状态变更
      if (statusHistory) {
        statusHistory.forEach(history => {
          if (history.invoice) {
            const statusMap: Record<string, { label: string; icon: string; color: string }> = {
              'pending': { label: '待处理', icon: '⏳', color: 'text-warning' },
              'processing': { label: '处理中', icon: '⚙️', color: 'text-info' },
              'completed': { label: '已完成', icon: '✅', color: 'text-success' },
              'failed': { label: '失败', icon: '❌', color: 'text-error' }
            }

            const toStatus = statusMap[history.to_status] || { label: history.to_status, icon: '📝', color: 'text-base-content' }

            activities.push({
              id: history.id,
              type: 'status_changed',
              title: '状态变更',
              description: `发票 #${history.invoice.invoice_number} 状态更新为${toStatus.label}`,
              timestamp: history.changed_at,
              icon: toStatus.icon,
              color: toStatus.color
            })
          }
        })
      }

      // 按时间排序并限制数量
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // 30秒刷新一次
    staleTime: 10000, // 10秒内认为数据是新鲜的
  })
}