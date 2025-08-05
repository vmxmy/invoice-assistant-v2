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
  UserConfigService,
  type Invoice,
  type OCRRequest
} from '../services/supabaseDataService'
import toast from 'react-hot-toast'

// Query Keys
export const QUERY_KEYS = {
  invoices: (userId: string, filters?: any) => ['invoices', userId, filters],
  userConfig: (userId: string) => ['userConfig', userId],
}

/**
 * 发票相关 Hooks
 */
export const useInvoices = (
  filters?: {
    seller_name?: string
    buyer_name?: string
    invoice_number?: string
    invoice_type?: string
    date_from?: string
    date_to?: string
    amount_min?: number
    amount_max?: number
    status?: string[]
    source?: string[]
    global_search?: string
  },
  page: number = 1,
  pageSize: number = 20,
  sortField: string = 'consumption_date',
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: QUERY_KEYS.invoices(user?.id || '', { filters, page, pageSize, sortField, sortOrder }),
    queryFn: () => {
      if (!user?.id) throw new Error('用户未登录')
      return InvoiceService.getInvoices(user.id, page, pageSize, filters, sortField, sortOrder)
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

  // 使用轮询替代实时订阅 - 避免WebSocket连接问题
  React.useEffect(() => {
    if (!user?.id) return

    // 每30秒自动刷新已删除发票列表
    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: ['deletedInvoices', user.id]
      })
    }, 30000) // 30秒

    return () => {
      clearInterval(interval)
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

export const useBatchRestoreInvoices = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invoiceIds: string[]) => {
      if (!user?.id) throw new Error('用户未登录')
      return InvoiceService.batchRestoreInvoices(invoiceIds, user.id)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`批量恢复失败: ${result.error}`)
        return
      }
      
      const { successCount, failedIds } = result.data!
      if (successCount > 0) {
        toast.success(`成功恢复 ${successCount} 个发票${failedIds.length > 0 ? `，${failedIds.length} 个失败` : ''}`)
      }
      
      // 刷新相关查询缓存
      queryClient.invalidateQueries({
        queryKey: ['deletedInvoices', user?.id || '']
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.invoices(user?.id || '', undefined)
      })
    },
    onError: (error: Error) => {
      toast.error(`批量恢复失败: ${error.message}`)
    }
  })
}

export const useBatchPermanentlyDeleteInvoices = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invoiceIds: string[]) => {
      if (!user?.id) throw new Error('用户未登录')
      return InvoiceService.batchPermanentlyDeleteInvoices(invoiceIds, user.id)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`批量删除失败: ${result.error}`)
        return
      }
      
      const { successCount, failedIds } = result.data!
      if (successCount > 0) {
        toast.success(`成功删除 ${successCount} 个发票${failedIds.length > 0 ? `，${failedIds.length} 个失败` : ''}`)
      }
      
      // 刷新删除发票列表缓存
      queryClient.invalidateQueries({
        queryKey: ['deletedInvoices', user?.id || '']
      })
    },
    onError: (error: Error) => {
      toast.error(`批量删除失败: ${error.message}`)
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