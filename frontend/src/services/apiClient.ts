// API 客户端 - 使用 Axios 和请求拦截器
import axios from 'axios'
import { supabase } from './supabase'
import { logger } from '../utils/logger'

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

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response) => {
    logger.log('✅ API Response:', response.config.method?.toUpperCase(), response.config.url, response.status)
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
    
    // 处理其他错误
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.message || 
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
  }
}

export default apiClient