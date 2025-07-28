import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { 
  useEmailScanJobs, 
  useCancelEmailScanJob, 
  useRetryEmailScanJob,
  useDeleteEmailScanJob 
} from '../hooks/useEmailAccounts'
import Layout from '../components/layout/Layout'
import SkeletonLoader from '../components/ui/SkeletonLoader'
import EmailScanResultsModal from '../components/email/EmailScanResultsModal'
import { toast } from 'react-hot-toast'

const EmailScanJobsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  
  // 状态管理
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [selectedScanJob, setSelectedScanJob] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // 数据获取
  const { 
    data: scanJobsData, 
    isLoading: scanJobsLoading, 
    error: scanJobsError, 
    refetch: refetchScanJobs 
  } = useEmailScanJobs({ 
    skip: (currentPage - 1) * pageSize,
    limit: pageSize,
    status: statusFilter || undefined
  })

  const cancelScanJob = useCancelEmailScanJob()
  const retryScanJob = useRetryEmailScanJob()
  const deleteScanJob = useDeleteEmailScanJob()

  const scanJobs = scanJobsData?.items || []
  const totalJobs = scanJobsData?.total || 0

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

  // 处理重试扫描任务
  const handleRetryScanJob = async (jobId: string) => {
    if (confirm('确定要重试此扫描任务吗？')) {
      try {
        await retryScanJob.mutateAsync(jobId)
        toast.success('扫描任务已重新开始')
        refetchScanJobs()
      } catch (error) {
        toast.error('重试扫描任务失败')
      }
    }
  }

  // 处理删除扫描任务
  const handleDeleteScanJob = async (jobId: string) => {
    if (confirm('确定要删除此扫描任务吗？删除后无法恢复。')) {
      try {
        await deleteScanJob.mutateAsync(jobId)
        toast.success('扫描任务已删除')
        refetchScanJobs()
      } catch (error) {
        toast.error('删除扫描任务失败')
      }
    }
  }

  // 获取状态显示信息
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { badge: 'badge-success', text: '已完成', icon: '✓' }
      case 'failed':
        return { badge: 'badge-error', text: '失败', icon: '✗' }
      case 'running':
        return { badge: 'badge-warning', text: '运行中', icon: '🔄' }
      case 'pending':
        return { badge: 'badge-info', text: '等待中', icon: '⏳' }
      case 'cancelled':
        return { badge: 'badge-neutral', text: '已取消', icon: '⏹' }
      default:
        return { badge: 'badge-ghost', text: status, icon: '?' }
    }
  }

  // 格式化时间
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // 计算持续时间
  const calculateDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const diffMs = end.getTime() - start.getTime()
    
    if (diffMs < 1000) return '< 1秒'
    if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}秒`
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}分${Math.floor((diffMs % 60000) / 1000)}秒`
    
    const hours = Math.floor(diffMs / 3600000)
    const minutes = Math.floor((diffMs % 3600000) / 60000)
    return `${hours}时${minutes}分`
  }

  // 渲染任务操作按钮
  const renderJobActions = (job: any) => {
    const canCancel = job.status === 'running' || job.status === 'pending'
    const canRetry = job.status === 'failed'
    const canDelete = job.status !== 'running'
    const canViewResults = job.status === 'completed' && job.scan_results?.emails

    return (
      <div className="flex items-center gap-2">
        {canViewResults && (
          <button
            onClick={() => {
              setSelectedScanJob(job)
              setShowResultsModal(true)
            }}
            className="btn btn-sm btn-primary btn-outline"
            title="查看扫描结果"
          >
            查看结果
          </button>
        )}
        
        {canCancel && (
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-sm btn-warning btn-outline">
              取消
            </label>
            <ul tabIndex={0} className="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 rounded-box w-40 border border-base-200">
              <li>
                <a onClick={() => handleCancelScanJob(job.job_id, false)}>
                  正常取消
                </a>
              </li>
              <li className="text-error">
                <a onClick={() => handleCancelScanJob(job.job_id, true)}>
                  强制停止
                </a>
              </li>
            </ul>
          </div>
        )}
        
        {canRetry && (
          <button
            onClick={() => handleRetryScanJob(job.job_id)}
            className="btn btn-sm btn-info btn-outline"
            title="重试任务"
          >
            重试
          </button>
        )}
        
        {canDelete && (
          <button
            onClick={() => handleDeleteScanJob(job.job_id)}
            className="btn btn-sm btn-error btn-outline"
            title="删除任务"
          >
            删除
          </button>
        )}
      </div>
    )
  }

  // 渲染任务列表
  const renderJobsList = () => {
    if (scanJobsLoading) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <SkeletonLoader key={index} className="h-32 rounded-lg" />
          ))}
        </div>
      )
    }

    if (scanJobs.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold mb-2">暂无扫描任务</h3>
          <p className="text-base-content/60 mb-6">
            {statusFilter ? `没有找到状态为"${statusFilter}"的扫描任务` : '还没有创建任何扫描任务'}
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/settings/email-accounts')}
          >
            去创建扫描任务
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {scanJobs.map((job) => {
          const statusInfo = getStatusInfo(job.status)
          
          return (
            <div key={job.id} className="card bg-base-100 shadow-sm border border-base-200/50 hover:shadow-md transition-shadow">
              <div className="card-body">
                {/* 任务头部信息 */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {job.description || `扫描任务 ${job.job_id.slice(0, 8)}`}
                      </h3>
                      <div className={`badge ${statusInfo.badge} gap-1`}>
                        <span>{statusInfo.icon}</span>
                        {statusInfo.text}
                      </div>
                      <div className="badge badge-outline badge-sm">
                        {job.job_type === 'full' ? '全量扫描' : '增量扫描'}
                      </div>
                    </div>
                    <div className="text-sm text-base-content/60 space-y-1">
                      <div>任务ID: {job.job_id}</div>
                      <div>创建时间: {formatTime(job.created_at)}</div>
                      {job.started_at && (
                        <div>开始时间: {formatTime(job.started_at)}</div>
                      )}
                      {job.completed_at && (
                        <div>
                          完成时间: {formatTime(job.completed_at)}
                          <span className="ml-2 text-primary">
                            (耗时: {calculateDuration(job.started_at || job.created_at, job.completed_at)})
                          </span>
                        </div>
                      )}
                      {job.status === 'running' && job.started_at && (
                        <div className="text-warning">
                          运行时长: {calculateDuration(job.started_at)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    {renderJobActions(job)}
                  </div>
                </div>

                {/* 进度信息 */}
                {job.status === 'running' && job.progress !== undefined && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>执行进度</span>
                      <span>{job.progress}%</span>
                    </div>
                    <progress className="progress progress-primary w-full" value={job.progress} max="100"></progress>
                    {job.current_step && (
                      <div className="text-xs text-base-content/60 mt-1">
                        当前步骤: {job.current_step}
                      </div>
                    )}
                  </div>
                )}

                {/* 统计信息 */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                  {job.total_emails !== undefined && (
                    <div className="stat-item">
                      <div className="text-base-content/60">总邮件数</div>
                      <div className="font-semibold">{job.total_emails.toLocaleString()}</div>
                    </div>
                  )}
                  {job.scanned_emails !== undefined && (
                    <div className="stat-item">
                      <div className="text-base-content/60">已扫描</div>
                      <div className="font-semibold">{job.scanned_emails.toLocaleString()}</div>
                    </div>
                  )}
                  {job.matched_emails !== undefined && (
                    <div className="stat-item">
                      <div className="text-base-content/60">匹配邮件</div>
                      <div className="font-semibold">{job.matched_emails.toLocaleString()}</div>
                    </div>
                  )}
                  {job.downloaded_attachments !== undefined && (
                    <div className="stat-item">
                      <div className="text-base-content/60">PDF附件</div>
                      <div className="font-semibold">{job.downloaded_attachments.toLocaleString()}</div>
                    </div>
                  )}
                  {job.processed_invoices !== undefined && (
                    <div className="stat-item">
                      <div className="text-base-content/60">处理发票</div>
                      <div className="font-semibold">{job.processed_invoices.toLocaleString()}</div>
                    </div>
                  )}
                </div>

                {/* 错误信息 */}
                {job.error_message && (
                  <div className="alert alert-error mt-4">
                    <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">{job.error_message}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Layout title="扫描任务管理">
      <div className="min-h-screen bg-base-200/40">
        <div className="container mx-auto p-4 max-w-7xl space-y-6">
          {/* 页面头部 */}
          <div className="bg-base-100 rounded-lg shadow-soft p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-base-content">扫描任务管理</h1>
                <p className="text-base-content/70 mt-2">
                  查看和管理所有邮箱扫描任务的执行状态和结果
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={() => refetchScanJobs()}
                  disabled={scanJobsLoading}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  刷新
                </button>
                
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/settings/email-accounts')}
                >
                  创建扫描任务
                </button>
              </div>
            </div>
          </div>

          {/* 筛选器 */}
          <div className="bg-base-100 rounded-lg shadow-soft p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">状态筛选</span>
                </label>
                <select 
                  className="select select-bordered select-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">全部状态</option>
                  <option value="running">运行中</option>
                  <option value="pending">等待中</option>
                  <option value="completed">已完成</option>
                  <option value="failed">失败</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-base-content/60">
                <span>共 {totalJobs} 个任务</span>
                {statusFilter && (
                  <span>• 当前筛选: {scanJobs.length} 个</span>
                )}
              </div>
            </div>
          </div>

          {/* 错误状态 */}
          {scanJobsError && (
            <div className="alert alert-error shadow-soft">
              <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>加载扫描任务失败，请刷新页面重试</span>
            </div>
          )}

          {/* 任务列表 */}
          <div className="bg-base-100 rounded-lg shadow-soft p-6">
            <h2 className="text-xl font-semibold mb-4">任务列表</h2>
            {renderJobsList()}
          </div>

          {/* 分页 */}
          {totalJobs > pageSize && (
            <div className="bg-base-100 rounded-lg shadow-soft p-4">
              <div className="flex justify-center">
                <div className="join">
                  <button 
                    className="join-item btn btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    上一页
                  </button>
                  <button className="join-item btn btn-sm btn-active">
                    第 {currentPage} 页
                  </button>
                  <button 
                    className="join-item btn btn-sm"
                    disabled={currentPage * pageSize >= totalJobs}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 扫描结果模态框 */}
        <EmailScanResultsModal
          isOpen={showResultsModal}
          onClose={() => {
            setShowResultsModal(false)
            setSelectedScanJob(null)
          }}
          scanJob={selectedScanJob}
          onProcessComplete={() => {
            toast.success('批量处理完成')
            setShowResultsModal(false)
            setSelectedScanJob(null)
          }}
        />
      </div>
    </Layout>
  )
}

export default EmailScanJobsPage