/**
 * 懒加载模态框组件集合
 * 减少初始加载时间，提高交互响应速度
 */
import React from 'react';
import { withLazyLoading, LazyModal } from '../common/LazyComponent';

// 懒加载发票模态框
export const LazyInvoiceModal = withLazyLoading(
  () => import('../invoice/modals/UnifiedInvoiceModal'),
  { name: 'InvoiceModal' }
);

// 懒加载发票删除确认模态框
export const LazyDeleteConfirmModal = withLazyLoading(
  () => import('../invoice/DeleteConfirmModal'),
  { name: 'DeleteConfirmModal' }
);

// 懒加载高级搜索模态框
export const LazyAdvancedSearchModal = withLazyLoading(
  () => import('../invoice/AdvancedSearchModal'),
  { name: 'AdvancedSearchModal' }
);

// 懒加载导出进度模态框
export const LazyExportProgressModal = withLazyLoading(
  () => import('../invoice/ExportProgressModal'),
  { name: 'ExportProgressModal' }
);

// 懒加载邮件详情模态框
export const LazyEmailDetailModal = withLazyLoading(
  () => import('../inbox/EmailDetailModal'),
  { name: 'EmailDetailModal' }
);


// 创建条件渲染的懒加载模态框
export const ConditionalLazyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  modalType: 'invoice' | 'delete' | 'search' | 'export' | 'email';
  props?: any;
}> = ({ isOpen, onClose, modalType, props = {} }) => {
  if (!isOpen) return null;

  const modalComponents = {
    invoice: LazyInvoiceModal,
    delete: LazyDeleteConfirmModal,
    search: LazyAdvancedSearchModal,
    export: LazyExportProgressModal,
    email: LazyEmailDetailModal,
  };

  const ModalComponent = modalComponents[modalType];
  
  return (
    <LazyModal isOpen={isOpen} name={modalType}>
      <ModalComponent onClose={onClose} {...props} />
    </LazyModal>
  );
};