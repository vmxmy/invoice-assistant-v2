/**
 * CORS 工具函数
 * 为 Edge Functions 提供统一的跨域支持
 */

export interface CORSOptions {
  allowedOrigins?: string[]
  allowedMethods?: string[]
  allowedHeaders?: string[]
  maxAge?: number
}

const defaultOptions: CORSOptions = {
  allowedOrigins: ['*'], // 在生产环境中应该指定具体域名
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'authorization',
    'x-client-info',
    'x-user-id',
    'apikey',
    'content-type'
  ],
  maxAge: 86400 // 24小时
}

/**
 * 创建CORS响应头
 */
export function createCORSHeaders(options: CORSOptions = {}): Headers {
  const opts = { ...defaultOptions, ...options }
  const headers = new Headers()

  headers.set('Access-Control-Allow-Origin', opts.allowedOrigins!.join(', '))
  headers.set('Access-Control-Allow-Methods', opts.allowedMethods!.join(', '))
  headers.set('Access-Control-Allow-Headers', opts.allowedHeaders!.join(', '))
  headers.set('Access-Control-Max-Age', opts.maxAge!.toString())
  headers.set('Access-Control-Allow-Credentials', 'true')

  return headers
}

/**
 * 处理OPTIONS预检请求
 */
export function handleCORSPreflightRequest(options: CORSOptions = {}): Response {
  const headers = createCORSHeaders(options)
  return new Response(null, {
    status: 200,
    headers
  })
}

/**
 * 为响应添加CORS头
 */
export function addCORSHeaders(response: Response, options: CORSOptions = {}): Response {
  const corsHeaders = createCORSHeaders(options)
  const headers = new Headers(response.headers)
  
  corsHeaders.forEach((value, key) => {
    headers.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/**
 * CORS中间件包装器
 */
export function withCORS(
  handler: (req: Request) => Promise<Response> | Response,
  options: CORSOptions = {}
) {
  return async (req: Request): Promise<Response> => {
    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') {
      return handleCORSPreflightRequest(options)
    }

    try {
      const response = await handler(req)
      return addCORSHeaders(response, options)
    } catch (error) {
      // 即使出错也要添加CORS头
      const errorResponse = new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Internal server error' 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
      return addCORSHeaders(errorResponse, options)
    }
  }
}