// React Query hooks for invoice management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/apiClient'

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
    staleTime: 2 * 60 * 1000, // 2分钟内不重新获取
    placeholderData: { items: [], total: 0 }, // 提供占位数据
  })
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
      console.log('✅ 发票创建成功:', data.id)
    },
    onError: (error: any) => {
      console.error('❌ 发票创建失败:', error.message)
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
      console.log('✅ 发票更新成功:', data.id)
    },
    onError: (error: any) => {
      console.error('❌ 发票更新失败:', error.message)
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
      // 使列表查询失效
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.stats() })
      console.log('✅ 发票删除成功:', id)
    },
    onError: (error: any) => {
      console.error('❌ 发票删除失败:', error.message)
    },
  })
}