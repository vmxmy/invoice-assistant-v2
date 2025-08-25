/**
 * 纯Supabase注册组件
 * 使用SupabaseAuthContext，支持智能状态处理
 */
import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../contexts/AuthContext'
import { AuthStatus } from '../../hooks/useAuth'
import EmailConfirmationGuide from './EmailConfirmationGuide'
import toast from 'react-hot-toast'

const SupabaseSignUp: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  
  const { signUp, resendConfirmation, status, message, loading, clearStatus } = useAuthContext()
  const navigate = useNavigate()

  // 监听状态变化，显示相应的toast
  useEffect(() => {
    if (status === AuthStatus.SUCCESS && message) {
      // 注册成功后跳转到邮箱确认页面
      if (status === AuthStatus.SUCCESS && !loading) {
        navigate(`/email-confirmation?email=${encodeURIComponent(email)}`)
      }
    } else if (status === AuthStatus.ERROR || status === AuthStatus.WEAK_PASSWORD) {
      toast.error(message)
    }
  }, [status, message, loading, navigate, email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 表单验证
    if (!email || !password || !confirmPassword || !displayName) {
      toast.error('请填写所有必填项')
      return
    }

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      toast.error('密码长度至少为6位')
      return
    }

    clearStatus()
    await signUp(email, password, displayName)
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
            创建账户
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">显示名称 *</span>
              </label>
              <input
                type="text"
                placeholder="输入您的昵称"
                className="input input-bordered w-full"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                required
                autoComplete="name"
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">邮箱地址 *</span>
              </label>
              <input
                type="email"
                placeholder="输入您的邮箱"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">密码 *</span>
              </label>
              <input
                type="password"
                placeholder="至少6位字符"
                className="input input-bordered w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">确认密码 *</span>
              </label>
              <input
                type="password"
                placeholder="再次输入密码"
                className="input input-bordered w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                autoComplete="new-password"
              />
            </div>

            {/* 智能状态显示 */}
            {status === AuthStatus.EMAIL_EXISTS && (
              <div className="space-y-3">
                <div className="alert alert-warning">
                  <div className="flex-1">
                    <p>该邮箱已注册</p>
                    <p className="text-sm opacity-70">我们已重新发送确认邮件</p>
                  </div>
                  <Link to="/login" className="btn btn-sm btn-primary">
                    直接登录
                  </Link>
                </div>
                <EmailConfirmationGuide 
                  email={email}
                  onEmailChange={setEmail}
                  showEmailInput={false}
                />
              </div>
            )}

            {status === AuthStatus.SUCCESS && (
              <EmailConfirmationGuide 
                email={email}
                onEmailChange={setEmail}
                showEmailInput={false}
              />
            )}


            {status === AuthStatus.WEAK_PASSWORD && (
              <div className="alert alert-error">
                <p>{message}</p>
              </div>
            )}
            
            <button
              type="submit"
              className={`btn btn-primary w-full ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? message || '注册中...' : '注册账户'}
            </button>
          </form>
          
          <div className="divider">已有账户？</div>
          
          <Link to="/login" className="btn btn-outline w-full">
            立即登录
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SupabaseSignUp