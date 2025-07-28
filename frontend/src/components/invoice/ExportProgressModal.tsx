/**
 * 导出进度模态框
 * 显示发票导出的实时进度
 */
import React, { useState } from 'react'

interface ExportProgress {
  invoiceId: string
  invoiceNumber: string
  status: 'pending' | 'downloading' | 'completed' | 'error'
  progress: number
  error?: string
  filePath?: string
  downloadUrl?: string
}

interface ExportProgressModalProps {
  isOpen: boolean
  onClose: () => void
  onCancel: () => void
  exportProgress: ExportProgress[]
  totalProgress: number
  canCancel: boolean
  title?: string
}

export function ExportProgressModal({
  isOpen,
  onClose,
  onCancel,
  exportProgress,
  totalProgress,
  canCancel,
  title = '导出发票'
}: ExportProgressModalProps) {
  const [copiedUrls, setCopiedUrls] = useState<Set<string>>(new Set())

  // 复制下载地址到剪贴板
  const copyToClipboard = async (url: string, invoiceId: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrls(prev => new Set(prev).add(invoiceId))
      
      // 2秒后清除复制状态
      setTimeout(() => {
        setCopiedUrls(prev => {
          const newSet = new Set(prev)
          newSet.delete(invoiceId)
          return newSet
        })
      }, 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }
  
  // 获取状态图标
  const getStatusIcon = (status: ExportProgress['status']) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'downloading':
        return '📥'
      case 'completed':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '⏳'
    }
  }

  // 获取状态文本
  const getStatusText = (status: ExportProgress['status']) => {
    switch (status) {
      case 'pending':
        return '等待中'
      case 'downloading':
        return '下载中'
      case 'completed':
        return '已完成'
      case 'error':
        return '失败'
      default:
        return '等待中'
    }
  }

  // 获取状态样式
  const getStatusClass = (status: ExportProgress['status']) => {
    switch (status) {
      case 'pending':
        return 'text-base-content/60'
      case 'downloading':
        return 'text-info'
      case 'completed':
        return 'text-success'
      case 'error':
        return 'text-error'
      default:
        return 'text-base-content/60'
    }
  }

  if (!isOpen) return null

  const completedCount = exportProgress.filter(item => item.status === 'completed').length
  const errorCount = exportProgress.filter(item => item.status === 'error').length
  const totalCount = exportProgress.length

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl">📥 {title}</h3>
          {!canCancel && (
            <button
              className="btn btn-sm btn-circle btn-ghost"
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>

        {/* 整体进度 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">整体进度</span>
            <span className="text-sm text-base-content/60">
              {completedCount} / {totalCount} 已完成
              {errorCount > 0 && (
                <span className="ml-2 text-error">({errorCount} 个失败)</span>
              )}
            </span>
          </div>
          
          <div className="w-full bg-base-300 rounded-full h-3">
            <div 
              className="bg-primary h-3 rounded-full transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            ></div>
          </div>
          
          <div className="text-center mt-2">
            <span className="text-lg font-bold">{totalProgress}%</span>
          </div>
        </div>

        {/* 详细进度列表 */}
        <div className="max-h-80 overflow-y-auto">
          <div className="space-y-2">
            {exportProgress.map((item) => (
              <div 
                key={item.invoiceId} 
                className="flex items-start justify-between p-3 bg-base-200 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-lg">
                    {getStatusIcon(item.status)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {item.invoiceNumber}
                    </div>
                    {item.filePath && (
                      <div className="text-xs text-base-content/60 mt-1 font-mono">
                        📁 {item.filePath}
                      </div>
                    )}
                    {item.downloadUrl && (
                      <div className="text-xs mt-1 flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <a 
                            href={item.downloadUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-focus underline font-mono text-xs break-all"
                            title="点击访问文件下载地址"
                          >
                            🔗 {item.downloadUrl}
                          </a>
                        </div>
                        <button
                          onClick={() => copyToClipboard(item.downloadUrl!, item.invoiceId)}
                          className={`btn btn-xs btn-ghost p-1 min-h-0 h-5 ${
                            copiedUrls.has(item.invoiceId) ? 'btn-success' : 'btn-outline'
                          }`}
                          title="复制下载地址"
                        >
                          {copiedUrls.has(item.invoiceId) ? '✅' : '📋'}
                        </button>
                      </div>
                    )}
                    {item.error && (
                      <div className="text-xs text-error mt-1">
                        ❌ {item.error}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start gap-3 flex-shrink-0 mt-1">
                  {/* 单个进度条 */}
                  {item.status === 'downloading' || item.status === 'completed' ? (
                    <div className="w-16">
                      <div className="w-full bg-base-300 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            item.status === 'completed' ? 'bg-success' : 'bg-info'
                          }`}
                          style={{ width: `${item.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-16"></div>
                  )}
                  
                  {/* 状态文本 */}
                  <span className={`text-sm font-medium w-16 text-right ${getStatusClass(item.status)}`}>
                    {getStatusText(item.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 统计信息 */}
        {totalCount > 1 && (
          <div className="mt-6 p-4 bg-base-200 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-success">{completedCount}</div>
                <div className="text-xs text-base-content/60">已完成</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-error">{errorCount}</div>
                <div className="text-xs text-base-content/60">失败</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-info">
                  {totalCount - completedCount - errorCount}
                </div>
                <div className="text-xs text-base-content/60">进行中</div>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="modal-action">
          {canCancel ? (
            <>
              <button
                className="btn btn-error btn-outline"
                onClick={onCancel}
              >
                🛑 取消导出
              </button>
            </>
          ) : (
            <>
              {totalProgress === 100 || errorCount === totalCount ? (
                <button
                  className="btn btn-primary"
                  onClick={onClose}
                >
                  ✅ 完成
                </button>
              ) : (
                <button
                  className="btn btn-ghost"
                  onClick={onClose}
                >
                  后台运行
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="modal-backdrop"></div>
    </div>
  )
}

export default ExportProgressModal