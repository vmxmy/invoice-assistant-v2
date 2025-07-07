// Supabase 客户端配置
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 调试环境变量
console.log('🔍 Supabase 环境变量检查:')
console.log('URL:', supabaseUrl ? '✅ 已设置' : '❌ 未设置', supabaseUrl)
console.log('Key:', supabaseAnonKey ? '✅ 已设置' : '❌ 未设置', supabaseAnonKey?.substring(0, 20) + '...')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少Supabase环境变量')
  console.log('所有环境变量:', import.meta.env)
  throw new Error('缺少Supabase环境变量')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // 推荐的安全流程
  }
})

// 类型定义
export interface UserProfile {
  id: string
  display_name: string
  bio?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// 从 Supabase 客户端获取类型
export type AuthUser = Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']
export type AuthError = Awaited<ReturnType<typeof supabase.auth.signUp>>['error']