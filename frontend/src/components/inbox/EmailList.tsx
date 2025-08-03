/**
 * 邮件列表组件
 * 显示邮件列表，支持点击查看详情
 */

import React from 'react'
import { InboxService } from '../../services/inboxService'
import { 
  EMAIL_STATUS_CONFIG, 
  EMAIL_CATEGORY_CONFIG,
  EXECUTION_PATH_CONFIG,
  type EmailRecord 
} from '../../types/inbox.types'

interface EmailListProps {
  emails: EmailRecord[]
  isLoading: boolean
  onEmailSelect: (emailId: string) => void
}

export function EmailList({ emails, isLoading, onEmailSelect }: EmailListProps) {
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="mt-4 text-base-content/70">加载邮件列表...</p>
          </div>
        </div>
      </div>
    )
  }

  if (emails.length === 0) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <svg className="mx-auto h-16 w-16 text-base-content/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-base-content/70 mb-2">暂无邮件</h3>
          <p className="text-base-content/50">当前条件下没有找到邮件记录</p>
        </div>
      </div>
    )
  }

  return (
    <div className="divide-y divide-base-300">
      {emails.map((email) => {
        const statusConfig = EMAIL_STATUS_CONFIG[email.overall_status as keyof typeof EMAIL_STATUS_CONFIG] || EMAIL_STATUS_CONFIG.not_processed
        const categoryConfig = EMAIL_CATEGORY_CONFIG[email.email_category as keyof typeof EMAIL_CATEGORY_CONFIG] || EMAIL_CATEGORY_CONFIG.unknown
        const pathConfig = EXECUTION_PATH_CONFIG[email.execution_path as keyof typeof EXECUTION_PATH_CONFIG] || { label: email.execution_path, description: '', color: 'text-gray-600' }

        return (
          <div
            key={email.id}
            onClick={() => onEmailSelect(email.id)}
            className="p-4 hover:bg-base-200 cursor-pointer transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* 类别图标 */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${categoryConfig.bgColor}`}>
                {categoryConfig.icon}
              </div>

              {/* 邮件信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-base-content truncate">
                      {email.email_subject || '无主题'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-base-content/70">
                      <span className="truncate">
                        发件人: {email.from_name || email.from_email || '未知'}
                      </span>
                      {email.to_email && (
                        <>
                          <span>•</span>
                          <span className="truncate">收件人: {email.to_email}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`badge ${statusConfig.bgColor} badge-sm`}>
                      <span className="mr-1">{statusConfig.icon}</span>
                      {statusConfig.label}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-4 text-base-content/60">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">类别:</span>
                      <span className={`px-2 py-1 rounded text-xs ${categoryConfig.bgColor}`}>
                        {categoryConfig.icon} {categoryConfig.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="font-medium">路径:</span>
                      <span className={pathConfig.color}>{pathConfig.label}</span>
                    </div>

                    {email.has_attachments && (
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span>{email.attachment_count} 附件</span>
                      </div>
                    )}

                    {email.user_mapping_status && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">用户:</span>
                        <span className="text-xs px-2 py-1 rounded bg-base-200">
                          {email.user_mapping_status}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-base-content/50 flex-shrink-0">
                    {InboxService.formatEmailDate(email.email_date || email.created_at)}
                  </div>
                </div>

                {/* 分类原因或错误摘要 */}
                {(email.classification_reason || email.error_summary) && (
                  <div className="mt-2 text-sm text-base-content/60">
                    {email.error_summary ? (
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-error mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-error">
                          {InboxService.truncateText(email.error_summary, 120)}
                        </span>
                      </div>
                    ) : email.classification_reason && (
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-info mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          {InboxService.truncateText(email.classification_reason, 120)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 箭头图标 */}
              <div className="flex-shrink-0 text-base-content/40">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}