/**
 * 收件箱统计信息组件
 * 显示邮件处理的各种统计数据
 */

import React from 'react'
import type { InboxStats as InboxStatsType } from '../../types/inbox.types'

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

  const statCards = [
    {
      title: '总邮件数',
      value: stats.total_emails,
      icon: '📧',
      trend: stats.recent_emails_today > 0 ? '+' + stats.recent_emails_today : '',
      trendLabel: '今日新增',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: '发票邮件',
      value: stats.invoice_emails,
      icon: '📄',
      trend: stats.emails_with_attachments > 0 ? stats.emails_with_attachments + '个' : '',
      trendLabel: '含附件',
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      title: '处理成功率',
      value: successRate + '%',
      icon: '✅',
      trend: stats.successful_processing + '/' + stats.total_emails,
      trendLabel: '成功/总数',
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      title: '本周活跃',
      value: stats.recent_emails_week,
      icon: '📊',
      trend: stats.recent_emails_today > 0 ? stats.recent_emails_today + '/' + stats.recent_emails_week : '',
      trendLabel: '今日/本周',
      color: 'text-info',
      bgColor: 'bg-info/10'
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

      {/* 4个半高指标卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-base-100 rounded-lg border border-base-300 p-3 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            {/* 顶部：图标和数值 */}
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.bgColor}`}>
                <span className="text-sm">{card.icon}</span>
              </div>
              
              {isLoading ? (
                <span className="loading loading-dots loading-xs"></span>
              ) : (
                <span className={`text-lg font-bold ${card.color}`}>
                  {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                </span>
              )}
            </div>
            
            {/* 标题 */}
            <div className="mb-1">
              <h3 className="text-sm font-medium text-base-content">{card.title}</h3>
            </div>

            {/* 趋势信息 */}
            {card.trend && (
              <div className="text-xs text-base-content/60">
                <span className="font-medium">{card.trend}</span>
                <span className="ml-1">{card.trendLabel}</span>
              </div>
            )}
          </div>
        ))}
      </div>

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