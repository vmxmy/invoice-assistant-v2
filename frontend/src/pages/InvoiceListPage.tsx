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
  Download
} from 'lucide-react';
import { api } from '../services/apiClient';
import Layout from '../components/layout/Layout';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  seller_name: string;
  buyer_name: string;
  total_amount: number;
  status: string;
  processing_status: string;
  source: string;
  created_at: string;
  tags: string[];
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  // 获取发票列表
  const { data: invoicesData, isLoading, refetch } = useQuery({
    queryKey: ['invoices', currentPage, pageSize, searchQuery],
    queryFn: async (): Promise<InvoiceListResponse> => {
      const response = await api.invoices.list({
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
        ...(searchQuery && { invoice_number: searchQuery })
      });
      return response.data;
    },
  });

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const handleSelectAll = () => {
    if (selectedInvoices.length === invoicesData?.items.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoicesData?.items.map(inv => inv.id) || []);
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

  return (
    <Layout>
      <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和操作 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-base-content">发票管理</h1>
            <p className="text-base-content/60 mt-1">
              共 {invoicesData?.total || 0} 张发票
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <button className="btn btn-primary">
              <Plus className="w-4 h-4" />
              新建发票
            </button>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="join w-full">
                  <input
                    type="text"
                    placeholder="搜索发票号、销售方..."
                    className="input input-bordered join-item flex-1"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button 
                    className="btn btn-primary join-item"
                    onClick={() => refetch()}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button className="btn btn-outline">
                <Filter className="w-4 h-4" />
                筛选
              </button>
            </div>
          </div>
        </div>

        {/* 发票列表 */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-0">
            {/* 列表头部 */}
            <div className="p-4 border-b border-base-300">
              <div className="flex items-center justify-between">
                <label className="label cursor-pointer gap-2">
                  <input 
                    type="checkbox" 
                    className="checkbox checkbox-sm"
                    checked={selectedInvoices.length === invoicesData?.items.length && invoicesData?.items.length > 0}
                    onChange={handleSelectAll}
                  />
                  <span className="label-text">
                    {selectedInvoices.length > 0 ? `已选择 ${selectedInvoices.length} 项` : '全选'}
                  </span>
                </label>
                
                {selectedInvoices.length > 0 && (
                  <div className="flex gap-2">
                    <button className="btn btn-sm btn-outline">
                      <Download className="w-3 h-3" />
                      导出
                    </button>
                    <button className="btn btn-sm btn-error btn-outline">
                      <Trash2 className="w-3 h-3" />
                      删除
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 发票列表 */}
            {isLoading ? (
              <div className="p-8 text-center">
                <span className="loading loading-spinner loading-lg"></span>
                <p className="mt-2 text-base-content/60">加载中...</p>
              </div>
            ) : (
              <div className="divide-y divide-base-300">
                {invoicesData?.items.map((invoice) => (
                  <div key={invoice.id} className="p-4 hover:bg-base-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        className="checkbox checkbox-sm"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={() => handleSelectInvoice(invoice.id)}
                      />
                      
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                        {/* 发票信息 */}
                        <div className="md:col-span-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            <div>
                              <p className="font-medium">{invoice.invoice_number}</p>
                              <p className="text-sm text-base-content/60">{invoice.seller_name}</p>
                            </div>
                          </div>
                        </div>

                        {/* 日期 */}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-base-content/60" />
                          <span className="text-sm">{formatDate(invoice.invoice_date)}</span>
                        </div>

                        {/* 金额 */}
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-success" />
                          <span className="font-medium text-success">
                            {formatCurrency(invoice.total_amount)}
                          </span>
                        </div>

                        {/* 状态 */}
                        <div>
                          <div className={`badge ${getStatusBadge(invoice.status)} badge-sm`}>
                            {invoice.status}
                          </div>
                        </div>

                        {/* 操作 */}
                        <div className="flex gap-1">
                          <button className="btn btn-ghost btn-sm">
                            <Eye className="w-3 h-3" />
                          </button>
                          <button className="btn btn-ghost btn-sm">
                            <Edit className="w-3 h-3" />
                          </button>
                          <button className="btn btn-ghost btn-sm text-error">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 分页 */}
            {invoicesData && invoicesData.total > pageSize && (
              <div className="p-4 border-t border-base-300">
                <div className="flex justify-center">
                  <div className="join">
                    <button 
                      className="join-item btn btn-sm"
                      disabled={!invoicesData.has_prev}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      上一页
                    </button>
                    <button className="join-item btn btn-sm btn-active">
                      {currentPage}
                    </button>
                    <button 
                      className="join-item btn btn-sm"
                      disabled={!invoicesData.has_next}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      下一页
                    </button>
                  </div>
                </div>
                <p className="text-center text-sm text-base-content/60 mt-2">
                  第 {currentPage} 页，共 {Math.ceil(invoicesData.total / pageSize)} 页
                </p>
              </div>
            )}

            {/* 空状态 */}
            {!isLoading && (!invoicesData?.items || invoicesData.items.length === 0) && (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-base-content/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-base-content/60 mb-2">暂无发票</h3>
                <p className="text-base-content/40 mb-4">
                  {searchQuery ? '未找到匹配的发票' : '开始上传您的第一张发票吧'}
                </p>
                <button className="btn btn-primary">
                  <Plus className="w-4 h-4" />
                  新建发票
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </Layout>
  );
};

export default InvoiceListPage;