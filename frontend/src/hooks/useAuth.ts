/**
 * 认证Hook - 使用最佳实践
 * 简洁、稳定、易于使用，支持智能状态处理
 */
import { useState, useEffect } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { autoConfirmEmailInDev } from '../utils/devAutoConfirm'

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

// 用户权限信息接口
export interface UserPermissions {
  user_id: string
  roles: string[]
  permissions: string[]
  permission_level: 'user' | 'moderator' | 'admin' | 'super_admin'
  is_admin: boolean
  is_super_admin: boolean
  is_moderator: boolean
  can_manage_users: boolean
  can_view_system_logs: boolean
}

export interface UseAuthReturn {
  user: User | null
  session: Session | null
  loading: boolean
  error: AuthError | null
  status: AuthStatus
  message: string
  isEmailVerified: boolean
  userPermissions: UserPermissions | null
  permissionsLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; status: AuthStatus }>
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null; status: AuthStatus }>
  signOut: () => Promise<{ error: AuthError | null }>
  resendConfirmation: (email: string) => Promise<{ error: AuthError | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null; status: AuthStatus }>
  clearStatus: () => void
  refreshPermissions: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)
  const [status, setStatus] = useState<AuthStatus>(AuthStatus.IDLE)
  const [message, setMessage] = useState('')
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)
  const [permissionsLoading, setPermissionsLoading] = useState(false)

  // 从JWT token解析权限（优先策略）
  const loadPermissionsFromJWT = useCallback(() => {
    if (!user?.email_confirmed_at) {
      setUserPermissions(null)
      return false
    }

    try {
      // 检查JWT token中是否有权限信息
      const token = session?.access_token
      if (!token) return false

      // 解析JWT payload（简单base64解码，生产环境应使用专门的JWT库）
      const payload = JSON.parse(atob(token.split('.')[1]))
      
      if (payload.user_role && payload.permissions) {
        const permissions: UserPermissions = {
          user_id: user.id,
          roles: [payload.user_role],
          permissions: payload.permissions || [],
          permission_level: payload.permission_level || payload.user_role,
          is_admin: payload.is_admin || false,
          is_super_admin: payload.is_super_admin || false,
          is_moderator: payload.is_moderator || false,
          can_manage_users: payload.can_manage_users || false,
          can_view_system_logs: payload.can_view_system_logs || false,
        }
        
        console.log('🔐 [JWT] 从JWT token解析权限成功:', permissions)
        setUserPermissions(permissions)
        return true
      }
    } catch (error) {
      console.warn('🔐 [JWT] JWT权限解析失败，将使用RPC fallback:', error)
    }
    
    return false
  }, [user, session])

  // RPC权限加载（备用策略）
  const loadPermissionsFromRPC = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('rpc_get_current_user_permissions')
      
      if (error) {
        console.error('🔐 [RPC] 加载用户权限失败:', error)
        setUserPermissions(null)
      } else if (data?.error) {
        console.error('🔐 [RPC] 权限服务错误:', data.error)
        setUserPermissions(null)
      } else {
        console.log('🔐 [RPC] 用户权限加载成功:', data)
        setUserPermissions(data as UserPermissions)
      }
    } catch (err) {
      console.error('🔐 [RPC] 权限加载异常:', err)
      setUserPermissions(null)
    }
  }, [])

  // 混合权限加载策略：JWT优先，RPC备用
  const loadUserPermissions = useCallback(async () => {
    if (!user?.email_confirmed_at) {
      setUserPermissions(null)
      return
    }

    setPermissionsLoading(true)
    
    try {
      // 1. 尝试从JWT获取权限（快速路径）
      const jwtSuccess = loadPermissionsFromJWT()
      
      // 2. 如果JWT解析失败，使用RPC获取（备用路径）
      if (!jwtSuccess) {
        console.log('🔐 [Permission] JWT解析失败，使用RPC备用方案')
        await loadPermissionsFromRPC()
      }
    } finally {
      setPermissionsLoading(false)
    }
  }, [user, loadPermissionsFromJWT, loadPermissionsFromRPC])

  useEffect(() => {
    // 获取初始会话
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('获取会话失败:', error)
        setError(error)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
        // 如果用户已登录且邮箱已验证，加载权限信息
        if (session?.user?.email_confirmed_at) {
          setTimeout(() => loadUserPermissions(), 100) // 短暂延迟确保状态已更新
        }
      }
      setLoading(false)
    })

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('认证状态变化:', event)
        
        // 避免在已经加载完成的情况下重复设置loading状态
        if (event === 'INITIAL_SESSION') {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        setError(null)
        
        // 只在特定事件下设置loading为false，避免干扰用户操作
        if (event === 'SIGNED_OUT') {
          setLoading(false)
        }
        
        // 处理认证事件
        switch (event) {
          case 'SIGNED_IN':
            // 用户登录后加载权限信息
            if (session?.user?.email_confirmed_at) {
              loadUserPermissions()
            }
            break
          case 'SIGNED_OUT':
            setStatus(AuthStatus.IDLE)
            setMessage('')
            setUserPermissions(null)
            break
          case 'USER_UPDATED':
            if (session?.user?.email_confirmed_at) {
              setStatus(AuthStatus.SUCCESS)
              setMessage('邮箱确认成功！')
              // 邮箱确认后加载权限
              loadUserPermissions()
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
      let finalStatus = AuthStatus.ERROR
      let finalMessage = error.message
      
      if (error.message.includes('Email not confirmed')) {
        finalStatus = AuthStatus.EMAIL_NOT_CONFIRMED
        finalMessage = '请先确认邮箱后再登录'
      } else if (error.message.includes('Invalid login credentials')) {
        finalStatus = AuthStatus.INVALID_CREDENTIALS
        finalMessage = '邮箱或密码错误'
      } else if (error.message.includes('Too many requests')) {
        finalStatus = AuthStatus.TOO_MANY_REQUESTS
        finalMessage = '请求过于频繁，请稍后再试'
      }
      
      setStatus(finalStatus)
      setMessage(finalMessage)
      
      return { error, status: finalStatus }
    }
    
    // 登录成功时，状态会通过onAuthStateChange处理
    // 这里直接设置成功状态
    setLoading(false)
    setStatus(AuthStatus.SUCCESS)
    setMessage('登录成功！')
    
    return { error: null, status: AuthStatus.SUCCESS }
  }

  const signUp = async (email: string, password: string, displayName?: string) => {
    setLoading(true)
    setError(null)
    setStatus(AuthStatus.LOADING)
    setMessage('注册中...')
    
    // 获取应用的基础URL - 使用环境变量配置的域名
    const configuredDomain = import.meta.env.VITE_APP_DOMAIN
    const currentURL = configuredDomain || window.location.origin
    const redirectURL = `${currentURL}/email-confirmation`
    
    const signUpData: any = { 
      email, 
      password,
      options: {
        emailRedirectTo: redirectURL,
        ...(displayName && { data: { display_name: displayName } })
      }
    }
    
    console.log('注册配置:', {
      email,
      redirectURL,
      currentURL,
      configuredDomain,
      windowOrigin: window.location.origin,
      hasDisplayName: !!displayName,
      isDevelopment: import.meta.env.DEV
    })
    
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

    // 开发环境自动确认邮箱
    if (import.meta.env.DEV && data.user && !data.user.email_confirmed_at) {
      console.log('🔧 [开发环境] 自动确认用户邮箱:', email)
      try {
        await autoConfirmEmailInDev(data.user.id)
        setStatus(AuthStatus.SUCCESS)
        setMessage('注册成功！开发环境已自动确认邮箱')
        setLoading(false)
      } catch (confirmError) {
        console.error('开发环境自动确认失败:', confirmError)
        setStatus(AuthStatus.SUCCESS)
        setMessage('注册成功！请检查邮箱确认链接')
        setLoading(false)
      }
    } else if (data.user && !data.user.email_confirmed_at) {
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

  const signInWithMagicLink = async (email: string) => {
    setLoading(true)
    setError(null)
    setStatus(AuthStatus.LOADING)
    setMessage('发送魔法链接中...')
    
    // 获取应用的基础URL - 使用环境变量配置的域名
    const configuredDomain = import.meta.env.VITE_APP_DOMAIN
    const currentURL = configuredDomain || window.location.origin
    const redirectURL = `${currentURL}/magic-link-callback`
    
    console.log('🔗 [魔法链接] 发送配置:', {
      email,
      redirectURL,
      currentURL,
      configuredDomain,
      windowOrigin: window.location.origin
    })
    
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectURL
      }
    })
    
    if (error) {
      setError(error)
      setStatus(AuthStatus.ERROR)
      setMessage(`魔法链接发送失败: ${error.message}`)
      setLoading(false)
      
      console.error('❌ [魔法链接] 发送失败:', error)
      return { error, status: AuthStatus.ERROR }
    } else {
      setStatus(AuthStatus.SUCCESS)
      setMessage('魔法链接已发送到您的邮箱！请点击邮件中的链接登录')
      setLoading(false)
      
      console.log('✅ [魔法链接] 发送成功')
      return { error: null, status: AuthStatus.SUCCESS }
    }
  }

  // 刷新权限信息
  const refreshPermissions = async () => {
    await loadUserPermissions()
  }

  // 检查用户是否有特定权限
  const hasPermission = (permission: string): boolean => {
    if (!userPermissions) return false
    return userPermissions.permissions.includes(permission)
  }

  // 检查用户是否有特定角色
  const hasRole = (role: string): boolean => {
    if (!userPermissions) return false
    return userPermissions.roles.includes(role)
  }

  // 检查用户是否有任意一个指定角色
  const hasAnyRole = (roles: string[]): boolean => {
    if (!userPermissions) return false
    return roles.some(role => userPermissions.roles.includes(role))
  }

  const clearStatus = () => {
    setStatus(AuthStatus.IDLE)
    setMessage('')
    setError(null)
  }

  // 🚨 安全计算属性：检查邮箱是否已验证
  const isEmailVerified = user?.email_confirmed_at !== null && user?.email_confirmed_at !== undefined

  return {
    user,
    session,
    loading,
    error,
    status,
    message,
    isEmailVerified,
    userPermissions,
    permissionsLoading,
    signIn,
    signUp,
    signOut,
    resendConfirmation,
    signInWithMagicLink,
    clearStatus,
    refreshPermissions,
    hasPermission,
    hasRole,
    hasAnyRole,
  }
}