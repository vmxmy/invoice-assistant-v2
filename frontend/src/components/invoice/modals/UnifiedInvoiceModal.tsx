import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  X,
  Clock,
  FileCheck,
  AlertCircle,
  RefreshCw,
  Download,
  Save,
  Edit2,
  Eye,
  CheckCircle
} from 'lucide-react';
import { useInvoice, useUpdateInvoice } from '../../../hooks/useInvoices';
import { AdaptiveInvoiceFields } from '../fields/AdaptiveInvoiceFields';
import { InvoiceDetailSkeleton } from '../../ui/SkeletonLoader';
import { LoadingButton } from '../../ui/LoadingButton';
import { SuccessAnimation } from '../../ui/SuccessAnimation';
import { useExport } from '../../../hooks/useExport';
import DownloadProgressModal from '../../ui/DownloadProgressModal';
import { notify } from '../../../utils/notifications';
import type { Invoice } from '../../../types';
import { 
  getInvoiceConfig, 
  getFieldValue, 
  validateField,
  type FieldConfig 
} from '../../../config/invoiceFieldsConfig';

export type ModalMode = 'view' | 'edit';

export interface UnifiedInvoiceModalProps {
  invoiceId: string | null;
  isOpen: boolean;
  mode?: ModalMode;
  onClose: () => void;
  onSuccess?: () => void;
  onModeChange?: (mode: ModalMode) => void;
}

interface EditFormData {
  [key: string]: any;
}

interface EditFormErrors {
  [key: string]: string;
}

