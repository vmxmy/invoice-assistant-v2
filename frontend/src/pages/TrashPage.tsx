/**
 * 回收站页面
 * 显示已删除的发票，支持恢复和永久删除
 */
import React, { useState } from 'react'
import { useDeletedInvoices, useRestoreInvoice, usePermanentlyDeleteInvoice } from '../hooks/useSupabaseData'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

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

export function TrashPage() {
  const [page, setPage] = useState(1)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  
  const pageSize = 20
  const { data: deletedInvoicesResult, isLoading, error } = useDeletedInvoices(page, pageSize)
  const restoreInvoice = useRestoreInvoice()
  const permanentlyDeleteInvoice = usePermanentlyDeleteInvoice()

  const deletedInvoices = deletedInvoicesResult?.data || []
  const totalCount = deletedInvoicesResult?.total || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  const handleRestore = async (invoiceId: string) => {
    await restoreInvoice.mutateAsync(invoiceId)
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

  return (
    <div className="min-h-screen bg-base-100 p-6">
      <div className="container mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">🗑️ 回收站</h1>
            <div className="badge badge-neutral">{totalCount} 项</div>
            {(() => {
              const expiringSoon = deletedInvoices.filter(inv => (inv.days_remaining || 0) <= 7).length;
              return expiringSoon > 0 ? (
                <div className="badge badge-error">{expiringSoon} 项即将过期</div>
              ) : null;
            })()}
          </div>
          <p className="text-base-content/70">
            已删除的发票将在这里保留 30 天，之后自动永久删除
          </p>
          {(() => {
            const expiringSoon = deletedInvoices.filter(inv => (inv.days_remaining || 0) <= 7).length;
            return expiringSoon > 0 ? (
              <div className="alert alert-warning mt-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>
                  ⚠️ 有 {expiringSoon} 个发票将在 7 天内自动永久删除，请及时恢复重要发票！
                </span>
              </div>
            ) : null;
          })()}
        </div>

        {/* 空状态 */}
        {deletedInvoices.length === 0 ? (
          <div className="card bg-base-200">
            <div className="card-body text-center py-16">
              <div className="text-6xl mb-4">🗑️</div>
              <h3 className="text-xl font-bold mb-2">回收站为空</h3>
              <p className="text-base-content/70">
                您没有已删除的发票
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 发票列表 */}
            <div className="grid gap-4">
              {deletedInvoices.map((invoice) => (
                <div 
                  key={invoice.id} 
                  className="card bg-base-200 border border-base-300"
                >
                  <div className="card-body">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">
                            {invoice.seller_name || '未知销售方'}
                          </h3>
                          <div className="badge badge-error badge-outline">已删除</div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-base-content/60">发票号码:</span>
                            <div className="font-mono">{invoice.invoice_number || '未知'}</div>
                          </div>
                          <div>
                            <span className="text-base-content/60">金额:</span>
                            <div className="font-bold text-primary">
                              ¥{invoice.total_amount?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                          <div>
                            <span className="text-base-content/60">删除时间:</span>
                            <div>
                              {invoice.deleted_at 
                                ? format(new Date(invoice.deleted_at), 'PPP', { locale: zhCN })
                                : '未知'
                              }
                            </div>
                          </div>
                          <div>
                            <span className="text-base-content/60">剩余保留:</span>
                            <div className={`font-bold ${
                              (invoice.days_remaining || 0) <= 7 ? 'text-error' : 
                              (invoice.days_remaining || 0) <= 15 ? 'text-warning' : 'text-success'
                            }`}>
                              {Math.ceil(invoice.days_remaining || 0)} 天
                            </div>
                          </div>
                          <div>
                            <span className="text-base-content/60">发票日期:</span>
                            <div>{invoice.invoice_date || '未知'}</div>
                          </div>
                        </div>
                        
                        {/* 删除倒计时提醒 */}
                        {(invoice.days_remaining || 0) <= 7 && (
                          <div className="alert alert-warning mt-2 py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="text-xs">
                              ⚠️ 此发票将在 {Math.ceil(invoice.days_remaining || 0)} 天后自动永久删除
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex gap-2 ml-4">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleRestore(invoice.id)}
                          disabled={restoreInvoice.isPending}
                        >
                          {restoreInvoice.isPending ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            '↺ 恢复'
                          )}
                        </button>
                        <button
                          className="btn btn-error btn-sm"
                          onClick={() => handlePermanentDelete(invoice)}
                          disabled={permanentlyDeleteInvoice.isPending}
                        >
                          {permanentlyDeleteInvoice.isPending ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            '🗑️ 永久删除'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
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
            )}
          </>
        )}

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
      </div>
    </div>
  )
}

export default TrashPage