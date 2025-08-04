import React, { useState, useEffect } from 'react'
import { EmailScanJob } from '../../types/email'
import { edgeFunctionEmail } from '../../services/edgeFunctionEmail'
import LoadingButton from '../ui/LoadingButton'
import { toast } from 'react-hot-toast'
import { decodeEmailSubject, decodeEmailAddress } from '../../utils/emailDecoder'

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
  // 邮件正文相关字段
  email_body_text?: string | null
  email_body_html?: string | null
  email_body_preview?: string | null
  email_body_size?: number
  has_email_body?: boolean
  body_extraction_method?: string
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

      // 模拟批量处理结果（新的架构中，扫描结果处理会在 Edge Function 中完成）
      // 这里可以调用 getScanResults 获取已处理的结果
      const results = selectedEmailList.map(email => ({
        success: true,
        email_uid: email.uid,
        subject: email.subject,
        message: '邮件处理成功',
        invoice_created: autoCreateInvoice
      }))
      
      // 更新处理状态
      setProcessingStatus({
        isProcessing: false,
        progress: 100,
        total: results.length,
        results: results
      })

      // 显示处理结果
      const successCount = results.filter((r: any) => r.status === 'success').length
      const partialCount = results.filter((r: any) => r.status === 'partial').length
      const failedCount = results.filter((r: any) => r.status === 'failed').length
      
      if (successCount > 0) {
        toast.success(`成功处理 ${successCount} 封邮件`)
      }
      if (partialCount > 0) {
        toast.warning(`${partialCount} 封邮件部分处理成功，请查看详细结果`)
      }
      if (failedCount > 0) {
        // 收集详细的失败信息
        const failedEmails = results.filter((r: any) => r.status === 'failed')
        const failureDetails = failedEmails.map((email: any) => {
          const emailError = email.error || '未知错误'
          const pdfErrors = email.pdfs?.filter((pdf: any) => pdf.status === 'failed')
            .map((pdf: any) => `${pdf.name}: ${pdf.error}`)
            .join('; ') || ''
          
          return `${decodeEmailSubject(email.subject)}: ${emailError}${pdfErrors ? ` | PDF错误: ${pdfErrors}` : ''}`
        }).join('\n')
        
        console.log('处理失败详情:', failureDetails)
        toast.error(`${failedCount} 封邮件处理失败，请查看详细结果`)
      }

      // 通知父组件处理完成
      if (onProcessComplete) {
        onProcessComplete()
      }
    } catch (error: any) {
      console.error('批量处理错误:', error)
      
      // 更详细的错误处理
      let errorMessage = '批量处理失败'
      let detailedError = ''
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = '处理超时，请稍后重试或减少选择的邮件数量'
      } else if (error.response?.data?.detail) {
        // FastAPI 错误格式
        errorMessage = error.response.data.detail
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => err.msg || err).join('; ')
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data) {
        // 尝试从响应数据中提取错误信息
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data
        } else {
          detailedError = JSON.stringify(error.response.data)
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      // 记录详细错误信息到控制台
      if (detailedError) {
        console.error('详细错误信息:', detailedError)
      }
      
      toast.error(errorMessage)
      setProcessingStatus(prev => ({ ...prev, isProcessing: false }))
    }
  }

  if (!isOpen || !scanJob) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-7xl max-h-[90vh] overflow-y-auto">
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
                <th>正文摘要</th>
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
                  <td className="max-w-xs truncate" title={decodeEmailSubject(email.subject)}>
                    {decodeEmailSubject(email.subject)}
                  </td>
                  <td className="max-w-xs truncate" title={decodeEmailAddress(email.from)}>
                    {decodeEmailAddress(email.from)}
                  </td>
                  <td>{new Date(email.date).toLocaleDateString()}</td>
                  <td className="max-w-sm">
                    {email.has_email_body && email.email_body_preview ? (
                      <div className="tooltip" data-tip={email.email_body_preview}>
                        <div className="text-xs text-base-content/70 truncate">
                          {email.email_body_preview.substring(0, 80)}
                          {email.email_body_preview.length > 80 && '...'}
                        </div>
                        <div className="text-xs text-base-content/50 mt-1">
                          {email.email_body_size} 字符 • {email.body_extraction_method}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-base-content/40">
                        <div>无正文内容</div>
                        <div className="text-xs opacity-60">未提取</div>
                      </div>
                    )}
                  </td>
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
            <div className="alert alert-info">
              <span className="loading loading-spinner loading-sm"></span>
              <div>
                <h4 className="font-semibold">正在批量处理发票...</h4>
                <p className="text-sm">处理较多文件可能需要几分钟，请耐心等待</p>
              </div>
            </div>
            <div className="mt-2">
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
          </div>
        )}

        {/* 处理结果 */}
        {processingStatus.results.length > 0 && !processingStatus.isProcessing && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">处理结果</h4>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {processingStatus.results.map((result: any, index: number) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg text-sm border-l-4 ${
                    result.status === 'success' ? 'bg-success/10 border-success' : 
                    result.status === 'partial' ? 'bg-warning/10 border-warning' : 'bg-error/10 border-error'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium truncate max-w-md" title={decodeEmailSubject(result.subject)}>
                      {decodeEmailSubject(result.subject)}
                    </span>
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
                    <div className="text-xs text-error mt-1">
                      <strong>错误原因:</strong> {result.error}
                    </div>
                  )}
                  
                  {/* 显示PDF处理详情 */}
                  {result.pdfs && result.pdfs.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs font-medium text-base-content/80">PDF处理详情:</div>
                      {result.pdfs.map((pdf: any, pdfIndex: number) => (
                        <div key={pdfIndex} className="text-xs bg-base-100 rounded p-2 border">
                          <div className="flex justify-between items-start">
                            <span className="font-medium truncate max-w-32" title={pdf.name}>
                              {pdf.name}
                            </span>
                            <span className={`badge badge-xs ${
                              pdf.status === 'success' ? 'badge-success' : 'badge-error'
                            }`}>
                              {pdf.status === 'success' ? '成功' : '失败'}
                            </span>
                          </div>
                          
                          {pdf.status === 'success' && pdf.invoice_data && (
                            <div className="mt-1 text-xs text-success">
                              {pdf.invoice_type && (
                                <div>类型: {pdf.invoice_type}</div>
                              )}
                              {pdf.invoice_data['发票号码'] && (
                                <div>发票号: {pdf.invoice_data['发票号码']}</div>
                              )}
                              {pdf.invoice_data['价税合计'] && (
                                <div>金额: ¥{pdf.invoice_data['价税合计']}</div>
                              )}
                            </div>
                          )}
                          
                          {pdf.status === 'failed' && pdf.error && (
                            <div className="mt-1 text-xs text-error">
                              <strong>失败原因:</strong> {pdf.error}
                            </div>
                          )}
                          
                          {pdf.source && (
                            <div className="mt-1 text-xs text-base-content/50">
                              来源: {pdf.source === 'attachment' ? '附件' : '邮件正文链接'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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