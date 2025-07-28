/**
 * 删除确认模态框
 * 支持单个和批量删除发票
 */
import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  invoiceIds: string[]
  invoiceNumbers?: string[]
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onSuccess,
  invoiceIds,
  invoiceNumbers = []
}: DeleteConfirmModalProps) {
  const { user } = useAuthContext()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 执行删除
  const handleDelete = async () => {
    if (!user?.id || invoiceIds.length === 0) return

    try {
      setDeleting(true)
      setError(null)

      // 软删除：更新deleted_at字段
      const { error: deleteError } = await supabase
        .from('invoices')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', invoiceIds)
        .eq('user_id', user.id)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('删除发票失败:', err)
      setError(err instanceof Error ? err.message : '删除发票失败')
    } finally {
      setDeleting(false)
    }
  }

  // 重置状态
  const handleClose = () => {
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  const isMultiple = invoiceIds.length > 1

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl text-error">
            🗑️ 确认删除
          </h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={handleClose}
            disabled={deleting}
          >
            ✕
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="alert alert-error mb-4">
            <div>
              <h3 className="font-bold">删除失败</h3>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        )}

        {/* 删除确认内容 */}
        <div className="mb-6">
          <div className="alert alert-warning">
            <div>
              <h3 className="font-bold">⚠️ 请确认删除操作</h3>
              <div className="text-sm mt-2">
                {isMultiple ? (
                  <>
                    您即将删除 <strong>{invoiceIds.length}</strong> 张发票，此操作不可撤销！
                  </>
                ) : (
                  <>
                    您即将删除发票，此操作不可撤销！
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 发票列表预览 */}
          {invoiceNumbers.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">将要删除的发票：</h4>
              <div className="bg-base-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                {isMultiple ? (
                  <div className="space-y-1">
                    {invoiceNumbers.map((number, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="w-4 h-4 text-center">•</span>
                        <span className="font-mono">{number}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="font-mono text-center">
                    {invoiceNumbers[0]}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 text-sm text-base-content/60">
            <p>删除后的发票将被标记为已删除，但数据仍会保留在系统中。</p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="modal-action">
          <button
            className="btn btn-ghost"
            onClick={handleClose}
            disabled={deleting}
          >
            取消
          </button>
          <button
            className="btn btn-error"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                删除中...
              </>
            ) : (
              <>
                🗑️ 确认删除
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="modal-backdrop" onClick={handleClose}></div>
    </div>
  )
}

export default DeleteConfirmModal