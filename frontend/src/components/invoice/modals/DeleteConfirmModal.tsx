import React, { useEffect, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useDeleteInvoice } from '../../../hooks/useInvoices';
import { notify } from '../../../utils/notifications';
import { LoadingButton } from '../../ui/LoadingButton';
import { SuccessAnimation } from '../../ui/SuccessAnimation';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  invoiceIds: string[];
  invoiceNumbers: string[];
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  invoiceIds,
  invoiceNumbers
}) => {
  const deleteInvoiceMutation = useDeleteInvoice();
  const isBatch = invoiceIds.length > 1;
  const [showSuccess, setShowSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 控制模态框显示
  useEffect(() => {
    const modal = document.getElementById('delete-confirm-modal') as HTMLDialogElement;
    if (modal) {
      if (isOpen && invoiceIds.length > 0) {
        modal.showModal();
      } else {
        modal.close();
      }
    }
  }, [isOpen, invoiceIds]);

  // 处理删除
  const handleDelete = async () => {
    // 防止重复点击
    if (isDeleting || deleteInvoiceMutation.isPending) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      // 批量删除时逐个删除
      if (isBatch) {
        const deletePromises = invoiceIds.map(id => 
          deleteInvoiceMutation.mutateAsync(id)
        );
        
        await Promise.all(deletePromises);
        setShowSuccess(true);
        setTimeout(() => {
          notify.success(`成功删除 ${invoiceIds.length} 张发票`);
          onSuccess?.();
          onClose();
          setIsDeleting(false);
        }, 1500);
      } else {
        // 单个删除
        await deleteInvoiceMutation.mutateAsync(invoiceIds[0]);
        setShowSuccess(true);
        setTimeout(() => {
          notify.success('发票删除成功');
          onSuccess?.();
          onClose();
          setIsDeleting(false);
        }, 1500);
      }
    } catch (error: any) {
      notify.error(error.message || '删除失败，请重试');
      setIsDeleting(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    if (!isDeleting && !deleteInvoiceMutation.isPending) {
      onClose();
    }
  };

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setIsDeleting(false);
      setShowSuccess(false);
    }
  }, [isOpen]);

  return (
    <dialog id="delete-confirm-modal" className="modal modal-bottom sm:modal-middle">
      <div className="modal-box w-full max-w-md mx-4 sm:mx-auto">
        {/* 警告图标 */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-error" />
          </div>
        </div>

        {/* 标题 */}
        <h3 className="font-bold text-lg text-center mb-4">
          确认删除{isBatch ? '发票' : ''}
        </h3>

        {/* 内容 */}
        <div className="text-center mb-6">
          <p className="text-base-content/80 mb-2">
            {isBatch 
              ? `您确定要删除选中的 ${invoiceIds.length} 张发票吗？`
              : '您确定要删除这张发票吗？'
            }
          </p>
          {!isBatch && invoiceNumbers[0] && (
            <p className="text-sm text-base-content/60">
              发票号码：{invoiceNumbers[0]}
            </p>
          )}
          <p className="text-sm text-error mt-3">
            此操作无法撤销，删除后数据将永久丢失。
          </p>
        </div>

        {/* 批量删除时显示发票列表 */}
        {isBatch && (
          <div className="mb-6 max-h-32 overflow-y-auto">
            <div className="bg-base-200 rounded-lg p-3">
              <p className="text-sm font-medium mb-2">将删除以下发票：</p>
              <div className="space-y-1">
                {invoiceNumbers.slice(0, 5).map((number, index) => (
                  <p key={index} className="text-xs text-base-content/70">
                    • {number}
                  </p>
                ))}
                {invoiceNumbers.length > 5 && (
                  <p className="text-xs text-base-content/50">
                    ... 以及其他 {invoiceNumbers.length - 5} 张发票
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleCancel}
            disabled={isDeleting || deleteInvoiceMutation.isPending}
          >
            取消
          </button>
          <LoadingButton
            type="button"
            variant="error"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={handleDelete}
            isLoading={isDeleting || deleteInvoiceMutation.isPending}
            loadingText="删除中..."
            disabled={isDeleting || deleteInvoiceMutation.isPending}
          >
            {isBatch ? `删除 ${invoiceIds.length} 张` : '删除'}
          </LoadingButton>
        </div>
      </div>

      {/* 背景遮罩 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleCancel}>close</button>
      </form>
      
      {/* 成功动画 */}
      <SuccessAnimation
        show={showSuccess}
        message={isBatch ? `已删除 ${invoiceIds.length} 张发票` : '发票已删除'}
        onComplete={() => setShowSuccess(false)}
      />
    </dialog>
  );
};

export default DeleteConfirmModal;