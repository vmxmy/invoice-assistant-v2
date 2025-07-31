/**
 * Supabase客户端配置 - 使用最佳实践
 * 简洁、稳定、无副作用
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
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
      'X-Client-Info': 'invoice-assist@2.0.0'
    }
  }
})

// 导出配置信息
export const config = {
  url: supabaseUrl,
  hasKey: Boolean(supabaseAnonKey)
}