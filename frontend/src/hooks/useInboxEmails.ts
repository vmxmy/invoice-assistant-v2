/**
 * 收件箱邮件管理的React Hooks
 */

import { useState, useEffect, useCallback } from 'react'
import { InboxService } from '../services/inboxService'
import type {
  EmailRecord,
  EmailDetail,
  EmailFilters,
  InboxStats,
  UseInboxEmailsParams
} from '../types/inbox.types'

// 邮件列表Hook
export function useInboxEmails(params: UseInboxEmailsParams) {
  const [emails, setEmails] = useState<EmailRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEmails = useCallback(async () => {
    if (!params.userId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await InboxService.getUserEmails(params)
      
      if (response.success) {
        setEmails(response.emails)
        setTotalCount(response.totalCount)
      } else {
        setError(response.error || '获取邮件列表失败')
        setEmails([])
        setTotalCount(0)
      }
    } catch (err: any) {
      setError(err.message || '获取邮件列表失败')
      setEmails([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [params.userId, params.page, params.pageSize, JSON.stringify(params.filters)])

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])

  return {
    emails,
    totalCount,
    isLoading,
    error,
    refetch: fetchEmails
  }
}

// 邮件详情Hook
export function useEmailDetail(emailId: string | null, userId: string | null) {
  const [emailDetail, setEmailDetail] = useState<EmailDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEmailDetail = useCallback(async () => {
    if (!emailId || !userId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await InboxService.getEmailDetail(emailId, userId)
      
      if (response.success) {
        setEmailDetail(response.email)
      } else {
        setError(response.error || '获取邮件详情失败')
        setEmailDetail(null)
      }
    } catch (err: any) {
      setError(err.message || '获取邮件详情失败')
      setEmailDetail(null)
    } finally {
      setIsLoading(false)
    }
  }, [emailId, userId])

  useEffect(() => {
    fetchEmailDetail()
  }, [fetchEmailDetail])

  return {
    emailDetail,
    isLoading,
    error,
    refetch: fetchEmailDetail
  }
}

// 收件箱统计Hook
export function useInboxStats(userId: string | null) {
  const [stats, setStats] = useState<InboxStats>({
    total_emails: 0,
    unread_emails: 0,
    verification_emails: 0,
    invoice_emails: 0,
    successful_processing: 0,
    failed_processing: 0,
    emails_with_attachments: 0,
    emails_with_body: 0,
    recent_emails_today: 0,
    recent_emails_week: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await InboxService.getInboxStats(userId)
      
      if (response.success) {
        setStats(response.stats)
      } else {
        setError(response.error || '获取统计信息失败')
      }
    } catch (err: any) {
      setError(err.message || '获取统计信息失败')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats
  }
}

// 邮件过滤器Hook
export function useEmailFilters(initialFilters: EmailFilters = {}) {
  const [filters, setFilters] = useState<EmailFilters>(initialFilters)

  const updateFilter = useCallback((key: keyof EmailFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }))
  }, [])

  const updateFilters = useCallback((newFilters: Partial<EmailFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  return {
    filters,
    updateFilter,
    updateFilters,
    clearFilters,
    resetFilters
  }
}

// 分页Hook
export function usePagination(initialPage = 1, initialPageSize = 20) {
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage))
  }, [])

  const nextPage = useCallback(() => {
    setPage(prev => prev + 1)
  }, [])

  const prevPage = useCallback(() => {
    setPage(prev => Math.max(1, prev - 1))
  }, [])

  const changePageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setPage(1) // 重置到第一页
  }, [])

  const resetPagination = useCallback(() => {
    setPage(initialPage)
    setPageSize(initialPageSize)
  }, [initialPage, initialPageSize])

  return {
    page,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    resetPagination
  }
}

// 邮件操作Hook
export function useEmailActions() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const markAsRead = useCallback(async (emailId: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // TODO: 实现标记为已读的API调用
      console.log('标记邮件为已读:', emailId)
      // const response = await InboxService.markAsRead(emailId)
    } catch (err: any) {
      setError(err.message || '标记已读失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteEmail = useCallback(async (emailId: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // TODO: 实现删除邮件的API调用
      console.log('删除邮件:', emailId)
      // const response = await InboxService.deleteEmail(emailId)
    } catch (err: any) {
      setError(err.message || '删除邮件失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    error,
    markAsRead,
    deleteEmail
  }
}