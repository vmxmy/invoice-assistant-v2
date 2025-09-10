/**
 * 优化版Supabase React Hooks
 * 使用统一查询键和精确缓存管理，提升性能
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
import { QueryKeys, QueryOptions, NetworkOptions } from '../utils/queryKeys'
import toast from 'react-hot-toast'

// 使用统一的查询键系统
// 注意：这里保留旧的QUERY_KEYS以保持兼容性，但推荐使用QueryKeys
export const QUERY_KEYS = {
  invoices: (userId: string, filters?: any) => QueryKeys.invoiceList(userId, filters),
  userConfig: (userId: string) => QueryKeys.userConfig(userId),
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
    overdue?: boolean
    urgent?: boolean
  },
  page: number = 1,
  pageSize: number = 20,
  sortField: string = 'consumption_date',
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  const { user } = useAuthContext()
  
  const queryParams = { filters, page, pageSize, sortField, sortOrder }

  return useQuery({
    queryKey: QueryKeys.invoiceList(user?.id || '', queryParams),
    queryFn: () => {
      if (!user?.id) throw new Error('用户未登录')
      return InvoiceService.getInvoices(user.id, page, pageSize, filters, sortField, sortOrder)
    },
    enabled: !!user?.id,
    ...QueryOptions.moderate, // 使用中等频率选项
    ...NetworkOptions.optimized, // 使用网络优化选项
    
    // 智能占位数据
    placeholderData: { data: [], total: 0, error: null },
    
    // 错误处理
    onError: (error: any) => {
      console.error('❌ [useInvoices] 获取发票列表失败:', error)
    }
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
    
    // 乐观更新：立即显示更新结果，提升用户体验
    onMutate: async (variables) => {
      // 取消相关的正在进行的查询
      await queryClient.cancelQueries({
        queryKey: QueryKeys.invoice(user!.id, variables.invoiceId)
      })
      
      // 获取当前数据以便回滚
      const previousInvoice = queryClient.getQueryData(
        QueryKeys.invoice(user!.id, variables.invoiceId)
      )
      
      // 乐观更新数据
      queryClient.setQueryData(
        QueryKeys.invoice(user!.id, variables.invoiceId),
        (old: any) => ({ ...old, ...variables.updates })
      )
      
      return { previousInvoice }
    },
    
    onSuccess: (result, variables) => {
      if (result.error) {
        toast.error(`更新发票失败: ${result.error}`)
        return
      }
      
      toast.success('发票更新成功')
      
      // 精确缓存更新：直接设置新数据
      if (result.data) {
        queryClient.setQueryData(
          QueryKeys.invoice(user!.id, variables.invoiceId),
          result.data
        )
      }
      
      // 精确失效：只失效相关的列表查询
      queryClient.invalidateQueries({
        queryKey: QueryKeys.invoiceList(user!.id),
        exact: false,
        refetchType: 'active' // 只重新获取当前活跃的查询
      })
      
      // 如果更新了状态相关字段，更新统计数据
      if (variables.updates.status || variables.updates.amount || variables.updates.total_amount) {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.dashboardStats(user!.id)
        })
      }
    },
    
    onError: (error: any, variables, context) => {
      // 回滚乐观更新
      if (context?.previousInvoice) {
        queryClient.setQueryData(
          QueryKeys.invoice(user!.id, variables.invoiceId),
          context.previousInvoice
        )
      }
      
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
    
    // 乐观删除：立即从列表中移除
    onMutate: async (invoiceId) => {
      // 取消相关查询
      await queryClient.cancelQueries({
        queryKey: QueryKeys.invoiceList(user!.id)
      })
      
      // 获取当前数据
      const previousData = queryClient.getQueriesData({
        queryKey: QueryKeys.invoiceList(user!.id),
        exact: false
      })
      
      // 乐观删除：从列表中移除
      queryClient.setQueriesData(
        { queryKey: QueryKeys.invoiceList(user!.id), exact: false },
        (oldData: any) => {
          if (!oldData || !oldData.data) return oldData
          return {
            ...oldData,
            data: oldData.data.filter((invoice: any) => invoice.id !== invoiceId),
            total: Math.max(0, (oldData.total || 1) - 1)
          }
        }
      )
      
      return { previousData }
    },
    
    onSuccess: (result, invoiceId) => {
      if (result.error) {
        toast.error(`删除发票失败: ${result.error}`)
        return
      }
      
      toast.success('发票已永久删除')
      
      // 清除单个发票的缓存
      queryClient.removeQueries({ 
        queryKey: QueryKeys.invoice(user!.id, invoiceId) 
      })
      
      
      // 更新统计数据
      queryClient.invalidateQueries({
        queryKey: QueryKeys.dashboardStats(user!.id)
      })
    },
    
    onError: (error: any, invoiceId, context) => {
      // 回滚乐观删除
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      
      toast.error(`删除发票失败: ${error.message}`)
    }
  })
}





export const useBatchDeleteInvoices = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invoiceIds: string[]) => {
      if (!user?.id) throw new Error('用户未登录')
      return InvoiceService.batchDeleteInvoices(invoiceIds, user.id)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`批量删除失败: ${result.error}`)
        return
      }
      
      const { successCount, failedIds } = result.data!
      if (successCount > 0) {
        toast.success(`已永久删除 ${successCount} 张发票${failedIds.length > 0 ? `，${failedIds.length} 个失败` : ''}`)
      }
      
      // 精确缓存管理
      queryClient.invalidateQueries({
        queryKey: QueryKeys.invoiceList(user!.id),
        exact: false
      })
      queryClient.invalidateQueries({
        queryKey: QueryKeys.dashboardStats(user!.id)
      })
    },
    onError: (error: Error) => {
      toast.error(`批量删除失败: ${error.message}`)
    }
  })
}

export const useBatchUpdateInvoiceStatus = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ invoiceIds, newStatus }: { invoiceIds: string[], newStatus: string }) => {
      if (!user?.id) throw new Error('用户未登录')
      return InvoiceService.batchUpdateInvoiceStatus(invoiceIds, user.id, newStatus)
    },
    onSuccess: (result, { newStatus }) => {
      if (result.error) {
        toast.error(`批量状态更新失败: ${result.error}`)
        return
      }
      
      const { successCount, failedIds } = result.data!
      if (successCount > 0) {
        toast.success(`已更新 ${successCount} 张发票状态为"${newStatus}"${failedIds.length > 0 ? `，${failedIds.length} 个失败` : ''}`)
      }
      
      // 精确缓存管理
      queryClient.invalidateQueries({
        queryKey: QueryKeys.invoiceList(user!.id),
        exact: false
      })
      queryClient.invalidateQueries({
        queryKey: QueryKeys.dashboardStats(user!.id)
      })
    },
    onError: (error: Error) => {
      toast.error(`批量状态更新失败: ${error.message}`)
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
    queryKey: QueryKeys.userConfig(user?.id || ''),
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
        queryKey: QueryKeys.userConfig(user!.id)
      })
    },
    onError: (error: Error) => {
      toast.error(`更新配置失败: ${error.message}`)
    }
  })
}