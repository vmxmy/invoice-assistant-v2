// React Query hooks for email account management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/apiClient'
import { logger } from '../utils/logger'
import { 
  EmailAccount,
  EmailAccountCreate, 
  EmailAccountUpdate, 
  EmailAccountTestResult,
  EmailScanJob,
  EmailScanJobCreate,
  EmailScanProgress
} from '../types/email'

// 查询键常量
export const EMAIL_ACCOUNT_KEYS = {
  all: ['emailAccounts'] as const,
  lists: () => [...EMAIL_ACCOUNT_KEYS.all, 'list'] as const,
  list: (params?: any) => [...EMAIL_ACCOUNT_KEYS.lists(), params] as const,
  details: () => [...EMAIL_ACCOUNT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...EMAIL_ACCOUNT_KEYS.details(), id] as const,
}

export const EMAIL_SCAN_KEYS = {
  all: ['emailScan'] as const,
  jobs: () => [...EMAIL_SCAN_KEYS.all, 'jobs'] as const,
  job: (jobId: string) => [...EMAIL_SCAN_KEYS.all, 'job', jobId] as const,
  progress: (jobId: string) => [...EMAIL_SCAN_KEYS.all, 'progress', jobId] as const,
}

// 获取邮箱账户列表
export const useEmailAccounts = (params?: { 
  skip?: number
  limit?: number
  is_active?: boolean
}) => {
  return useQuery({
    queryKey: EMAIL_ACCOUNT_KEYS.list(params),
    queryFn: async () => {
      const response = await api.emailAccounts.list(params)
      logger.log('📧 Email accounts response:', response.data)
      return response.data
    },
    staleTime: 2 * 60 * 1000, // 2分钟内不重新获取
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })
}

// 获取单个邮箱账户
export const useEmailAccount = (id: string) => {
  return useQuery({
    queryKey: EMAIL_ACCOUNT_KEYS.detail(id),
    queryFn: async () => {
      const response = await api.emailAccounts.get(id)
      return response.data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// 创建邮箱账户
export const useCreateEmailAccount = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: EmailAccountCreate) => {
      const response = await api.emailAccounts.create(data)
      return response.data
    },
    onSuccess: (data) => {
      // 更新邮箱账户列表缓存
      queryClient.invalidateQueries({ queryKey: EMAIL_ACCOUNT_KEYS.all })
      logger.log('✅ 邮箱账户创建成功:', data.email_address)
    },
    onError: (error: any) => {
      let errorMessage = '创建邮箱账户失败'
      
      if (error.status === 400) {
        errorMessage = '邮箱配置不正确或邮箱已存在'
      } else if (error.status === 401) {
        errorMessage = '邮箱认证失败，请检查密码'
      } else if (error.status >= 500) {
        errorMessage = '服务器错误，请稍后重试'
      } else {
        errorMessage = error.message || '创建邮箱账户失败'
      }
      
      logger.error('❌', errorMessage, error.status ? `(${error.status})` : '')
    },
  })
}

// 更新邮箱账户
export const useUpdateEmailAccount = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EmailAccountUpdate }) => {
      const response = await api.emailAccounts.update(id, data)
      return response.data
    },
    onSuccess: (data) => {
      // 更新相关缓存
      queryClient.setQueryData(EMAIL_ACCOUNT_KEYS.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: EMAIL_ACCOUNT_KEYS.lists() })
      logger.log('✅ 邮箱账户更新成功:', data.email_address)
    },
    onError: (error: any) => {
      let errorMessage = '更新邮箱账户失败'
      
      if (error.status === 404) {
        errorMessage = '邮箱账户不存在'
      } else if (error.status === 403) {
        errorMessage = '没有权限修改此账户'
      } else if (error.status === 400) {
        errorMessage = '配置信息不正确'
      } else if (error.status >= 500) {
        errorMessage = '服务器错误，请稍后重试'
      } else {
        errorMessage = error.message || '更新邮箱账户失败'
      }
      
      logger.error('❌', errorMessage, error.status ? `(${error.status})` : '')
    },
  })
}

// 删除邮箱账户
export const useDeleteEmailAccount = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.emailAccounts.delete(id)
      return response.data
    },
    onSuccess: (_, id) => {
      // 移除特定账户的缓存
      queryClient.removeQueries({ queryKey: EMAIL_ACCOUNT_KEYS.detail(id) })
      
      // 立即更新列表缓存，移除已删除的账户
      queryClient.setQueriesData(
        { queryKey: EMAIL_ACCOUNT_KEYS.lists() },
        (oldData: any) => {
          if (!oldData) return oldData
          
          return {
            ...oldData,
            items: oldData.items?.filter((item: EmailAccount) => item.id !== id) || [],
            total: Math.max(0, (oldData.total || 1) - 1)
          }
        }
      )
      
      queryClient.invalidateQueries({ queryKey: EMAIL_ACCOUNT_KEYS.lists() })
      logger.log('✅ 邮箱账户删除成功:', id)
    },
    onError: (error: any, id) => {
      let errorMessage = '删除邮箱账户失败'
      
      if (error.status === 404) {
        errorMessage = '邮箱账户不存在'
        // 如果账户不存在，也从缓存中移除
        queryClient.removeQueries({ queryKey: EMAIL_ACCOUNT_KEYS.detail(id) })
        queryClient.invalidateQueries({ queryKey: EMAIL_ACCOUNT_KEYS.lists() })
      } else if (error.status === 403) {
        errorMessage = '没有权限删除此账户'
      } else if (error.status >= 500) {
        errorMessage = '服务器错误，请稍后重试'
      } else {
        errorMessage = error.message || '删除邮箱账户失败'
      }
      
      logger.error('❌', errorMessage, error.status ? `(${error.status})` : '')
    },
  })
}

// 测试邮箱连接
export const useTestEmailConnection = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, testData }: { id: string; testData?: { password?: string } }) => {
      const response = await api.emailAccounts.testConnection(id, testData)
      return { ...response.data, accountId: id } as EmailAccountTestResult & { accountId: string }
    },
    onMutate: async ({ id }) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: EMAIL_ACCOUNT_KEYS.lists() })
      
      // 保存当前数据作为备份
      const previousData = queryClient.getQueryData(EMAIL_ACCOUNT_KEYS.lists())
      
      return { previousData, accountId: id }
    },
    onSuccess: async (data, _, context) => {
      if (data.success) {
        logger.log('✅ 邮箱连接测试成功')
      } else {
        logger.warn('⚠️ 邮箱连接测试失败:', data.message)
      }
      
      // 刷新邮箱账户列表
      await queryClient.invalidateQueries({ queryKey: EMAIL_ACCOUNT_KEYS.lists() })
    },
    onError: (error: any) => {
      logger.error('❌ 邮箱连接测试错误:', error.message)
    },
  })
}

// 检测IMAP配置
export const useDetectImapConfig = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await api.emailAccounts.detectConfig(email)
      return response.data
    },
    onSuccess: (data) => {
      logger.log('✅ IMAP配置检测成功:', data.imap_host)
    },
    onError: (error: any) => {
      logger.warn('⚠️ 无法自动检测IMAP配置:', error.message)
    },
  })
}

// 重置同步状态
export const useResetSyncState = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (accountId: string) => {
      const response = await api.emailAccounts.resetSync(accountId)
      return response.data
    },
    onSuccess: async (data, accountId) => {
      logger.log('✅ 同步状态已重置:', data.message)
      // 刷新邮箱账户列表以更新同步状态
      await queryClient.invalidateQueries({ queryKey: EMAIL_ACCOUNT_KEYS.lists() })
      await queryClient.invalidateQueries({ queryKey: EMAIL_ACCOUNT_KEYS.detail(accountId) })
    },
    onError: (error: any) => {
      logger.error('❌ 重置同步状态失败:', error.message || '未知错误')
    },
  })
}

// 完全重置账户数据
export const useResetAccountData = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (accountId: string) => {
      const response = await api.emailAccounts.resetAll(accountId)
      return response.data
    },
    onSuccess: async (data, accountId) => {
      logger.log('✅ 账户数据已完全重置:', data)
      logger.log(`  邮件索引: ${data.deleted_counts?.email_index || 0} 条`)
      logger.log(`  扫描任务: ${data.deleted_counts?.scan_jobs || 0} 条`)
      logger.log(`  处理任务: ${data.deleted_counts?.processing_tasks || 0} 条`)
      logger.log(`  同步状态: ${data.deleted_counts?.sync_state || 0} 条`)
      
      // 刷新相关查询
      await queryClient.invalidateQueries({ queryKey: EMAIL_ACCOUNT_KEYS.lists() })
      await queryClient.invalidateQueries({ queryKey: EMAIL_ACCOUNT_KEYS.detail(accountId) })
      await queryClient.invalidateQueries({ queryKey: EMAIL_SCAN_KEYS.jobs() })
    },
    onError: (error: any) => {
      logger.error('❌ 重置账户数据失败:', error.message || '未知错误')
    },
  })
}

// 获取扫描任务列表
export const useEmailScanJobs = (params?: { 
  skip?: number
  limit?: number 
  status?: string 
}) => {
  return useQuery({
    queryKey: [...EMAIL_SCAN_KEYS.jobs(), params],
    queryFn: async () => {
      const response = await api.emailScan.listJobs(params)
      return response.data
    },
    staleTime: 30 * 1000, // 30秒内不重新获取（扫描任务状态变化较快）
    refetchInterval: 5000, // 每5秒自动刷新
    refetchOnWindowFocus: true,
  })
}

// 获取扫描任务详情
export const useEmailScanJob = (jobId: string) => {
  return useQuery({
    queryKey: EMAIL_SCAN_KEYS.job(jobId),
    queryFn: async () => {
      const response = await api.emailScan.getJob(jobId)
      return response.data
    },
    enabled: !!jobId,
    staleTime: 30 * 1000,
    refetchInterval: 2000, // 任务详情更频繁刷新
  })
}

// 获取扫描进度
export const useEmailScanProgress = (jobId: string) => {
  return useQuery({
    queryKey: EMAIL_SCAN_KEYS.progress(jobId),
    queryFn: async () => {
      const response = await api.emailScan.getProgress(jobId)
      return response.data as EmailScanProgress
    },
    enabled: !!jobId,
    staleTime: 10 * 1000,
    refetchInterval: 1000, // 进度每秒刷新
  })
}

// 创建扫描任务
export const useCreateEmailScanJob = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: EmailScanJobCreate) => {
      const response = await api.emailScan.createJob(data)
      return response.data
    },
    onSuccess: (data) => {
      // 刷新扫描任务列表
      queryClient.invalidateQueries({ queryKey: EMAIL_SCAN_KEYS.jobs() })
      logger.log('✅ 邮箱扫描任务创建成功:', data.job_id)
    },
    onError: (error: any) => {
      let errorMessage = '创建扫描任务失败'
      
      if (error.status === 400) {
        errorMessage = '扫描参数不正确'
      } else if (error.status === 404) {
        errorMessage = '邮箱账户不存在'
      } else if (error.status >= 500) {
        errorMessage = '服务器错误，请稍后重试'
      } else {
        errorMessage = error.message || '创建扫描任务失败'
      }
      
      logger.error('❌', errorMessage, error.status ? `(${error.status})` : '')
    },
  })
}

// 取消扫描任务
export const useCancelEmailScanJob = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ jobId, force = false }: { jobId: string; force?: boolean }) => {
      const response = await api.emailScan.cancelJob(jobId, force)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EMAIL_SCAN_KEYS.all })
      logger.log('✅ 扫描任务已取消:', data.job_id)
    },
    onError: (error: any) => {
      logger.error('❌ 取消扫描任务失败:', error.message)
    },
  })
}

// 重试扫描任务
export const useRetryEmailScanJob = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.emailScan.retryJob(jobId)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EMAIL_SCAN_KEYS.all })
      logger.log('✅ 扫描任务重试成功:', data.job_id)
    },
    onError: (error: any) => {
      logger.error('❌ 重试扫描任务失败:', error.message)
    },
  })
}

// 删除扫描任务
export const useDeleteEmailScanJob = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.emailScan.deleteJob(jobId)
      return response.data
    },
    onSuccess: (_, jobId) => {
      queryClient.removeQueries({ queryKey: EMAIL_SCAN_KEYS.job(jobId) })
      queryClient.invalidateQueries({ queryKey: EMAIL_SCAN_KEYS.jobs() })
      logger.log('✅ 扫描任务已删除:', jobId)
    },
    onError: (error: any) => {
      logger.error('❌ 删除扫描任务失败:', error.message)
    },
  })
}

// 手动刷新邮箱账户列表
export const useRefreshEmailAccounts = () => {
  const queryClient = useQueryClient()
  
  return () => {
    // 清除所有邮箱账户相关缓存
    queryClient.removeQueries({ queryKey: EMAIL_ACCOUNT_KEYS.all })
    // 重新获取数据
    queryClient.invalidateQueries({ queryKey: EMAIL_ACCOUNT_KEYS.all })
    logger.log('🔄 手动刷新邮箱账户数据')
  }
}