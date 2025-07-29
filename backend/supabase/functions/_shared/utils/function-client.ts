/**
 * Edge Function 互调用客户端
 * 提供Functions之间安全、可靠的调用机制
 */

import type { ProcessingResult, EdgeFunctionContext } from '../types/index.ts'

export class EdgeFunctionClient {
  private baseUrl: string
  private authToken: string
  private context: EdgeFunctionContext

  constructor(context: EdgeFunctionContext) {
    this.baseUrl = Deno.env.get('SUPABASE_URL') || ''
    this.authToken = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    this.context = context
  }

  /**
   * 调用其他Edge Function
   */
  async callFunction<T = any>(
    functionName: string, 
    data: any, 
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      timeout?: number
      retries?: number
      headers?: Record<string, string>
    } = {}
  ): Promise<ProcessingResult<T>> {
    const { method = 'POST', timeout = 30000, retries = 3, headers = {} } = options
    
    const url = `${this.baseUrl}/functions/v1/${functionName}`
    const requestHeaders = {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
      'X-Request-ID': this.context.request_id,
      'X-User-ID': this.context.user_id || '',
      ...headers
    }

    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔗 [EdgeFunctionClient] 调用 ${functionName}, 尝试 ${attempt}/${retries}`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        
        const startTime = performance.now()
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: method !== 'GET' ? JSON.stringify(data) : undefined,
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        const endTime = performance.now()
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }
        
        const result = await response.json()
        
        console.log(`✅ [EdgeFunctionClient] ${functionName} 调用成功, 耗时: ${(endTime - startTime).toFixed(2)}ms`)
        
        return {
          success: true,
          data: result,
          metadata: {
            processing_time: endTime - startTime,
            step: functionName,
            timestamp: new Date().toISOString()
          }
        }
        
      } catch (error) {
        lastError = error as Error
        console.warn(`⚠️ [EdgeFunctionClient] ${functionName} 调用失败 (尝试 ${attempt}/${retries}):`, error.message)
        
        if (attempt < retries) {
          // 指数退避重试
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          await this.delay(delay)
        }
      }
    }
    
    console.error(`❌ [EdgeFunctionClient] ${functionName} 调用最终失败:`, lastError?.message)
    return {
      success: false,
      error: lastError?.message || `调用 ${functionName} 失败`,
      metadata: {
        step: functionName,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * 并行调用多个Functions
   */
  async callFunctionsParallel<T = any>(
    calls: Array<{
      name: string
      data: any
      options?: any
    }>
  ): Promise<Record<string, ProcessingResult<T>>> {
    console.log(`🔗 [EdgeFunctionClient] 并行调用 ${calls.length} 个Functions`)
    
    const promises = calls.map(async (call) => {
      const result = await this.callFunction(call.name, call.data, call.options)
      return [call.name, result] as [string, ProcessingResult<T>]
    })
    
    const results = await Promise.all(promises)
    return Object.fromEntries(results)
  }

  /**
   * 串行调用Functions（管道模式）
   */
  async callFunctionsPipeline<T = any>(
    pipeline: Array<{
      name: string
      transform?: (prevResult: any, originalData: any) => any
      options?: any
    }>,
    initialData: any
  ): Promise<ProcessingResult<T>> {
    console.log(`🔗 [EdgeFunctionClient] 管道调用 ${pipeline.length} 个Functions`)
    
    let currentData = initialData
    const stepResults: Record<string, any> = {}
    const stepTimings: Record<string, number> = {}
    
    for (const step of pipeline) {
      const stepStartTime = performance.now()
      
      // 如果有转换函数，转换输入数据
      const inputData = step.transform ? step.transform(currentData, initialData) : currentData
      
      const result = await this.callFunction(step.name, inputData, step.options)
      
      if (!result.success) {
        return {
          success: false,
          error: `管道在步骤 ${step.name} 失败: ${result.error}`,
          metadata: {
            step: step.name,
            timestamp: new Date().toISOString(),
            completed_steps: Object.keys(stepResults)
          }
        }
      }
      
      const stepEndTime = performance.now()
      stepTimings[step.name] = stepEndTime - stepStartTime
      stepResults[step.name] = result.data
      currentData = result.data
    }
    
    return {
      success: true,
      data: currentData as T,
      metadata: {
        step: 'pipeline_complete',
        timestamp: new Date().toISOString(),
        step_results: stepResults,
        step_timings: stepTimings,
        total_processing_time: Object.values(stepTimings).reduce((a, b) => a + b, 0)
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * 创建Function客户端的工厂函数
 */
export function createFunctionClient(context: EdgeFunctionContext): EdgeFunctionClient {
  return new EdgeFunctionClient(context)
}

/**
 * 快捷调用单个Function
 */
export async function callFunction<T = any>(
  functionName: string, 
  data: any, 
  context: EdgeFunctionContext,
  options?: any
): Promise<ProcessingResult<T>> {
  const client = new EdgeFunctionClient(context)
  return client.callFunction(functionName, data, options)
}