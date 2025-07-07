// Supabase 客户端配置
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sfenhhtvcyslxplvewmt.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'

// 调试日志
console.log('🔧 Supabase 配置调试:', {
  url: supabaseUrl,
  urlType: typeof supabaseUrl,
  key: supabaseAnonKey,
  keyType: typeof supabaseAnonKey,
  keyLength: supabaseAnonKey?.length,
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  envVars: import.meta.env
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少环境变量:', { supabaseUrl, supabaseAnonKey })
  throw new Error('缺少Supabase环境变量')
}

// 尝试创建 Supabase 客户端
let supabase: any
try {
  console.log('🔄 正在创建 Supabase 客户端...')
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce' // 推荐的安全流程
    }
  })
  console.log('✅ Supabase 客户端创建成功')
} catch (error) {
  console.error('❌ Supabase 客户端创建失败:', error)
  throw error
}

export { supabase }

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