/**
 * 魔法链接回调页面
 * 处理用户点击魔法链接后的登录流程
 */
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const MagicLinkCallbackPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleMagicLinkCallback = async () => {
      try {
        console.log('🔗 [魔法链接] 处理回调...')
        
        // 检查URL参数
        const urlParams = new URLSearchParams(window.location.search)
        const accessToken = urlParams.get('access_token')
        const refreshToken = urlParams.get('refresh_token')
        const type = urlParams.get('type')
        
        console.log('🔗 [魔法链接] URL参数:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type
        })

        if (type === 'magiclink' && accessToken && refreshToken) {
          // 设置会话
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (error) {
            console.error('❌ [魔法链接] 设置会话失败:', error)
            setError(`登录失败: ${error.message}`)
            toast.error('魔法链接登录失败')
          } else if (data.user) {
            console.log('✅ [魔法链接] 登录成功:', data.user.email)
            toast.success('魔法链接登录成功！')
            
            // 重定向到仪表板
            setTimeout(() => {
              navigate('/dashboard', { replace: true })
            }, 1000)
          }
        } else {
          // 如果没有有效的魔法链接参数，尝试从URL获取session
          const { data, error } = await supabase.auth.getSessionFromUrl()
          
          if (error) {
            console.error('❌ [魔法链接] 获取会话失败:', error)
            setError(`获取会话失败: ${error.message}`)
            toast.error('魔法链接处理失败')
          } else if (data.session) {
            console.log('✅ [魔法链接] 会话获取成功')
            toast.success('登录成功！')
            navigate('/dashboard', { replace: true })
          } else {
            setError('无效的魔法链接或链接已过期')
            toast.error('魔法链接无效或已过期')
          }
        }
      } catch (err) {
        console.error('❌ [魔法链接] 处理异常:', err)
        setError('处理魔法链接时发生错误')
        toast.error('魔法链接处理失败')
      } finally {
        setLoading(false)
      }
    }

    handleMagicLinkCallback()
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <div className="loading loading-spinner loading-lg mx-auto"></div>
            <h2 className="card-title justify-center mt-4">处理魔法链接</h2>
            <p className="text-base-content/70">正在验证您的登录...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <div className="text-error text-6xl mb-4">⚠️</div>
            <h2 className="card-title justify-center text-error">登录失败</h2>
            <p className="text-base-content/70 mb-4">{error}</p>
            
            <div className="card-actions justify-center">
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/login')}
              >
                返回登录
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <div className="text-success text-6xl mb-4">✅</div>
          <h2 className="card-title justify-center text-success">登录成功</h2>
          <p className="text-base-content/70">正在跳转到仪表板...</p>
        </div>
      </div>
    </div>
  )
}

export default MagicLinkCallbackPage