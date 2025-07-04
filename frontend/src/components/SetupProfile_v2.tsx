// 优化后的Profile设置组件 - 使用 React Query
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateProfile } from '../hooks/useAuth'
import { useAuth } from '../contexts/AuthContext_v2'

interface ProfileData {
  display_name: string
  bio: string
}

const SetupProfile: React.FC = () => {
  const { user } = useAuth()
  const [formData, setFormData] = useState<ProfileData>({
    display_name: user?.user_metadata?.display_name || '',
    bio: ''
  })
  const [message, setMessage] = useState('')
  
  // React Query hook
  const createProfileMutation = useCreateProfile()
  
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

    setMessage('')

    try {
      await createProfileMutation.mutateAsync(formData)
      setMessage('资料设置成功！')
      
      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)
    } catch (error: any) {
      setMessage(`设置失败: ${error.message}`)
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="text-center mb-6">
              <h2 className="card-title justify-center text-2xl">完善个人资料</h2>
              <p className="text-base-content/70 text-sm mt-2">
                请设置您的个人资料以完成注册
              </p>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">显示名称 *</span>
                </label>
                <input
                  name="display_name"
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  placeholder="您的姓名或昵称"
                />
              </div>

              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text">个人简介</span>
                </label>
                <textarea
                  name="bio"
                  rows={3}
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="textarea textarea-bordered w-full"
                  placeholder="简单介绍一下自己（可选）"
                />
              </div>

              <div className="form-control">
                <button
                  type="submit"
                  disabled={createProfileMutation.isPending}
                  className={`btn btn-primary w-full ${createProfileMutation.isPending ? 'loading' : ''}`}
                >
                  {createProfileMutation.isPending ? '保存中...' : '保存并继续'}
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
          <p className="text-base-content/70 text-sm">
            邮箱: <strong>{user?.email}</strong>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SetupProfile