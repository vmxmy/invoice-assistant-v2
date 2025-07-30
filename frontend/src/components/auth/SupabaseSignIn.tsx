/**
 * 纯Supabase登录组件
 * 使用SupabaseAuthContext
 */
import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const SupabaseSignIn: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { signIn } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  
  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('请填写邮箱和密码')
      return
    }

    setIsLoading(true)
    
    try {
      const { error } = await signIn(email, password)
      
      if (error) {
        console.error('登录失败:', error)
        
        // 处理常见错误
        if (error.message.includes('Invalid login credentials')) {
          toast.error('邮箱或密码错误')
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('请先验证邮箱')
        } else {
          toast.error(`登录失败: ${error.message}`)
        }
        return
      }

      toast.success('登录成功！')
      navigate(from, { replace: true })
    } catch (error) {
      console.error('登录异常:', error)
      toast.error('登录时发生异常，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
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
                disabled={isLoading}
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
                disabled={isLoading}
                required
              />
            </div>
            
            <button
              type="submit"
              className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? '登录中...' : '登录'}
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