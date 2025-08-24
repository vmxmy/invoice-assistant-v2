/**
 * 收件箱主页面组件
 * 整合邮件列表、过滤器、统计信息等功能
 */

import React, { useState } from 'react'
import { Mail, RefreshCw } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useInboxEmails, useInboxStats, useEmailFilters, usePagination } from '../../hooks/useInboxEmails'
import { EmailList } from './EmailList'
import { EmailDetailModal } from './EmailDetailModal'
import { InboxStats } from './InboxStats'
import { EmailFilters } from './EmailFilters'
import PageHeader from '../layout/PageHeader'
import Layout from '../layout/Layout'
import type { EmailFilters as EmailFiltersType } from '../../types/inbox.types'

export function InboxPage() {
  const { user } = useAuth()
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  
  // 分页管理
  const { page, pageSize, goToPage, nextPage, prevPage, changePageSize } = usePagination(1, 20)
  
  // 过滤器管理
  const { filters, updateFilter, updateFilters, clearFilters } = useEmailFilters()
  
  // 邮件列表数据
  const {
    emails,
    totalCount,
    isLoading: emailsLoading,
    error: emailsError,
    refetch: refetchEmails
  } = useInboxEmails({
    userId: user?.id || '',
    page,
    pageSize,
    filters
  })
  
  // 统计信息
  const {
    stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useInboxStats(user?.id || '')

  // 处理邮件选择
  const handleEmailSelect = (emailId: string) => {
    setSelectedEmailId(emailId)
  }

  // 处理模态框关闭
  const handleModalClose = () => {
    setSelectedEmailId(null)
  }

  // 处理过滤器变更
  const handleFiltersChange = (newFilters: Partial<EmailFiltersType>) => {
    updateFilters(newFilters)
    goToPage(1) // 重置到第一页
  }

  // 处理刷新
  const handleRefresh = () => {
    refetchEmails()
    refetchStats()
  }

  // 计算分页信息
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, totalCount)

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-warning">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>请先登录以查看收件箱</span>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      {/* 通用页面头部 */}
      <PageHeader
        title="收件箱"
        icon={<Mail className="w-6 h-6" />}
        description="查看和管理邮件处理记录"
        actions={[
          {
            label: '刷新',
            onClick: handleRefresh,
            variant: 'ghost',
            icon: <RefreshCw className={`w-4 h-4 ${emailsLoading ? 'animate-spin' : ''}`} />,
            disabled: emailsLoading
          }
        ]}
      />

      <div className="container mx-auto px-4 py-6">
        {/* 统计信息 */}
        <div className="mb-6">
          <InboxStats
            stats={stats}
            isLoading={statsLoading}
            error={statsError}
          />
        </div>

        {/* 过滤器 */}
        <div className="mb-6">
          <EmailFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={clearFilters}
          />
        </div>

        {/* 邮件列表区域 */}
        <div className="bg-base-100 rounded-lg shadow-sm border border-base-300">
          {/* 列表头部 */}
          <div className="border-b border-base-300 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">邮件列表</h2>
                {emailsLoading && (
                  <span className="loading loading-spinner loading-sm"></span>
                )}
              </div>
              
              {totalCount > 0 && (
                <div className="text-sm text-base-content/70">
                  显示 {startIndex}-{endIndex} 项，共 {totalCount} 项
                </div>
              )}
            </div>
          </div>

          {/* 错误信息 */}
          {emailsError && (
            <div className="p-4 border-b border-base-300">
              <div className="alert alert-error">
                <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>加载邮件列表失败: {emailsError}</span>
                <button
                  onClick={handleRefresh}
                  className="btn btn-sm btn-ghost"
                >
                  重试
                </button>
              </div>
            </div>
          )}

          {/* 邮件列表 */}
          <EmailList
            emails={emails}
            isLoading={emailsLoading}
            onEmailSelect={handleEmailSelect}
          />

          {/* 分页控件 */}
          {totalCount > 0 && (
            <div className="border-t border-base-300 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-base-content/70">每页显示</span>
                  <select
                    className="select select-sm select-bordered"
                    value={pageSize}
                    onChange={(e) => changePageSize(Number(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-base-content/70">项</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={prevPage}
                    disabled={page <= 1}
                    className="btn btn-sm btn-ghost"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    上一页
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (page <= 3) {
                        pageNum = i + 1
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = page - 2 + i
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`btn btn-sm ${page === pageNum ? 'btn-primary' : 'btn-ghost'}`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={nextPage}
                    disabled={page >= totalPages}
                    className="btn btn-sm btn-ghost"
                  >
                    下一页
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 邮件详情模态框 */}
        {selectedEmailId && (
          <EmailDetailModal
            emailId={selectedEmailId}
            onClose={handleModalClose}
          />
        )}
      </div>
    </Layout>
  )
}

export default InboxPage;