// 优化后的用户登录组件 - 使用 React Query
import React, { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useSignIn } from '../../hooks/useAuth'

interface FormData {
  email: string
  password: string
}

const SignIn: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  })
  const [message, setMessage] = useState('')
  
  // React Query hook
  const signInMutation = useSignIn()
  
  const navigate = useNavigate()
  const location = useLocation()

  // 获取重定向路径
  const from = location.state?.from?.pathname || '/dashboard'

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    try {
      await signInMutation.mutateAsync({
        email: formData.email,
        password: formData.password
      })
      
      setMessage('登录成功！')
      
      // 延迟跳转，让用户看到成功消息
      setTimeout(() => {
        navigate(from, { replace: true })
      }, 1000)
      
    } catch (error: any) {
      setMessage(`登录失败: ${error.message}`)
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title justify-center text-2xl mb-6">用户登录</h2>
            
            <form onSubmit={handleSignIn}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">邮箱地址</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  placeholder="your@email.com"
                />
              </div>

              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text">密码</span>
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  placeholder="请输入密码"
                />
              </div>

              <div className="form-control">
                <button
                  type="submit"
                  disabled={signInMutation.isPending}
                  className={`btn btn-primary w-full ${signInMutation.isPending ? 'loading' : ''}`}
                >
                  {signInMutation.isPending ? '登录中...' : '登录'}
                </button>
              </div>
            </form>

            {/* 消息提示 */}
            {message && (
              <div className={`alert mt-4 ${message.includes('成功') ? 'alert-success' : 'alert-error'}`}>
                <span>{message}</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-base-content/70">
            没有账户？
            <Link to="/signup" className="link link-primary ml-1">
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignIn