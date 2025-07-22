import React, { useState, useEffect } from 'react'
import { EmailScanJob } from '../../types/email'
import { api } from '../../services/apiClient'
import LoadingButton from '../ui/LoadingButton'
import { toast } from 'react-hot-toast'

interface EmailScanResultsModalProps {
  isOpen: boolean
  onClose: () => void
  scanJob: EmailScanJob | null
  onProcessComplete?: () => void
}

interface EmailResult {
  uid: number
  subject: string
  from: string
  date: string
  has_attachments: boolean
  attachment_names: string[]
  selected?: boolean
}

interface ProcessingStatus {
  isProcessing: boolean
  progress: number
  total: number
  currentEmail?: string
  results: any[]
}

const EmailScanResultsModal: React.FC<EmailScanResultsModalProps> = ({
  isOpen,
  onClose,
  scanJob,
  onProcessComplete
}) => {
  const [emails, setEmails] = useState<EmailResult[]>([])
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set())
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    progress: 0,
    total: 0,
    results: []
  })
  const [autoCreateInvoice, setAutoCreateInvoice] = useState(true)
  const [continueOnError, setContinueOnError] = useState(true)

  // 解析扫描结果
  useEffect(() => {
    if (scanJob?.scan_results?.emails) {
      const emailList = scanJob.scan_results.emails.map((email: any) => ({
        ...email,
        selected: email.has_attachments // 默认选中有附件的邮件
      }))
      setEmails(emailList)
      
      // 自动选中有附件的邮件
      const defaultSelected = new Set(
        emailList
          .filter((email: EmailResult) => email.has_attachments)
          .map((email: EmailResult) => email.uid)
      )
      setSelectedEmails(defaultSelected)
    }
  }, [scanJob])

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmails(new Set(emails.map(e => e.uid)))
    } else {
      setSelectedEmails(new Set())
    }
  }

  // 选择单个邮件
  const handleSelectEmail = (uid: number, checked: boolean) => {
    const newSelected = new Set(selectedEmails)
    if (checked) {
      newSelected.add(uid)
    } else {
      newSelected.delete(uid)
    }
    setSelectedEmails(newSelected)
  }

  // 批量处理选中的邮件
  const handleBatchProcess = async () => {
    if (selectedEmails.size === 0) {
      toast.error('请至少选择一封邮件')
      return
    }

    setProcessingStatus({
      isProcessing: true,
      progress: 0,
      total: selectedEmails.size,
      results: []
    })

    try {
      // 准备批量处理请求
      const selectedEmailList = emails.filter(e => selectedEmails.has(e.uid))
      const batchRequest = {
        emails: selectedEmailList.map(email => ({
          account_id: scanJob?.email_account_id,
          uid: email.uid,
          subject: email.subject
        })),
        auto_create_invoice: autoCreateInvoice,
        continue_on_error: continueOnError
      }

      // 调用批量处理API
      const response = await api.emailProcessing.batchProcess(batchRequest)
      
      if (response.data) {
        const results = response.data.results
        
        // 更新处理状态
        setProcessingStatus({
          isProcessing: false,
          progress: 100,
          total: results.length,
          results: results
        })

        // 显示处理结果
        const successCount = results.filter((r: any) => r.status === 'success').length
        const failedCount = results.filter((r: any) => r.status === 'failed').length
        
        if (successCount > 0) {
          toast.success(`成功处理 ${successCount} 封邮件`)
        }
        if (failedCount > 0) {
          toast.error(`${failedCount} 封邮件处理失败`)
        }

        // 通知父组件处理完成
        if (onProcessComplete) {
          onProcessComplete()
        }
      } else {
        toast.error('批量处理失败')
      }
    } catch (error: any) {
      console.error('批量处理错误:', error)
      toast.error(error.message || '批量处理失败')
      setProcessingStatus(prev => ({ ...prev, isProcessing: false }))
    }
  }

  if (!isOpen || !scanJob) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-6xl">
        <h3 className="font-bold text-lg mb-4">
          扫描结果 - {scanJob.scan_results?.matched_emails || 0} 封匹配的邮件
        </h3>

        {/* 处理选项 */}
        <div className="bg-base-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <label className="label cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm mr-2"
                  checked={selectedEmails.size === emails.length && emails.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                <span className="label-text">全选</span>
              </label>
              <span className="text-sm text-base-content/70">
                已选择 {selectedEmails.size} / {emails.length} 封邮件
              </span>
            </div>
            <div className="flex items-center gap-4">
              <label className="label cursor-pointer">
                <span className="label-text mr-2">自动创建发票</span>
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={autoCreateInvoice}
                  onChange={(e) => setAutoCreateInvoice(e.target.checked)}
                />
              </label>
              <label className="label cursor-pointer">
                <span className="label-text mr-2">出错继续</span>
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={continueOnError}
                  onChange={(e) => setContinueOnError(e.target.checked)}
                />
              </label>
            </div>
          </div>
        </div>

        {/* 邮件列表 */}
        <div className="overflow-x-auto max-h-96">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>选择</th>
                <th>主题</th>
                <th>发件人</th>
                <th>日期</th>
                <th>附件</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <tr key={email.uid} className={selectedEmails.has(email.uid) ? 'active' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={selectedEmails.has(email.uid)}
                      onChange={(e) => handleSelectEmail(email.uid, e.target.checked)}
                    />
                  </td>
                  <td className="max-w-xs truncate">{email.subject}</td>
                  <td className="max-w-xs truncate">{email.from}</td>
                  <td>{new Date(email.date).toLocaleDateString()}</td>
                  <td>
                    {email.has_attachments ? (
                      <div className="tooltip" data-tip={email.attachment_names.join(', ')}>
                        <span className="badge badge-primary badge-sm">
                          {email.attachment_names.length} 个附件
                        </span>
                      </div>
                    ) : (
                      <span className="text-base-content/50">无附件</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 处理进度 */}
        {processingStatus.isProcessing && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>处理进度</span>
              <span>{processingStatus.progress}/{processingStatus.total}</span>
            </div>
            <progress 
              className="progress progress-primary w-full" 
              value={processingStatus.progress} 
              max={processingStatus.total}
            ></progress>
            {processingStatus.currentEmail && (
              <p className="text-sm text-base-content/70 mt-1">
                正在处理: {processingStatus.currentEmail}
              </p>
            )}
          </div>
        )}

        {/* 处理结果 */}
        {processingStatus.results.length > 0 && !processingStatus.isProcessing && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">处理结果</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {processingStatus.results.map((result: any, index: number) => (
                <div 
                  key={index} 
                  className={`p-2 rounded-lg text-sm ${
                    result.status === 'success' ? 'bg-success/10' : 
                    result.status === 'partial' ? 'bg-warning/10' : 'bg-error/10'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium truncate max-w-md">{result.subject}</span>
                    <span className={`badge badge-sm ${
                      result.status === 'success' ? 'badge-success' : 
                      result.status === 'partial' ? 'badge-warning' : 'badge-error'
                    }`}>
                      {result.status === 'success' ? '成功' : 
                       result.status === 'partial' ? '部分成功' : '失败'}
                    </span>
                  </div>
                  {result.pdf_count > 0 && (
                    <div className="text-xs text-base-content/70 mt-1">
                      处理 {result.processed_count}/{result.pdf_count} 个PDF
                    </div>
                  )}
                  {result.error && (
                    <div className="text-xs text-error mt-1">{result.error}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            关闭
          </button>
          {processingStatus.results.length === 0 && (
            <LoadingButton
              onClick={handleBatchProcess}
              loading={processingStatus.isProcessing}
              disabled={selectedEmails.size === 0}
              className="btn btn-primary"
            >
              处理选中的邮件
            </LoadingButton>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmailScanResultsModal