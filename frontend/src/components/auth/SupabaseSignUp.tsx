/**
 * 纯Supabase注册组件
 * 使用SupabaseAuthContext
 */
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const SupabaseSignUp: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { signUp } = useAuthContext()
  const navigate = useNavigate()

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

    setIsLoading(true)
    
    try {
      const { error } = await signUp(email, password, displayName)
      
      if (error) {
        console.error('注册失败:', error)
        
        // 处理常见错误
        if (error.message.includes('User already registered')) {
          toast.error('该邮箱已被注册')
        } else if (error.message.includes('Password should be at least')) {
          toast.error('密码强度不够')
        } else {
          toast.error(`注册失败: ${error.message}`)
        }
        return
      }

      toast.success('注册成功！请检查邮箱验证链接')
      navigate('/login')
    } catch (error) {
      console.error('注册异常:', error)
      toast.error('注册时发生异常，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
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
                disabled={isLoading}
                required
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
                disabled={isLoading}
                required
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
                disabled={isLoading}
                required
                minLength={6}
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
                disabled={isLoading}
                required
              />
            </div>
            
            <button
              type="submit"
              className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? '注册中...' : '注册账户'}
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