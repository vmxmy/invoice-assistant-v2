/**
 * 回收站页面
 * 显示已删除的发票，支持恢复和永久删除
 * 支持表格和卡片视图切换
 */
import React, { useState } from 'react'
import { useDeletedInvoices, useRestoreInvoice, usePermanentlyDeleteInvoice, useBatchRestoreInvoices, useBatchPermanentlyDeleteInvoices } from '../hooks/useSupabaseData'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import Layout from '../components/layout/Layout'
import TrashListView from '../components/trash/TrashListView'
import TrashTableView from '../components/trash/TrashTableView'

// 视图模式
enum ViewMode {
  TABLE = 'table',
  GRID = 'grid'
}

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  invoiceNumber: string
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, invoiceNumber }: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg text-error">⚠️ 永久删除确认</h3>
        <p className="py-4">
          您即将永久删除发票 <span className="font-mono font-bold">{invoiceNumber}</span>
        </p>
        <p className="text-sm text-base-content/70 mb-4">
          此操作将：
          <br />• 从数据库中永久删除发票记录
          <br />• 删除存储桶中的文件
          <br />• 清理重复检测的哈希记录
          <br />• <strong className="text-error">此操作无法撤销！</strong>
        </p>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-error" onClick={onConfirm}>
            🗑️ 永久删除
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}

interface RestoreConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  invoiceNumber: string
}

function RestoreConfirmModal({ isOpen, onClose, onConfirm, invoiceNumber }: RestoreConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg text-success">↺ 恢复发票确认</h3>
        <p className="py-4">
          您即将恢复发票 <span className="font-mono font-bold">{invoiceNumber}</span>
        </p>
        <p className="text-sm text-base-content/70 mb-4">
          此操作将：
          <br />• 将发票状态恢复为正常
          <br />• 发票将重新出现在发票列表中
          <br />• 清除删除时间戳
          <br />• 可以再次正常使用和管理
        </p>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-success" onClick={onConfirm}>
            ↺ 确认恢复
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}

interface BatchRestoreConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  count: number
  isPending: boolean
}

function BatchRestoreConfirmModal({ isOpen, onClose, onConfirm, count, isPending }: BatchRestoreConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg text-success">↺ 批量恢复确认</h3>
        <p className="py-4">
          您即将恢复 <span className="font-bold text-primary">{count}</span> 个发票
        </p>
        <p className="text-sm text-base-content/70 mb-4">
          此操作将：
          <br />• 将这些发票状态恢复为正常
          <br />• 发票将重新出现在发票列表中
          <br />• 清除删除时间戳
          <br />• 可以再次正常使用和管理
        </p>
        <div className="modal-action">
          <button 
            className="btn btn-ghost" 
            onClick={onClose}
            disabled={isPending}
          >
            取消
          </button>
          <button 
            className="btn btn-success" 
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                恢复中...
              </>
            ) : (
              `↺ 确认恢复 ${count} 个发票`
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}

interface BatchDeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  count: number
  isPending: boolean
}

function BatchDeleteConfirmModal({ isOpen, onClose, onConfirm, count, isPending }: BatchDeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg text-error">⚠️ 批量永久删除确认</h3>
        <p className="py-4">
          您即将永久删除 <span className="font-bold text-error">{count}</span> 个发票
        </p>
        <p className="text-sm text-base-content/70 mb-4">
          此操作将：
          <br />• 从数据库中永久删除这些发票记录
          <br />• 删除存储桶中的文件
          <br />• 清理重复检测的哈希记录
          <br />• <strong className="text-error">此操作无法撤销！</strong>
        </p>
        <div className="modal-action">
          <button 
            className="btn btn-ghost" 
            onClick={onClose}
            disabled={isPending}
          >
            取消
          </button>
          <button 
            className="btn btn-error" 
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                删除中...
              </>
            ) : (
              `🗑️ 永久删除 ${count} 个发票`
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}

export function TrashPage() {
  const [page, setPage] = useState(1)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [restoreModalOpen, setRestoreModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID) // 默认卡片视图
  
  // 批量选择相关状态
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false)
  const [batchRestoreModalOpen, setBatchRestoreModalOpen] = useState(false)
  
  const pageSize = 20
  const { data: deletedInvoicesResult, isLoading, error } = useDeletedInvoices(page, pageSize)
  const restoreInvoice = useRestoreInvoice()
  const permanentlyDeleteInvoice = usePermanentlyDeleteInvoice()
  const batchRestoreInvoices = useBatchRestoreInvoices()
  const batchPermanentlyDeleteInvoices = useBatchPermanentlyDeleteInvoices()

  const deletedInvoices = deletedInvoicesResult?.data || []
  const totalCount = deletedInvoicesResult?.total || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  // 批量选择相关函数
  const isAllSelected = deletedInvoices.length > 0 && selectedInvoices.length === deletedInvoices.length
  const isIndeterminate = selectedInvoices.length > 0 && selectedInvoices.length < deletedInvoices.length

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInvoices([])
    } else {
      setSelectedInvoices(deletedInvoices.map(invoice => invoice.id))
    }
  }

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    )
  }

  const clearSelection = () => {
    setSelectedInvoices([])
  }

  // 分页变化时清除选择
  React.useEffect(() => {
    clearSelection()
  }, [page])

  const handleRestore = (invoice: any) => {
    setSelectedInvoice(invoice)
    setRestoreModalOpen(true)
  }

  const confirmRestore = async () => {
    if (selectedInvoice) {
      await restoreInvoice.mutateAsync(selectedInvoice.id)
      setRestoreModalOpen(false)
      setSelectedInvoice(null)
    }
  }

  const handlePermanentDelete = (invoice: any) => {
    setSelectedInvoice(invoice)
    setDeleteModalOpen(true)
  }

  const confirmPermanentDelete = async () => {
    if (selectedInvoice) {
      await permanentlyDeleteInvoice.mutateAsync(selectedInvoice.id)
      setDeleteModalOpen(false)
      setSelectedInvoice(null)
    }
  }

  // 批量操作处理函数
  const handleBatchRestore = () => {
    if (selectedInvoices.length > 0) {
      setBatchRestoreModalOpen(true)
    }
  }

  const confirmBatchRestore = async () => {
    if (selectedInvoices.length > 0) {
      await batchRestoreInvoices.mutateAsync(selectedInvoices)
      setBatchRestoreModalOpen(false)
      clearSelection()
    }
  }

  const handleBatchPermanentDelete = () => {
    if (selectedInvoices.length > 0) {
      setBatchDeleteModalOpen(true)
    }
  }

  const confirmBatchPermanentDelete = async () => {
    if (selectedInvoices.length > 0) {
      await batchPermanentlyDeleteInvoices.mutateAsync(selectedInvoices)
      setBatchDeleteModalOpen(false)
      clearSelection()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 p-6">
        <div className="container mx-auto">
          <div className="flex justify-center items-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-100 p-6">
        <div className="container mx-auto">
          <div className="alert alert-error">
            <span>加载回收站失败: {error.message}</span>
          </div>
        </div>
      </div>
    )
  }

  // 计算即将过期的发票数量
  const expiringSoon = deletedInvoices.filter(inv => (inv.days_remaining || 0) <= 7).length;

  return (
    <Layout>
      <div className="page-container min-h-screen">
        <div className="container mx-auto p-6 max-w-7xl">
          
          {/* 页面标题和统计 */}
          <section className="mb-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  🗑️ 回收站
                </h1>
                <p className="text-base-content/60 mt-2">
                  已删除的发票将在这里保留 30 天，之后自动永久删除
                  <span className="ml-2">共 {totalCount} 项</span>
                  {expiringSoon > 0 && (
                    <span className="ml-2 text-error font-medium">
                      ({expiringSoon} 项即将过期)
                    </span>
                  )}
                </p>
              </div>
              
              {/* 视图切换按钮 */}
              <div className="flex gap-2">
                <button
                  className={`btn btn-sm ${
                    viewMode === ViewMode.GRID ? 'btn-primary' : 'btn-ghost'
                  }`}
                  onClick={() => setViewMode(ViewMode.GRID)}
                >
                  📋 卡片
                </button>
                <button
                  className={`btn btn-sm ${
                    viewMode === ViewMode.TABLE ? 'btn-primary' : 'btn-ghost'
                  }`}
                  onClick={() => setViewMode(ViewMode.TABLE)}
                >
                  📊 表格
                </button>
              </div>
              
              {/* 警告提示 */}
              {expiringSoon > 0 && (
                <div className="alert alert-warning w-full md:w-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm">
                    ⚠️ 有 {expiringSoon} 个发票将在 7 天内自动永久删除，请及时恢复重要发票！
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* 发票列表区域 */}
          <section>
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-0">
                
                {/* 空状态 */}
                {deletedInvoices.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-6xl mb-4">🗑️</div>
                    <h3 className="text-xl font-bold mb-2">回收站为空</h3>
                    <p className="text-base-content/70">
                      您没有已删除的发票
                    </p>
                  </div>
                ) : (
                  <>
                    {/* 列表头部 */}
                    <div className="p-4 border-b border-base-300">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={isAllSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = isIndeterminate
                              }}
                              onChange={handleSelectAll}
                            />
                            <span className="font-medium">已删除的发票</span>
                          </label>
                          {selectedInvoices.length > 0 && (
                            <span className="text-sm text-primary font-medium">
                              已选择 {selectedInvoices.length} 项
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-base-content/60">
                          显示 {deletedInvoices.length} / {totalCount} 条记录
                        </span>
                      </div>
                      
                      {/* 批量操作按钮 */}
                      {selectedInvoices.length > 0 && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-base-200">
                          <button
                            className="btn btn-success btn-sm"
                            onClick={handleBatchRestore}
                            disabled={batchRestoreInvoices.isPending}
                          >
                            {batchRestoreInvoices.isPending ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              '↺ 批量恢复'
                            )}
                          </button>
                          <button
                            className="btn btn-error btn-sm"
                            onClick={handleBatchPermanentDelete}
                            disabled={batchPermanentlyDeleteInvoices.isPending}
                          >
                            {batchPermanentlyDeleteInvoices.isPending ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              '🗑️ 批量删除'
                            )}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={clearSelection}
                          >
                            取消选择
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 内容区域 */}
                    <div className="p-6">
                      {viewMode === ViewMode.GRID ? (
                        <TrashListView
                          invoices={deletedInvoices}
                          selectedInvoices={selectedInvoices}
                          onSelectInvoice={handleSelectInvoice}
                          onRestoreInvoice={handleRestore}
                          onPermanentDeleteInvoice={handlePermanentDelete}
                          isLoading={isLoading}
                        />
                      ) : (
                        <TrashTableView
                          invoices={deletedInvoices}
                          selectedInvoices={selectedInvoices}
                          onSelectInvoice={handleSelectInvoice}
                          onSelectAll={handleSelectAll}
                          isAllSelected={isAllSelected}
                          isIndeterminate={isIndeterminate}
                          onRestoreInvoice={handleRestore}
                          onPermanentDeleteInvoice={handlePermanentDelete}
                          isLoading={isLoading}
                        />
                      )}
                    </div>

                    {/* 分页 */}
                    {totalPages > 1 && (
                      <div className="p-4 border-t border-base-300">
                        <div className="flex justify-center">
                          <div className="join">
                            <button 
                              className="join-item btn btn-sm"
                              onClick={() => setPage(page - 1)}
                              disabled={page <= 1}
                            >
                              « 上一页
                            </button>
                            
                            <div className="join-item btn btn-sm btn-active">
                              第 {page} 页 / 共 {totalPages} 页
                            </div>
                            
                            <button 
                              className="join-item btn btn-sm"
                              onClick={() => setPage(page + 1)}
                              disabled={page >= totalPages}
                            >
                              下一页 »
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* 永久删除确认模态框 */}
          <DeleteConfirmModal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false)
              setSelectedInvoice(null)
            }}
            onConfirm={confirmPermanentDelete}
            invoiceNumber={selectedInvoice?.invoice_number || ''}
          />
          
          {/* 恢复确认模态框 */}
          <RestoreConfirmModal
            isOpen={restoreModalOpen}
            onClose={() => {
              setRestoreModalOpen(false)
              setSelectedInvoice(null)
            }}
            onConfirm={confirmRestore}
            invoiceNumber={selectedInvoice?.invoice_number || ''}
          />

          {/* 批量恢复确认模态框 */}
          <BatchRestoreConfirmModal
            isOpen={batchRestoreModalOpen}
            onClose={() => setBatchRestoreModalOpen(false)}
            onConfirm={confirmBatchRestore}
            count={selectedInvoices.length}
            isPending={batchRestoreInvoices.isPending}
          />

          {/* 批量删除确认模态框 */}
          <BatchDeleteConfirmModal
            isOpen={batchDeleteModalOpen}
            onClose={() => setBatchDeleteModalOpen(false)}
            onConfirm={confirmBatchPermanentDelete}
            count={selectedInvoices.length}
            isPending={batchPermanentlyDeleteInvoices.isPending}
          />
        </div>
      </div>
    </Layout>
  )
}

export default TrashPage