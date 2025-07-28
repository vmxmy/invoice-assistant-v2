// API 客户端 - 使用 Axios 和请求拦截器
import axios from 'axios'
import { supabase } from './supabase'
import { logger } from '../utils/logger'
import { transformResponse, extractErrorMessage } from '../utils/responseTransformer'

// 创建 Axios 实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8090',
  timeout: 10000, // 默认 10 秒超时
  headers: {
    'Content-Type': 'application/json',
  },
})

// 创建专门用于 OCR 的 Axios 实例（更长的超时时间）
const ocrClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8090',
  timeout: 60000, // OCR 需要 60 秒超时
  headers: {
    'Content-Type': 'multipart/form-data',
  },
})

// 为 OCR 客户端添加请求拦截器
ocrClient.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`
      }
      logger.log('🔍 OCR Request:', config.method?.toUpperCase(), config.url)
      return config
    } catch (error) {
      logger.error('❌ OCR 获取认证token失败:', error)
      return config
    }
  },
  (error) => {
    logger.error('❌ OCR 请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// OCR 响应拦截器
ocrClient.interceptors.response.use(
  (response) => {
    logger.log('✅ OCR Response:', response.status, '耗时:', response.config.metadata?.endTime - response.config.metadata?.startTime, 'ms')
    return response
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      logger.error('❌ OCR 请求超时，请检查文件大小或网络连接')
      return Promise.reject({
        ...error,
        message: 'OCR 识别超时，请稍后重试或联系管理员'
      })
    }
    logger.error('❌ OCR Error:', error)
    return Promise.reject(error)
  }
)

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
      logger.log('📊 OCR响应数据结构:', {
        原始格式: originalData,
        转换后格式: response.data,
        字段映射: {
          'code -> invoice_code': originalData.code,
          'number -> invoice_number': originalData.number,
          'total -> total_amount': originalData.total,
          'seller -> seller_name': originalData.seller
        }
      })
    }
    
    return response
  },
  (error) => {
    // 统一错误处理
    if (error.response) {
      // 服务器返回错误响应
      logger.error('❌ API Error Response:', error.response.status, error.response.data)
      
      const errorMessage = extractErrorMessage(error.response.data)
      
      // 特殊处理401错误
      if (error.response.status === 401) {
        logger.warn('🔑 认证失败，需要重新登录')
        // 可以在这里触发重新登录逻辑
      }
      
      return Promise.reject({
        status: error.response.status,
        message: errorMessage,
        data: error.response.data
      })
    } else if (error.request) {
      // 请求已发送但没有收到响应
      logger.error('❌ No Response:', error.request)
      return Promise.reject({
        message: '网络错误，请检查网络连接',
        code: error.code
      })
    } else {
      // 请求配置出错
      logger.error('❌ Request Error:', error.message)
      return Promise.reject({
        message: error.message || '请求失败',
        code: error.code
      })
    }
  }
)

// API 接口定义
export const api = {
  // 发票相关接口
  invoices: {
    list: (params?: any) => apiClient.get('/api/v1/invoices', { params }),
    get: (id: string) => apiClient.get(`/api/v1/invoices/${id}`),
    create: (data: any) => apiClient.post('/api/v1/invoices', data),
    update: (id: string, data: any) => apiClient.put(`/api/v1/invoices/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/v1/invoices/${id}`),
    batchDelete: (ids: string[]) => apiClient.post('/api/v1/invoices/batch-delete', { ids }),
    download: (id: string) => apiClient.get(`/api/v1/invoices/${id}/download`, {
      responseType: 'blob'
    }),
    batchDownload: (ids: string[]) => apiClient.post('/api/v1/invoices/batch-download', { ids }, {
      responseType: 'blob'
    }),
    search: (params: any) => apiClient.post('/api/v1/invoices/search', params),
    upload: (formData: FormData) => apiClient.post('/api/v1/invoices/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    listDetails: (params?: any) => apiClient.get('/api/v1/invoices/details', { params }),
    // 新增：统计接口 
    stats: {
      overview: () => apiClient.get('/api/v1/invoices/stats/overview'),
      monthly: () => apiClient.get('/api/v1/invoices/stats/monthly'),
      category: () => apiClient.get('/api/v1/invoices/stats/category'),
      type: () => apiClient.get('/api/v1/invoices/stats/type')
    }
  },
  
  // 邮箱账户相关接口
  emailAccounts: {
    list: () => apiClient.get('/api/v1/email-accounts'),
    get: (id: string) => apiClient.get(`/api/v1/email-accounts/${id}`),
    create: (data: any) => apiClient.post('/api/v1/email-accounts', data),
    update: (id: string, data: any) => apiClient.put(`/api/v1/email-accounts/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/v1/email-accounts/${id}`),
    testConnection: (id: string) => apiClient.post(`/api/v1/email-accounts/${id}/test`),
    // 扫描相关
    scanInvoices: (id: string, params?: any) => apiClient.post(`/api/v1/email-accounts/${id}/scan`, params || {}),
    getScanStatus: (taskId: string) => apiClient.get(`/api/v1/email-scan/tasks/${taskId}/status`),
    getScanHistory: (id: string) => apiClient.get(`/api/v1/email-accounts/${id}/scan-history`),
  },
  
  // 邮件扫描接口 - 新增
  emailScan: {
    // 启动扫描任务
    start: (accountId: string, options?: any) => apiClient.post(`/api/v1/email-scan/start`, {
      account_id: accountId,
      ...options
    }),
    // 获取任务状态
    status: (taskId: string) => apiClient.get(`/api/v1/email-scan/tasks/${taskId}/status`),
    // 获取任务列表
    tasks: (params?: any) => apiClient.get('/api/v1/email-scan/tasks', { params }),
    // 获取任务详情 
    task: (taskId: string) => apiClient.get(`/api/v1/email-scan/tasks/${taskId}`),
    // 取消任务
    cancel: (taskId: string) => apiClient.post(`/api/v1/email-scan/tasks/${taskId}/cancel`),
    // 重试任务
    retry: (taskId: string) => apiClient.post(`/api/v1/email-scan/tasks/${taskId}/retry`),
    // 获取任务结果
    results: (taskId: string) => apiClient.get(`/api/v1/email-scan/tasks/${taskId}/results`),
  },
  
  // OCR相关接口 - 使用专门的 OCR 客户端
  ocr: {
    // 完整OCR处理（包含识别、解析、验证）
    full: (data: FormData) => {
      // 添加时间戳用于计算耗时
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        metadata: { startTime: Date.now() }
      };
      
      return ocrClient.post('/api/v1/ocr/combined/full', data, config).then(response => {
        response.config.metadata.endTime = Date.now();
        return response;
      });
    },
    
    // 快速OCR处理（无验证）
    quick: (data: FormData) => ocrClient.post('/api/v1/ocr/combined/quick', data),
    
    // 仅识别文本
    recognize: (data: FormData) => ocrClient.post('/api/v1/ocr/recognize', data),
    
    // 仅解析发票数据
    parse: (data: { text: string; invoice_type?: string }) => apiClient.post('/api/v1/ocr/parse', data),
    
    // 分析发票类型
    analyzeType: (data: FormData) => ocrClient.post('/api/v1/ocr/analyze-type', data),
  },
  
  // 监控相关接口 - 新增
  monitoring: {
    // 健康检查
    getHealthCheck: () => apiClient.get('/api/v1/monitoring/health'),
    // 性能报告
    getPerformanceReport: () => apiClient.get('/api/v1/monitoring/performance'),
    // 回归检查
    getRegressionCheck: () => apiClient.get('/api/v1/monitoring/regression'),
    // 系统日志
    getLogs: (params?: any) => apiClient.get('/api/v1/monitoring/logs', { params }),
    // 指标统计
    getMetrics: () => apiClient.get('/api/v1/monitoring/metrics'),
  },
  
  // 配置相关接口
  config: {
    getFieldsConfig: () => apiClient.get('/api/v1/config/fields'),
    updateFieldsConfig: (data: any) => apiClient.put('/api/v1/config/fields', data),
  }
}

export default apiClient