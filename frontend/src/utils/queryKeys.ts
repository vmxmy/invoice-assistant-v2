/**
 * 统一查询键工厂
 * 提供一致的查询键结构，提高缓存命中率和数据一致性
 */

// 查询参数类型定义
export interface InvoiceQueryParams {
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
  page?: number
  pageSize?: number
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

/**
 * 查询键工厂
 * 使用 as const 确保类型安全和一致性
 */
export const QueryKeys = {
  // 应用根键
  all: ['app'] as const,
  
  // === 用户相关 ===
  users: () => [...QueryKeys.all, 'users'] as const,
  user: (userId: string) => [...QueryKeys.users(), userId] as const,
  userConfig: (userId: string) => [...QueryKeys.user(userId), 'config'] as const,
  userProfile: (userId: string) => [...QueryKeys.user(userId), 'profile'] as const,
  
  // === 发票相关 ===
  invoices: (userId: string) => [...QueryKeys.user(userId), 'invoices'] as const,
  
  // 发票列表查询 - 支持不同参数组合
  invoiceList: (userId: string, params?: InvoiceQueryParams) => 
    [...QueryKeys.invoices(userId), 'list', params] as const,
  
  // 单个发票详情
  invoice: (userId: string, invoiceId: string) => 
    [...QueryKeys.invoices(userId), 'detail', invoiceId] as const,
  
  // 已删除的发票
  trashedInvoices: (userId: string, params?: PaginationParams) => 
    [...QueryKeys.invoices(userId), 'trashed', params] as const,
  
  // === 统计相关 ===
  stats: (userId: string) => [...QueryKeys.user(userId), 'stats'] as const,
  dashboardStats: (userId: string) => [...QueryKeys.stats(userId), 'dashboard'] as const,
  invoiceStats: (userId: string, invoiceId?: string) => 
    invoiceId 
      ? [...QueryKeys.stats(userId), 'invoice', invoiceId] as const
      : [...QueryKeys.stats(userId), 'invoices'] as const,
  
  // === 收件箱相关 ===
  inbox: (userId: string) => [...QueryKeys.user(userId), 'inbox'] as const,
  inboxEmails: (userId: string, params?: any) => 
    [...QueryKeys.inbox(userId), 'emails', params] as const,
  
  // === 导出相关 ===
  exports: (userId: string) => [...QueryKeys.user(userId), 'exports'] as const,
  exportProgress: (userId: string, taskId: string) => 
    [...QueryKeys.exports(userId), 'progress', taskId] as const,
  
  // === 搜索相关 ===
  search: (userId: string) => [...QueryKeys.user(userId), 'search'] as const,
  searchResults: (userId: string, query: string, filters?: any) => 
    [...QueryKeys.search(userId), 'results', query, filters] as const,
  
  // === OCR相关 ===
  ocr: () => [...QueryKeys.all, 'ocr'] as const,
  ocrTask: (taskId: string) => [...QueryKeys.ocr(), 'task', taskId] as const,
  ocrResults: (fileHash: string) => [...QueryKeys.ocr(), 'results', fileHash] as const,
} as const

/**
 * 查询键类型提取
 */
export type QueryKey = ReturnType<typeof QueryKeys[keyof typeof QueryKeys]>

/**
 * 查询键工具函数
 */
export const QueryKeyUtils = {
  /**
   * 检查查询键是否匹配特定模式
   */
  matches: (queryKey: readonly unknown[], pattern: readonly unknown[]): boolean => {
    if (pattern.length > queryKey.length) return false
    return pattern.every((part, index) => part === queryKey[index])
  },
  
  /**
   * 获取用户相关的所有查询键模式
   */
  getUserPatterns: (userId: string) => ({
    allUser: QueryKeys.user(userId),
    allInvoices: QueryKeys.invoices(userId),
    allStats: QueryKeys.stats(userId),
    allInbox: QueryKeys.inbox(userId),
  }),
  
  /**
   * 失效用户相关的所有缓存
   */
  invalidateUserCache: (queryClient: any, userId: string) => {
    const patterns = QueryKeyUtils.getUserPatterns(userId)
    Object.values(patterns).forEach(pattern => {
      queryClient.invalidateQueries({ queryKey: pattern, exact: false })
    })
  },
  
  /**
   * 清除用户相关的所有缓存
   */
  clearUserCache: (queryClient: any, userId: string) => {
    const patterns = QueryKeyUtils.getUserPatterns(userId)
    Object.values(patterns).forEach(pattern => {
      queryClient.removeQueries({ queryKey: pattern, exact: false })
    })
  }
}

/**
 * 常用查询选项预设
 */
export const QueryOptions = {
  // 快速变化的数据 (如统计数据)
  frequent: {
    staleTime: 30 * 1000, // 30秒
    refetchInterval: 60 * 1000, // 1分钟
  },
  
  // 中等频率数据 (如发票列表)
  moderate: {
    staleTime: 5 * 60 * 1000, // 5分钟
    refetchInterval: false,
  },
  
  // 稳定数据 (如用户配置)
  stable: {
    staleTime: 30 * 60 * 1000, // 30分钟
    refetchInterval: false,
  },
  
  // 实时数据 (如导出进度)
  realtime: {
    staleTime: 0,
    refetchInterval: 2 * 1000, // 2秒
    refetchIntervalInBackground: false,
  },
}

/**
 * 网络优化选项
 */
export const NetworkOptions = {
  // 网络优化查询选项
  optimized: {
    retry: (failureCount: number, error: any) => {
      // 4xx 错误不重试
      if (error?.status >= 400 && error?.status < 500) return false
      return failureCount < 3
    },
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
  
  // 关键数据查询选项
  critical: {
    retry: 5,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },
}