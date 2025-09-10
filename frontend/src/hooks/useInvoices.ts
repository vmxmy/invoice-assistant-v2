// 优化版React Query hooks - 使用统一查询键和精确缓存管理
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoiceService } from '../services/invoice'
import { logger } from '../utils/logger'
import { useNetworkQuery, useNetworkMutation } from './useNetworkRequest'
import { QueryKeys, QueryOptions, NetworkOptions } from '../utils/queryKeys'
// import { useExtractRegionFromInvoiceNumber } from './useInvoiceRegions' // 已移除
// import { transformInvoiceData, transformInvoiceList } from '../utils/invoiceDataTransform'

// 查询键常量 - 为了兼容性保留，但推荐使用QueryKeys
export const INVOICE_KEYS = {
  all: ['invoices'] as const,
  lists: () => [...INVOICE_KEYS.all, 'list'] as const,
  list: (params?: any) => [...INVOICE_KEYS.lists(), params] as const,
  details: () => [...INVOICE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...INVOICE_KEYS.details(), id] as const,
  stats: () => [...INVOICE_KEYS.all, 'stats'] as const,
}

// 获取当前用户ID的辅助函数
function getCurrentUserId(): string {
  // 这里应该从认证上下文获取，但为了保持兼容性，使用默认值
  // TODO: 实现从认证上下文获取用户ID
  return 'current-user'
}

// 获取发票列表 - 网络优化版本
export const useInvoices = (params?: { 
  skip?: number
  limit?: number
  seller_name?: string
  invoice_number?: string
  region_code?: string      // 新增：地区代码筛选
  province_name?: string    // 新增：省份名称筛选
}) => {
  const userId = getCurrentUserId() // 获取当前用户ID
  
  return useNetworkQuery(
    QueryKeys.invoiceList(userId, params), // 使用统一查询键
    async () => {
      const response = await invoiceService.list(params)
      return response.data
    },
    {
      // 网络优化选项
      skipOnSlowNetwork: false, // 发票列表是关键数据，慢网络下也要加载
      enableMetrics: true,
      
      // 查询选项
      placeholderData: { items: [], total: 0 },
      
      // 使用统一的选项配置
      ...QueryOptions.moderate,
      
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

// 手动刷新发票列表 - 优化版
export const useRefreshInvoices = () => {
  const queryClient = useQueryClient()
  const userId = getCurrentUserId()
  
  return () => {
    // 使用统一查询键精确刷新
    queryClient.removeQueries({ 
      queryKey: QueryKeys.invoiceList(userId),
      exact: false 
    })
    queryClient.invalidateQueries({ 
      queryKey: QueryKeys.invoiceList(userId),
      exact: false
    })
    
    // 同时刷新统计数据
    queryClient.invalidateQueries({
      queryKey: QueryKeys.dashboardStats(userId)
    })
    
    logger.log('🔄 手动刷新发票数据')
  }
}

// 获取单个发票详情 - 优化版
export const useInvoice = (id: string) => {
  const userId = getCurrentUserId()
  
  return useQuery({
    queryKey: QueryKeys.invoice(userId, id), // 使用统一查询键
    queryFn: async () => {
      const response = await invoiceService.get(id)
      return response.data
    },
    enabled: !!id, // 只有在有ID时才执行
    ...QueryOptions.stable, // 使用稳定数据选项
    ...NetworkOptions.optimized,
  })
}

/**
 * 获取单个发票详情（包含地区信息） - 增强版
 * 已移除：useInvoiceWithRegion 功能（依赖于已删除的 useExtractRegionFromInvoiceNumber）
 */

// 获取发票统计 - 优化版
export const useInvoiceStats = () => {
  const userId = getCurrentUserId()
  
  return useQuery({
    queryKey: QueryKeys.invoiceStats(userId), // 使用统一查询键
    queryFn: async () => {
      const response = await invoiceService.stats()
      return response.data
    },
    ...QueryOptions.frequent, // 统计数据需要频繁更新
    ...NetworkOptions.optimized,
  })
}

// useCreateInvoice hook 已删除 - 使用 InvoiceUploadPage 中的 uploadMutation 替代

// 更新发票 mutation - 优化版
export const useUpdateInvoice = () => {
  const queryClient = useQueryClient()
  const userId = getCurrentUserId()
  
  return useNetworkMutation<any, Error, { id: string; data: any }>(
    async ({ id, data }) => {
      const response = await invoiceService.update(id, data)
      return response.data
    },
    {
      // 网络优化选项
      skipOnOffline: true,
      enableMetrics: true,
      
      // 重试配置
      retryConfig: {
        maxAttempts: 2,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffFactor: 2,
        jitterRange: 200
      },
      
      // 乐观更新
      onMutate: async (variables) => {
        // 取消相关查询
        await queryClient.cancelQueries({
          queryKey: QueryKeys.invoice(userId, variables.id)
        })
        
        // 获取当前数据
        const previousInvoice = queryClient.getQueryData(
          QueryKeys.invoice(userId, variables.id)
        )
        
        // 乐观更新
        queryClient.setQueryData(
          QueryKeys.invoice(userId, variables.id),
          (old: any) => ({ ...old, ...variables.data })
        )
        
        return { previousInvoice }
      },
      
      // 成功回调 - 精确缓存管理
      onSuccess: (data, variables, context) => {
        // 直接设置新数据
        if (data) {
          queryClient.setQueryData(
            QueryKeys.invoice(userId, variables.id),
            data
          )
        }
        
        // 精确失效相关列表和统计
        queryClient.invalidateQueries({ 
          queryKey: QueryKeys.invoiceList(userId),
          exact: false,
          refetchType: 'active'
        })
        
        // 如果更新了关键字段，更新统计
        if (variables.data.status || variables.data.amount) {
          queryClient.invalidateQueries({ 
            queryKey: QueryKeys.dashboardStats(userId)
          })
        }
        
        logger.log('✅ 发票更新成功:', data?.id || variables.id)
      },
      
      // 错误处理
      onError: (error: any, variables, context) => {
        // 回滚乐观更新
        if (context?.previousInvoice) {
          queryClient.setQueryData(
            QueryKeys.invoice(userId, variables.id),
            context.previousInvoice
          )
        }
        
        let errorMessage = '发票更新失败'
        if (error.status === 404) {
          errorMessage = '发票不存在或已被删除'
        } else if (error.status === 403) {
          errorMessage = '没有权限修改此发票'
        } else if (error.status >= 500) {
          errorMessage = '服务器错误，请稍后重试'
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

