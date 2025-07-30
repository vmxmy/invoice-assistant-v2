// Profile 设置组件 - 使用Supabase原生认证
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const SetupProfile: React.FC = () => {
  const { user } = useAuthContext()
  const [formData, setFormData] = useState({
    display_name: user?.user_metadata?.display_name || '',
    bio: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  
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
    
    if (!user) {
      toast.error('用户未登录')
      return
    }

    if (!formData.display_name.trim()) {
      toast.error('请输入显示名称')
      return
    }

    setIsLoading(true)
    
    try {
      // 使用 Supabase auth 更新用户元数据
      const { supabase } = await import('../lib/supabase')
      const { error } = await supabase.auth.updateUser({
        data: formData
      })
      
      if (error) {
        toast.error(`创建配置文件失败: ${error.message}`)
        return
      }

      toast.success('配置文件创建成功！')
      navigate('/dashboard')
    } catch (error: any) {
      console.error('创建配置文件异常:', error)
      toast.error('创建配置文件时发生异常')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-center mb-6">
            设置个人资料
          </h2>
          
          <p className="text-sm text-base-content/60 mb-6 text-center">
            完善您的个人信息以开始使用系统
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">显示名称 *</span>
              </label>
              <input
                type="text"
                name="display_name"
                placeholder="输入您的昵称"
                className="input input-bordered w-full"
                value={formData.display_name}
                onChange={handleInputChange}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">个人简介</span>
              </label>
              <textarea
                name="bio"
                placeholder="简单介绍一下您自己（可选）"
                className="textarea textarea-bordered w-full"
                rows={3}
                value={formData.bio}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? '创建中...' : '完成设置'}
            </button>
          </form>
          
          <div className="text-center mt-4">
            <p className="text-xs text-base-content/50">
              您的邮箱: {user?.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SetupProfile