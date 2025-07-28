import React, { useState, useEffect } from 'react'
import { useCreateEmailAccount } from '../../hooks/useEmailAccounts'
import { EmailAccountCreate, ImapConfig } from '../../types/email'
import LoadingButton from '../ui/LoadingButton'

interface AddEmailAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (account: any) => void
}

const AddEmailAccountModal: React.FC<AddEmailAccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<EmailAccountCreate>({
    email_address: '',
    password: '',
    display_name: '',
    imap_host: '',
    imap_port: 993,
    imap_use_ssl: true,
    smtp_host: '',
    smtp_port: 587,
    smtp_use_tls: true,
    scan_config: {
      auto_scan: false,
      scan_interval: 3600,
      folders: ['INBOX'],
      keywords: ['发票', 'invoice', '账单', 'bill']
    }
  })

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [autoDetectError, setAutoDetectError] = useState<string | null>(null)

  const createMutation = useCreateEmailAccount()

  // 重置表单
  const resetForm = () => {
    setFormData({
      email_address: '',
      password: '',
      display_name: '',
      imap_host: '',
      imap_port: 993,
      imap_use_ssl: true,
      smtp_host: '',
      smtp_port: 587,
      smtp_use_tls: true,
      scan_config: {
        auto_scan: false,
        scan_interval: 3600,
        folders: ['INBOX'],
        keywords: ['发票', 'invoice', '账单', 'bill']
      }
    })
    setShowAdvanced(false)
    setAutoDetectError(null)
  }

  // 自动检测IMAP配置
  const handleEmailBlur = async () => {
    if (formData.email_address && !showAdvanced) {
      try {
        setAutoDetectError(null)
        
        // 简化的邮箱配置自动检测逻辑
        const email = formData.email_address.toLowerCase()
        let config: Partial<ImapConfig> = {}
        
        if (email.includes('@gmail.com')) {
          config = {
            imap_host: 'imap.gmail.com',
            imap_port: 993,
            imap_use_ssl: true,
            smtp_host: 'smtp.gmail.com',
            smtp_port: 587,
            smtp_use_tls: true
          }
        } else if (email.includes('@qq.com')) {
          config = {
            imap_host: 'imap.qq.com',
            imap_port: 993,
            imap_use_ssl: true,
            smtp_host: 'smtp.qq.com',
            smtp_port: 587,
            smtp_use_tls: true
          }
        } else if (email.includes('@163.com')) {
          config = {
            imap_host: 'imap.163.com',
            imap_port: 993,
            imap_use_ssl: true,
            smtp_host: 'smtp.163.com',
            smtp_port: 465,
            smtp_use_tls: true
          }
        } else if (email.includes('@126.com')) {
          config = {
            imap_host: 'imap.126.com',
            imap_port: 993,
            imap_use_ssl: true,
            smtp_host: 'smtp.126.com',
            smtp_port: 465,
            smtp_use_tls: true
          }
        } else if (email.includes('@outlook.com') || email.includes('@hotmail.com')) {
          config = {
            imap_host: 'outlook.office365.com',
            imap_port: 993,
            imap_use_ssl: true,
            smtp_host: 'smtp-mail.outlook.com',
            smtp_port: 587,
            smtp_use_tls: true
          }
        } else {
          // 未知邮箱服务商，显示手动配置
          setAutoDetectError('无法自动检测邮箱配置，请手动配置')
          setShowAdvanced(true)
          return
        }
        
        setFormData(prev => ({
          ...prev,
          imap_host: config.imap_host || '',
          imap_port: config.imap_port || 993,
          imap_use_ssl: config.imap_use_ssl ?? true,
          smtp_host: config.smtp_host || '',
          smtp_port: config.smtp_port || 587,
          smtp_use_tls: config.smtp_use_tls ?? true
        }))
      } catch (error) {
        setAutoDetectError('无法自动检测邮箱配置，请手动配置')
        setShowAdvanced(true)
      }
    }
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const result = await createMutation.mutateAsync(formData)
      onSuccess?.(result)
      onClose()
      resetForm()
    } catch (error) {
      // 错误已在hook中处理
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
      <div className="modal-box w-11/12 max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">添加邮箱账户</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 基本信息 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">邮箱地址 *</span>
            </label>
            <input
              type="email"
              className="input input-bordered"
              value={formData.email_address}
              onChange={(e) => setFormData(prev => ({ ...prev, email_address: e.target.value }))}
              onBlur={handleEmailBlur}
              placeholder="例如：user@gmail.com"
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">密码/授权码 *</span>
            </label>
            <input
              type="password"
              className="input input-bordered"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="邮箱密码或应用授权码"
              required
            />
            <label className="label">
              <span className="label-text-alt">
                QQ邮箱、163邮箱等需要使用应用授权码，不是登录密码
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
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="给这个邮箱账户起个名字"
            />
          </div>

          {/* 自动检测错误提示 */}
          {autoDetectError && (
            <div className="alert alert-warning">
              <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>{autoDetectError}</span>
            </div>
          )}

          {/* 高级配置 */}
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">手动配置IMAP/SMTP设置</span>
              <input
                type="checkbox"
                className="toggle"
                checked={showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
              />
            </label>
          </div>

          {showAdvanced && (
            <div className="space-y-4 p-4 bg-base-200 rounded-lg">
              <h4 className="font-semibold">IMAP 设置</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">IMAP 服务器</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={formData.imap_host}
                    onChange={(e) => setFormData(prev => ({ ...prev, imap_host: e.target.value }))}
                    placeholder="imap.gmail.com"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">IMAP 端口</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered input-sm"
                    value={formData.imap_port}
                    onChange={(e) => setFormData(prev => ({ ...prev, imap_port: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">使用SSL加密</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.imap_use_ssl}
                    onChange={(e) => setFormData(prev => ({ ...prev, imap_use_ssl: e.target.checked }))}
                  />
                </label>
              </div>

              <h4 className="font-semibold mt-4">SMTP 设置（可选）</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">SMTP 服务器</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={formData.smtp_host}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtp_host: e.target.value }))}
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">SMTP 端口</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered input-sm"
                    value={formData.smtp_port}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">使用TLS加密</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.smtp_use_tls}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtp_use_tls: e.target.checked }))}
                  />
                </label>
              </div>
            </div>
          )}

          {/* 扫描配置 */}
          <div className="space-y-4 p-4 bg-base-200 rounded-lg">
            <h4 className="font-semibold">扫描设置</h4>
            
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">启用自动扫描</span>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={formData.scan_config?.auto_scan}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    scan_config: { ...prev.scan_config!, auto_scan: e.target.checked }
                  }))}
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">扫描关键词</span>
              </label>
              <input
                type="text"
                className="input input-bordered input-sm"
                value={formData.scan_config?.keywords.join(', ')}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  scan_config: { 
                    ...prev.scan_config!, 
                    keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                  }
                }))}
                placeholder="发票, invoice, 账单, bill"
              />
              <label className="label">
                <span className="label-text-alt">用逗号分隔多个关键词</span>
              </label>
            </div>
          </div>

          {/* 按钮 */}
          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              取消
            </button>
            <LoadingButton
              type="submit"
              className="btn btn-primary"
              isLoading={createMutation.isPending}
              disabled={!formData.email_address || !formData.password}
            >
              添加账户
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddEmailAccountModal