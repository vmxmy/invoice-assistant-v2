// React Query hooks for authentication
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { api } from '../services/apiClient'
import { logger } from '../utils/logger'

// 查询键常量
export const AUTH_KEYS = {
  user: ['auth', 'user'] as const,
  profile: ['auth', 'profile'] as const,
  session: ['auth', 'session'] as const,
}

// 获取当前用户会话
export const useSession = () => {
  return useQuery({
    queryKey: AUTH_KEYS.session,
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      return session
    },
    staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
    retry: 1,
  })
}

// 获取用户Profile
export const useProfile = () => {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: AUTH_KEYS.profile,
    queryFn: async () => {
      const response = await api.profile.getMe()
      return response.data
    },
    enabled: !!session?.user, // 只有在用户已登录时才执行
    staleTime: 10 * 60 * 1000, // 10分钟内不重新获取
    retry: (failureCount, error: any) => {
      // 404错误不重试(Profile不存在)
      if (error?.status === 404) return false
      return failureCount < 2
    },
  })
}

// 创建Profile mutation
export const useCreateProfile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { display_name: string; bio?: string }) => {
      const response = await api.profile.createMe(data)
      return response.data
    },
    onSuccess: (data) => {
      // 更新Profile缓存
      queryClient.setQueryData(AUTH_KEYS.profile, data)
      logger.log('✅ Profile创建成功:', data)
    },
    onError: (error: any) => {
      logger.error('❌ Profile创建失败:', error.message)
    },
  })
}

// 更新Profile mutation
export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: Partial<{ display_name: string; bio: string; avatar_url: string }>) => {
      const response = await api.profile.updateMe(data)
      return response.data
    },
    onSuccess: (data) => {
      // 更新Profile缓存
      queryClient.setQueryData(AUTH_KEYS.profile, data)
      logger.log('✅ Profile更新成功:', data)
    },
    onError: (error: any) => {
      logger.error('❌ Profile更新失败:', error.message)
    },
  })
}

// 注册 mutation
export const useSignUp = () => {
  return useMutation({
    mutationFn: async ({ 
      email, 
      password, 
      metadata 
    }: { 
      email: string; 
      password: string; 
      metadata?: any 
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
      })
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      logger.log('✅ 用户注册成功:', data.user?.email)
    },
    onError: (error: any) => {
      logger.error('❌ 用户注册失败:', error.message)
    },
  })
}

// 登录 mutation
export const useSignIn = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // 清除旧的缓存数据
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.session })
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.profile })
      logger.log('✅ 用户登录成功:', data.user?.email)
    },
    onError: (error: any) => {
      logger.error('❌ 用户登录失败:', error.message)
    },
  })
}

// 登出 mutation
export const useSignOut = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onSuccess: () => {
      // 清除所有缓存
      queryClient.clear()
      logger.log('✅ 用户已登出')
    },
    onError: (error: any) => {
      logger.error('❌ 登出失败:', error.message)
    },
  })
}

// 重新发送确认邮件 mutation
export const useResendConfirmation = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      })
      
      if (error) throw error
    },
    onSuccess: () => {
      logger.log('✅ 确认邮件已重新发送')
    },
    onError: (error: any) => {
      logger.error('❌ 发送确认邮件失败:', error.message)
    },
  })
}