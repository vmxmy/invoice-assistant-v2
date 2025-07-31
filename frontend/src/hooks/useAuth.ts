/**
 * 认证Hook - 使用最佳实践
 * 简洁、稳定、易于使用，支持智能状态处理
 */
import { useState, useEffect } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// 认证状态枚举
export enum AuthStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  EMAIL_EXISTS = 'email_exists',
  EMAIL_NOT_CONFIRMED = 'email_not_confirmed',
  INVALID_CREDENTIALS = 'invalid_credentials',
  WEAK_PASSWORD = 'weak_password',
  TOO_MANY_REQUESTS = 'too_many_requests',
  ERROR = 'error'
}

export interface UseAuthReturn {
  user: User | null
  session: Session | null
  loading: boolean
  error: AuthError | null
  status: AuthStatus
  message: string
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; status: AuthStatus }>
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null; status: AuthStatus }>
  signOut: () => Promise<{ error: AuthError | null }>
  resendConfirmation: (email: string) => Promise<{ error: AuthError | null }>
  clearStatus: () => void
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)
  const [status, setStatus] = useState<AuthStatus>(AuthStatus.IDLE)
  const [message, setMessage] = useState('')

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
        
        // 处理认证事件
        switch (event) {
          case 'SIGNED_IN':
            setStatus(AuthStatus.SUCCESS)
            setMessage('登录成功！')
            break
          case 'SIGNED_OUT':
            setStatus(AuthStatus.IDLE)
            setMessage('')
            break
          case 'USER_UPDATED':
            if (session?.user?.email_confirmed_at) {
              setStatus(AuthStatus.SUCCESS)
              setMessage('邮箱确认成功！')
            }
            break
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    setStatus(AuthStatus.LOADING)
    setMessage('登录中...')
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setError(error)
      setLoading(false)
      
      // 智能状态处理
      if (error.message.includes('Email not confirmed')) {
        setStatus(AuthStatus.EMAIL_NOT_CONFIRMED)
        setMessage('请先确认邮箱后再登录')
      } else if (error.message.includes('Invalid login credentials')) {
        setStatus(AuthStatus.INVALID_CREDENTIALS)
        setMessage('邮箱或密码错误')
      } else if (error.message.includes('Too many requests')) {
        setStatus(AuthStatus.TOO_MANY_REQUESTS)
        setMessage('请求过于频繁，请稍后再试')
      } else {
        setStatus(AuthStatus.ERROR)
        setMessage(error.message)
      }
      
      return { error, status }
    }
    
    return { error: null, status: AuthStatus.SUCCESS }
  }

  const signUp = async (email: string, password: string, displayName?: string) => {
    setLoading(true)
    setError(null)
    setStatus(AuthStatus.LOADING)
    setMessage('注册中...')
    
    const signUpData: any = { email, password }
    if (displayName) {
      signUpData.options = {
        data: { display_name: displayName }
      }
    }
    
    const { data, error } = await supabase.auth.signUp(signUpData)
    
    if (error) {
      setError(error)
      setLoading(false)
      
      // 智能状态处理
      if (error.message.includes('User already registered')) {
        setStatus(AuthStatus.EMAIL_EXISTS)
        setMessage('该邮箱已注册，我们已重新发送确认邮件')
      } else if (error.message.includes('Password should be at least')) {
        setStatus(AuthStatus.WEAK_PASSWORD)
        setMessage('密码强度不够，请使用至少6位字符')
      } else {
        setStatus(AuthStatus.ERROR)
        setMessage(error.message)
      }
      
      return { error, status }
    }

    if (data.user && !data.user.email_confirmed_at) {
      setStatus(AuthStatus.SUCCESS)
      setMessage('注册成功！请检查邮箱确认链接')
      setLoading(false)
    }
    
    return { error: null, status: AuthStatus.SUCCESS }
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

  const resendConfirmation = async (email: string) => {
    setLoading(true)
    setError(null)
    setStatus(AuthStatus.LOADING)
    setMessage('发送确认邮件中...')
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    })
    
    if (error) {
      setError(error)
      setStatus(AuthStatus.ERROR)
      setMessage('发送确认邮件失败')
      setLoading(false)
    } else {
      setStatus(AuthStatus.SUCCESS)
      setMessage('确认邮件已重新发送')
      setLoading(false)
    }
    
    return { error }
  }

  const clearStatus = () => {
    setStatus(AuthStatus.IDLE)
    setMessage('')
    setError(null)
  }

  return {
    user,
    session,
    loading,
    error,
    status,
    message,
    signIn,
    signUp,
    signOut,
    resendConfirmation,
    clearStatus,
  }
}