// 优化后的用户注册组件 - 使用 React Query
import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSignUp, useCreateProfile, useResendConfirmation } from '../../hooks/useAuth'
import { useAuth } from '../../contexts/AuthContext_v2'

interface FormData {
  email: string
  password: string
  confirmPassword: string
  displayName: string
}

const SignUp: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  })
  const [message, setMessage] = useState('')
  const [step, setStep] = useState(1) // 1: 注册, 2: 邮箱验证, 3: 完成
  
  // React Query hooks
  const signUpMutation = useSignUp()
  const createProfileMutation = useCreateProfile()
  const resendMutation = useResendConfirmation()
  
  // 认证状态
  const { user, hasProfile } = useAuth()
  const navigate = useNavigate()

  // 监听认证状态变化
  useEffect(() => {
    if (user && user.email_confirmed_at && step === 2) {
      handleCreateProfile()
    }
  }, [user, step])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      setMessage('密码不匹配')
      return
    }

    if (formData.password.length < 8) {
      setMessage('密码至少需要8位字符')
      return
    }

    setMessage('')

    try {
      await signUpMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
        metadata: { display_name: formData.displayName }
      })
      
      setMessage('注册成功！请检查邮箱并点击确认链接。')
      setStep(2)
    } catch (error: any) {
      setMessage(`注册失败: ${error.message}`)
    }
  }

  const handleCreateProfile = async () => {
    try {
      await createProfileMutation.mutateAsync({
        display_name: formData.displayName || user?.user_metadata?.display_name || '',
        bio: '新用户'
      })
      
      setMessage('账户设置完成！欢迎使用发票助手。')
      setStep(3)
    } catch (error: any) {
      console.error('Profile创建失败:', error)
      setMessage('账户创建成功，但Profile设置失败，请稍后重试。')
      setStep(3) // 仍然显示完成页面
    }
  }

  const handleResendConfirmation = async () => {
    try {
      await resendMutation.mutateAsync(formData.email)
      setMessage('确认邮件已重新发送！')
    } catch (error: any) {
      setMessage(`发送失败: ${error.message}`)
    }
  }

  const goToDashboard = () => {
    navigate('/dashboard')
  }

  // 计算loading状态
  const loading = signUpMutation.isPending || 
                 createProfileMutation.isPending || 
                 resendMutation.isPending


  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            
            {/* 第1步: 注册表单 */}
            {step === 1 && (
              <>
                <h2 className="card-title justify-center text-2xl mb-6">用户注册</h2>
                
                <form onSubmit={handleSignUp}>
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

                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text">显示名称</span>
                    </label>
                    <input
                      name="displayName"
                      type="text"
                      value={formData.displayName}
                      onChange={handleInputChange}
                      className="input input-bordered w-full"
                      placeholder="您的姓名"
                    />
                  </div>

                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text">密码</span>
                    </label>
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={handleInputChange}
                      className="input input-bordered w-full"
                      placeholder="至少8位字符"
                    />
                  </div>

                  <div className="form-control mb-6">
                    <label className="label">
                      <span className="label-text">确认密码</span>
                    </label>
                    <input
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="input input-bordered w-full"
                      placeholder="再次输入密码"
                    />
                  </div>

                  <div className="form-control">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`btn btn-primary w-full ${loading ? 'loading' : ''}`}
                    >
                      {loading ? '注册中...' : '创建账户'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* 第2步: 邮箱验证 */}
            {step === 2 && (
              <div className="text-center">
                <h2 className="card-title justify-center text-2xl mb-6">验证邮箱</h2>
                <div className="alert alert-info mb-4">
                  <div>
                    <p>
                      我们已向 <strong>{formData.email}</strong> 发送确认邮件。
                    </p>
                    <p className="text-sm mt-2">
                      请检查邮箱并点击确认链接以完成注册。
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleResendConfirmation}
                  disabled={loading}
                  className={`btn btn-outline btn-sm ${loading ? 'loading' : ''}`}
                >
                  {loading ? '发送中...' : '重新发送确认邮件'}
                </button>
              </div>
            )}

            {/* 第3步: 注册完成 */}
            {step === 3 && (
              <div className="text-center">
                <div className="text-success text-6xl mb-4">✓</div>
                <h2 className="card-title justify-center text-success text-2xl mb-4">注册成功！</h2>
                <p className="text-base-content/70 mb-6">
                  欢迎使用发票助手！您现在可以开始上传和管理发票了。
                </p>
                <button
                  onClick={goToDashboard}
                  className="btn btn-success w-full"
                >
                  进入系统
                </button>
              </div>
            )}

            {/* 消息提示 */}
            {message && (
              <div className={`alert mt-4 ${message.includes('成功') || message.includes('完成') ? 'alert-success' : 'alert-error'}`}>
                <span>{message}</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-base-content/70">
            已有账户？
            <Link to="/login" className="link link-primary ml-1">
              立即登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignUp