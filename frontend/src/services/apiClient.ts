// API 客户端 - 使用 Axios 和请求拦截器
import axios from 'axios'
import { supabase } from './supabase'
import { logger } from '../utils/logger'
import { transformResponse, extractErrorMessage } from '../utils/responseTransformer'

// 创建 Axios 实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8090',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 自动添加 JWT Token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // 获取当前会话
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`
      }
      
      logger.log('🚀 API Request:', config.method?.toUpperCase(), config.url)
      return config
    } catch (error) {
      logger.error('❌ 获取认证token失败:', error)
      return config
    }
  },
  (error) => {
    logger.error('❌ 请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器 - 统一错误处理和响应格式转换
apiClient.interceptors.response.use(
  (response) => {
    logger.log('✅ API Response:', response.config.method?.toUpperCase(), response.config.url, response.status)
    
    // 转换响应格式以确保向后兼容
    const originalData = response.data
    response.data = transformResponse(originalData, response.config.url)
    
    // 对OCR相关接口添加详细日志
    if (response.config.url?.includes('/ocr/')) {
      logger.log('📊 OCR响应详情:', {
        url: response.config.url,
        status: response.status,
        success: response.data?.success,
        invoice_type: response.data?.invoice_type,
        fields_count: response.data?.fields ? Object.keys(response.data.fields).length : 0,
        fields: response.data?.fields ? Object.keys(response.data.fields) : [],
        has_raw_ocr: !!response.data?.raw_ocr_data,
        has_validation: !!response.data?.validation,
        has_confidence: !!response.data?.confidence,
        processing_time: response.data?.processing_time
      })
    }
    
    return response
  },
  async (error) => {
    const originalRequest = error.config
    
    logger.error('❌ API Error:', error.response?.status, error.response?.data)
    
    // 处理 401 未授权错误
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        // 尝试刷新 token
        const { error: refreshError } = await supabase.auth.refreshSession()
        
        if (!refreshError) {
          // Token 刷新成功，重试原请求
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            originalRequest.headers.Authorization = `Bearer ${session.access_token}`
            return apiClient(originalRequest)
          }
        }
      } catch (refreshError) {
        logger.error('❌ Token刷新失败:', refreshError)
      }
      
      // Token 刷新失败，重定向到登录页
      window.location.href = '/login'
      return Promise.reject(error)
    }
    
    // 处理其他错误 - 使用统一错误提取器
    const errorMessage = extractErrorMessage(error.response?.data) || 
                        error.message || 
                        '网络请求失败'
    
    return Promise.reject({
      ...error,
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data
    })
  }
)

// API 接口定义
export const api = {
  // Profile 相关接口
  profile: {
    // 获取当前用户 Profile
    getMe: () => apiClient.get('/api/v1/profiles/me'),
    
    // 创建用户 Profile
    createMe: (data: { display_name: string; bio?: string }) => 
      apiClient.post('/api/v1/profiles/me', data),
    
    // 更新用户 Profile
    updateMe: (data: Partial<{ display_name: string; bio: string; avatar_url: string }>) => 
      apiClient.put('/api/v1/profiles/me', data),
  },
  
  // Invoice 相关接口
  invoices: {
    // 获取发票列表
    list: (params?: { 
      page?: number; 
      page_size?: number; 
      seller_name?: string; 
      buyer_name?: string;
      invoice_number?: string;
      amountMin?: number;
      amountMax?: number;
      dateFrom?: string;
      dateTo?: string;
      status?: string[];
      source?: string[];
    }) => apiClient.get('/api/v1/invoices/', { params }),
    
    // 获取单个发票
    get: (id: string) => apiClient.get(`/api/v1/invoices/${id}`),
    
    // create 方法已删除 - 使用 createWithFile 替代
    
    // 创建发票（含文件和OCR数据）
    createWithFile: (data: FormData) => apiClient.post('/api/v1/invoices/create-with-file', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    
    // 更新发票
    update: (id: string, data: any) => apiClient.put(`/api/v1/invoices/${id}`, data),
    
    // 删除发票
    delete: (id: string) => apiClient.delete(`/api/v1/invoices/${id}`),
    
    // 获取发票统计
    stats: () => apiClient.get('/api/v1/invoices/statistics'),
    
    // 导出相关接口
    getDownloadUrl: (id: string, signal?: AbortSignal) => 
      apiClient.get(`/api/v1/invoices/${id}/download`, { signal }),
    
    getBatchDownloadUrls: (data: { invoice_ids: string[] }, signal?: AbortSignal) => 
      apiClient.post('/api/v1/invoices/batch-download', data, { 
        signal,
        timeout: 60000  // 批量操作使用60秒超时
      }),
  },
  
  // Task 相关接口
  tasks: {
    // 获取任务列表
    list: (params?: { skip?: number; limit?: number; status?: string }) => 
      apiClient.get('/api/v1/tasks/', { params }),
    
    // 获取单个任务
    get: (id: string) => apiClient.get(`/api/v1/tasks/${id}`),
    
    // 创建任务
    create: (data: { title: string; description?: string }) => 
      apiClient.post('/api/v1/tasks/', data),
    
    // 更新任务
    update: (id: string, data: any) => apiClient.put(`/api/v1/tasks/${id}`, data),
    
    // 删除任务
    delete: (id: string) => apiClient.delete(`/api/v1/tasks/${id}`),
  },
  
  // 认证相关接口
  auth: {
    // 验证 Token
    verify: () => apiClient.get('/api/v1/auth/verify'),
    
    // 获取当前用户信息
    me: () => apiClient.get('/api/v1/auth/me'),
  },
  
  // OCR相关接口
  ocr: {
    // 完整OCR处理（包含识别、解析、验证）
    full: (data: FormData) => apiClient.post('/api/v1/ocr/combined/full', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    
    // 快速OCR处理（无验证）
    quick: (data: FormData) => apiClient.post('/api/v1/ocr/combined/quick', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  },

  // 邮箱账户相关接口
  emailAccounts: {
    // 获取邮箱账户列表
    list: (params?: { skip?: number; limit?: number; is_active?: boolean }) => 
      apiClient.get('/api/v1/email-accounts', { params }),
    
    // 获取单个邮箱账户
    get: (id: string) => apiClient.get(`/api/v1/email-accounts/${id}`),
    
    // 创建邮箱账户
    create: (data: any) => apiClient.post('/api/v1/email-accounts', data),
    
    // 更新邮箱账户
    update: (id: string, data: any) => apiClient.put(`/api/v1/email-accounts/${id}`, data),
    
    // 删除邮箱账户
    delete: (id: string) => apiClient.delete(`/api/v1/email-accounts/${id}`),
    
    // 测试邮箱连接
    testConnection: (id: string, testData?: { password?: string }) => 
      apiClient.post(`/api/v1/email-accounts/${id}/test`, testData || {}),
    
    // 重置同步状态
    resetSync: (id: string) => apiClient.post(`/api/v1/email-accounts/${id}/reset-sync`),
    
    // 完全重置账户数据
    resetAll: (id: string) => apiClient.post(`/api/v1/email-accounts/${id}/reset-all`),
    
    // 检测IMAP配置
    detectConfig: (email: string) => 
      apiClient.post('/api/v1/email-accounts/detect-config', { email_address: email }),
  },

  // 邮箱扫描相关接口
  emailScan: {
    // 创建扫描任务
    createJob: (data: any) => apiClient.post('/api/v1/email-scan/jobs', data),
    
    // 获取扫描任务列表
    listJobs: (params?: { skip?: number; limit?: number; status?: string }) => 
      apiClient.get('/api/v1/email-scan/jobs', { params }),
    
    // 获取扫描任务详情
    getJob: (jobId: string) => apiClient.get(`/api/v1/email-scan/jobs/${jobId}`),
    
    // 获取扫描进度
    getProgress: (jobId: string) => apiClient.get(`/api/v1/email-scan/jobs/${jobId}/progress`),
    
    // 取消扫描任务
    cancelJob: (jobId: string, force?: boolean) => 
      apiClient.post(`/api/v1/email-scan/jobs/${jobId}/cancel`, { force: force || false }),
    
    // 重试扫描任务
    retryJob: (jobId: string) => apiClient.post(`/api/v1/email-scan/jobs/${jobId}/retry`),
    
    // 删除扫描任务
    deleteJob: (jobId: string) => apiClient.delete(`/api/v1/email-scan/jobs/${jobId}`),
  },
  
  // Email Processing 相关接口
  emailProcessing: {
    // 批量处理邮件
    batchProcess: (data: {
      emails: Array<{
        account_id: string;
        uid: number;
        subject: string;
      }>;
      auto_create_invoice: boolean;
      continue_on_error: boolean;
    }) => apiClient.post('/api/v1/email-processing/batch-process', data),
    
    // 获取处理状态
    getStatus: (jobId: string) => apiClient.get(`/api/v1/email-processing/processing-status/${jobId}`),
  }
}

export default apiClient