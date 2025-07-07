// React 认证上下文
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../services/supabase'
import type { UserProfile } from '../services/supabase'

// 简化的类型定义
type User = any // Supabase User 类型
type AuthError = any // Supabase AuthError 类型

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: any) => Promise<{ data: any; error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  createProfile: (profileData: Partial<UserProfile>) => Promise<UserProfile>
  loadUserProfile: () => Promise<void>
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
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 获取初始会话
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          await loadUserProfile(session.access_token)
        }
      } catch (error) {
        console.error('获取会话失败:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('认证状态变化:', event, session?.user?.email)
        
        if (session?.user) {
          setUser(session.user)
          if (event === 'SIGNED_IN') {
            await loadUserProfile(session.access_token)
          }
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (accessToken?: string) => {
    try {
      if (!accessToken) {
        const { data: { session } } = await supabase.auth.getSession()
        accessToken = session?.access_token
      }

      if (!accessToken) {
        console.log('无访问令牌，跳过Profile加载')
        return
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8090'
      const response = await fetch(`${apiUrl}/api/v1/profiles/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const profileData = await response.json()
        setProfile(profileData)
        console.log('Profile加载成功:', profileData)
      } else if (response.status === 404) {
        console.log('Profile不存在，需要创建')
        setProfile(null)
      } else {
        console.error('加载Profile失败:', response.status, await response.text())
      }
    } catch (error) {
      console.error('加载用户资料失败:', error)
    }
  }

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })
      return { data, error }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      console.log('🔐 开始登录，邮箱:', email)
      console.log('🔧 Supabase客户端检查:', !!supabase)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      console.log('📤 登录响应:', { data: !!data, error: error?.message })
      return { data, error }
    } catch (err: any) {
      console.error('❌ 用户登录失败:', err)
      return { data: null, error: { message: err.message || '登录请求失败' } }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setProfile(null)
    }
    return { error }
  }

  const createProfile = async (profileData: Partial<UserProfile>): Promise<UserProfile> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('未登录')

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8090'
    const response = await fetch(`${apiUrl}/api/v1/profiles/me`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    })

    if (response.ok) {
      const profile = await response.json()
      setProfile(profile)
      return profile
    } else {
      const errorData = await response.json()
      throw new Error(errorData.detail || '创建资料失败')
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    createProfile,
    loadUserProfile: () => loadUserProfile()
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}