/**
 * 发票查看模态框
 * 支持查看发票详情
 * 采用紧凑型布局设计系统
 */
import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { AdaptiveInvoiceFields } from './fields/AdaptiveInvoiceFields'
import { Eye, X, Loader2 } from 'lucide-react'
import type { Invoice } from '../../types'

interface InvoiceModalProps {
  invoiceId: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function InvoiceModal({
  invoiceId,
  isOpen,
  onClose,
  onSuccess
}: InvoiceModalProps) {
  const { user } = useAuthContext()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取发票详情
  const fetchInvoice = async () => {
    if (!invoiceId || !user?.id) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single()

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setInvoice(data)
    } catch (err) {
      console.error('获取发票详情失败:', err)
      setError(err instanceof Error ? err.message : '获取发票详情失败')
    } finally {
      setLoading(false)
    }
  }


  // 初始化数据
  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchInvoice()
    }
  }, [isOpen, invoiceId])

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setInvoice(null)
      setError(null)
    }
  }, [isOpen])


  // 键盘快捷键处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // ESC - 关闭模态框
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  // 注册键盘事件
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="modal modal-open modal-compact">
      <div className="modal-box modal-box-compact">
        {/* 固定标题栏 - 紧凑设计 */}
        <div className="modal-header-compact sticky top-0 z-10 bg-base-100 border-b border-base-200">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-base">
              查看发票详情
            </h3>
            <span className="badge badge-outline badge-sm">只读</span>
          </div>
          <button
            className="btn btn-circle btn-ghost btn-compact-sm"
            onClick={onClose}
            title="关闭 (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容区域 - 可滚动 */}
        <div className="modal-content-compact">
          {/* Loading状态 - 紧凑设计 */}
          {loading && (
            <div className="modal-loading-compact">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-base-content/60 mt-2">加载中...</p>
            </div>
          )}

          {/* 错误状态 - 紧凑设计 */}
          {error && (
            <div className="alert alert-error modal-error-compact">
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 发票详情 - 使用自适应字段组件 */}
          {invoice && (
            <div className="space-y-3">
              <AdaptiveInvoiceFields
                invoice={invoice}
                mode="view"
                editData={undefined}
                onFieldChange={() => {}}
                errors={{}}
              />
            </div>
          )}
        </div>

        {/* 固定操作栏 - 紧凑设计 */}
        <div className="modal-footer-compact sticky bottom-0 bg-base-100 border-t border-base-200">
          <div className="modal-buttons-compact">
            <button
              className="btn btn-ghost btn-compact-sm"
              onClick={onClose}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
      
      <div className="modal-backdrop backdrop-blur-sm bg-base-content/20" onClick={onClose}></div>
    </div>
  )
}

export default InvoiceModal