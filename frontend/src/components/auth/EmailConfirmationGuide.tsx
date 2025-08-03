/**
 * 邮箱确认流程引导组件
 * 提供友好的用户引导和操作选项
 */
import React, { useState } from 'react'
import { useAuthContext } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

interface EmailConfirmationGuideProps {
  email: string
  onEmailChange?: (email: string) => void
  showEmailInput?: boolean
}

const EmailConfirmationGuide: React.FC<EmailConfirmationGuideProps> = ({
  email,
  onEmailChange,
  showEmailInput = false
}) => {
  const [localEmail, setLocalEmail] = useState(email)
  const { resendConfirmation, signInWithMagicLink, loading } = useAuthContext()

  const handleResendConfirmation = async () => {
    const emailToUse = showEmailInput ? localEmail : email
    if (!emailToUse) {
      toast.error('请输入邮箱地址')
      return
    }
    
    await resendConfirmation(emailToUse)
  }

  const handleMagicLink = async () => {
    const emailToUse = showEmailInput ? localEmail : email
    if (!emailToUse) {
      toast.error('请输入邮箱地址')
      return
    }
    
    await signInWithMagicLink(emailToUse)
  }

  const handleEmailChange = (newEmail: string) => {
    setLocalEmail(newEmail)
    onEmailChange?.(newEmail)
  }

  return (
    <div className="alert alert-info">
      <div className="flex-1 space-y-3">
        <div className="flex items-start space-x-2">
          <div className="text-info text-xl">📧</div>
          <div>
            <h4 className="font-semibold">请确认您的邮箱</h4>
            <p className="text-sm opacity-80">
              我们已向 <span className="font-mono">{showEmailInput ? localEmail : email}</span> 发送了确认邮件
            </p>
          </div>
        </div>

        {showEmailInput && (
          <div className="form-control">
            <input
              type="email"
              placeholder="输入邮箱地址"
              className="input input-bordered input-sm"
              value={localEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        <div className="space-y-2">
          <h5 className="font-medium text-sm">📋 确认步骤：</h5>
          <ol className="text-sm space-y-1 list-decimal list-inside opacity-80">
            <li>检查邮箱收件箱</li>
            <li>查看垃圾邮件文件夹</li>
            <li>点击邮件中的确认链接</li>
            <li>返回登录页面</li>
          </ol>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button 
            type="button"
            className={`btn btn-sm btn-ghost ${loading ? 'loading' : ''}`}
            onClick={handleResendConfirmation}
            disabled={loading}
          >
            🔄 重新发送
          </button>
          
          <button 
            type="button"
            className={`btn btn-sm btn-ghost ${loading ? 'loading' : ''}`}
            onClick={handleMagicLink}
            disabled={loading}
          >
            ✨ 发送魔法链接
          </button>
        </div>

        <div className="text-xs opacity-60 space-y-1">
          <p>💡 <strong>提示：</strong></p>
          <ul className="list-disc list-inside space-y-0.5 ml-4">
            <li>确认邮件可能需要几分钟才能到达</li>
            <li>魔法链接可以直接登录，无需密码</li>
            <li>如果仍未收到邮件，请检查邮箱地址是否正确</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default EmailConfirmationGuide