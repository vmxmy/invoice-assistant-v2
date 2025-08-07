import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Search, Filter } from 'lucide-react';
import VirtualizedInvoiceList from './VirtualizedInvoiceList';
import PullToRefresh from './PullToRefresh';
import MobileSearch from './MobileSearch';
import MobileQuickActions from './MobileQuickActions';
import { InvoiceCardSkeleton } from './MobileSkeletonLoader';
import { useMediaQuery } from '../../hooks/useMediaQuery';

// 发票数据类型定义（与VirtualizedInvoiceList保持一致）
interface Invoice {
  id: string;
  user_id: string;
  email_task_id?: string;
  invoice_number: string;
  invoice_code?: string;
  invoice_type?: string;
  status: string;
  processing_status?: string;
  amount: number;
  tax_amount?: number;
  total_amount?: number;
  currency: string;
  invoice_date: string;
  consumption_date?: string;
  seller_name?: string;
  seller_tax_id?: string;
  buyer_name?: string;
  buyer_tax_id?: string;
  file_path?: string;
  file_url?: string;
  file_size?: number;
  file_hash?: string;
  source: string;
  source_metadata?: Record<string, any>;
  is_verified: boolean;
  verified_at?: string;
  verified_by?: string;
  verification_notes?: string;
  tags?: string[];
  category?: string;
  remarks?: string;
  expense_category?: string;
  category_icon?: string;
  category_color?: string;
  display_amount?: number;
  category_path?: string;
  started_at?: string;
  completed_at?: string;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  extracted_data: Record<string, any>;
  metadata?: Record<string, any>;
  created_by?: string;
  updated_by?: string;
  version: number;
  secondary_category_name?: string;
  primary_category_name?: string;
}

interface MobileInvoiceManagerProps {
  invoices: Invoice[];
  loading: boolean;
  selectedInvoices: string[];
  onInvoiceSelect: (invoiceId: string) => void;
  onInvoiceView: (invoiceId: string) => void;
  onInvoiceEdit: (invoice: Invoice) => void;
  onInvoiceDelete: (invoice: Invoice) => void;
  onStatusChange?: (invoiceId: string, newStatus: string) => Promise<boolean>;
  onRefresh?: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
  hasNextPage?: boolean;
  isLoadingMore?: boolean;
  onSearch?: (query: string) => void;
  onUpload?: () => void;
  onFilter?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  activeFiltersCount?: number;
}

const MobileInvoiceManager: React.FC<MobileInvoiceManagerProps> = ({
  invoices,
  loading,
  selectedInvoices,
  onInvoiceSelect,
  onInvoiceView,
  onInvoiceEdit,
  onInvoiceDelete,
  onStatusChange,
  onRefresh,
  onLoadMore,
  hasNextPage = false,
  isLoadingMore = false,
  onSearch,
  onUpload,
  onFilter,
  searchValue = '',
  onSearchChange,
  activeFiltersCount = 0,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleRefresh = useCallback(async () => {
    if (refreshing || !onRefresh) return;
    
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, onRefresh]);

  const handleSearchChange = useCallback((value: string) => {
    onSearchChange?.(value);
  }, [onSearchChange]);

  const handleSearch = useCallback((query: string) => {
    onSearch?.(query);
  }, [onSearch]);

  const handleUploadClick = useCallback(() => {
    onUpload?.();
  }, [onUpload]);

  const handleCameraClick = useCallback(() => {
    // 触发摄像头上传
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // 处理摄像头拍摄的文件
        console.log('摄像头拍摄文件:', file);
        onUpload?.();
      }
    };
    input.click();
  }, [onUpload]);

  const handleFileClick = useCallback(() => {
    // 触发文件选择
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        console.log('选择的文件:', files);
        onUpload?.();
      }
    };
    input.click();
  }, [onUpload]);

  // 搜索建议（示例数据）
  const searchSuggestions = [
    { id: '1', text: '餐饮服务', type: 'category' as const },
    { id: '2', text: '交通运输', type: 'category' as const },
    { id: '3', text: '住宿服务', type: 'category' as const },
    { id: '4', text: '办公用品', type: 'category' as const },
  ];

  if (!isMobile) {
    // 桌面端降级到常规组件
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-base-100 mobile-full-container">
      {/* 顶部搜索区域 */}
      <div className="sticky top-0 z-30 bg-base-100 border-b border-base-200 safe-area-top">
        <div className="p-4 pb-2">
          <MobileSearch
            value={searchValue}
            onChange={handleSearchChange}
            onSearch={handleSearch}
            placeholder="搜索发票号、金额或商家..."
            suggestions={searchSuggestions}
            onFilterClick={onFilter}
            activeFiltersCount={activeFiltersCount}
          />
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        {loading && !refreshing ? (
          <div className="p-4">
            <InvoiceCardSkeleton count={5} />
          </div>
        ) : (
          <PullToRefresh
            onRefresh={handleRefresh}
            refreshingText="刷新中..."
            pullText="下拉刷新"
            releaseText="释放更新"
          >
            {invoices.length === 0 && !loading ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-96 text-base-content/60 p-8"
              >
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-lg font-medium mb-2 text-center">暂无发票数据</h3>
                <p className="text-sm text-center mb-6">
                  {searchValue ? '没有找到匹配的发票' : '上传第一个发票开始使用'}
                </p>
                {!searchValue && (
                  <button
                    onClick={handleUploadClick}
                    className="btn btn-primary btn-wide"
                  >
                    <Upload className="w-5 h-5" />
                    上传发票
                  </button>
                )}
              </motion.div>
            ) : (
              <VirtualizedInvoiceList
                invoices={invoices}
                selectedInvoices={selectedInvoices}
                onInvoiceSelect={onInvoiceSelect}
                onInvoiceView={onInvoiceView}
                onInvoiceEdit={onInvoiceEdit}
                onInvoiceDelete={onInvoiceDelete}
                onStatusChange={onStatusChange}
                hasNextPage={hasNextPage}
                isNextPageLoading={isLoadingMore}
                loadNextPage={onLoadMore}
              />
            )}
          </PullToRefresh>
        )}
      </div>

      {/* 快捷操作按钮 */}
      <MobileQuickActions
        onUploadClick={handleUploadClick}
        onCameraClick={handleCameraClick}
        onFileClick={handleFileClick}
      />

      {/* 底部选择操作栏 */}
      {selectedInvoices.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-primary text-primary-content p-4 safe-area-bottom z-40"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">
              已选择 {selectedInvoices.length} 个发票
            </span>
            <div className="flex gap-2">
              <button className="btn btn-sm btn-ghost text-primary-content">
                批量删除
              </button>
              <button className="btn btn-sm btn-ghost text-primary-content">
                导出
              </button>
              <button 
                className="btn btn-sm btn-ghost text-primary-content"
                onClick={() => selectedInvoices.forEach(() => {})}
              >
                取消选择
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MobileInvoiceManager;