/**
 * 发票查看和编辑模态框
 * 支持查看详情和编辑发票信息
 * 采用紧凑型布局设计系统
 */
import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { AdaptiveInvoiceFields } from './fields/AdaptiveInvoiceFields'
import { Eye, Edit, Save, X, Loader2 } from 'lucide-react'
import type { Invoice } from '../../types'

interface InvoiceModalProps {
  invoiceId: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  mode: 'view' | 'edit'
  onModeChange?: (mode: 'view' | 'edit') => void
}

export function InvoiceModal({
  invoiceId,
  isOpen,
  onClose,
  onSuccess,
  mode,
  onModeChange
}: InvoiceModalProps) {
  const { user } = useAuthContext()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editedInvoice, setEditedInvoice] = useState<Partial<Invoice>>({})
  const [internalMode, setInternalMode] = useState<'view' | 'edit'>(mode)

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

      // 保存成功后切换回查看模式
      setInternalMode('view')
      onModeChange?.('view')
      onSuccess?.()
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
      setInternalMode(mode)
    }
  }, [isOpen, mode])
  
  // 同步外部mode变化
  useEffect(() => {
    setInternalMode(mode)
  }, [mode])

  // 更新编辑状态
  const updateField = (field: keyof Invoice, value: any) => {
    setEditedInvoice(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 键盘快捷键处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // ESC - 关闭模态框
    if (e.key === 'Escape') {
      onClose()
    }
    // Ctrl+S - 保存编辑
    if (e.ctrlKey && e.key === 's' && internalMode === 'edit') {
      e.preventDefault()
      handleSave()
    }
    // Ctrl+E - 切换到编辑模式
    if (e.ctrlKey && e.key === 'e' && internalMode === 'view') {
      e.preventDefault()
      setInternalMode('edit')
      onModeChange?.('edit')
    }
  }, [internalMode, onClose, onModeChange])

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
            {internalMode === 'view' ? (
              <Eye className="w-4 h-4 text-primary" />
            ) : (
              <Edit className="w-4 h-4 text-warning" />
            )}
            <h3 className="font-semibold text-base">
              {internalMode === 'view' ? '查看发票详情' : '编辑发票信息'}
            </h3>
            {internalMode === 'view' && (
              <span className="badge badge-outline badge-sm">只读</span>
            )}
            {internalMode === 'edit' && (
              <span className="badge badge-warning badge-sm">编辑中</span>
            )}
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
                mode={internalMode}
                editData={internalMode === 'edit' ? editedInvoice : undefined}
                onFieldChange={updateField}
                errors={{}}
              />
            </div>
          )}
        </div>

        {/* 固定操作栏 - 紧凑设计 */}
        <div className="modal-footer-compact sticky bottom-0 bg-base-100 border-t border-base-200">
          <div className="modal-buttons-compact">
            {internalMode === 'view' ? (
              <>
                <button
                  className="btn btn-primary btn-compact-sm gap-1"
                  onClick={() => {
                    setInternalMode('edit')
                    onModeChange?.('edit')
                  }}
                  title="快捷键: Ctrl+E"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>编辑</span>
                </button>
                <button
                  className="btn btn-ghost btn-compact-sm"
                  onClick={onClose}
                >
                  关闭
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-primary btn-compact-sm gap-1"
                  onClick={handleSave}
                  disabled={saving}
                  title="快捷键: Ctrl+S"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>保存中...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>保存</span>
                    </>
                  )}
                </button>
                <button
                  className="btn btn-ghost btn-compact-sm"
                  onClick={() => {
                    setInternalMode('view')
                    onModeChange?.('view')
                    setEditedInvoice(invoice || {})
                  }}
                  disabled={saving}
                >
                  取消
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="modal-backdrop backdrop-blur-sm bg-base-content/20" onClick={onClose}></div>
    </div>
  )
}

export default InvoiceModal