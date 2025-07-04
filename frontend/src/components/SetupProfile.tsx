// Profile 设置组件
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProfileData {
  display_name: string
  bio: string
}

const SetupProfile: React.FC = () => {
  const { user, createProfile } = useAuth()
  const [formData, setFormData] = useState<ProfileData>({
    display_name: user?.user_metadata?.display_name || '',
    bio: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const navigate = useNavigate()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.display_name.trim()) {
      setMessage('请输入显示名称')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      await createProfile(formData)
      setMessage('资料设置成功！')
      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)
    } catch (error: any) {
      setMessage(`设置失败: ${error.message}`)
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">完善个人资料</h2>
              <p className="text-gray-600 text-sm mt-2">
                请设置您的个人资料以完成注册
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">显示名称 *</label>
              <input
                name="display_name"
                type="text"
                required
                value={formData.display_name}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="您的姓名或昵称"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">个人简介</label>
              <textarea
                name="bio"
                rows={3}
                value={formData.bio}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="简单介绍一下自己（可选）"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : '保存并继续'}
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
            邮箱: <strong>{user?.email}</strong>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SetupProfile