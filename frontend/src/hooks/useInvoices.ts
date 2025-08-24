// React Query hooks for invoice management - 网络优化版本
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoiceService } from '../services/invoice'
import { logger } from '../utils/logger'
import { useNetworkQuery, useNetworkMutation } from './useNetworkRequest'
// import { transformInvoiceData, transformInvoiceList } from '../utils/invoiceDataTransform'

// 查询键常量
export const INVOICE_KEYS = {
  all: ['invoices'] as const,
  lists: () => [...INVOICE_KEYS.all, 'list'] as const,
  list: (params?: any) => [...INVOICE_KEYS.lists(), params] as const,
  details: () => [...INVOICE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...INVOICE_KEYS.details(), id] as const,
  stats: () => [...INVOICE_KEYS.all, 'stats'] as const,
}

// 获取发票列表 - 网络优化版本
export const useInvoices = (params?: { 
  skip?: number
  limit?: number
  seller_name?: string
  invoice_number?: string 
}) => {
  return useNetworkQuery(
    INVOICE_KEYS.list(params),
    async () => {
      const response = await invoiceService.list(params)
      // 不再需要前端数据转换
      // if (response.data?.items) {
      //   response.data.items = transformInvoiceList(response.data.items)
      // }
      return response.data
    },
    {
      // 网络优化选项
      skipOnSlowNetwork: false, // 发票列表是关键数据，慢网络下也要加载
      enableMetrics: true,
      
      // 查询选项
      placeholderData: { items: [], total: 0 },
      
      // 网络变化回调
      onNetworkChange: (networkInfo) => {
        if (networkInfo.connectionQuality === 'poor') {
          logger.log('🐌 [useInvoices] 网络较慢，发票列表加载可能较慢');
        }
      },
      
      // 重试回调
      onRetry: (attempt, error) => {
        logger.warn(`🔄 [useInvoices] 发票列表加载重试 (${attempt}次):`, error.message);
      }
    }
  )
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
      const response = await invoiceService.get(id)
      // 不再需要前端数据转换
      // if (response.data) {
      //   response.data = transformInvoiceData(response.data)
      // }
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
      const response = await invoiceService.stats()
      return response.data
    },
    staleTime: 10 * 60 * 1000, // 10分钟内不重新获取
  })
}

// useCreateInvoice hook 已删除 - 使用 InvoiceUploadPage 中的 uploadMutation 替代

// 更新发票 mutation - 网络优化版本
export const useUpdateInvoice = () => {
  const queryClient = useQueryClient()
  
  return useNetworkMutation<any, Error, { id: string; data: any }>(
    async ({ id, data }) => {
      const response = await invoiceService.update(id, data)
      return response.data
    },
    {
      // 网络优化选项
      skipOnOffline: true, // 离线时不允许更新操作
      enableMetrics: true,
      
      // 重试配置
      retryConfig: {
        maxAttempts: 2, // 更新操作谨慎重试
        baseDelay: 1000,
        maxDelay: 5000,
        backoffFactor: 2,
        jitterRange: 200
      },
      
      // 成功回调
      onSuccess: (data, variables) => {
        // 更新相关缓存
        queryClient.setQueryData(INVOICE_KEYS.detail(data.id), data)
        queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() })
        queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.stats() })
        logger.log('✅ 发票更新成功:', data.id)
      },
      
      // 错误回调
      onError: (error: any, variables) => {
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
      
      // 网络状态变化回调
      onNetworkChange: (networkInfo) => {
        if (!networkInfo.isOnline) {
          logger.warn('📵 [useUpdateInvoice] 网络离线，更新操作将被阻止');
        }
      },
      
      // 重试回调
      onRetry: (attempt, error) => {
        logger.warn(`🔄 [useUpdateInvoice] 发票更新重试 (${attempt}次):`, error.message);
      }
    }
  )
}

// 删除发票 mutation
export const useDeleteInvoice = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      await invoiceService.delete(id)
      return { id }
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