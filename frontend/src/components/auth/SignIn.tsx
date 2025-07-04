// React + TypeScript 用户登录组件
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface FormData {
  email: string
  password: string
}

const SignIn: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await signIn(formData.email, formData.password)

      if (error) {
        throw error
      }

      if (data.user) {
        setMessage('登录成功！')
        navigate('/dashboard')
      }
    } catch (error: any) {
      setMessage(`登录失败: ${error.message}`)
    } finally {
      setLoading(false)
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
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '登录中...' : '登录'}
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