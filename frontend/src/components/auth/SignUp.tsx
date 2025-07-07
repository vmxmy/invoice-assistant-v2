// React + TypeScript 用户注册组件
import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabase'
import { logger } from '../../utils/logger'

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
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [step, setStep] = useState(1) // 1: 注册, 2: 邮箱验证, 3: 完成
  
  const { signUp, user, createProfile } = useAuth()
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

    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await signUp(
        formData.email,
        formData.password,
        { display_name: formData.displayName }
      )

      if (error) {
        throw error
      }

      if (data.user) {
        setMessage('注册成功！请检查邮箱并点击确认链接。')
        setStep(2)
      }
    } catch (error: any) {
      setMessage(`注册失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProfile = async () => {
    try {
      await createProfile({
        display_name: formData.displayName || user?.user_metadata?.display_name || '',
        bio: '新用户'
      })
      
      setMessage('账户设置完成！欢迎使用发票助手。')
      setStep(3)
    } catch (error: any) {
      logger.error('Profile创建失败:', error)
      setMessage('账户创建成功，但Profile设置失败，请稍后重试。')
      setStep(3) // 仍然显示完成页面
    }
  }

  const resendConfirmation = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email
      })

      if (error) throw error
      setMessage('确认邮件已重新发送！')
    } catch (error: any) {
      setMessage(`发送失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const goToDashboard = () => {
    navigate('/dashboard')
  }

  const messageClass = message.includes('成功') || message.includes('完成')
    ? 'bg-green-50 text-green-800 border border-green-200'
    : 'bg-red-50 text-red-800 border border-red-200'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white p-8 rounded-lg shadow-md">
          
          {/* 第1步: 注册表单 */}
          {step === 1 && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <h2 className="text-2xl font-bold text-center text-gray-900">用户注册</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">邮箱地址</label>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">显示名称</label>
                <input
                  name="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="您的姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">密码</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="至少8位字符"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">确认密码</label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="再次输入密码"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? '注册中...' : '创建账户'}
              </button>
            </form>
          )}

          {/* 第2步: 邮箱验证 */}
          {step === 2 && (
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">验证邮箱</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-blue-800">
                  我们已向 <strong>{formData.email}</strong> 发送确认邮件。
                </p>
                <p className="text-blue-600 text-sm mt-2">
                  请检查邮箱并点击确认链接以完成注册。
                </p>
              </div>
              
              <button
                onClick={resendConfirmation}
                disabled={loading}
                className="text-blue-600 hover:text-blue-800 text-sm underline disabled:text-gray-400"
              >
                {loading ? '发送中...' : '重新发送确认邮件'}
              </button>
            </div>
          )}

          {/* 第3步: 注册完成 */}
          {step === 3 && (
            <div className="text-center space-y-4">
              <div className="text-green-600 text-6xl">✓</div>
              <h2 className="text-2xl font-bold text-green-800">注册成功！</h2>
              <p className="text-gray-600">
                欢迎使用发票助手！您现在可以开始上传和管理发票了。
              </p>
              <button
                onClick={goToDashboard}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                进入系统
              </button>
            </div>
          )}

          {/* 消息提示 */}
          {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${messageClass}`}>
              {message}
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            已有账户？
            <Link to="/login" className="text-blue-600 hover:text-blue-800 ml-1">
              立即登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignUp