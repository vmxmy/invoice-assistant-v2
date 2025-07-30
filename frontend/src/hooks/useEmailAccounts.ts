/**
 * 邮箱账户和扫描任务相关的 React hooks
 * 基于 React Query 和 Edge Function 服务
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { edgeFunctionEmail } from '../services/edgeFunctionEmail'
import { logger } from '../utils/logger'
import type { 
  EmailAccount, 
  EmailAccountCreate, 
  EmailAccountUpdate,
  EmailAccountTestResult,
  EmailScanJob, 
  EmailScanParams,
  SmartScanRequest
} from '../types/email'

// Query Keys
const QUERY_KEYS = {
  emailAccounts: ['emailAccounts'] as const,
  emailScanJobs: ['emailScanJobs'] as const,
  emailFolders: (accountId: string) => ['emailFolders', accountId] as const,
}

/**
 * 获取用户的邮箱账户列表
 */
export function useEmailAccounts(filters?: { is_active?: boolean }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.emailAccounts, filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      let query = supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }

      const { data, error, count } = await query

      if (error) {
        logger.error('获取邮箱账户失败:', error)
        throw new Error(error.message)
      }

      return {
        items: data || [],
        total: count || data?.length || 0
      }
    },
    staleTime: 30000, // 30秒内不重新获取
  })
}

/**
 * 获取邮箱扫描任务列表
 */
export function useEmailScanJobs(filters?: { 
  limit?: number
  skip?: number
  status?: string
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.emailScanJobs, filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      let query = supabase
        .from('email_scan_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.limit) {
        const from = filters.skip || 0
        const to = from + filters.limit - 1
        query = query.range(from, to)
      }

      const { data, error, count } = await query

      if (error) {
        logger.error('获取扫描任务失败:', error)
        throw new Error(error.message)
      }

      return {
        items: data || [],
        total: count || data?.length || 0
      }
    },
    staleTime: 10000, // 10秒内不重新获取
    refetchInterval: (data) => {
      // 如果有正在运行的任务，每5秒刷新一次
      const hasRunningJobs = data?.items?.some(job => 
        job.status === 'running' || job.status === 'pending'
      )
      return hasRunningJobs ? 5000 : false
    }
  })
}

/**
 * 创建邮箱账户
 */
export function useCreateEmailAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountData: EmailAccountCreate) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      // 先测试连接
      logger.log('测试邮箱连接...')
      
      // 准备IMAP配置
      const imapConfig = {
        email_address: accountData.email_address,
        password: accountData.password,
        imap_host: accountData.imap_host || getDefaultImapConfig(accountData.email_address).imap_host,
        imap_port: accountData.imap_port || getDefaultImapConfig(accountData.email_address).imap_port,
        imap_use_ssl: accountData.imap_use_ssl ?? getDefaultImapConfig(accountData.email_address).imap_use_ssl,
        display_name: accountData.display_name,
        smtp_host: accountData.smtp_host,
        smtp_port: accountData.smtp_port,
        smtp_use_tls: accountData.smtp_use_tls,
        scan_config: accountData.scan_config
      }

      // 插入数据库
      const { data, error } = await supabase
        .from('email_accounts')
        .insert([{
          ...imapConfig,
          user_id: user.id,
          is_active: true,
          is_verified: false, // 初始状态为未验证
          sync_state: {
            sync_mode: 'never_synced',
            total_emails_indexed: 0,
            is_synced: false
          }
        }])
        .select()
        .single()

      if (error) {
        logger.error('创建邮箱账户失败:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: (data) => {
      toast.success('邮箱账户创建成功')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emailAccounts })
      
      // 自动测试连接
      edgeFunctionEmail.testEmailConnection(data.id)
        .then(result => {
          if (result.success) {
            toast.success('邮箱连接测试成功')
            // 更新验证状态
            supabase
              .from('email_accounts')
              .update({ is_verified: true })
              .eq('id', data.id)
              .then(() => {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emailAccounts })
              })
          } else {
            toast.error(`邮箱连接测试失败: ${result.message}`)
          }
        })
        .catch(error => {
          logger.error('测试邮箱连接失败:', error)
          toast.error('邮箱连接测试失败')
        })
    },
    onError: (error) => {
      logger.error('创建邮箱账户失败:', error)
      toast.error(error instanceof Error ? error.message : '创建邮箱账户失败')
    }
  })
}

/**
 * 更新邮箱账户
 */
export function useUpdateEmailAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ accountId, updates }: { accountId: string, updates: EmailAccountUpdate }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      const { data, error } = await supabase
        .from('email_accounts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        logger.error('更新邮箱账户失败:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      toast.success('邮箱账户更新成功')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emailAccounts })
    },
    onError: (error) => {
      logger.error('更新邮箱账户失败:', error)
      toast.error(error instanceof Error ? error.message : '更新邮箱账户失败')
    }
  })
}

/**
 * 删除邮箱账户
 */
export function useDeleteEmailAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id)

      if (error) {
        logger.error('删除邮箱账户失败:', error)
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      toast.success('邮箱账户删除成功')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emailAccounts })
    },
    onError: (error) => {
      logger.error('删除邮箱账户失败:', error)
      toast.error(error instanceof Error ? error.message : '删除邮箱账户失败')
    }
  })
}

/**
 * 测试邮箱连接
 */
export function useTestEmailConnection() {
  return useMutation({
    mutationFn: async (accountId: string): Promise<EmailAccountTestResult> => {
      const result = await edgeFunctionEmail.testEmailConnection(accountId)
      
      return {
        success: result.success,
        message: result.message,
        connection_details: result.connectionDetails ? {
          imap_status: result.connectionDetails.imapStatus,
          smtp_status: result.connectionDetails.smtpStatus,
          folders: result.connectionDetails.folders,
          total_emails: result.connectionDetails.totalEmails
        } : undefined,
        error_details: result.errorDetails ? {
          error_type: result.errorDetails.errorType,
          error_message: result.errorDetails.errorMessage
        } : undefined
      }
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('邮箱连接测试成功')
      } else {
        toast.error(`连接测试失败: ${result.message}`)
      }
    },
    onError: (error) => {
      logger.error('测试邮箱连接失败:', error)
      toast.error('测试邮箱连接失败')
    }
  })
}

/**
 * 启动邮箱扫描
 */
export function useStartEmailScan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ accountId, scanParams }: { accountId: string, scanParams: EmailScanParams }) => {
      return await edgeFunctionEmail.startEmailScan(accountId, scanParams)
    },
    onSuccess: (result) => {
      toast.success('邮箱扫描已启动')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emailScanJobs })
    },
    onError: (error) => {
      logger.error('启动邮箱扫描失败:', error)
      toast.error(error instanceof Error ? error.message : '启动邮箱扫描失败')
    }
  })
}

/**
 * 启动智能扫描
 */
export function useStartSmartScan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: SmartScanRequest) => {
      return await edgeFunctionEmail.startSmartScan(request)
    },
    onSuccess: () => {
      toast.success('智能扫描已启动')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emailScanJobs })
    },
    onError: (error) => {
      logger.error('启动智能扫描失败:', error)
      toast.error(error instanceof Error ? error.message : '启动智能扫描失败')
    }
  })
}

/**
 * 取消扫描任务
 */
export function useCancelEmailScanJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobId, force }: { jobId: string, force?: boolean }) => {
      return await edgeFunctionEmail.cancelScan(jobId, force)
    },
    onSuccess: () => {
      toast.success('扫描任务已取消')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emailScanJobs })
    },
    onError: (error) => {
      logger.error('取消扫描任务失败:', error)
      toast.error(error instanceof Error ? error.message : '取消扫描任务失败')
    }
  })
}

/**
 * 重试扫描任务
 */
export function useRetryEmailScanJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      return await edgeFunctionEmail.retryScan(jobId)
    },
    onSuccess: () => {
      toast.success('扫描任务已重新启动')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emailScanJobs })
    },
    onError: (error) => {
      logger.error('重试扫描任务失败:', error)
      toast.error(error instanceof Error ? error.message : '重试扫描任务失败')
    }
  })
}

/**
 * 删除扫描任务
 */
export function useDeleteEmailScanJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      const { error } = await supabase
        .from('email_scan_jobs')
        .delete()
        .eq('job_id', jobId)
        .eq('user_id', user.id)

      if (error) {
        logger.error('删除扫描任务失败:', error)
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      toast.success('扫描任务已删除')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emailScanJobs })
    },
    onError: (error) => {
      logger.error('删除扫描任务失败:', error)
      toast.error(error instanceof Error ? error.message : '删除扫描任务失败')
    }
  })
}

/**
 * 获取邮箱文件夹
 */
export function useEmailFolders(accountId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.emailFolders(accountId),
    queryFn: async () => {
      return await edgeFunctionEmail.getEmailFolders(accountId)
    },
    enabled: !!accountId,
    staleTime: 300000, // 5分钟内不重新获取
  })
}

/**
 * 扫描进度监听 Hook
 */
export function useEmailScanProgress(jobId: string | null) {
  const [progress, setProgress] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!jobId) return

    logger.log('📡 开始监听扫描进度:', jobId)
    
    const unsubscribe = edgeFunctionEmail.subscribeToScanProgress(jobId, (newProgress) => {
      setProgress(newProgress)
      setIsConnected(true)
    })

    // 立即获取一次当前进度
    edgeFunctionEmail.getScanProgress(jobId)
      .then(setProgress)
      .catch(error => {
        logger.error('获取初始进度失败:', error)
      })

    return () => {
      logger.log('📡 停止监听扫描进度:', jobId)
      unsubscribe()
    }
  }, [jobId])

  return { progress, isConnected }
}

/**
 * 根据邮箱地址获取默认IMAP配置
 */
function getDefaultImapConfig(email: string) {
  const domain = email.split('@')[1]?.toLowerCase()
  
  const configs = {
    'gmail.com': {
      imap_host: 'imap.gmail.com',
      imap_port: 993,
      imap_use_ssl: true,
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_use_tls: true,
      provider_name: 'Gmail'
    },
    'qq.com': {
      imap_host: 'imap.qq.com',
      imap_port: 993,
      imap_use_ssl: true,
      smtp_host: 'smtp.qq.com',
      smtp_port: 587,
      smtp_use_tls: true,
      provider_name: 'QQ邮箱'
    },
    '163.com': {
      imap_host: 'imap.163.com',
      imap_port: 993,
      imap_use_ssl: true,
      smtp_host: 'smtp.163.com',
      smtp_port: 587,
      smtp_use_tls: true,
      provider_name: '163邮箱'
    },
    '126.com': {
      imap_host: 'imap.126.com',
      imap_port: 993,
      imap_use_ssl: true,
      smtp_host: 'smtp.126.com',
      smtp_port: 587,
      smtp_use_tls: true,
      provider_name: '126邮箱'
    },
    'outlook.com': {
      imap_host: 'outlook.office365.com',
      imap_port: 993,
      imap_use_ssl: true,
      smtp_host: 'smtp.office365.com',
      smtp_port: 587,
      smtp_use_tls: true,
      provider_name: 'Outlook'
    },
    'hotmail.com': {
      imap_host: 'outlook.office365.com',
      imap_port: 993,
      imap_use_ssl: true,
      smtp_host: 'smtp.office365.com',
      smtp_port: 587,
      smtp_use_tls: true,
      provider_name: 'Hotmail'
    }
  }

  return configs[domain as keyof typeof configs] || {
    imap_host: '',
    imap_port: 993,
    imap_use_ssl: true,
    smtp_host: '',
    smtp_port: 587,
    smtp_use_tls: true,
    provider_name: '其他'
  }
}