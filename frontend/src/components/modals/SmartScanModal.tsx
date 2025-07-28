import React, { useState, useEffect } from 'react'
import { EmailAccount, SmartScanRequest } from '../../types/email'
import LoadingButton from '../ui/LoadingButton'
import { useStartSmartScan } from '../../hooks/useEmailAccounts'
import { toast } from 'react-hot-toast'

interface SmartScanModalProps {
  isOpen: boolean
  onClose: () => void
  account: EmailAccount | null
  onSuccess?: (job: any) => void
}

interface SmartScanInfo {
  auto_calculated_date_from: string | null
  auto_calculated_date_to: string | null
  scan_range_description: string
  auto_processing_enabled: boolean
}

const SmartScanModal: React.FC<SmartScanModalProps> = ({
  isOpen,
  onClose,
  account,
  onSuccess
}) => {
  const [keywords, setKeywords] = useState<string[]>(['发票'])
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [newExcludeKeyword, setNewExcludeKeyword] = useState('')
  const [smartScanInfo, setSmartScanInfo] = useState<SmartScanInfo | null>(null)
  
  const startSmartScan = useStartSmartScan()

  // 重置表单
  const resetForm = () => {
    setKeywords(['发票'])
    setExcludeKeywords([])
    setDescription('')
    setNewKeyword('')
    setNewExcludeKeyword('')
    setSmartScanInfo(null)
  }

  // 关闭模态框
  const handleClose = () => {
    resetForm()
    onClose()
  }

  // 添加关键词
  const addKeyword = () => {
    const trimmed = newKeyword.trim()
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed])
      setNewKeyword('')
    }
  }

  // 移除关键词
  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword))
  }

  // 添加排除关键词
  const addExcludeKeyword = () => {
    const trimmed = newExcludeKeyword.trim()
    if (trimmed && !excludeKeywords.includes(trimmed)) {
      setExcludeKeywords([...excludeKeywords, trimmed])
      setNewExcludeKeyword('')
    }
  }

  // 移除排除关键词
  const removeExcludeKeyword = (keyword: string) => {
    setExcludeKeywords(excludeKeywords.filter(k => k !== keyword))
  }

  // 提交智能扫描
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!account) return

    try {
      const requestData: SmartScanRequest = {
        email_account_id: account.id,
        keywords: keywords,
        exclude_keywords: excludeKeywords,
        description: description || `智能扫描 ${account.email_address}`
      }

      const result = await startSmartScan.mutateAsync(requestData)
      
      // 模拟智能扫描信息（因为新的API可能返回不同格式）
      setSmartScanInfo({
        auto_calculated_date_from: null,
        auto_calculated_date_to: null,
        scan_range_description: '智能分析最优扫描范围',
        auto_processing_enabled: true
      })

      onSuccess?.(result)
      
      // 稍后关闭模态框
      setTimeout(() => {
        handleClose()
      }, 2000)

    } catch (error: any) {
      console.error('创建智能扫描任务失败:', error)
      toast.error(error.message || '创建智能扫描任务失败')
    }
  }

  // 格式化日期显示
  const formatDateRange = (info: SmartScanInfo) => {
    if (!info.auto_calculated_date_from) {
      return '扫描所有邮件'
    }
    
    const fromDate = new Date(info.auto_calculated_date_from)
    const toDate = info.auto_calculated_date_to ? new Date(info.auto_calculated_date_to) : new Date()
    
    return `从 ${fromDate.toLocaleDateString()} 到 ${toDate.toLocaleDateString()}`
  }

  if (!isOpen || !account) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-xl text-primary">🚀 智能扫描</h3>
            <p className="text-base-content/70 text-sm mt-1">{account.email_address}</p>
          </div>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={handleClose}>✕</button>
        </div>

        {/* 智能扫描说明 */}
        <div className="alert alert-info mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h3 className="font-bold">一键式全自动处理</h3>
            <div className="text-xs">
              ✅ 自动计算扫描时间范围<br/>
              ✅ 自动OCR识别和发票解析<br/>
              ✅ 自动去重和保存入库<br/>
              ✅ 生成详细处理报告
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本设置 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-base">搜索配置</h4>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">任务描述（可选）</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`智能扫描 ${account.email_address}`}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">搜索关键词</span>
                <span className="label-text-alt">邮件主题必须包含的关键词</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {keywords.map((keyword) => (
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
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addKeyword()
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={addKeyword}
                >
                  添加
                </button>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">排除关键词（可选）</span>
                <span className="label-text-alt">包含这些关键词的邮件将被排除</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {excludeKeywords.map((keyword) => (
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
                  value={newExcludeKeyword}
                  onChange={(e) => setNewExcludeKeyword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addExcludeKeyword()
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={addExcludeKeyword}
                >
                  添加
                </button>
              </div>
            </div>
          </div>

          {/* 智能扫描结果信息 */}
          {smartScanInfo && (
            <div className="alert alert-success">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-bold">智能扫描任务已创建！</h3>
                <div className="text-xs">
                  <div>📅 {smartScanInfo.scan_range_description}</div>
                  <div>🤖 {formatDateRange(smartScanInfo)}</div>
                  <div>⚡ 自动处理已启用，请在任务列表中查看进度</div>
                </div>
              </div>
            </div>
          )}

          {/* 自动化说明 */}
          <div className="bg-base-200 rounded-lg p-4">
            <h5 className="font-medium mb-2">🎯 系统将自动处理以下内容：</h5>
            <div className="text-sm space-y-1 text-base-content/80">
              <div>• 根据上次扫描时间智能计算本次扫描范围</div>
              <div>• 扫描邮件附件和正文中的PDF发票</div>
              <div>• OCR识别发票信息并自动分类</div>
              <div>• 检测重复发票并智能合并数据</div>
              <div>• 保存发票记录到您的账户</div>
              <div>• 生成详细的处理结果报告</div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="modal-action">
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={handleClose}
              disabled={startSmartScan.isPending}
            >
              取消
            </button>
            <LoadingButton
              type="submit"
              className="btn btn-primary"
              isLoading={startSmartScan.isPending}
              disabled={keywords.length === 0}
            >
              {startSmartScan.isPending ? '创建任务中...' : '开始智能扫描'}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SmartScanModal