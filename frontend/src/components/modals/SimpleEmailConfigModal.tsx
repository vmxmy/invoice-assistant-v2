import React, { useState, useEffect } from 'react'
import { useAuthContext } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import LoadingButton from '../ui/LoadingButton'
import { toast } from 'react-hot-toast'

interface SimpleEmailConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const SimpleEmailConfigModal: React.FC<SimpleEmailConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuthContext()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 重置表单
  const resetForm = () => {
    setEmail('')
    setDisplayName('')
    setError(null)
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setError('用户未登录')
      return
    }

    if (!email) {
      setError('请输入邮箱地址')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 调试信息：显示当前用户ID
      console.log('🔍 SimpleEmailConfigModal - 当前用户信息:', {
        userId: user.id,
        userEmail: user.email,
        configEmail: email
      })
      
      // 创建最简化的邮箱账户记录，只保存转发邮箱地址
      const { data, error: insertError } = await supabase
        .from('email_accounts')
        .insert({
          user_id: user.id,
          email_address: email,
          display_name: displayName || email,
          // 必填字段使用默认值
          imap_host: 'forwarding-only', // 标识这是转发专用配置
          encrypted_password: 'not-required-for-forwarding',
          is_active: true,
          is_verified: false,
          metadata: {
            type: 'forwarding_only',
            purpose: 'edge_function_identity'
          }
        })
        .select()
        .single()

      if (insertError) {
        console.error('插入邮箱配置失败:', insertError)
        setError(insertError.message || '保存邮箱配置失败')
        return
      }

      toast.success('邮箱配置保存成功')
      onSuccess?.()
      onClose()
      resetForm()
    } catch (error) {
      console.error('保存邮箱配置失败:', error)
      setError('保存邮箱配置失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 模态框关闭时重置表单
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">配置转发邮箱</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="mb-4 p-4 bg-info/10 rounded-lg border border-info/20">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-info mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-info">
              <p className="font-medium mb-1">配置说明：</p>
              <p>此邮箱地址仅用于 Edge Function 身份关联，不需要提供密码或IMAP配置。系统将使用此邮箱作为转发标识。</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">转发邮箱地址 *</span>
            </label>
            <input
              type="email"
              className="input input-bordered"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="例如：your-email@gmail.com"
              required
            />
            <label className="label">
              <span className="label-text-alt">
                此邮箱将用于接收转发的发票邮件
              </span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">显示名称</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="为此配置起个名字（可选）"
            />
          </div>

          {error && (
            <div className="alert alert-error">
              <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              取消
            </button>
            <LoadingButton
              type="submit"
              className="btn btn-primary"
              isLoading={isLoading}
              disabled={!email}
            >
              保存配置
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SimpleEmailConfigModal