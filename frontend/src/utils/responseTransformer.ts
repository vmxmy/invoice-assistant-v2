/**
 * API响应格式转换器
 * 
 * 在API响应格式统一迁移期间提供向后兼容性支持
 * 检测并转换旧的success_response包装格式到新的直接响应格式
 */

import { logger } from './logger'

/**
 * 检测响应是否为旧的success_response包装格式
 */
function isWrappedResponse(data: any): boolean {
  return data && 
         typeof data === 'object' && 
         'success' in data && 
         'data' in data &&
         typeof data.success === 'boolean'
}

/**
 * 检测响应是否为列表包装格式 (含items字段)
 */
function isListResponse(data: any): boolean {
  return data && 
         typeof data === 'object' && 
         'items' in data &&
         Array.isArray(data.items)
}

/**
 * 转换响应格式到统一格式
 * 
 * @param data 原始响应数据
 * @param endpoint 端点路径（用于日志）
 * @returns 统一格式的响应数据
 */
export function transformResponse(data: any, endpoint?: string): any {
  try {
    // 如果是旧的包装格式，提取data字段
    if (isWrappedResponse(data)) {
      logger.log('🔄 检测到旧包装格式响应，正在转换:', endpoint)
      return data.data
    }

    // 如果是列表格式，保持原样（新格式）
    if (isListResponse(data)) {
      return data
    }

    // 其他情况直接返回（已经是新格式或简单格式）
    return data

  } catch (error) {
    logger.error('❌ 响应格式转换失败:', error, endpoint)
    // 转换失败时返回原数据
    return data
  }
}

/**
 * 提取错误信息从不同格式的错误响应
 * 
 * @param errorResponse 错误响应数据
 * @returns 错误信息字符串
 */
export function extractErrorMessage(errorResponse: any): string {
  // 标准FastAPI错误格式
  if (errorResponse?.detail) {
    if (typeof errorResponse.detail === 'string') {
      return errorResponse.detail
    }
    if (Array.isArray(errorResponse.detail)) {
      // ValidationError格式
      return errorResponse.detail.map((err: any) => err.msg || err.message || String(err)).join(', ')
    }
  }

  // 自定义错误格式
  if (errorResponse?.message) {
    return errorResponse.message
  }

  // 旧包装格式错误
  if (errorResponse?.error) {
    return errorResponse.error
  }

  // 后备方案
  return '未知错误'
}

/**
 * 验证响应数据结构是否符合预期
 * 
 * @param data 响应数据
 * @param expectedType 期望的数据类型 ('object' | 'array' | 'list')
 * @returns 是否符合预期
 */
export function validateResponseStructure(data: any, expectedType: 'object' | 'array' | 'list'): boolean {
  switch (expectedType) {
    case 'object':
      return typeof data === 'object' && data !== null && !Array.isArray(data)
    
    case 'array':
      return Array.isArray(data)
    
    case 'list':
      return isListResponse(data)
    
    default:
      return true
  }
}

/**
 * 获取列表响应的实际数据数组
 * 
 * @param data 可能是列表格式或数组格式的数据
 * @returns 数据数组
 */
export function extractListData(data: any): any[] {
  if (isListResponse(data)) {
    return data.items || []
  }
  
  if (Array.isArray(data)) {
    return data
  }
  
  return []
}

/**
 * 获取列表响应的分页信息
 * 
 * @param data 列表响应数据
 * @returns 分页信息
 */
export function extractPaginationInfo(data: any): {
  total: number
  page: number
  pageSize: number
} {
  if (isListResponse(data)) {
    return {
      total: data.total || 0,
      page: data.page || 1,
      pageSize: data.page_size || 20
    }
  }
  
  // 对于简单数组，返回基本信息
  const items = Array.isArray(data) ? data : []
  return {
    total: items.length,
    page: 1,
    pageSize: items.length
  }
}