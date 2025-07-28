/**
 * 发票查看和编辑模态框
 * 支持查看详情和编辑发票信息
 */
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { AdaptiveInvoiceFields } from './fields/AdaptiveInvoiceFields'
import type { Invoice } from '../../types'

interface InvoiceModalProps {
  invoiceId: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  mode: 'view' | 'edit'
}

export function InvoiceModal({
  invoiceId,
  isOpen,
  onClose,
  onSuccess,
  mode
}: InvoiceModalProps) {
  const { user } = useAuthContext()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editedInvoice, setEditedInvoice] = useState<Partial<Invoice>>({})

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
      setEditedInvoice(data)
    } catch (err) {
      console.error('获取发票详情失败:', err)
      setError(err instanceof Error ? err.message : '获取发票详情失败')
    } finally {
      setLoading(false)
    }
  }

  // 保存编辑
  const handleSave = async () => {
    if (!invoice || !user?.id) return

    try {
      setSaving(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          ...editedInvoice,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id)
        .eq('user_id', user.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('保存发票失败:', err)
      setError(err instanceof Error ? err.message : '保存发票失败')
    } finally {
      setSaving(false)
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
      setEditedInvoice({})
      setError(null)
    }
  }, [isOpen])

  // 更新编辑状态
  const updateField = (field: keyof Invoice, value: any) => {
    setEditedInvoice(prev => ({
      ...prev,
      [field]: value
    }))
  }


  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl">
            {mode === 'view' ? '👁️ 查看发票' : '✏️ 编辑发票'}
          </h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Loading状态 */}
        {loading && (
          <div className="text-center py-12">
            <div className="loading loading-spinner loading-lg"></div>
            <p className="mt-4">正在加载发票详情...</p>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="alert alert-error mb-6">
            <div>
              <h3 className="font-bold">操作失败</h3>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        )}

        {/* 发票详情 - 使用自适应字段组件 */}
        {invoice && (
          <AdaptiveInvoiceFields
            invoice={invoice}
            mode={mode}
            editData={mode === 'edit' ? editedInvoice : undefined}
            onFieldChange={updateField}
            errors={{}}
          />
        )}

        {/* 操作按钮 */}
        <div className="modal-action">
          {mode === 'view' ? (
            <>
              <button
                className="btn btn-ghost"
                onClick={onClose}
              >
                关闭
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  // 这里可以切换到编辑模式
                  console.log('切换到编辑模式')
                }}
              >
                ✏️ 编辑
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-ghost"
                onClick={onClose}
                disabled={saving}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    保存中...
                  </>
                ) : (
                  '💾 保存'
                )}
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}

export default InvoiceModal