import React, { useState } from 'react'
import { useStartEmailScan } from '../../hooks/useEmailAccounts'
import { EmailAccount, EmailScanJobCreate, EmailScanParams } from '../../types/email'
import LoadingButton from '../ui/LoadingButton'

interface EmailScanModalProps {
  isOpen: boolean
  onClose: () => void
  account: EmailAccount | null
  onSuccess?: (job: any) => void
}

const EmailScanModal: React.FC<EmailScanModalProps> = ({
  isOpen,
  onClose,
  account,
  onSuccess
}) => {
  // 根据账户同步状态设置默认参数
  const getDefaultDateFrom = () => {
    if (!account) return ''
    
    const isFirstSync = !account.sync_state || account.sync_state.sync_mode === 'never_synced'
    const date = new Date()
    
    if (isFirstSync) {
      // 首次同步：当年的1月1日
      date.setMonth(0) // 1月
      date.setDate(1)  // 1日
      date.setHours(0, 0, 0, 0) // 清零时间
    } else {
      // 增量同步：默认180天前
      date.setDate(date.getDate() - 180)
    }
    
    return date.toISOString().split('T')[0]
  }
  
  // 获取默认的最大邮件数量
  const getDefaultMaxEmails = () => {
    if (!account) return 1000
    
    const isFirstSync = !account.sync_state || account.sync_state.sync_mode === 'never_synced'
    // 首次同步不限制数量，增量同步限制100封
    return isFirstSync ? undefined : 100
  }

  const [scanParams, setScanParams] = useState<EmailScanParams>({
    folders: ['INBOX'],
    date_from: getDefaultDateFrom(),
    date_to: '',
    subject_keywords: ['发票'],
    exclude_keywords: [],
    sender_filters: [],
    max_emails: getDefaultMaxEmails(),
    download_attachments: true,
    attachment_types: ['.pdf', '.jpg', '.jpeg', '.png'],
    max_attachment_size: 10485760 // 10MB
  })

  const [description, setDescription] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const startEmailScan = useStartEmailScan()
  
  // 当账户变化时，更新默认参数
  React.useEffect(() => {
    if (account) {
      setScanParams(prev => ({
        ...prev,
        date_from: getDefaultDateFrom(),
        max_emails: getDefaultMaxEmails()
      }))
      
      const isFirstSync = !account.sync_state || account.sync_state.sync_mode === 'never_synced'
      setDescription(isFirstSync ? '初次同步' : '增量同步')
    }
  }, [account])

  // 重置表单
  const resetForm = () => {
    setScanParams({
      folders: ['INBOX'],
      date_from: '',
      date_to: '',
      subject_keywords: ['发票', 'invoice', '账单', 'bill'],
      exclude_keywords: [],
      sender_filters: [],
      max_emails: 1000,
      download_attachments: true,
      attachment_types: ['.pdf', '.jpg', '.jpeg', '.png'],
      max_attachment_size: 10485760
    })
    setDescription('')
    setShowAdvanced(false)
  }

  // 提交扫描任务
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!account) return
    
    // 根据同步状态决定任务类型
    const isFirstSync = !account.sync_state || account.sync_state.sync_mode === 'never_synced'
    const jobType = isFirstSync ? 'manual' : 'incremental'

    const scanData: EmailScanJobCreate = {
      email_account_id: account.id,
      job_type: jobType,
      scan_params: scanParams,
      description: description || `扫描 ${account.email_address}`
    }

    // 打印扫描参数以便调试
    console.log('📧 扫描任务参数:', {
      email_account_id: account.id,
      job_type: jobType,
      scan_params: {
        ...scanParams,
        date_from: scanParams.date_from || '未设置',
        date_to: scanParams.date_to || '未设置',
        subject_keywords: scanParams.subject_keywords,
        exclude_keywords: scanParams.exclude_keywords,
        sender_filters: scanParams.sender_filters
      }
    })

    try {
      const result = await startEmailScan.mutateAsync(scanData)
      onSuccess?.(result)
      onClose()
      resetForm()
    } catch (error) {
      // 错误已在hook中处理
    }
  }

  // 添加关键词
  const addKeyword = (keyword: string) => {
    if (keyword && !scanParams.subject_keywords.includes(keyword)) {
      setScanParams(prev => ({
        ...prev,
        subject_keywords: [...prev.subject_keywords, keyword]
      }))
    }
  }

  // 移除关键词
  const removeKeyword = (keyword: string) => {
    setScanParams(prev => ({
      ...prev,
      subject_keywords: prev.subject_keywords.filter(k => k !== keyword)
    }))
  }

  // 添加排除关键词
  const addExcludeKeyword = (keyword: string) => {
    if (keyword && !scanParams.exclude_keywords.includes(keyword)) {
      setScanParams(prev => ({
        ...prev,
        exclude_keywords: [...prev.exclude_keywords, keyword]
      }))
    }
  }

  // 移除排除关键词
  const removeExcludeKeyword = (keyword: string) => {
    setScanParams(prev => ({
      ...prev,
      exclude_keywords: prev.exclude_keywords.filter(k => k !== keyword)
    }))
  }

  // 添加发件人过滤
  const addSenderFilter = (sender: string) => {
    if (sender && !scanParams.sender_filters.includes(sender)) {
      setScanParams(prev => ({
        ...prev,
        sender_filters: [...prev.sender_filters, sender]
      }))
    }
  }

  // 移除发件人过滤
  const removeSenderFilter = (sender: string) => {
    setScanParams(prev => ({
      ...prev,
      sender_filters: prev.sender_filters.filter(s => s !== sender)
    }))
  }

  if (!isOpen || !account) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-3xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-lg">邮箱扫描设置</h3>
            <p className="text-base-content/70 text-sm">{account.email_address}</p>
          </div>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本设置 */}
          <div className="space-y-4">
            <h4 className="font-semibold">基本设置</h4>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">任务描述</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="给这次扫描任务起个名字"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">开始日期</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={scanParams.date_from}
                  onChange={(e) => setScanParams(prev => ({ ...prev, date_from: e.target.value }))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">结束日期</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={scanParams.date_to}
                  onChange={(e) => setScanParams(prev => ({ ...prev, date_to: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* 关键词设置 */}
          <div className="space-y-4">
            <h4 className="font-semibold">邮件过滤</h4>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">主题关键词</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {scanParams.subject_keywords.map((keyword) => (
                  <div key={keyword} className="badge badge-primary gap-1">
                    {keyword}
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => removeKeyword(keyword)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered input-sm flex-1"
                  placeholder="输入关键词后按回车添加"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addKeyword(e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">排除关键词（可选）</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {scanParams.exclude_keywords.map((keyword) => (
                  <div key={keyword} className="badge badge-error gap-1">
                    {keyword}
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => removeExcludeKeyword(keyword)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered input-sm flex-1"
                  placeholder="输入要排除的关键词后按回车添加"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addExcludeKeyword(e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                />
              </div>
              <label className="label">
                <span className="label-text-alt">包含这些关键词的邮件将被排除</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">发件人过滤（可选）</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {scanParams.sender_filters.map((sender) => (
                  <div key={sender} className="badge badge-secondary gap-1">
                    {sender}
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => removeSenderFilter(sender)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <input
                type="email"
                className="input input-bordered input-sm"
                placeholder="输入发件人邮箱后按回车添加"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSenderFilter(e.currentTarget.value)
                    e.currentTarget.value = ''
                  }
                }}
              />
              <label className="label">
                <span className="label-text-alt">留空表示不过滤发件人</span>
              </label>
            </div>
          </div>

          {/* 高级设置 */}
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">显示高级设置</span>
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
              <div className="form-control">
                <label className="label">
                  <span className="label-text">最大扫描邮件数</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={scanParams.max_emails || ''}
                  onChange={(e) => setScanParams(prev => ({ 
                    ...prev, 
                    max_emails: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  min="1"
                  max="10000"
                  placeholder="1000"
                />
                <label className="label">
                  <span className="label-text-alt">留空表示不限制数量</span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">扫描文件夹</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={scanParams.folders[0]}
                  onChange={(e) => setScanParams(prev => ({ ...prev, folders: [e.target.value] }))}
                >
                  <option value="INBOX">收件箱</option>
                  <option value="Sent">已发送</option>
                  <option value="Drafts">草稿箱</option>
                  <option value="All">全部邮件</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">下载附件</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={scanParams.download_attachments}
                    onChange={(e) => setScanParams(prev => ({ 
                      ...prev, 
                      download_attachments: e.target.checked 
                    }))}
                  />
                </label>
              </div>

              {scanParams.download_attachments && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">最大附件大小 (MB)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={Math.round(scanParams.max_attachment_size / 1048576)}
                    onChange={(e) => setScanParams(prev => ({ 
                      ...prev, 
                      max_attachment_size: parseInt(e.target.value) * 1048576 
                    }))}
                    min="1"
                    max="100"
                  />
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              取消
            </button>
            <LoadingButton
              type="submit"
              className="btn btn-primary"
              isLoading={startEmailScan.isPending}
            >
              开始扫描
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmailScanModal