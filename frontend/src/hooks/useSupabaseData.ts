/**
 * 纯Supabase React Hooks
 * 基于React Query和Supabase服务层
 */
import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  InvoiceService,
  EmailAccountService,
  EmailScanJobService,
  UserConfigService,
  type Invoice,
  type EmailAccount,
  type EmailScanJob,
  type OCRRequest
} from '../services/supabaseDataService'
import toast from 'react-hot-toast'

// Query Keys
export const QUERY_KEYS = {
  invoices: (userId: string, filters?: any) => ['invoices', userId, filters],
  emailAccounts: (userId: string) => ['emailAccounts', userId],
  scanJobs: (userId: string) => ['scanJobs', userId],
  userConfig: (userId: string) => ['userConfig', userId],
}

/**
 * 发票相关 Hooks
 */
export const useInvoices = (
  filters?: {
    seller_name?: string
    invoice_number?: string
    date_from?: string
    date_to?: string
    amount_min?: number
    amount_max?: number
  },
  page: number = 1,
  pageSize: number = 20
) => {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: QUERY_KEYS.invoices(user?.id || '', { filters, page, pageSize }),
    queryFn: () => {
      if (!user?.id) throw new Error('用户未登录')
      return InvoiceService.getInvoices(user.id, page, pageSize, filters)
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5分钟
  })
}

export const useCreateInvoice = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invoiceData: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user?.id) throw new Error('用户未登录')
      return InvoiceService.createInvoice(user.id, invoiceData)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`创建发票失败: ${result.error}`)
        return
      }
      
      toast.success('发票创建成功')
      // 使查询缓存失效
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.invoices(user?.id || '', undefined)
      })
    },
    onError: (error: Error) => {
      toast.error(`创建发票失败: ${error.message}`)
    }
  })
}

export const useUpdateInvoice = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      invoiceId, 
      updates 
    }: { 
      invoiceId: string
      updates: Partial<Omit<Invoice, 'id' | 'user_id' | 'created_at'>>
    }) => {
      if (!user?.id) throw new Error('用户未登录')
      return InvoiceService.updateInvoice(invoiceId, user.id, updates)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`更新发票失败: ${result.error}`)
        return
      }
      
      toast.success('发票更新成功')
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.invoices(user?.id || '', undefined)
      })
    },
    onError: (error: Error) => {
      toast.error(`更新发票失败: ${error.message}`)
    }
  })
}

export const useDeleteInvoice = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invoiceId: string) => {
      if (!user?.id) throw new Error('用户未登录')
      return InvoiceService.deleteInvoice(invoiceId, user.id)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`删除发票失败: ${result.error}`)
        return
      }
      
      toast.success('发票已移至回收站')
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.invoices(user?.id || '', undefined)
      })
    },
    onError: (error: Error) => {
      toast.error(`删除发票失败: ${error.message}`)
    }
  })
}

export const useRestoreInvoice = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invoiceId: string) => {
      if (!user?.id) throw new Error('用户未登录')
      return InvoiceService.restoreInvoice(invoiceId, user.id)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`恢复发票失败: ${result.error}`)
        return
      }
      
      toast.success('发票恢复成功')
      // 同时刷新已删除发票列表和普通发票列表的缓存
      queryClient.invalidateQueries({
        queryKey: ['deletedInvoices', user?.id || '']
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.invoices(user?.id || '', undefined)
      })
      // 也刷新统计数据
      queryClient.invalidateQueries({
        queryKey: ['dashboardStats', user?.id]
      })
    },
    onError: (error: Error) => {
      toast.error(`恢复发票失败: ${error.message}`)
    }
  })
}

export const useDeletedInvoices = (page: number = 1, pageSize: number = 20) => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  // 实时订阅invoices表的变更来维护v_deleted_invoices视图数据的同步
  React.useEffect(() => {
    if (!user?.id) return

    const subscription = supabase
      .channel('deleted-invoices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // 当invoices表的删除状态发生变更时，刷新v_deleted_invoices视图查询
          if (payload.new?.status === 'deleted' || payload.old?.status === 'deleted') {
            queryClient.invalidateQueries({
              queryKey: ['deletedInvoices', user.id]
            })
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user?.id, queryClient])

  return useQuery({
    queryKey: ['deletedInvoices', user?.id || '', page, pageSize],
    queryFn: () => {
      if (!user?.id) throw new Error('用户未登录')
      return InvoiceService.getDeletedInvoices(user.id, page, pageSize)
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1分钟（比普通查询更频繁刷新）
    refetchInterval: 30 * 1000, // 30秒自动刷新（用于更新剩余天数）
  })
}

export const usePermanentlyDeleteInvoice = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invoiceId: string) => {
      if (!user?.id) throw new Error('用户未登录')
      return InvoiceService.permanentlyDeleteInvoice(invoiceId, user.id)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`永久删除失败: ${result.error}`)
        return
      }
      
      toast.success('发票已永久删除')
      queryClient.invalidateQueries({
        queryKey: ['deletedInvoices', user?.id || '']
      })
    },
    onError: (error: Error) => {
      toast.error(`永久删除失败: ${error.message}`)
    }
  })
}

