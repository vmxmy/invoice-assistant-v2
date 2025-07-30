/**
 * 登录页面 - 使用最佳实践
 * 支持登录和注册功能
 */
import React, { useState } from 'react'
import { useAuthContext } from '../contexts/AuthContext'

export function LoginPage() {
  const { signIn, signUp, loading, error } = useAuthContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    
    if (!email || !password) {
      setLocalError('请填写所有必填字段')
      return
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        setLocalError('密码确认不匹配')
        return
      }
      if (password.length < 6) {
        setLocalError('密码长度至少6位')
        return
      }
      await signUp(email, password)
    } else {
      await signIn(email, password)
    }
  }

  const displayError = localError || error?.message

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <div className="card w-full max-w-sm bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center text-2xl mb-4">
            🎯 发票助手{isSignUp ? '注册' : '登录'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">邮箱</span>
              </label>
              <input
                type="email"
                placeholder="请输入邮箱"
                className="input input-bordered"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">密码</span>
              </label>
              <input
                type="password"
                placeholder={isSignUp ? "请输入密码（至少6位）" : "请输入密码"}
                className="input input-bordered"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {isSignUp && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">确认密码</span>
                </label>
                <input
                  type="password"
                  placeholder="请再次输入密码"
                  className="input input-bordered"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {displayError && (
              <div className="alert alert-error">
                <span>{displayError}</span>
              </div>
            )}

            <div className="form-control mt-6">
              <button
                type="submit"
                className={`btn btn-primary ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {isSignUp ? '注册' : '登录'}
              </button>
            </div>

            <div className="divider">或</div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setLocalError(null)
                setConfirmPassword('')
              }}
            >
              {isSignUp ? '已有账号？立即登录' : '没有账号？立即注册'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}