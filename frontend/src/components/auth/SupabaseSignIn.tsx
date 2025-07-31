/**
 * 纯Supabase登录组件
 * 使用SupabaseAuthContext，支持智能状态处理
 */
import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../../contexts/AuthContext'
import { AuthStatus } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

const SupabaseSignIn: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const { signIn, resendConfirmation, status, message, loading, clearStatus } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  
  const from = location.state?.from?.pathname || '/dashboard'

  // 监听状态变化，显示相应的toast
  useEffect(() => {
    if (status === AuthStatus.SUCCESS && message) {
      toast.success(message)
      if (status === AuthStatus.SUCCESS && !loading) {
        navigate(from, { replace: true })
      }
    } else if (status === AuthStatus.ERROR || status === AuthStatus.INVALID_CREDENTIALS || 
               status === AuthStatus.TOO_MANY_REQUESTS) {
      toast.error(message)
    }
  }, [status, message, loading, navigate, from])

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
                required
              />
            </div>

            {/* 智能状态显示 */}
            {status === AuthStatus.EMAIL_NOT_CONFIRMED && (
              <div className="alert alert-info">
                <div className="flex-1">
                  <p>请先确认邮箱</p>
                  <p className="text-sm opacity-70">没收到邮件？</p>
                </div>
                <button 
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={handleResendConfirmation}
                  disabled={loading}
                >
                  重新发送
                </button>
              </div>
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
            >
              {loading ? message || '登录中...' : '登录'}
            </button>
          </form>
          
          <div className="divider">还没有账户？</div>
          
          <Link to="/signup" className="btn btn-outline w-full">
            立即注册
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SupabaseSignIn