export const useInvoiceOCR = () => {
  return useMutation({
    mutationFn: (request: OCRRequest) => {
      return InvoiceService.processInvoiceOCR(request)
    },
    onError: (error: Error) => {
      toast.error(`OCR处理失败: ${error.message}`)
    }
  })
}

/**
 * 邮箱账户相关 Hooks
 */
export const useEmailAccounts = () => {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: QUERY_KEYS.emailAccounts(user?.id || ''),
    queryFn: () => {
      if (!user?.id) throw new Error('用户未登录')
      return EmailAccountService.getEmailAccounts(user.id)
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10分钟
  })
}

export const useCreateEmailAccount = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (accountData: Omit<EmailAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user?.id) throw new Error('用户未登录')
      return EmailAccountService.createEmailAccount(user.id, accountData)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`创建邮箱账户失败: ${result.error}`)
        return
      }
      
      toast.success('邮箱账户创建成功')
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.emailAccounts(user?.id || '')
      })
    },
    onError: (error: Error) => {
      toast.error(`创建邮箱账户失败: ${error.message}`)
    }
  })
}

export const useUpdateEmailAccount = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      accountId, 
      updates 
    }: { 
      accountId: string
      updates: Partial<Omit<EmailAccount, 'id' | 'user_id' | 'created_at'>>
    }) => {
      if (!user?.id) throw new Error('用户未登录')
      return EmailAccountService.updateEmailAccount(accountId, user.id, updates)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`更新邮箱账户失败: ${result.error}`)
        return
      }
      
      toast.success('邮箱账户更新成功')
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.emailAccounts(user?.id || '')
      })
    },
    onError: (error: Error) => {
      toast.error(`更新邮箱账户失败: ${error.message}`)
    }
  })
}

export const useDeleteEmailAccount = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (accountId: string) => {
      if (!user?.id) throw new Error('用户未登录')
      return EmailAccountService.deleteEmailAccount(accountId, user.id)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`删除邮箱账户失败: ${result.error}`)
        return
      }
      
      toast.success('邮箱账户删除成功')
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.emailAccounts(user?.id || '')
      })
    },
    onError: (error: Error) => {
      toast.error(`删除邮箱账户失败: ${error.message}`)
    }
  })
}

export const useTestEmailConnection = () => {
  return useMutation({
    mutationFn: ({ accountId, userId }: { accountId: string, userId: string }) => {
      return EmailAccountService.testEmailConnection(accountId, userId)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`邮箱连接测试失败: ${result.error}`)
        return
      }
      
      if (result.data) {
        toast.success('邮箱连接测试成功')
      } else {
        toast.error('邮箱连接测试失败')
      }
    },
    onError: (error: Error) => {
      toast.error(`邮箱连接测试失败: ${error.message}`)
    }
  })
}

/**
 * 邮箱扫描任务相关 Hooks
 */
export const useEmailScanJobs = () => {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: QUERY_KEYS.scanJobs(user?.id || ''),
    queryFn: () => {
      if (!user?.id) throw new Error('用户未登录')
      return EmailScanJobService.getScanJobs(user.id)
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // 5秒刷新一次（监控任务状态）
  })
}

export const useCreateScanJob = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      emailAccountId, 
      scanConfig 
    }: { 
      emailAccountId: string
      scanConfig: {
        date_from?: string
        date_to?: string
        subject_keywords?: string[]
      }
    }) => {
      if (!user?.id) throw new Error('用户未登录')
      return EmailScanJobService.createScanJob(user.id, emailAccountId, scanConfig)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`创建扫描任务失败: ${result.error}`)
        return
      }
      
      toast.success('扫描任务已开始')
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.scanJobs(user?.id || '')
      })
    },
    onError: (error: Error) => {
      toast.error(`创建扫描任务失败: ${error.message}`)
    }
  })
}

export const useCancelScanJob = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (jobId: string) => {
      if (!user?.id) throw new Error('用户未登录')
      return EmailScanJobService.cancelScanJob(jobId, user.id)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`取消扫描任务失败: ${result.error}`)
        return
      }
      
      toast.success('扫描任务已取消')
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.scanJobs(user?.id || '')
      })
    },
    onError: (error: Error) => {
      toast.error(`取消扫描任务失败: ${error.message}`)
    }
  })
}

/**
 * 用户配置相关 Hooks
 */
export const useUserConfig = () => {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: QUERY_KEYS.userConfig(user?.id || ''),
    queryFn: () => {
      if (!user?.id) throw new Error('用户未登录')
      return UserConfigService.getUserConfig(user.id)
    },
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000, // 30分钟
  })
}

export const useUpdateUserConfig = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: Record<string, any>) => {
      if (!user?.id) throw new Error('用户未登录')
      return UserConfigService.updateUserConfig(user.id, updates)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`更新配置失败: ${result.error}`)
        return
      }
      
      toast.success('配置更新成功')
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userConfig(user?.id || '')
      })
    },
    onError: (error: Error) => {
      toast.error(`更新配置失败: ${error.message}`)
    }
  })
}