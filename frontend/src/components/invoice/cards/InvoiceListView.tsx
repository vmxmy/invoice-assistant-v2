import React, { useState, useEffect } from 'react';
import { Grid, List, ChevronDown } from 'lucide-react';
import InvoiceCard from './InvoiceCard';

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
}

interface InvoiceListViewProps {
  invoices: Invoice[];
  selectedInvoices: string[];
  onSelectInvoice: (invoiceId: string) => void;
  onViewInvoice: (invoiceId: string) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  isLoading?: boolean;
}

export type ViewMode = 'list' | 'grid';

export const InvoiceListView: React.FC<InvoiceListViewProps> = ({
  invoices,
  selectedInvoices,
  onSelectInvoice,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  isLoading = false
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isMobile, setIsMobile] = useState(false);

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // 小屏幕自动切换到卡片视图
      if (window.innerWidth < 768) {
        setViewMode('grid');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="card bg-base-100 border border-base-300">
            <div className="card-body p-4">
              <div className="animate-pulse space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-base-300 rounded"></div>
                    <div className="w-24 h-4 bg-base-300 rounded"></div>
                  </div>
                  <div className="w-6 h-6 bg-base-300 rounded-full"></div>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-3 bg-base-300 rounded"></div>
                  <div className="w-3/4 h-3 bg-base-300 rounded"></div>
                </div>
                <div className="flex justify-between">
                  <div className="w-20 h-3 bg-base-300 rounded"></div>
                  <div className="w-16 h-3 bg-base-300 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* 视图切换按钮（仅在桌面端显示） */}
      {!isMobile && (
        <div className="flex justify-end mb-4">
          <div className="btn-group">
            <button 
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-active' : 'btn-ghost'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-active' : 'btn-ghost'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 发票列表 */}
      {viewMode === 'grid' || isMobile ? (
        // 卡片视图
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              isSelected={selectedInvoices.includes(invoice.id)}
              onSelect={onSelectInvoice}
              onView={onViewInvoice}
              onEdit={onEditInvoice}
              onDelete={onDeleteInvoice}
            />
          ))}
        </div>
      ) : (
        // 列表视图（桌面端）
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>
                  <label>
                    <input type="checkbox" className="checkbox" />
                  </label>
                </th>
                <th>发票信息</th>
                <th>销售方</th>
                <th>消费日期</th>
                <th>金额</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover">
                  <td>
                    <label>
                      <input 
                        type="checkbox" 
                        className="checkbox"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={() => onSelectInvoice(invoice.id)}
                      />
                    </label>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-bold">{invoice.invoice_number}</div>
                        <div className="text-sm opacity-50">{invoice.buyer_name}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="truncate">{invoice.seller_name}</span>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span>{formatDate(invoice.consumption_date || invoice.invoice_date)}</span>
                      {invoice.consumption_date && invoice.consumption_date !== invoice.invoice_date && (
                        <span className="text-xs text-base-content/50">
                          开票: {formatDate(invoice.invoice_date)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="font-semibold text-success">
                      {formatCurrency(invoice.total_amount)}
                    </span>
                  </td>
                  <td>
                    <div className={`badge ${getStatusBadge(invoice.status)} badge-sm`}>
                      {invoice.status}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button 
                        className="btn btn-ghost btn-xs"
                        onClick={() => onViewInvoice(invoice.id)}
                      >
                        查看
                      </button>
                      <button 
                        className="btn btn-ghost btn-xs"
                        onClick={() => onEditInvoice(invoice)}
                      >
                        编辑
                      </button>
                      <button 
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => onDeleteInvoice(invoice)}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InvoiceListView;