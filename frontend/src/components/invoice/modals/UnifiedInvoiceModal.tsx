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
  CheckCircle,
  Trash2,
  Share2
} from 'lucide-react';
import { useInvoice, useUpdateInvoice } from '../../../hooks/useInvoices';
import { AdaptiveInvoiceFields } from '../fields/AdaptiveInvoiceFields';
import { InvoiceDetailSkeleton } from '../../ui/SkeletonLoader';
import { LoadingButton } from '../../ui/LoadingButton';
import { SuccessAnimation } from '../../ui/SuccessAnimation';
import { MobileOptimizedModal } from '../../ui/MobileOptimizedModal';
import { useExport } from '../../../hooks/useExport';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';
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
  // 设备检测
  const device = useDeviceDetection();
  
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
      console.log('🔍 [UnifiedInvoiceModal] 发票数据:', invoice);
      console.log('🔍 [UnifiedInvoiceModal] 金额字段:', {
        amount_without_tax: invoice.amount_without_tax,
        tax_amount: invoice.tax_amount,
        total_amount: invoice.total_amount
      });
      console.log('🔍 [UnifiedInvoiceModal] invoice_details 字段:', {
        type: typeof invoice.invoice_details,
        value: invoice.invoice_details,
        isArray: Array.isArray(invoice.invoice_details)
      });
      
      const config = getInvoiceConfig(invoice);
      const initialData: EditFormData = {};

      // 根据字段配置初始化编辑数据
      config.groups.forEach(group => {
        group.fields.forEach(field => {
          const value = getFieldValue(invoice, field);
          
          // 调试日志：输出字段值
          if (field.key === 'consumption_date' || field.key === 'departure_time') {
            console.log(`🔍 [UnifiedInvoiceModal] 字段 ${field.key}:`, {
              field,
              value,
              paths: field.valuePaths,
              invoice_type: invoice.invoice_type
            });
          }
          
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

  // 数据自动保存（移动端优化）
  useEffect(() => {
    if (!device.isMobile || currentMode !== 'edit' || !invoice) return;

    const saveTimer = setTimeout(() => {
      // 自动保存逻辑（可选实现）
      console.log('🔄 [UnifiedInvoiceModal] 移动端自动保存检查');
    }, 5000);

    return () => clearTimeout(saveTimer);
  }, [editData, device.isMobile, currentMode, invoice]);

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
    console.log('🔧 [UnifiedInvoiceModal] 开始保存发票...');
    
    if (!validateForm() || !invoice) {
      console.log('❌ [UnifiedInvoiceModal] 表单验证失败或发票不存在');
      return;
    }

    try {
      // 构建更新数据
      const updateData: Partial<Invoice> = {};
      const config = getInvoiceConfig(invoice);

      console.log('📝 [UnifiedInvoiceModal] 当前编辑数据:', editData);

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
              } else if (field.key === 'consumption_date' || field.key === 'travel_date' || field.key === 'flight_date') {
                updateData.consumption_date = value;
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
            } else if (field.type === 'category') {
              // 处理分类字段
              if (field.key === 'expense_category') {
                updateData.expense_category = value;
              }
            }
          }
        });
      });

      console.log('💾 [UnifiedInvoiceModal] 准备保存的数据:', updateData);
      console.log('🆔 [UnifiedInvoiceModal] 发票ID:', invoice.id);

      const result = await updateInvoiceMutation.mutateAsync({
        id: invoice.id,
        data: updateData
      });

      console.log('✅ [UnifiedInvoiceModal] 保存成功:', result);

      // 显示成功动画
      setShowSuccess(true);
      notify.success('发票保存成功');
      
      // 延迟执行后续操作
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.();
        handleModeChange('view');
        // 刷新数据
        refetch();
      }, 1500);

    } catch (error: any) {
      console.error('❌ [UnifiedInvoiceModal] 保存失败:', error);
      notify.error(error.message || '发票更新失败');
    }
  };

  // 处理下载
  const handleDownload = async () => {
    if (!invoice) return;
    if (device.isMobile) {
      // 移动端触觉反馈
      if ('vibrate' in navigator) {
        navigator.vibrate([10]);
      }
    }
    await downloadSingle(invoice);
  };

  // 处理删除（新增功能）
  const handleDelete = async () => {
    if (!invoice) return;
    
    // TODO: 实现删除功能
    console.log('🗑️ [UnifiedInvoiceModal] 删除发票:', invoice.id);
    notify.info('删除功能待实现');
  };

  // 处理分享（新增功能）
  const handleShare = async () => {
    if (!invoice) return;
    
    if (navigator.share && device.isMobile) {
      try {
        await navigator.share({
          title: `发票 - ${invoice.invoice_number || '未知'}`,
          text: `发票金额: ¥${invoice.total_amount || 0}`,
          url: window.location.href
        });
      } catch (error) {
        console.log('分享取消或失败');
      }
    } else {
      // 降级到复制链接
      navigator.clipboard?.writeText(window.location.href);
      notify.success('链接已复制到剪贴板');
    }
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

  // 更多操作菜单选项
  const moreOptions = [
    {
      label: '分享',
      icon: <Share2 className="w-4 h-4" />,
      onClick: handleShare
    },
    {
      label: '删除',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDelete,
      variant: 'error' as const
    }
  ];

  // 底部操作按钮
  const renderBottomActions = () => {
    if (currentMode === 'view') {
      return (
        <>
          <button className="btn" onClick={handleClose}>
            关闭
          </button>
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
      );
    } else {
      return (
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
      );
    }
  };

  return (
    <>
      <MobileOptimizedModal
        isOpen={isOpen}
        onClose={handleClose}
        title={currentMode === 'edit' ? '编辑发票' : '发票详情'}
        showMoreButton={currentMode === 'view' && !!invoice}
        moreOptions={moreOptions}
        enableSwipeToClose={true}
        bottomActions={renderBottomActions()}
      >
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
      </MobileOptimizedModal>

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