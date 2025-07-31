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

      // 硬删除：逐个删除发票和相关数据
      for (const invoiceId of invoiceIds) {
        console.log(`🔄 开始删除发票 ${invoiceId}，用户ID: ${user.id}`)
        
        // 先获取发票信息，包含文件路径和哈希值
        const { data: invoice, error: fetchError } = await supabase
          .from('invoices')
          .select('file_path, file_hash, invoice_number')
          .eq('id', invoiceId)
          .eq('user_id', user.id)
          .single()

        if (fetchError) {
          console.error(`❌ 获取发票 ${invoiceId} 信息失败:`, fetchError)
          continue
        }

        console.log(`📋 发票信息:`, {
          invoiceId,
          invoiceNumber: invoice.invoice_number,
          fileHash: invoice.file_hash,
          filePath: invoice.file_path,
          userId: user.id
        })

        // 精准删除哈希记录（RLS策略已修复）
        if (invoice?.file_hash) {
          console.log(`🗑️ 删除哈希记录 - file_hash: ${invoice.file_hash}`)
          
          const { data: deletedHashes, error: hashError } = await supabase
            .from('file_hashes')
            .delete()
            .eq('file_hash', invoice.file_hash)
            .eq('user_id', user.id)
            .select('id')
          
          if (hashError) {
            console.error(`❌ 删除哈希记录失败:`, hashError)
            throw new Error(`删除哈希记录失败: ${hashError.message}`)
          }
          
          console.log(`✅ 成功删除 ${deletedHashes?.length || 0} 条哈希记录`)
          
          // 验证删除结果
          const { data: remainingHashes } = await supabase
            .from('file_hashes')
            .select('id')
            .eq('file_hash', invoice.file_hash)
            .eq('user_id', user.id)
          
          if (remainingHashes && remainingHashes.length > 0) {
            console.warn(`⚠️ 还有 ${remainingHashes.length} 条哈希记录未删除`)
          } else {
            console.log(`🎯 哈希记录删除验证通过`)
          }
        }

        // 删除数据库记录
        const { error: deleteError } = await supabase
          .from('invoices')
          .delete()
          .eq('id', invoiceId)
          .eq('user_id', user.id)

        if (deleteError) {
          throw new Error(`删除发票 ${invoiceId} 失败: ${deleteError.message}`)
        }

        console.log(`✅ 成功删除发票记录 ${invoiceId}`)

        // 删除存储桶中的文件
        if (invoice?.file_path) {
          const { error: storageError } = await supabase.storage
            .from('invoice-files')
            .remove([invoice.file_path])
          
          if (storageError) {
            console.warn(`删除文件 ${invoice.file_path} 失败:`, storageError)
          } else {
            console.log(`✅ 成功删除文件 ${invoice.file_path}`)
          }
        }
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
      <div className="modal-box max-w-md">
        {/* 关闭按钮 */}
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={handleClose}
          disabled={deleting}
        >
          ✕
        </button>

        {/* 头部图标和标题 */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-error/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-base-content">确认删除</h3>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="alert alert-error mb-4">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* 主要内容 */}
        <div className="text-center mb-6">
          <p className="text-base-content/70 mb-4">
            {isMultiple ? (
              <>您即将删除 <span className="font-semibold text-base-content">{invoiceIds.length}</span> 张发票</>
            ) : (
              <>您即将删除此发票</>
            )}
          </p>

          {/* 发票号显示 - 简化版 */}
          {invoiceNumbers.length > 0 && (
            <div className="bg-base-200 rounded-lg p-3 mb-4">
              {isMultiple ? (
                invoiceNumbers.length <= 3 ? (
                  <div className="space-y-1">
                    {invoiceNumbers.map((number, index) => (
                      <div key={index} className="font-mono text-sm text-base-content/80">
                        {number}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-base-content/80">
                    <div className="font-mono">{invoiceNumbers[0]}</div>
                    <div className="text-xs mt-1">等 {invoiceNumbers.length} 张发票</div>
                  </div>
                )
              ) : (
                <div className="font-mono text-base-content/80">
                  {invoiceNumbers[0]}
                </div>
              )}
            </div>
          )}

          <p className="text-sm text-base-content/50">
            此操作不可撤销
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            className="btn btn-ghost flex-1"
            onClick={handleClose}
            disabled={deleting}
          >
            取消
          </button>
          <button
            className="btn btn-error flex-1"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                删除中
              </>
            ) : (
              <>
                确认删除
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