// 优化后的认证上下文 - 使用 React Query
import React, { createContext, useContext, useEffect } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../services/supabase'
import { useSession, useProfile } from '../hooks/useAuth'
import { logger } from '../utils/logger'
import type { User, Profile } from '../types'

// 简化的认证上下文类型
interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  isAuthenticated: boolean
  hasProfile: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // 使用 React Query hooks
  const { data: session, isLoading: sessionLoading } = useSession()
  const { data: profile, isLoading: profileLoading } = useProfile()

  // 监听认证状态变化（保留实时同步）
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.log('🔄 认证状态变化:', event, session?.user?.email)
        
        // React Query 会自动处理状态更新
        // 这里只需要处理一些特殊情况
        if (event === 'SIGNED_OUT') {
          logger.log('🚪 用户已登出')
        } else if (event === 'SIGNED_IN') {
          logger.log('🔑 用户已登录')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const value: AuthContextType = {
    user: session?.user || null,
    profile: profile || null,
    loading: sessionLoading || profileLoading,
    isAuthenticated: !!session?.user,
    hasProfile: !!profile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}