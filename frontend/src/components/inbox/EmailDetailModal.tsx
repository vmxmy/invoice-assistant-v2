/**
 * 邮件详情模态框组件
 * 显示邮件的详细信息，包括HTML内容渲染
 */

import React, { useEffect, useRef } from 'react'
import { useEmailDetail } from '../../hooks/useInboxEmails'
import { useAuth } from '../../hooks/useAuth'
import { InboxService } from '../../services/inboxService'
import { EMAIL_STATUS_CONFIG, EMAIL_CATEGORY_CONFIG } from '../../types/inbox.types'

interface EmailDetailModalProps {
  emailId: string
  onClose: () => void
}

export function EmailDetailModal({ emailId, onClose }: EmailDetailModalProps) {
  const { user } = useAuth()
  const modalRef = useRef<HTMLDialogElement>(null)
  
  const {
    emailDetail,
    isLoading,
    error
  } = useEmailDetail(emailId, user?.id)

  // 打开模态框
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.showModal()
    }
  }, [])

  // 处理ESC键和点击外部关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // 处理模态框关闭
  const handleClose = () => {
    if (modalRef.current) {
      modalRef.current.close()
    }
    onClose()
  }

  // 如果正在加载
  if (isLoading) {
    return (
      <dialog ref={modalRef} className="modal" onClose={handleClose}>
        <div className="modal-box w-11/12 max-w-5xl h-5/6">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="mt-4 text-base-content/70">加载邮件详情...</p>
            </div>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop" onClick={handleClose}>
          <button type="button">关闭</button>
        </form>
      </dialog>
    )
  }

  // 如果出错
  if (error) {
    return (
      <dialog ref={modalRef} className="modal" onClose={handleClose}>
        <div className="modal-box">
          <div className="alert alert-error">
            <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>加载邮件详情失败: {error}</span>
          </div>
          <div className="modal-action">
            <button className="btn" onClick={handleClose}>关闭</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop" onClick={handleClose}>
          <button type="button">关闭</button>
        </form>
      </dialog>
    )
  }

  // 如果没有数据
  if (!emailDetail) {
    return (
      <dialog ref={modalRef} className="modal" onClose={handleClose}>
        <div className="modal-box">
          <div className="alert alert-warning">
            <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>邮件不存在或无权限访问</span>
          </div>
          <div className="modal-action">
            <button className="btn" onClick={handleClose}>关闭</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop" onClick={handleClose}>
          <button type="button">关闭</button>
        </form>
      </dialog>
    )
  }

  const statusConfig = EMAIL_STATUS_CONFIG[emailDetail.overall_status as keyof typeof EMAIL_STATUS_CONFIG] || EMAIL_STATUS_CONFIG.not_processed
  const categoryConfig = EMAIL_CATEGORY_CONFIG[emailDetail.email_category as keyof typeof EMAIL_CATEGORY_CONFIG] || EMAIL_CATEGORY_CONFIG.unknown

  return (
    <dialog ref={modalRef} className="modal" onClose={handleClose}>
      <div className="modal-box w-11/12 max-w-6xl h-5/6 p-0 overflow-hidden">
        {/* 模态框头部 */}
        <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${categoryConfig.bgColor}`}>
                  {categoryConfig.icon}
                </div>
                <h2 className="text-xl font-bold truncate">
                  {emailDetail.email_subject || '无主题'}
                </h2>
                <div className={`badge ${statusConfig.bgColor}`}>
                  <span className="mr-1">{statusConfig.icon}</span>
                  {statusConfig.label}
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-base-content/70">
                <div className="flex items-center gap-2">
                  <span className="font-medium">发件人:</span>
                  <span>{emailDetail.from_name || emailDetail.from_email || '未知'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">收件人:</span>
                  <span>{emailDetail.to_email || '未知'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">时间:</span>
                  <span>{InboxService.formatEmailDate(emailDetail.email_date)}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="btn btn-ghost btn-sm btn-circle"
              title="关闭"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 模态框内容 */}
        <div className="overflow-y-auto h-full pb-20">
          {/* 邮件基本信息 */}
          <div className="p-6 border-b border-base-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-base-content/70">邮件类别:</span>
                  <div className={`inline-flex items-center gap-1 ml-2 px-2 py-1 rounded text-sm ${categoryConfig.bgColor}`}>
                    {categoryConfig.icon} {categoryConfig.label}
                  </div>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-base-content/70">执行路径:</span>
                  <span className="ml-2 text-sm">{emailDetail.execution_path}</span>
                </div>
                
                {emailDetail.has_attachments && (
                  <div>
                    <span className="text-sm font-medium text-base-content/70">附件:</span>
                    <span className="ml-2 text-sm">
                      {emailDetail.attachment_count} 个附件
                      {emailDetail.attachment_names && (
                        <div className="mt-1 text-xs text-base-content/60">
                          {emailDetail.attachment_names.join(', ')}
                        </div>
                      )}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-base-content/70">处理时间:</span>
                  <span className="ml-2 text-sm">{InboxService.formatEmailDate(emailDetail.created_at)}</span>
                </div>
                
                {emailDetail.total_processing_time && (
                  <div>
                    <span className="text-sm font-medium text-base-content/70">耗时:</span>
                    <span className="ml-2 text-sm">{emailDetail.total_processing_time}ms</span>
                  </div>
                )}
                
                {emailDetail.user_mapping_status && (
                  <div>
                    <span className="text-sm font-medium text-base-content/70">用户映射:</span>
                    <span className="ml-2 text-sm">{emailDetail.user_mapping_status}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 处理详情 */}
          {(emailDetail.classification_reason || emailDetail.recommendations) && (
            <div className="p-6 border-b border-base-300">
              <h3 className="text-lg font-semibold mb-4">处理详情</h3>
              
              {emailDetail.classification_reason && (
                <div className="mb-4">
                  <span className="text-sm font-medium text-base-content/70">分类原因:</span>
                  <p className="mt-1 text-sm text-base-content/80">{emailDetail.classification_reason}</p>
                </div>
              )}
              
              {emailDetail.recommendations && emailDetail.recommendations.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-base-content/70">建议:</span>
                  <ul className="mt-1 text-sm text-base-content/80 list-disc list-inside">
                    {emailDetail.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 邮件内容 */}
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">邮件内容</h3>
            
            {/* 优先显示HTML内容，改进渲染样式 */}
            {emailDetail.email_body_html ? (
              <div className="border border-base-300 rounded-lg overflow-hidden bg-white">
                <div className="bg-base-100 px-4 py-2 border-b border-base-300">
                  <span className="text-sm font-medium text-base-content/70">邮件正文 (HTML)</span>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                  <div 
                    className="email-content prose prose-sm max-w-none"
                    style={{
                      lineHeight: '1.6',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      color: '#374151',
                      fontSize: '14px'
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: InboxService.sanitizeHTML(emailDetail.email_body_html) 
                    }} 
                  />
                </div>
              </div>
            ) : emailDetail.email_body_text ? (
              <div className="border border-base-300 rounded-lg overflow-hidden bg-white">
                <div className="bg-base-100 px-4 py-2 border-b border-base-300">
                  <span className="text-sm font-medium text-base-content/70">邮件正文 (文本)</span>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-base-content font-sans leading-relaxed">
                    {emailDetail.email_body_text}
                  </pre>
                </div>
              </div>
            ) : emailDetail.email_body_preview ? (
              <div className="border border-base-300 rounded-lg overflow-hidden bg-base-50">
                <div className="bg-base-100 px-4 py-2 border-b border-base-300">
                  <span className="text-sm font-medium text-base-content/70">内容预览</span>
                </div>
                <div className="p-4">
                  <p className="text-sm text-base-content/80 leading-relaxed">{emailDetail.email_body_preview}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-base-content/50 border border-base-300 rounded-lg bg-base-50">
                <svg className="mx-auto h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-base font-medium">暂无邮件内容</p>
                <p className="text-sm text-base-content/40 mt-1">此邮件可能没有正文内容或内容提取失败</p>
              </div>
            )}
          </div>

          {/* 错误信息 */}
          {emailDetail.error_summary && (
            <div className="p-6 border-t border-base-300">
              <div className="alert alert-warning">
                <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <div className="font-bold">处理过程中出现问题</div>
                  <div className="text-sm">{emailDetail.error_summary}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 模态框底部操作 */}
        <div className="absolute bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 p-4">
          <div className="flex justify-end">
            <button className="btn btn-primary" onClick={handleClose}>
              关闭
            </button>
          </div>
        </div>
      </div>
      
      <form method="dialog" className="modal-backdrop" onClick={handleClose}>
        <button type="button">关闭</button>
      </form>
    </dialog>
  )
}