export const UnifiedInvoiceModal: React.FC<UnifiedInvoiceModalProps> = ({
  invoiceId,
  isOpen,
  mode = 'view',
  onClose,
  onSuccess,
  onModeChange
}) => {
  // 状态管理
  const [currentMode, setCurrentMode] = useState<ModalMode>(mode);
  const [editData, setEditData] = useState<EditFormData>({});
  const [errors, setErrors] = useState<EditFormErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // 数据获取
  const { data: invoice, isLoading, error, refetch } = useInvoice(invoiceId || '');
  const updateInvoiceMutation = useUpdateInvoice();

  // 导出功能
  const exportHook = useExport();
  const {
    downloadSingle,
    isExporting,
    isProgressModalOpen,
    downloads,
    totalProgress,
    closeProgressModal,
    cancelDownload
  } = exportHook;

  // 模式变化时同步状态
  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  // 发票数据变化时初始化编辑表单数据
  useEffect(() => {
    if (invoice && isOpen) {
      const config = getInvoiceConfig(invoice);
      const initialData: EditFormData = {};

      // 根据字段配置初始化编辑数据
      config.groups.forEach(group => {
        group.fields.forEach(field => {
          const value = getFieldValue(invoice, field);
          
          // 特殊处理不同字段类型的初始值
          switch (field.type) {
            case 'date':
              // 确保日期格式为 YYYY-MM-DD
              if (value && typeof value === 'string') {
                if (value.includes('T')) {
                  initialData[field.key] = value.split('T')[0];
                } else {
                  initialData[field.key] = value;
                }
              } else {
                initialData[field.key] = '';
              }
              break;
            case 'currency':
            case 'number':
              // 数字字段确保有效的数值
              if (value !== undefined && value !== null && value !== '') {
                initialData[field.key] = value.toString();
              } else {
                initialData[field.key] = '';
              }
              break;
            case 'tags':
              // 标签字段确保是数组
              initialData[field.key] = Array.isArray(value) ? value : [];
              break;
            default:
              initialData[field.key] = value || '';
          }
        });
      });

      setEditData(initialData);
      setErrors({});
      setShowSuccess(false);
    }
  }, [invoice, isOpen]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // 控制模态框显示
  useEffect(() => {
    const modal = document.getElementById('unified-invoice-modal') as HTMLDialogElement;
    if (modal) {
      if (isOpen && invoiceId) {
        modal.showModal();
      } else {
        modal.close();
      }
    }
  }, [isOpen, invoiceId]);

  // 获取状态标签样式
  const getStatusBadge = (status: string) => {
    const statusMap = {
      'draft': { class: 'badge-warning', text: '草稿' },
      'pending': { class: 'badge-info', text: '处理中' },
      'completed': { class: 'badge-success', text: '已完成' },
      'failed': { class: 'badge-error', text: '失败' }
    };
    return statusMap[status as keyof typeof statusMap] || { class: 'badge-neutral', text: status };
  };

  // 获取来源标签样式
  const getSourceBadge = (source: string) => {
    const sourceMap = {
      'upload': { class: 'badge-primary', text: '上传', icon: FileCheck },
      'email': { class: 'badge-secondary', text: '邮件', icon: FileText },
      'api': { class: 'badge-accent', text: 'API', icon: FileText }
    };
    return sourceMap[source as keyof typeof sourceMap] || { class: 'badge-neutral', text: source, icon: FileText };
  };

  // 处理字段值变化
  const handleFieldChange = (key: string, value: any) => {
    setEditData(prev => ({ ...prev, [key]: value }));
    
    // 清除对应字段的错误
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  // 处理标签添加
  const handleAddTag = (key: string, tag: string) => {
    const currentTags = Array.isArray(editData[key]) ? editData[key] : [];
    if (!currentTags.includes(tag)) {
      handleFieldChange(key, [...currentTags, tag]);
    }
  };

  // 处理标签删除
  const handleRemoveTag = (key: string, tag: string) => {
    const currentTags = Array.isArray(editData[key]) ? editData[key] : [];
    handleFieldChange(key, currentTags.filter((t: string) => t !== tag));
  };

  // 验证表单
  const validateForm = (): boolean => {
    if (!invoice) return false;

    const config = getInvoiceConfig(invoice);
    const newErrors: EditFormErrors = {};

    config.groups.forEach(group => {
      group.fields.forEach(field => {
        const value = editData[field.key];
        const error = validateField(value, field);
        if (error) {
          newErrors[field.key] = error;
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理模式切换
  const handleModeChange = (newMode: ModalMode) => {
    setCurrentMode(newMode);
    onModeChange?.(newMode);
    
    if (newMode === 'view') {
      // 切换到查看模式时清除编辑状态
      setErrors({});
    }
  };

  // 处理保存
  const handleSave = async () => {
    if (!validateForm() || !invoice) {
      return;
    }

    try {
      // 构建更新数据
      const updateData: Partial<Invoice> = {};
      const config = getInvoiceConfig(invoice);

      // 根据字段配置构建更新数据
      config.groups.forEach(group => {
        group.fields.forEach(field => {
          if (field.type !== 'readonly' && editData[field.key] !== undefined) {
            const value = editData[field.key];
            
            // 根据字段类型处理值
            if (field.type === 'currency' || field.type === 'number') {
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                // 映射到发票字段
                if (field.key === 'total_amount' || field.key === 'fare') {
                  updateData.total_amount = numValue;
                } else if (field.key === 'amount_without_tax') {
                  updateData.amount_without_tax = numValue;
                } else if (field.key === 'tax_amount') {
                  updateData.tax_amount = numValue;
                }
              }
            } else if (field.type === 'date') {
              if (field.key === 'invoice_date') {
                updateData.invoice_date = value;
              }
            } else if (field.type === 'text' || field.type === 'textarea') {
              // 映射到发票字段
              if (field.key === 'invoice_number' || field.key === 'ticket_number') {
                updateData.invoice_number = value;
              } else if (field.key === 'invoice_code' || field.key === 'electronic_ticket_number') {
                updateData.invoice_code = value;
              } else if (field.key === 'seller_name') {
                updateData.seller_name = value;
              } else if (field.key === 'seller_tax_number') {
                updateData.seller_tax_number = value;
              } else if (field.key === 'buyer_name' || field.key === 'passenger_name') {
                updateData.buyer_name = value;
              } else if (field.key === 'buyer_tax_number' || field.key === 'buyer_credit_code') {
                updateData.buyer_tax_number = value;
              } else if (field.key === 'remarks') {
                updateData.remarks = value;
              } else if (field.key === 'notes') {
                updateData.notes = value;
              }
            } else if (field.type === 'tags') {
              updateData.tags = value;
            }
          }
        });
      });

      console.log('保存发票数据:', updateData);

      await updateInvoiceMutation.mutateAsync({
        id: invoice.id,
        data: updateData
      });

      // 显示成功动画
      setShowSuccess(true);
      
      // 延迟执行后续操作
      setTimeout(() => {
        onSuccess?.();
        handleModeChange('view');
        // 刷新数据
        refetch();
      }, 1500);

    } catch (error: any) {
      notify.error(error.message || '发票更新失败');
    }
  };

  // 处理下载
  const handleDownload = async () => {
    if (!invoice) return;
    await downloadSingle(invoice);
  };

  // 处理关闭
  const handleClose = () => {
    setErrors({});
    setCurrentMode('view');
    onClose();
  };

  // 处理取消编辑
  const handleCancelEdit = () => {
    setErrors({});
    handleModeChange('view');
  };

  return (
    <>
      <dialog id="unified-invoice-modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box w-full max-w-4xl mx-4 sm:mx-auto h-[90vh] sm:h-auto">
          {/* 关闭按钮 */}
          <form method="dialog">
            <button 
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </button>
          </form>

          {/* 标题 */}
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {currentMode === 'edit' ? '编辑发票' : '发票详情'}
          </h3>

          {/* 内容区域 */}
          <div className="py-4 overflow-y-auto max-h-[calc(90vh-180px)] sm:max-h-[calc(80vh-180px)]">
            {isLoading ? (
              <InvoiceDetailSkeleton />
            ) : error ? (
              // 错误状态
              <div className="text-center py-8">
                <div className="flex flex-col items-center gap-4">
                  <AlertCircle className="w-12 h-12 text-error" />
                  <div>
                    <h3 className="text-lg font-medium text-base-content/60 mb-2">
                      加载失败
                    </h3>
                    <p className="text-base-content/40 mb-4">
                      {error?.message || '获取发票详情时出现错误'}
                    </p>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => refetch()}
                    >
                      <RefreshCw className="w-4 h-4" />
                      重试
                    </button>
                  </div>
                </div>
              </div>
            ) : invoice ? (
              <div className="space-y-4">
                {/* 状态和来源标签 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className={`badge ${getStatusBadge(invoice.status).class} gap-2`}>
                    <Clock className="w-3 h-3" />
                    {getStatusBadge(invoice.status).text}
                  </div>
                  {invoice.source && (
                    <div className={`badge ${getSourceBadge(invoice.source).class} gap-2`}>
                      {React.createElement(getSourceBadge(invoice.source).icon, { className: "w-3 h-3" })}
                      {getSourceBadge(invoice.source).text}
                    </div>
                  )}
                  {invoice.processing_status && (
                    <div className="badge badge-outline gap-2">
                      <span className="loading loading-spinner loading-xs"></span>
                      {invoice.processing_status}
                    </div>
                  )}
                  {invoice.is_verified && (
                    <div className="badge badge-success gap-2">
                      <CheckCircle className="w-3 h-3" />
                      已验证
                    </div>
                  )}
                </div>
                
                {/* 使用自适应字段组件显示发票信息 */}
                <AdaptiveInvoiceFields
                  invoice={invoice}
                  mode={currentMode}
                  editData={currentMode === 'edit' ? editData : undefined}
                  onFieldChange={handleFieldChange}
                  errors={errors}
                  onRemoveTag={handleRemoveTag}
                  onAddTag={handleAddTag}
                />
              </div>
            ) : null}
          </div>

          {/* 操作按钮 */}
          <div className="modal-action">
            {currentMode === 'view' ? (
              // 查看模式按钮
              <>
                <button className="btn" onClick={handleClose}>关闭</button>
                {invoice && (
                  <>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleModeChange('edit')}
                    >
                      <Edit2 className="w-4 h-4" />
                      编辑
                    </button>
                    <LoadingButton
                      variant="success"
                      icon={<Download className="w-4 h-4" />}
                      onClick={handleDownload}
                      isLoading={isExporting}
                      loadingText="下载中..."
                      disabled={isExporting}
                    >
                      下载
                    </LoadingButton>
                  </>
                )}
              </>
            ) : (
              // 编辑模式按钮
              <>
                <button
                  className="btn"
                  onClick={handleCancelEdit}
                  disabled={updateInvoiceMutation.isPending}
                >
                  取消
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => handleModeChange('view')}
                  disabled={updateInvoiceMutation.isPending}
                >
                  <Eye className="w-4 h-4" />
                  预览
                </button>
                <LoadingButton
                  variant="primary"
                  icon={<Save className="w-4 h-4" />}
                  onClick={handleSave}
                  isLoading={updateInvoiceMutation.isPending}
                  loadingText="保存中..."
                  disabled={updateInvoiceMutation.isPending}
                >
                  保存
                </LoadingButton>
              </>
            )}
          </div>
        </div>

        {/* 背景遮罩 */}
        <form method="dialog" className="modal-backdrop">
          <button onClick={handleClose}>close</button>
        </form>
      </dialog>

      {/* 下载进度模态框 */}
      {isOpen && (
        <DownloadProgressModal
          isOpen={isProgressModalOpen}
          onClose={closeProgressModal}
          onCancel={cancelDownload}
          downloads={downloads}
          totalProgress={totalProgress}
          canCancel={isExporting}
          title="发票下载"
        />
      )}
      
      {/* 成功动画 */}
      <SuccessAnimation
        show={showSuccess}
        message="发票更新成功"
        onComplete={() => setShowSuccess(false)}
      />
    </>
  );
};

export default UnifiedInvoiceModal;