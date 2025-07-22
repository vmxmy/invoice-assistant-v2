import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEmailAccounts, useEmailScanJobs, useCancelEmailScanJob } from '../hooks/useEmailAccounts'
import { EmailAccount } from '../types/email'
import Layout from '../components/layout/Layout'
import EmailAccountCard from '../components/email/EmailAccountCard'
import AddEmailAccountModal from '../components/modals/AddEmailAccountModal'
import EmailScanModal from '../components/modals/EmailScanModal'
import EmailScanResultsModal from '../components/email/EmailScanResultsModal'
import SkeletonLoader from '../components/ui/SkeletonLoader'
import { toast } from 'react-hot-toast'

const EmailAccountsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  // 状态管理
  const [showAddModal, setShowAddModal] = useState(false)
  const [showScanModal, setShowScanModal] = useState(false)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null)
  const [selectedScanJob, setSelectedScanJob] = useState<any>(null)
  const [showInactive, setShowInactive] = useState(false)

  // 数据获取
  const { data: accountsData, isLoading: accountsLoading, error: accountsError, refetch: refetchAccounts } = useEmailAccounts({
    is_active: showInactive ? undefined : true
  })
  const { data: scanJobsData, isLoading: scanJobsLoading, refetch: refetchScanJobs } = useEmailScanJobs({ limit: 10 })
  const cancelScanJob = useCancelEmailScanJob()

  const accounts = accountsData?.items || []
  const scanJobs = scanJobsData?.items || []
  
  // 调试日志
  React.useEffect(() => {
    if (accountsData) {
      console.log('📊 EmailAccountsPage - accountsData:', accountsData)
      console.log('📊 EmailAccountsPage - accounts:', accounts)
    }
    if (scanJobsData) {
      console.log('📊 EmailAccountsPage - scanJobsData:', scanJobsData)
      console.log('📊 EmailAccountsPage - scanJobs:', scanJobs)
    }
  }, [accountsData, accounts, scanJobsData, scanJobs])

  // 处理编辑账户
  const handleEditAccount = (account: EmailAccount) => {
    setSelectedAccount(account)
    setShowAddModal(true) // 重用添加模态框进行编辑
  }

  // 处理扫描账户
  const handleScanAccount = (account: EmailAccount) => {
    setSelectedAccount(account)
    setShowScanModal(true)
  }

  // 处理添加账户成功
  const handleAddSuccess = () => {
    // 数据会通过React Query自动更新
    refetchAccounts()
  }

  // 处理扫描成功
  const handleScanSuccess = () => {
    // 可以导航到扫描任务页面
    navigate('/settings/email-scan-jobs')
  }

  // 获取活跃的扫描任务数量
  const getActiveScanJobsCount = () => {
    return scanJobs.filter(job => job.status === 'running' || job.status === 'pending').length
  }

  // 处理取消扫描任务
  const handleCancelScanJob = async (jobId: string, force: boolean = false) => {
    const action = force ? '强制停止' : '取消'
    const confirmMessage = force 
      ? '确定要强制停止此扫描任务吗？这可能会导致部分数据未保存。' 
      : '确定要取消此扫描任务吗？'
    
    if (confirm(confirmMessage)) {
      try {
        await cancelScanJob.mutateAsync({ jobId, force })
        toast.success(`扫描任务已${action}`)
        refetchScanJobs()
      } catch (error) {
        toast.error(`${action}扫描任务失败`)
      }
    }
  }

  // 渲染空状态
  const renderEmptyState = () => (
    <div className="card bg-base-100 shadow-lg border border-base-200 p-8 text-center">
      <div className="mb-4">
        <svg className="w-24 h-24 mx-auto text-base-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">暂无邮箱账户</h3>
      <p className="text-base-content/60 mb-4">
        添加邮箱账户以自动扫描和导入发票
      </p>
      <button 
        className="btn btn-primary"
        onClick={() => setShowAddModal(true)}
      >
        添加第一个邮箱账户
      </button>
    </div>
  )

  // 渲染账户列表
  const renderAccountsList = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {accounts.map((account) => (
        <EmailAccountCard
          key={account.id}
          account={account}
          onEdit={handleEditAccount}
          onScan={handleScanAccount}
        />
      ))}
    </div>
  )

  // 渲染加载状态
  const renderLoadingState = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, index) => (
        <SkeletonLoader key={index} className="h-64 rounded-lg" />
      ))}
    </div>
  )

  return (
    <Layout title="邮箱配置管理">
      <div className="min-h-screen bg-base-200/40">
        <div className="container mx-auto p-4 max-w-7xl space-y-6">
          {/* 页面头部区域 */}
          <div className="bg-base-100 rounded-lg shadow-soft p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-base-content">邮箱配置管理</h1>
                <p className="text-base-content/70 mt-2">
                  {accounts.length > 0 && (
                    <span className="inline-flex items-center gap-2">
                      <span className="badge badge-neutral badge-sm">
                        共 {accounts.length} 个邮箱账户
                      </span>
                      {getActiveScanJobsCount() > 0 && (
                        <span className="badge badge-info badge-sm">
                          {getActiveScanJobsCount()} 个扫描任务进行中
                        </span>
                      )}
                    </span>
                  )}
                  {accounts.length === 0 && '添加邮箱账户以自动扫描和导入发票'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {accounts.length > 0 && (
                  <div className="form-control">
                    <label className="label cursor-pointer gap-2">
                      <span className="label-text text-sm">显示已停用</span>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                      />
                    </label>
                  </div>
                )}
                
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={() => refetchAccounts()}
                  disabled={accountsLoading}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  刷新
                </button>
                
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowAddModal(true)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  添加邮箱账户
                </button>
              </div>
            </div>
          </div>

          {/* 错误状态 */}
          {accountsError && (
            <div className="alert alert-error shadow-soft">
              <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>加载邮箱账户失败，请刷新页面重试</span>
            </div>
          )}

          {/* 邮箱账户列表区域 */}
          <div className="bg-base-100 rounded-lg shadow-soft p-6">
            <h2 className="text-xl font-semibold mb-4">邮箱账户列表</h2>
            {accountsLoading ? (
              renderLoadingState()
            ) : accounts.length === 0 ? (
              renderEmptyState()
            ) : (
              renderAccountsList()
            )}
          </div>

          {/* 扫描任务快速状态 */}
          {scanJobs.length > 0 && (
            <div className="bg-base-100 rounded-lg shadow-soft p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">最近扫描任务</h2>
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => navigate('/settings/email-scan-jobs')}
                >
                  查看全部
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scanJobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="card bg-base-200/20 border border-base-200/50 compact hover:shadow-md transition-shadow">
                    <div className="card-body">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{job.description || `任务 ${job.job_id.slice(0, 8)}`}</p>
                          <p className="text-xs text-base-content/50">{new Date(job.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`badge badge-sm ${
                            job.status === 'completed' ? 'badge-success' :
                            job.status === 'failed' ? 'badge-error' :
                            job.status === 'running' ? 'badge-warning' :
                            'badge-info'
                          }`}>
                            {job.status}
                          </div>
                          {/* 为运行中的任务添加操作菜单 */}
                          {(job.status === 'running' || job.status === 'pending') && (
                            <div className="dropdown dropdown-end">
                              <label tabIndex={0} className="btn btn-ghost btn-xs">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </label>
                              <ul tabIndex={0} className="dropdown-content z-[10] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-200/50">
                                <li>
                                  <a onClick={() => handleCancelScanJob(job.job_id, false)}>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    取消任务
                                  </a>
                                </li>
                                <li className="text-error">
                                  <a onClick={() => handleCancelScanJob(job.job_id, true)}>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    强制停止
                                  </a>
                                </li>
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 已完成任务的查看结果按钮 */}
                      {job.status === 'completed' && job.scan_results?.emails && (
                        <button
                          onClick={() => {
                            setSelectedScanJob(job)
                            setShowResultsModal(true)
                          }}
                          className="btn btn-sm btn-primary btn-outline mt-2 w-full"
                        >
                          查看结果并处理
                        </button>
                      )}
                      
                      {/* 任务完成统计信息 */}
                      {(job.status === 'completed' || job.status === 'running') && (
                        <div className="mt-3 space-y-1">
                          {job.scanned_emails !== undefined && (
                            <div className="flex justify-between text-xs">
                              <span className="text-base-content/70">扫描邮件:</span>
                              <span className="font-medium">{job.scanned_emails}</span>
                            </div>
                          )}
                          {job.matched_emails !== undefined && (
                            <div className="flex justify-between text-xs">
                              <span className="text-base-content/70">有效邮件:</span>
                              <span className="font-medium">{job.matched_emails}</span>
                            </div>
                          )}
                          {job.downloaded_attachments !== undefined && (
                            <div className="flex justify-between text-xs">
                              <span className="text-base-content/70">PDF附件:</span>
                              <span className="font-medium">{job.downloaded_attachments}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {job.status === 'running' && job.progress !== undefined && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>进度</span>
                            <span>{job.progress}%</span>
                          </div>
                          <progress className="progress progress-primary w-full" value={job.progress} max="100"></progress>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 配置指南区域 */}
          <div className="bg-base-100 rounded-lg shadow-soft p-6">
            <div className="collapse collapse-arrow border-0">
              <input type="checkbox" />
              <div className="collapse-title text-lg font-medium px-0">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  邮箱配置指南
                </div>
              </div>
              <div className="collapse-content px-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-4">
                    <div className="p-4 bg-base-200/30 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M20 18h-2V9.25L12 13L6 9.25V18H4V6h1.2l6.8 4.25L18.8 6H20m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/>
                        </svg>
                        Gmail 配置指南
                      </h4>
                      <ol className="text-sm text-base-content/70 space-y-1 list-decimal list-inside">
                        <li>启用两步验证</li>
                        <li>生成应用专用密码</li>
                        <li>使用应用密码而非登录密码</li>
                      </ol>
                    </div>
                    <div className="p-4 bg-base-200/30 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M3,3H21A2,2 0 0,1 23,5V19A2,2 0 0,1 21,21H3A2,2 0 0,1 1,19V5A2,2 0 0,1 3,3M19,17V7L12,11L5,7V17H19Z"/>
                        </svg>
                        163邮箱IMAP设置
                      </h4>
                      <ol className="text-sm text-base-content/70 space-y-1 list-decimal list-inside">
                        <li>登录 163 邮箱</li>
                        <li>设置 → POP3/SMTP/IMAP</li>
                        <li>开启服务并获取授权密码</li>
                      </ol>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-base-200/30 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,7.33C14.58,7.33 16.67,9.42 16.67,12C16.67,14.58 14.58,16.67 12,16.67C9.42,16.67 7.33,14.58 7.33,12C7.33,9.42 9.42,7.33 12,7.33Z"/>
                        </svg>
                        QQ邮箱授权码获取方法
                      </h4>
                      <ol className="text-sm text-base-content/70 space-y-1 list-decimal list-inside">
                        <li>登录 QQ 邮箱网页版</li>
                        <li>进入设置 → 账户</li>
                        <li>开启 POP3/SMTP 服务并生成授权码</li>
                      </ol>
                    </div>
                    <div className="p-4 bg-base-200/30 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M21.8,8.001c0,0-0.195-1.378-0.795-1.985c-0.76-0.797-1.613-0.801-2.004-0.847 c-2.799-0.202-6.997-0.202-6.997-0.202h-0.009c0,0-4.198,0-6.997,0.202C4.608,5.216,3.756,5.22,2.995,6.016 c-0.6,0.607-0.795,1.985-0.795,1.985S2,9.62,2,11.238v1.517c0,1.618,0.2,3.237,0.2,3.237s0.195,1.378,0.795,1.985 c0.761,0.797,1.76,0.771,2.205,0.855c1.6,0.153,6.8,0.201,6.8,0.201s4.203-0.006,7.001-0.209c0.391-0.047,1.243-0.051,2.004-0.847 c0.6-0.607,0.795-1.985,0.795-1.985s0.2-1.618,0.2-3.237v-1.517C22,9.62,21.8,8.001,21.8,8.001z M9.935,14.594l-0.001-5.62 l5.404,2.82L9.935,14.594z"/>
                        </svg>
                        Outlook/Hotmail 配置
                      </h4>
                      <ol className="text-sm text-base-content/70 space-y-1 list-decimal list-inside">
                        <li>启用两步验证</li>
                        <li>生成应用密码</li>
                        <li>配置IMAP: outlook.office365.com:993</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 模态框 */}
        <AddEmailAccountModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false)
            setSelectedAccount(null)
          }}
          onSuccess={handleAddSuccess}
        />

        <EmailScanModal
          isOpen={showScanModal}
          onClose={() => {
            setShowScanModal(false)
            setSelectedAccount(null)
          }}
          account={selectedAccount}
          onSuccess={handleScanSuccess}
        />

        <EmailScanResultsModal
          isOpen={showResultsModal}
          onClose={() => {
            setShowResultsModal(false)
            setSelectedScanJob(null)
          }}
          scanJob={selectedScanJob}
          onProcessComplete={() => {
            // 刷新发票列表页面或显示成功提示
            toast.success('批量处理完成')
            setShowResultsModal(false)
            setSelectedScanJob(null)
          }}
        />
      </div>
    </Layout>
  )
}

export default EmailAccountsPage