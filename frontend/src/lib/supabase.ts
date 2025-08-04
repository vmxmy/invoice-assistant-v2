/**
 * Supabase客户端配置 - 多环境支持
 * 简洁、稳定、无副作用
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const appEnv = import.meta.env.VITE_APP_ENV || 'development'
const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// 环境信息日志
if (debugMode) {
  console.log(`🔧 Environment: ${appEnv}`)
  console.log(`🔗 Supabase URL: ${supabaseUrl}`)
  console.log(`🔑 Has Anon Key: ${Boolean(supabaseAnonKey)}`)
}

// 创建单例Supabase客户端 - 最佳实践
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 启用基本认证功能
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // 禁用URL检测，避免副作用
    // 使用默认流程
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': `invoice-assist@2.0.0-${appEnv}`
    }
  }
})

// 导出环境配置信息
export const config = {
  url: supabaseUrl,
  env: appEnv,
  isLocal: supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1'),
  isProduction: appEnv === 'production',
  isStaging: appEnv === 'staging',
  isDevelopment: appEnv === 'development',
  debugMode,
  hasKey: Boolean(supabaseAnonKey)
}

// 环境验证
if (config.isProduction && config.isLocal) {
  console.warn('⚠️ Warning: Production environment configured with local URL')
}

if (config.isDevelopment && !config.isLocal) {
  console.warn('⚠️ Warning: Development environment configured with remote URL')
}