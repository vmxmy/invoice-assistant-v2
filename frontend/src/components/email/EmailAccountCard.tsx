import React, { useState } from 'react'
import {
  useDeleteEmailAccount,
  useTestEmailConnection,
  useUpdateEmailAccount,
  useCreateEmailScanJob,
  useResetSyncState,
  useResetAccountData
} from '../../hooks/useEmailAccounts'
import { EmailAccount, EmailScanJobCreate } from '../../types/email'
import LoadingButton from '../ui/LoadingButton'
import AccountStatusBadge from '../ui/AccountStatusBadge'

interface EmailAccountCardProps {
  account: EmailAccount
  onEdit?: (account: EmailAccount) => void
  onScan?: (account: EmailAccount) => void
  onSmartScan?: (account: EmailAccount) => void
}

const EmailAccountCard: React.FC<EmailAccountCardProps> = ({ account, onEdit, onScan, onSmartScan }) => {
  const [showScanOptions, setShowScanOptions] = useState(false)

  const deleteMutation = useDeleteEmailAccount()
  const testMutation = useTestEmailConnection()
  const updateMutation = useUpdateEmailAccount()
  const createScanJobMutation = useCreateEmailScanJob()
  const resetSyncMutation = useResetSyncState()
  const resetAccountMutation = useResetAccountData()

  // 删除账户
  const handleDelete = async () => {
    if (window.confirm(`确定要删除邮箱账户 "${account.email_address}" 吗？`)) {
      try {
        await deleteMutation.mutateAsync(account.id)
      } catch (error) {
        // 错误已在hook中处理
      }
    }
  }

  // 测试连接
  const handleTestConnection = async () => {
    try {
      const result = await testMutation.mutateAsync({ id: account.id })
      // 测试结果会在hook中记录日志
    } catch (error) {
      // 错误已在hook中处理
    }
  }

  // 切换启用状态
  const handleToggleActive = async () => {
    try {
      await updateMutation.mutateAsync({
        id: account.id,
        data: { is_active: !account.is_active }
      })
    } catch (error) {
      // 错误已在hook中处理
    }
  }

  // 初始化同步
  const handleInitSync = async () => {
    if (!window.confirm('确定要重置同步状态吗？这将删除所有已同步的邮件记录（不影响实际邮箱），并重新开始初次同步。')) {
      return
    }

    try {
      // 先重置同步状态
      await resetSyncMutation.mutateAsync(account.id)

      // 等待一下，确保状态已重置
      await new Promise(resolve => setTimeout(resolve, 500))

      // 然后开始初次同步
      const dateFrom = new Date()
      dateFrom.setMonth(0) // 1月
      dateFrom.setDate(1)  // 1日
      dateFrom.setHours(0, 0, 0, 0) // 清零时间

      const scanData: EmailScanJobCreate = {
        email_account_id: account.id,
        job_type: 'manual',
        scan_params: {
          folders: ['INBOX'],
          date_from: dateFrom.toISOString().split('T')[0], // YYYY-MM-DD 格式
          subject_keywords: ['发票'], // 只检测中文"发票"
          exclude_keywords: [],
          sender_filters: [],
          max_emails: undefined, // 首次同步不限制数量
          download_attachments: true,
          attachment_types: ['.pdf', '.jpg', '.jpeg', '.png'],
          max_attachment_size: 10485760, // 10MB
        },
        description: '初始化同步'
      }

      await createScanJobMutation.mutateAsync(scanData)
      setShowScanOptions(false)
    } catch (error) {
      // 错误已在hook中处理
    }
  }

  // 重置账户
  const handleResetAccount = async () => {
    const confirmed = window.confirm(
      `确定要重置账户 "${account.email_address}" 的所有数据吗？\n\n` +
      '这将删除：\n' +
      '• 所有邮件索引记录\n' +
      '• 所有扫描任务历史\n' +
      '• 所有处理任务记录\n' +
      '• 所有同步状态信息\n\n' +
      '此操作不可恢复！'
    )

    if (!confirmed) return

    try {
      await resetAccountMutation.mutateAsync(account.id)
    } catch (error) {
      // 错误已在hook中处理
    }
  }

  // 获取连接状态显示
  const getConnectionStatus = () => {
    if (testMutation.isPending) {
      return <span className="loading loading-spinner loading-xs"></span>
    }

    if (account.is_verified) {
      return <span className="text-success">✓ 连接正常</span>
    } else if (account.last_error) {
      return <span className="text-error">✗ 连接失败</span>
    } else {
      return <span className="text-base-content/50">未测试</span>
    }
  }

  // 格式化最后扫描时间
  const formatLastScanTime = (dateString?: string) => {
    if (!dateString) return '从未扫描'

    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return '刚刚扫描'
    if (diffInHours < 24) return `${diffInHours}小时前`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}天前`
    return date.toLocaleDateString()
  }

  return (
    <div className="card-interactive">
      <div className="card-body">
        {/* 头部信息 */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="card-title text-lg">
                {account.display_name || account.email_address}
              </h3>
              <AccountStatusBadge
                isActive={account.is_active}
                isVerified={account.is_verified}
                lastError={account.last_error}
              />
            </div>

            {account.display_name && (
              <p className="text-base-content/70 text-sm">{account.email_address}</p>
            )}

            <div className="text-xs text-base-content/50 mt-1">
              {account.imap_host}:{account.imap_port} {account.imap_use_ssl ? '(SSL)' : ''}
            </div>
          </div>

          {/* 操作菜单 */}
          <div className="dropdown dropdown-end">
            <button
              tabIndex={0}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
              </svg>
            </button>
            <ul tabIndex={0} className="dropdown-content z-[10] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-200/50">
              <li>
                <button onClick={() => onEdit?.(account)}>
                  编辑配置
                </button>
              </li>
              <li>
                <LoadingButton
                  variant="ghost"
                  className="justify-start w-full text-left"
                  isLoading={testMutation.isPending}
                  onClick={handleTestConnection}
                >
                  测试连接
                </LoadingButton>
              </li>
              <li>
                <button
                  onClick={handleToggleActive}
                  className={account.is_active ? 'text-warning' : 'text-success'}
                >
                  {account.is_active ? '停用账户' : '启用账户'}
                </button>
              </li>
              <li className="border-t pt-1 mt-1">
                <LoadingButton
                  variant="ghost"
                  className="justify-start w-full text-left text-error"
                  isLoading={resetAccountMutation.isPending}
                  onClick={handleResetAccount}
                >
                  重置账户
                </LoadingButton>
              </li>
              <li>
                <button
                  onClick={handleDelete}
                  className="text-error"
                  disabled={deleteMutation.isPending}
                >
                  删除账户
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* 状态信息 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-base-content/50">连接状态：</span>
            <div>{getConnectionStatus()}</div>
          </div>
          <div>
            <span className="text-base-content/50">同步状态：</span>
            <div>
              {!account.sync_state || account.sync_state.sync_mode === 'never_synced' ? (
                <span className="text-warning">未同步</span>
              ) : account.sync_state.is_synced ? (
                <span className="text-success">已同步 ({account.sync_state.total_emails_indexed} 封邮件)</span>
              ) : (
                <span className="text-info">同步中</span>
              )}
            </div>
          </div>
        </div>

        {/* 扫描配置信息 */}
        {account.scan_config && (
          <div className="mt-3 p-3 card-level-2">
            <div className="flex items-center justify-between text-sm">
              <span>自动扫描：{account.scan_config.auto_scan ? '已启用' : '已禁用'}</span>
              {account.scan_config.auto_scan && (
                <span className="text-base-content/50">
                  每{Math.floor(account.scan_config.scan_interval / 3600)}小时
                </span>
              )}
            </div>
            <div className="text-xs text-base-content/50 mt-1">
              关键词：{account.scan_config.keywords.join(', ')}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="card-actions justify-end mt-4">
          {account.is_active && (
            <>
              {/* 扫描选项 */}
              {showScanOptions ? (
                <div className="flex gap-2 flex-wrap">
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setShowScanOptions(false)}
                  >
                    取消
                  </button>
                  <LoadingButton
                    className="btn btn-sm btn-outline btn-secondary"
                    isLoading={createScanJobMutation.isPending || resetSyncMutation.isPending}
                    onClick={handleInitSync}
                  >
                    初始化同步
                  </LoadingButton>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => { onSmartScan?.(account); setShowScanOptions(false); }}
                  >
                    🚀 增量扫描
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setShowScanOptions(true)}
                >
                  开始扫描
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmailAccountCard