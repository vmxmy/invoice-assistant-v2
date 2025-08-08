/**
 * 收件箱统计信息组件
 * 显示邮件处理的各种统计数据
 */

import React from 'react'
import type { InboxStats as InboxStatsType } from '../../types/inbox.types'
import { DaisyUIStatsSection, type StatItem } from '../invoice/indicators/DaisyUIStatsSection'
import { 
  EnvelopeIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface InboxStatsProps {
  stats: InboxStatsType
  isLoading: boolean
  error: string | null
}

export function InboxStats({ stats, isLoading, error }: InboxStatsProps) {
  if (error) {
    return (
      <div className="alert alert-warning">
        <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span>统计信息加载失败: {error}</span>
      </div>
    )
  }

  // 计算成功率
  const successRate = stats.total_emails > 0 
    ? Math.round((stats.successful_processing / stats.total_emails) * 100)
    : 0

  // 生成 DaisyUI 统计数据
  const daisyUIStats: StatItem[] = [
    {
      id: 'total-emails',
      title: '总邮件数',
      value: stats.total_emails.toLocaleString(),
      desc: stats.recent_emails_today > 0 ? `今日新增 ${stats.recent_emails_today}` : '今日无新增',
      icon: <EnvelopeIcon className="h-8 w-8 stroke-current opacity-80" />,
      trend: stats.recent_emails_today > 0 ? 'up' : 'neutral'
    },
    {
      id: 'invoice-emails',
      title: '发票邮件',
      value: stats.invoice_emails.toLocaleString(),
      desc: stats.emails_with_attachments > 0 ? `${stats.emails_with_attachments} 个含附件` : '无附件',
      icon: <DocumentTextIcon className="h-8 w-8 stroke-current opacity-80" />
    },
    {
      id: 'success-rate',
      title: '处理成功率',
      value: `${successRate}%`,
      desc: `${stats.successful_processing}/${stats.total_emails} 成功`,
      icon: <CheckCircleIcon className="h-8 w-8 stroke-current opacity-80" />,
      trend: successRate >= 80 ? 'up' : successRate >= 50 ? 'neutral' : 'down'
    },
    {
      id: 'weekly-activity',
      title: '本周活跃',
      value: stats.recent_emails_week.toLocaleString(),
      desc: stats.recent_emails_today > 0 ? `今日 ${stats.recent_emails_today}` : '今日无活动',
      icon: <ChartBarIcon className="h-8 w-8 stroke-current opacity-80" />
    }
  ]

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-base-content">统计概览</h2>
        {isLoading && (
          <span className="loading loading-spinner loading-sm"></span>
        )}
      </div>

      {/* 使用 DaisyUI Stats 组件 */}
      <DaisyUIStatsSection 
        stats={daisyUIStats}
        loading={isLoading}
      />

      {/* 失败情况提醒（仅在有失败时显示） */}
      {stats.failed_processing > 0 && (
        <div className="alert alert-warning py-2">
          <svg className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm">
            有 <strong>{stats.failed_processing}</strong> 封邮件处理失败，建议检查邮件内容或系统配置
          </span>
        </div>
      )}
    </div>
  )
}