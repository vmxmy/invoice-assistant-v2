/**
 * 邮箱确认提示页面
 * 用户注册后显示确认邮件发送成功的提示
 */
import React, { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { AuthStatus } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const EmailConfirmationPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const email = searchParams.get('email') || ''
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  
  const { resendConfirmation, status, message, loading } = useAuthContext()

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  // 监听重发邮件状态
  useEffect(() => {
    if (status === AuthStatus.SUCCESS && message.includes('重新发送')) {
      toast.success(message)
      setCountdown(60)
      setCanResend(false)
    } else if (status === AuthStatus.ERROR) {
      toast.error(message)
    }
  }, [status, message])

  const handleResendEmail = async () => {
    if (!email) {
      toast.error('邮箱地址不能为空')
      return
    }
    await resendConfirmation(email)
  }

  const getEmailProvider = (email: string) => {
    const domain = email.split('@')[1]
    const providers: { [key: string]: { name: string; url: string } } = {
      'qq.com': { name: 'QQ邮箱', url: 'https://mail.qq.com' },
      '163.com': { name: '网易163', url: 'https://mail.163.com' },
      '126.com': { name: '网易126', url: 'https://mail.126.com' },
      'gmail.com': { name: 'Gmail', url: 'https://mail.google.com' },
      'outlook.com': { name: 'Outlook', url: 'https://outlook.live.com' },
      'hotmail.com': { name: 'Hotmail', url: 'https://outlook.live.com' },
      'live.com': { name: 'Live', url: 'https://outlook.live.com' },
      'yeah.net': { name: '网易yeah', url: 'https://mail.yeah.net' }
    }
    return providers[domain] || { name: '邮箱', url: '#' }
  }

  const emailProvider = getEmailProvider(email)

  return (
    <div className="min-h-screen min-h-[100vh] min-h-[100dvh] bg-base-200 flex items-center justify-center p-4 mobile-full-container">
      <div className="card w-full max-w-lg bg-base-100 shadow-xl">
        <div className="card-body text-center">
          {/* 成功图标 */}
          <div className="mx-auto mb-6">
            <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <h2 className="card-title text-2xl font-bold mb-4 justify-center">
            确认邮件已发送
          </h2>
          
          <div className="space-y-4 text-base-content/80">
            <p>
              我们已向 <span className="font-semibold text-primary">{email}</span> 发送了确认邮件
            </p>
            
            <div className="bg-base-200 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">请按以下步骤完成注册：</h3>
              <ol className="list-decimal list-inside space-y-2 text-left">
                <li>打开您的邮箱</li>
                <li>查找来自我们的确认邮件</li>
                <li>点击邮件中的确认链接</li>
                <li>返回登录页面进行登录</li>
              </ol>
            </div>

            <div className="alert alert-info">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-left">
                <p className="font-semibold">没有收到邮件？</p>
                <p className="text-sm opacity-70">
                  请检查垃圾邮件文件夹，或稍后重新发送确认邮件
                </p>
              </div>
            </div>
          </div>

          <div className="card-actions flex-col w-full mt-6 space-y-3">
            {/* 打开邮箱按钮 */}
            {emailProvider.url !== '#' && (
              <a 
                href={emailProvider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary w-full"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                打开 {emailProvider.name}
              </a>
            )}

            {/* 重新发送邮件按钮 */}
            <button
              onClick={handleResendEmail}
              disabled={!canResend || loading}
              className={`btn btn-outline w-full ${loading ? 'loading' : ''}`}
            >
              {loading ? '发送中...' : canResend ? '重新发送确认邮件' : `重新发送 (${countdown}s)`}
            </button>

            {/* 返回登录按钮 */}
            <Link to="/login" className="btn btn-ghost w-full">
              返回登录页面
            </Link>
          </div>

          {/* 底部提示 */}
          <div className="mt-6 text-sm text-base-content/60">
            <p>确认邮件有效期为24小时</p>
            <p>如果您在确认邮箱后仍无法登录，请联系客服</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailConfirmationPage