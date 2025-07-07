// Supabase 客户端配置
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
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