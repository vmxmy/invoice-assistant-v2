import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  Calendar,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Download,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/apiClient';
import Layout from '../components/layout/Layout';
import UnifiedInvoiceModal, { type ModalMode } from '../components/invoice/modals/UnifiedInvoiceModal';
import DeleteConfirmModal from '../components/invoice/modals/DeleteConfirmModal';
import { AdvancedSearchDrawer } from '../components/invoice/search/AdvancedSearchDrawer';
import type { SearchFilters } from '../components/invoice/search/AdvancedSearchDrawer';
import FilterPanel from '../components/invoice/search/FilterPanel';
import { getInvoiceTypeName, getInvoiceTypeIcon } from '../config/invoiceFieldsConfig';
import { InvoiceListSkeleton } from '../components/ui/SkeletonLoader';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { notify } from '../utils/notifications';
import { useDebounce } from '../hooks/useDebounce';
import InvoiceListView from '../components/invoice/cards/InvoiceListView';
import InvoiceTableView from '../components/invoice/table/InvoiceTableView';
import { useExport } from '../hooks/useExport';
import DownloadProgressModal from '../components/ui/DownloadProgressModal';
import type { Invoice as InvoiceType } from '../types/table';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  consumption_date?: string;
  seller_name: string;
  buyer_name: string;
  total_amount: number;
  status: string;
  processing_status: string;
  source: string;
  invoice_type?: string;
  created_at: string;
  tags: string[];
  extracted_data?: {
    structured_data?: {
      total_amount?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

interface InvoiceListResponse {
  items: Invoice[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

const InvoiceListPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // 500ms 防抖
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [useTableView, setUseTableView] = useState(true); // 新增：控制表格视图
  
  // 高级搜索状态
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  
  // 统一模态框状态
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  
  // 删除确认模态框状态
  const [deleteInvoiceIds, setDeleteInvoiceIds] = useState<string[]>([]);
  const [deleteInvoiceNumbers, setDeleteInvoiceNumbers] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // 导出功能
  const {
    downloadBatch,
    isExporting,
    isProgressModalOpen,
    downloads,
    totalProgress,
    closeProgressModal,
    cancelDownload
  } = useExport();
  
  // 调试日志
  console.log('[InvoiceListPage] export state:', { 
    isExporting, 
    isProgressModalOpen, 
    totalProgress,
    downloadsCount: downloads.length 
  });

  // 获取发票列表
  const { data: invoicesData, isLoading, error, refetch, isError, isFetching } = useQuery({
    queryKey: ['invoices', currentPage, pageSize, debouncedSearchQuery, searchFilters],
    queryFn: async (): Promise<InvoiceListResponse> => {
      // 处理参数格式
      const params: any = {
        page: currentPage,
        page_size: pageSize
      };
      
      // 处理基础搜索查询
      if (debouncedSearchQuery) {
        params.query = debouncedSearchQuery;
      }
      
      // 处理高级搜索参数
      if (searchFilters.invoiceNumber) {
        params.invoice_number = searchFilters.invoiceNumber;
      }
      if (searchFilters.sellerName) {
        params.seller_name = searchFilters.sellerName;
      }
      if (searchFilters.buyerName) {
        // 后端不支持buyer_name参数，需要将买方名称也加入到query参数中
        // 如果已经有query参数，拼接起来；否则直接使用buyerName
        if (params.query) {
          params.query = `${params.query} ${searchFilters.buyerName}`;
        } else {
          params.query = searchFilters.buyerName;
        }
      }
      if (searchFilters.amountMin !== undefined) {
        params.amount_min = searchFilters.amountMin;
      }
      if (searchFilters.amountMax !== undefined) {
        params.amount_max = searchFilters.amountMax;
      }
      if (searchFilters.dateFrom) {
        params.date_from = searchFilters.dateFrom;
      }
      if (searchFilters.dateTo) {
        params.date_to = searchFilters.dateTo;
      }
      if (searchFilters.status && searchFilters.status.length > 0) {
        // 后端只支持单个状态，取第一个
        params.status = searchFilters.status[0];
      }
      if (searchFilters.source && searchFilters.source.length > 0) {
        // 后端只支持单个来源，取第一个
        params.source = searchFilters.source[0];
      }
      
      console.log('API调用参数:', params);
      const response = await api.invoices.list(params);
      
      // 数据去重保护
      const uniqueInvoices = Array.from(
        new Map(response.data.items.map(item => [item.id, item])).values()
      );
      
      return {
        ...response.data,
        items: uniqueInvoices
      };
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // 对于网络错误重试3次，其他错误不重试
      if (failureCount < 3 && error instanceof Error && error.message.includes('网络')) {
        return true;
      }
      return false;
    },
    onError: (error: any) => {
      notify.error(error.message || '获取发票列表失败，请重试');
    }
  });

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const handleSelectAll = (invoiceIds?: string[]) => {
    if (invoiceIds !== undefined) {
      // 从表格组件传入的ID列表
      console.log('[handleSelectAll] Setting selectedInvoices to:', invoiceIds);
      // 确保是数组
      if (Array.isArray(invoiceIds)) {
        setSelectedInvoices(invoiceIds);
      } else {
        console.error('[handleSelectAll] invoiceIds is not an array:', invoiceIds);
        setSelectedInvoices([]);
      }
    } else {
      // 原来的逻辑（用于其他地方调用）
      if (selectedInvoices.length === invoicesData?.items.length && invoicesData?.items.length > 0) {
        setSelectedInvoices([]);
      } else {
        setSelectedInvoices(invoicesData?.items.map(inv => inv.id) || []);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'draft': 'badge-warning',
      'pending': 'badge-info', 
      'completed': 'badge-success',
      'failed': 'badge-error'
    };
    return statusMap[status as keyof typeof statusMap] || 'badge-neutral';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 查看发票详情
  const handleViewInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setModalMode('view');
    setIsModalOpen(true);
  };

  // 编辑发票
  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoiceId(invoice.id);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // 关闭模态框
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedInvoiceId(null);
    setModalMode('view');
  };

  // 模态框操作成功回调
  const handleModalSuccess = () => {
    refetch(); // 刷新发票列表
  };

  // 模态框模式变化回调
  const handleModeChange = (mode: ModalMode) => {
    setModalMode(mode);
  };

  // 删除单个发票
  const handleDeleteInvoice = (invoice: Invoice) => {
    setDeleteInvoiceIds([invoice.id]);
    setDeleteInvoiceNumbers([invoice.invoice_number]);
    setIsDeleteModalOpen(true);
  };

  // 批量删除发票
  const handleBatchDelete = () => {
    if (selectedInvoices.length === 0) {
      notify.warning('请先选择要删除的发票');
      return;
    }
    
    // 防止重复点击
    if (isDeleteModalOpen) return;
    
    const selectedInvoiceData = invoicesData?.items.filter(inv => 
      selectedInvoices.includes(inv.id)
    ) || [];
    
    setDeleteInvoiceIds(selectedInvoices);
    setDeleteInvoiceNumbers(selectedInvoiceData.map(inv => inv.invoice_number));
    setIsDeleteModalOpen(true);
  };

  // 关闭删除模态框
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteInvoiceIds([]);
    setDeleteInvoiceNumbers([]);
  };

  // 删除成功回调
  const handleDeleteSuccess = () => {
    setSelectedInvoices([]); // 清空选中项
    refetch(); // 刷新发票列表
  };

  // 高级搜索处理
  const handleAdvancedSearch = (filters: SearchFilters) => {
    setSearchFilters(filters);
    setCurrentPage(1); // 重置到第一页
  };

  // 计算活跃的筛选数量
  const activeFilterCount = Object.values(searchFilters).filter(value => 
    value !== undefined && value !== '' && 
    !(Array.isArray(value) && value.length === 0)
  ).length;

  // 移除单个筛选条件
  const handleRemoveFilter = (filterKey: keyof SearchFilters) => {
    const newFilters = { ...searchFilters };
    
    // 对于数组类型的筛选，特殊处理
    if (filterKey === 'status' || filterKey === 'source') {
      delete newFilters[filterKey];
    } else {
      delete newFilters[filterKey];
    }
    
    setSearchFilters(newFilters);
    setCurrentPage(1);
  };

  // 清除所有筛选条件
  const handleClearAllFilters = () => {
    setSearchFilters({});
    setCurrentPage(1);
  };

  // 批量导出发票
  const handleBatchExport = async () => {
    if (selectedInvoices.length === 0) {
      notify.warning('请先选择要导出的发票');
      return;
    }
    
    const selectedInvoiceData = invoicesData?.items.filter(inv => 
      selectedInvoices.includes(inv.id)
    ) || [];
    
    await downloadBatch(selectedInvoiceData);
    
    // 导出成功后清空选中项
    setSelectedInvoices([]);
  };

  // 批量操作处理
  const handleBulkAction = async (action: string, invoiceIds: string[]) => {
    switch (action) {
      case 'export':
        const selectedInvoiceData = invoicesData?.items.filter(inv => 
          invoiceIds.includes(inv.id)
        ) || [];
        await downloadBatch(selectedInvoiceData);
        setSelectedInvoices([]);
        break;
      case 'delete':
        const selectedInvoiceNumbers = invoicesData?.items
          .filter(inv => invoiceIds.includes(inv.id))
          .map(inv => inv.invoice_number) || [];
        setDeleteInvoiceIds(invoiceIds);
        setDeleteInvoiceNumbers(selectedInvoiceNumbers);
        setIsDeleteModalOpen(true);
        break;
      default:
        notify.warning('未知的批量操作');
    }
  };

  return (
    <ErrorBoundary>
      <Layout>
      <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和操作 */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-base-content truncate">
              发票管理
            </h1>
            <p className="text-base-content/60 mt-1 text-sm sm:text-base">
              共 {invoicesData?.total || 0} 张发票
              {selectedInvoices.length > 0 && (
                <span className="ml-2 text-primary">
                  (已选择 {selectedInvoices.length} 张)
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button className="btn btn-primary btn-sm sm:btn-md">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">新建发票</span>
            </button>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <div className="flex-1">
                <div className="join w-full">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="搜索发票号、销售方..."
                      className="input input-bordered input-sm sm:input-md join-item w-full pr-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isFetching && searchQuery && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className="loading loading-spinner loading-xs"></span>
                      </div>
                    )}
                  </div>
                  <button 
                    className="btn btn-primary btn-sm sm:btn-md join-item"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <button 
                className="btn btn-outline btn-sm sm:btn-md flex-shrink-0"
                onClick={() => setIsAdvancedSearchOpen(true)}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">筛选</span>
                {activeFilterCount > 0 && (
                  <span className="badge badge-sm badge-primary">{activeFilterCount}</span>
                )}
              </button>
              
              {/* 视图切换按钮 - 仅桌面端显示 */}
              <div className="hidden lg:flex items-center gap-2 ml-2">
                <button
                  className={`btn btn-sm ${!useTableView ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setUseTableView(false)}
                  title="卡片视图"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
                    <line x1="9" y1="3" x2="9" y2="21" strokeWidth="2"/>
                    <line x1="3" y1="9" x2="21" y2="9" strokeWidth="2"/>
                  </svg>
                </button>
                <button
                  className={`btn btn-sm ${useTableView ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setUseTableView(true)}
                  title="表格视图"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
                    <line x1="3" y1="8" x2="21" y2="8" strokeWidth="2"/>
                    <line x1="3" y1="13" x2="21" y2="13" strokeWidth="2"/>
                    <line x1="8" y1="3" x2="8" y2="21" strokeWidth="2"/>
                    <line x1="15" y1="3" x2="15" y2="21" strokeWidth="2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 筛选条件展示 */}
        <FilterPanel
          filters={searchFilters}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />

        {/* 发票列表 */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-0">
            {/* 列表头部 - 仅在卡片视图时显示 */}
            {!useTableView && (
              <div className="p-4 border-b border-base-300">
                <div className="flex items-center justify-between">
                  <label className="label cursor-pointer gap-2">
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-sm"
                      checked={selectedInvoices.length === invoicesData?.items.length && invoicesData?.items.length > 0}
                      onChange={() => handleSelectAll()}
                    />
                    <span className="label-text">
                      {selectedInvoices.length > 0 ? `已选择 ${selectedInvoices.length} 项` : '全选'}
                    </span>
                  </label>
                  
                  {selectedInvoices.length > 0 && (
                    <div className="flex gap-2">
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={handleBatchExport}
                        disabled={isExporting}
                      >
                        <Download className="w-3 h-3" />
                        导出
                      </button>
                      <button 
                        className="btn btn-sm btn-error btn-outline"
                        onClick={handleBatchDelete}
                      >
                        <Trash2 className="w-3 h-3" />
                        删除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 发票列表 */}
            {isLoading ? (
              <InvoiceListSkeleton />
            ) : isError ? (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <AlertCircle className="w-12 h-12 text-error" />
                  <div>
                    <h3 className="text-lg font-medium text-base-content/60 mb-2">
                      加载失败
                    </h3>
                    <p className="text-base-content/40 mb-4">
                      {error?.message || '获取发票列表时出现错误'}
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
            ) : useTableView ? (
              // 新的 TanStack Table 视图
              <InvoiceTableView
                invoices={invoicesData?.items || []}
                selectedInvoices={selectedInvoices}
                onSelectInvoice={handleSelectInvoice}
                onSelectAll={handleSelectAll}
                onViewInvoice={handleViewInvoice}
                onEditInvoice={handleEditInvoice}
                onDeleteInvoice={handleDeleteInvoice}
                onBulkAction={handleBulkAction}
                isLoading={isLoading}
                totalCount={invoicesData?.total || 0}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            ) : (
              // 原有的卡片视图
              <InvoiceListView
                invoices={invoicesData?.items || []}
                selectedInvoices={selectedInvoices}
                onSelectInvoice={handleSelectInvoice}
                onViewInvoice={handleViewInvoice}
                onEditInvoice={handleEditInvoice}
                onDeleteInvoice={handleDeleteInvoice}
                isLoading={isLoading}
              />
            )}

            {/* 分页 - 仅在使用卡片视图时显示 */}
            {!useTableView && invoicesData && invoicesData.total > pageSize && (
              <div className="p-3 sm:p-4 border-t border-base-300">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                  {/* 页码信息 */}
                  <p className="text-xs sm:text-sm text-base-content/60 text-center sm:text-left">
                    共 {invoicesData.total} 条记录，第 {currentPage} 页，共 {Math.ceil(invoicesData.total / pageSize)} 页
                  </p>
                  
                  {/* 分页控件 */}
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    {/* 桌面端完整分页 */}
                    <div className="hidden sm:flex items-center gap-2">
                      <button 
                        className="btn btn-sm btn-outline"
                        disabled={!invoicesData.has_prev}
                        onClick={() => setCurrentPage(1)}
                      >
                        首页
                      </button>
                      <button 
                        className="btn btn-sm btn-outline"
                        disabled={!invoicesData.has_prev}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                      >
                        上一页
                      </button>
                      
                      {/* 页码选择 */}
                      <div className="join">
                        {Array.from({ length: Math.min(5, Math.ceil(invoicesData.total / pageSize)) }, (_, i) => {
                          const totalPages = Math.ceil(invoicesData.total / pageSize);
                          let pageNum;
                          
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              className={`join-item btn btn-sm ${pageNum === currentPage ? 'btn-active' : ''}`}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button 
                        className="btn btn-sm btn-outline"
                        disabled={!invoicesData.has_next}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                      >
                        下一页
                      </button>
                      <button 
                        className="btn btn-sm btn-outline"
                        disabled={!invoicesData.has_next}
                        onClick={() => setCurrentPage(Math.ceil(invoicesData.total / pageSize))}
                      >
                        末页
                      </button>
                    </div>

                    {/* 移动端简化分页 */}
                    <div className="flex sm:hidden items-center gap-2">
                      <button 
                        className="btn btn-sm btn-outline"
                        disabled={!invoicesData.has_prev}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                      >
                        上一页
                      </button>
                      <span className="text-sm px-2">
                        {currentPage} / {Math.ceil(invoicesData.total / pageSize)}
                      </span>
                      <button 
                        className="btn btn-sm btn-outline"
                        disabled={!invoicesData.has_next}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 空状态 */}
            {!isLoading && (!invoicesData?.items || invoicesData.items.length === 0) && (
              <div className="p-6 sm:p-8 text-center">
                <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-base-content/20 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-base-content/60 mb-2">
                  暂无发票
                </h3>
                <p className="text-sm sm:text-base text-base-content/40 mb-4 max-w-md mx-auto">
                  {searchQuery ? '未找到匹配的发票，请尝试其他搜索条件' : '开始上传您的第一张发票吧'}
                </p>
                <button className="btn btn-primary btn-sm sm:btn-md">
                  <Plus className="w-4 h-4" />
                  新建发票
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      
      {/* 统一发票模态框 */}
      <UnifiedInvoiceModal
        invoiceId={selectedInvoiceId}
        isOpen={isModalOpen}
        mode={modalMode}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        onModeChange={handleModeChange}
      />
      
      {/* 删除确认模态框 */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onSuccess={handleDeleteSuccess}
        invoiceIds={deleteInvoiceIds}
        invoiceNumbers={deleteInvoiceNumbers}
      />
      
      {/* 高级搜索抽屉 */}
      <AdvancedSearchDrawer
        isOpen={isAdvancedSearchOpen}
        onClose={() => setIsAdvancedSearchOpen(false)}
        onSearch={handleAdvancedSearch}
        currentFilters={searchFilters}
      />
      
      {/* 下载进度模态框 */}
      <DownloadProgressModal
        isOpen={isProgressModalOpen}
        onClose={closeProgressModal}
        onCancel={cancelDownload}
        downloads={downloads}
        totalProgress={totalProgress}
        canCancel={isExporting}
        title="批量导出发票"
      />
      
    </Layout>
    </ErrorBoundary>
  );
};

export default InvoiceListPage;