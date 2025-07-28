/**
 * 认证Hook - 使用最佳实践
 * 简洁、稳定、易于使用
 */
import { useState, useEffect } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface UseAuthReturn {
  user: User | null
  session: Session | null
  loading: boolean
  error: AuthError | null
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  useEffect(() => {
    // 获取初始会话
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('获取会话失败:', error)
        setError(error)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
      setLoading(false)
    })

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('认证状态变化:', event)
        setSession(session)
        setUser(session?.user ?? null)
        setError(null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setError(error)
      setLoading(false)
    }
    
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signUp({ email, password })
    
    if (error) {
      setError(error)
      setLoading(false)
    }
    
    return { error }
  }

  const signOut = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      setError(error)
      setLoading(false)
    }
    return { error }
  }

  return {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
  }
}