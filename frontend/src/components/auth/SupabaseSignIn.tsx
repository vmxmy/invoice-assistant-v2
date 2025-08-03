/**
 * 纯Supabase登录组件
 * 使用SupabaseAuthContext，支持智能状态处理
 */
import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../../contexts/AuthContext'
import { AuthStatus } from '../../hooks/useAuth'
import EmailConfirmationGuide from './EmailConfirmationGuide'
import toast from 'react-hot-toast'

const SupabaseSignIn: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showMagicLink, setShowMagicLink] = useState(false)
  
  const { signIn, resendConfirmation, signInWithMagicLink, status, message, loading, clearStatus } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  
  const from = location.state?.from?.pathname || '/dashboard'
  
  // 防止重复toast和导航的ref
  const lastStatusRef = useRef<AuthStatus>(AuthStatus.IDLE)
  const lastMessageRef = useRef<string>('')
  const hasNavigatedRef = useRef<boolean>(false)

  // 监听状态变化，显示相应的toast - 防止重复触发
  useEffect(() => {
    // 检查状态或消息是否有实际变化
    if (status !== lastStatusRef.current || message !== lastMessageRef.current) {
      lastStatusRef.current = status
      lastMessageRef.current = message
      
      if (status === AuthStatus.SUCCESS && message) {
        toast.success(message)
        // 使用setTimeout确保状态更新完成后再导航，并防止重复导航
        if (!loading && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true
          setTimeout(() => {
            navigate(from, { replace: true })
          }, 100)
        }
      } else if (status === AuthStatus.ERROR || status === AuthStatus.INVALID_CREDENTIALS || 
                 status === AuthStatus.TOO_MANY_REQUESTS) {
        if (message) {
          toast.error(message)
        }
      }
    }
  }, [status, message, loading, navigate, from])

  // 重置导航标记当状态变为非成功状态时
  useEffect(() => {
    if (status !== AuthStatus.SUCCESS) {
      hasNavigatedRef.current = false
    }
  }, [status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('请填写邮箱和密码')
      return
    }

    clearStatus()
    await signIn(email, password)
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error('请输入邮箱地址')
      return
    }
    
    await resendConfirmation(email)
  }

  const handleMagicLinkSignIn = async () => {
    if (!email) {
      toast.error('请输入邮箱地址')
      return
    }
    
    clearStatus()
    await signInWithMagicLink(email)
  }

  return (
    <div className="min-h-screen min-h-[100vh] min-h-[100dvh] bg-base-200 flex items-center justify-center p-4 mobile-full-container">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-center mb-6">
            账户登录
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">邮箱地址</span>
              </label>
              <input
                type="email"
                placeholder="输入您的邮箱"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            {!showMagicLink && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">密码</span>
                </label>
                <input
                  type="password"
                  placeholder="输入您的密码"
                  className="input input-bordered w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required={!showMagicLink}
                />
              </div>
            )}

            {/* 智能状态显示 */}
            {status === AuthStatus.EMAIL_NOT_CONFIRMED && (
              <EmailConfirmationGuide 
                email={email}
                onEmailChange={setEmail}
                showEmailInput={false}
              />
            )}

            {status === AuthStatus.INVALID_CREDENTIALS && (
              <div className="alert alert-error">
                <p>{message}</p>
              </div>
            )}

            {status === AuthStatus.SUCCESS && message && (
              <div className="alert alert-success">
                <p>{message}</p>
              </div>
            )}
            
            <button
              type="submit"
              className={`btn btn-primary w-full ${loading ? 'loading' : ''}`}
              disabled={loading}
              onClick={showMagicLink ? handleMagicLinkSignIn : undefined}
            >
              {loading ? message || '处理中...' : (showMagicLink ? '发送魔法链接' : '登录')}
            </button>
          </form>
          
          {/* 切换登录方式 */}
          <div className="divider">
            <button 
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setShowMagicLink(!showMagicLink)
                clearStatus()
              }}
            >
              {showMagicLink ? '使用密码登录' : '使用魔法链接登录'}
            </button>
          </div>
          
          <div className="text-center">
            <Link to="/signup" className="btn btn-outline w-full">
              立即注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupabaseSignIn