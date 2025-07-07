// React Query hooks for invoice management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/apiClient'
import { logger } from '../utils/logger'

// 查询键常量
export const INVOICE_KEYS = {
  all: ['invoices'] as const,
  lists: () => [...INVOICE_KEYS.all, 'list'] as const,
  list: (params?: any) => [...INVOICE_KEYS.lists(), params] as const,
  details: () => [...INVOICE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...INVOICE_KEYS.details(), id] as const,
  stats: () => [...INVOICE_KEYS.all, 'stats'] as const,
}

// 获取发票列表
export const useInvoices = (params?: { 
  skip?: number
  limit?: number
  seller_name?: string
  invoice_number?: string 
}) => {
  return useQuery({
    queryKey: INVOICE_KEYS.list(params),
    queryFn: async () => {
      const response = await api.invoices.list(params)
      return response.data
    },
    staleTime: 1 * 60 * 1000, // 1分钟内不重新获取（减少缓存时间）
    placeholderData: { items: [], total: 0 }, // 提供占位数据
    refetchOnWindowFocus: true, // 窗口获得焦点时刷新
    refetchOnMount: true, // 组件挂载时刷新
  })
}

// 手动刷新发票列表
export const useRefreshInvoices = () => {
  const queryClient = useQueryClient()
  
  return () => {
    // 清除所有发票相关缓存
    queryClient.removeQueries({ queryKey: INVOICE_KEYS.all })
    // 重新获取数据
    queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.all })
    logger.log('🔄 手动刷新发票数据')
  }
}

// 获取单个发票详情
export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: INVOICE_KEYS.detail(id),
    queryFn: async () => {
      const response = await api.invoices.get(id)
      return response.data
    },
    enabled: !!id, // 只有在有ID时才执行
    staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
  })
}

// 获取发票统计
export const useInvoiceStats = () => {
  return useQuery({
    queryKey: INVOICE_KEYS.stats(),
    queryFn: async () => {
      const response = await api.invoices.stats()
      return response.data
    },
    staleTime: 10 * 60 * 1000, // 10分钟内不重新获取
  })
}

// 创建发票 mutation
export const useCreateInvoice = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.invoices.create(formData)
      return response.data
    },
    onSuccess: (data) => {
      // 使相关查询失效，触发重新获取
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.stats() })
      logger.log('✅ 发票创建成功:', data.id)
    },
    onError: (error: any) => {
      let errorMessage = '发票创建失败'
      
      if (error.status === 400) {
        errorMessage = '文件格式不正确或数据无效'
      } else if (error.status === 413) {
        errorMessage = '文件太大，请选择较小的文件'
      } else if (error.status >= 500) {
        errorMessage = '服务器错误，请稍后重试'
      } else {
        errorMessage = error.message || '发票创建失败'
      }
      
      logger.error('❌', errorMessage, error.status ? `(${error.status})` : '')
    },
  })
}

// 更新发票 mutation
export const useUpdateInvoice = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.invoices.update(id, data)
      return response.data
    },
    onSuccess: (data) => {
      // 更新相关缓存
      queryClient.setQueryData(INVOICE_KEYS.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.stats() })
      logger.log('✅ 发票更新成功:', data.id)
    },
    onError: (error: any) => {
      let errorMessage = '发票更新失败'
      
      if (error.status === 404) {
        errorMessage = '发票不存在或已被删除'
      } else if (error.status === 403) {
        errorMessage = '没有权限修改此发票'
      } else if (error.status === 400) {
        errorMessage = '数据格式不正确'
      } else if (error.status >= 500) {
        errorMessage = '服务器错误，请稍后重试'
      } else {
        errorMessage = error.message || '发票更新失败'
      }
      
      logger.error('❌', errorMessage, error.status ? `(${error.status})` : '')
    },
  })
}

// 删除发票 mutation
export const useDeleteInvoice = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.invoices.delete(id)
      return response.data
    },
    onSuccess: (_, id) => {
      // 移除特定发票的缓存
      queryClient.removeQueries({ queryKey: INVOICE_KEYS.detail(id) })
      
      // 立即更新列表缓存，移除已删除的发票
      queryClient.setQueriesData(
        { queryKey: INVOICE_KEYS.lists() },
        (oldData: any) => {
          if (!oldData) return oldData
          
          return {
            ...oldData,
            items: oldData.items?.filter((item: any) => item.id !== id) || [],
            total: Math.max(0, (oldData.total || 1) - 1)
          }
        }
      )
      
      // 使列表查询失效，确保下次获取最新数据
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.stats() })
      
      logger.log('✅ 发票删除成功:', id)
    },
    onError: (error: any, id) => {
      let errorMessage = '发票删除失败'
      
      if (error.status === 404) {
        errorMessage = '发票不存在或已被删除'
        
        // 如果发票不存在，也从缓存中移除
        queryClient.removeQueries({ queryKey: INVOICE_KEYS.detail(id) })
        queryClient.setQueriesData(
          { queryKey: INVOICE_KEYS.lists() },
          (oldData: any) => {
            if (!oldData) return oldData
            return {
              ...oldData,
              items: oldData.items?.filter((item: any) => item.id !== id) || [],
              total: Math.max(0, (oldData.total || 1) - 1)
            }
          }
        )
        queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() })
        queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.stats() })
      } else if (error.status === 403) {
        errorMessage = '没有权限删除此发票'
      } else if (error.status >= 500) {
        errorMessage = '服务器错误，请稍后重试'
      } else {
        errorMessage = error.message || '发票删除失败'
      }
      
      logger.error('❌', errorMessage, error.status ? `(${error.status})` : '')
    },
  })
}