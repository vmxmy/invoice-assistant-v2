// React + TypeScript 用户登录组件 - 使用React Query优化
import React, { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useSignIn } from '../../hooks/useAuth'
import type { SignInFormData } from '../../types'

interface FormData extends SignInFormData {
  rememberMe?: boolean
}

const SignIn: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  })
  const [message, setMessage] = useState('')
  
  // React Query hook for better state management
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

  const messageClass = message.includes('成功')
    ? 'bg-green-50 text-green-800 border border-green-200'
    : 'bg-red-50 text-red-800 border border-red-200'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <form onSubmit={handleSignIn} className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-gray-900">用户登录</h2>
            
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
              <label className="block text-sm font-medium text-gray-700">密码</label>
              <input
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入密码"
              />
            </div>

            <button
              type="submit"
              disabled={signInMutation.isPending}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {signInMutation.isPending ? '登录中...' : '登录'}
            </button>
          </form>

          {/* 消息提示 */}
          {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${messageClass}`}>
              {message}
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            没有账户？
            <Link to="/signup" className="text-blue-600 hover:text-blue-800 ml-1">
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignIn