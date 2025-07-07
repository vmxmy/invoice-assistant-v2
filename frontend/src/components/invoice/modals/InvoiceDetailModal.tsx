import React, { useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Building2, 
  User, 
  DollarSign,
  Tag,
  Clock,
  FileCheck,
  X,
  Receipt,
  AlertCircle,
  RefreshCw,
  Download
} from 'lucide-react';
import { useInvoice } from '../../../hooks/useInvoices';
import { formatCurrency, formatDate } from '../../../utils/format';
import InvoiceTypeDetails, { getInvoiceTypeName, getInvoiceTypeIcon } from '../details/InvoiceTypeDetails';
import { InvoiceDetailSkeleton } from '../../ui/SkeletonLoader';
import { useExport } from '../../../hooks/useExport';
import DownloadProgressModal from '../../ui/DownloadProgressModal';
import { LoadingButton } from '../../ui/LoadingButton';

interface InvoiceDetailModalProps {
  invoiceId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoiceId,
  isOpen,
  onClose
}) => {
  // 获取发票详情数据
  const { data: invoice, isLoading, error } = useInvoice(invoiceId || '');
  
  // 导出功能 - 只在模态框打开时启用
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

  // 调试日志 - 检查是否与InvoiceListPage冲突
  if (isOpen) {
    console.log('[InvoiceDetailModal] export state (modal open):', { 
      isExporting, 
      isProgressModalOpen, 
      totalProgress,
      downloadsCount: downloads.length 
    });
  }

  // 键盘事件处理 - ESC关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // 控制模态框显示
  useEffect(() => {
    const modal = document.getElementById('invoice-detail-modal') as HTMLDialogElement;
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

  // 处理下载
  const handleDownload = async () => {
    if (!invoice) return;
    await downloadSingle(invoice);
  };

  return (
    <dialog id="invoice-detail-modal" className="modal modal-bottom sm:modal-middle">
      <div className="modal-box w-full max-w-3xl mx-4 sm:mx-auto">
        {/* 关闭按钮 */}
        <form method="dialog">
          <button 
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        {/* 标题 */}
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          发票详情
        </h3>

        {/* 内容区域 */}
        <div className="py-4">
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
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="w-4 h-4" />
                    重试
                  </button>
                </div>
              </div>
            </div>
          ) : invoice ? (
            // 发票详情内容
            <div className="space-y-6">
              {/* 状态和来源标签 */}
              <div className="flex flex-wrap gap-2">
                <div className={`badge ${getStatusBadge(invoice.status).class} gap-2`}>
                  <Clock className="w-3 h-3" />
                  {getStatusBadge(invoice.status).text}
                </div>
                <div className={`badge ${getSourceBadge(invoice.source).class} gap-2`}>
                  {React.createElement(getSourceBadge(invoice.source).icon, { className: "w-3 h-3" })}
                  {getSourceBadge(invoice.source).text}
                </div>
                {/* 发票类型标签 */}
                {invoice.invoice_type && (
                  <div className="badge badge-accent gap-2">
                    <span>{getInvoiceTypeIcon(invoice.invoice_type)}</span>
                    {getInvoiceTypeName(invoice.invoice_type)}
                  </div>
                )}
                {invoice.processing_status && (
                  <div className="badge badge-outline gap-2">
                    <span className="loading loading-spinner loading-xs"></span>
                    {invoice.processing_status}
                  </div>
                )}
              </div>

              {/* 基本信息网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 发票号码 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      发票号码
                    </span>
                  </label>
                  <input 
                    type="text" 
                    value={invoice.invoice_number} 
                    className="input input-bordered" 
                    readOnly 
                  />
                </div>

                {/* 开票日期 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      开票日期
                    </span>
                  </label>
                  <input 
                    type="text" 
                    value={formatDate(invoice.invoice_date)} 
                    className="input input-bordered" 
                    readOnly 
                  />
                </div>

                {/* 销售方 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      销售方名称
                    </span>
                  </label>
                  <input 
                    type="text" 
                    value={invoice.seller_name} 
                    className="input input-bordered" 
                    readOnly 
                  />
                </div>

                {/* 购买方 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <User className="w-4 h-4" />
                      购买方名称
                    </span>
                  </label>
                  <input 
                    type="text" 
                    value={invoice.buyer_name} 
                    className="input input-bordered" 
                    readOnly 
                  />
                </div>

                {/* 发票金额 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      发票金额
                    </span>
                  </label>
                  <input 
                    type="text" 
                    value={formatCurrency(invoice.total_amount)} 
                    className="input input-bordered text-success font-bold" 
                    readOnly 
                  />
                </div>

                {/* 创建时间 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      创建时间
                    </span>
                  </label>
                  <input 
                    type="text" 
                    value={new Date(invoice.created_at).toLocaleString('zh-CN')} 
                    className="input input-bordered" 
                    readOnly 
                  />
                </div>
              </div>

              {/* 发票类型专有信息 */}
              <InvoiceTypeDetails invoice={invoice} />

              {/* 标签 */}
              {invoice.tags && invoice.tags.length > 0 && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      标签
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-base-200 rounded-lg">
                    {invoice.tags.map((tag, index) => (
                      <div key={index} className="badge badge-outline">
                        {tag}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 附加信息 */}
              {invoice.notes && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">备注</span>
                  </label>
                  <textarea 
                    value={invoice.notes} 
                    className="textarea textarea-bordered h-24" 
                    readOnly 
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* 操作按钮 */}
        <div className="modal-action">
          <form method="dialog">
            <button className="btn" onClick={onClose}>关闭</button>
          </form>
          {invoice && (
            <>
              <button className="btn btn-primary">编辑</button>
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
        </div>
      </div>

      {/* 背景遮罩 - 点击关闭 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
      
      {/* 下载进度模态框 - 只在主模态框打开时渲染 */}
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
    </dialog>
  );
};

export default InvoiceDetailModal;