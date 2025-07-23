import React from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { getInvoiceTypeName, getInvoiceTypeIcon } from '../../../config/invoiceFieldsConfig';

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

interface InvoiceListTableViewProps {
  invoices: Invoice[];
  selectedInvoices: string[];
  onSelectInvoice: (invoiceId: string) => void;
  onSelectAll: () => void;
  onViewInvoice: (invoiceId: string) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  isLoading?: boolean;
}

export const InvoiceListTableView: React.FC<InvoiceListTableViewProps> = ({
  invoices,
  selectedInvoices,
  onSelectInvoice,
  onSelectAll,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  isLoading = false
}) => {
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
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th></th>
              <th>发票信息</th>
              <th>销售方</th>
              <th>消费日期</th>
              <th>金额</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                <td><div className="w-4 h-4 bg-base-300 rounded animate-pulse"></div></td>
                <td><div className="w-32 h-4 bg-base-300 rounded animate-pulse"></div></td>
                <td><div className="w-24 h-4 bg-base-300 rounded animate-pulse"></div></td>
                <td><div className="w-20 h-4 bg-base-300 rounded animate-pulse"></div></td>
                <td><div className="w-16 h-4 bg-base-300 rounded animate-pulse"></div></td>
                <td><div className="w-16 h-4 bg-base-300 rounded animate-pulse"></div></td>
                <td><div className="w-20 h-4 bg-base-300 rounded animate-pulse"></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>
              <label>
                <input 
                  type="checkbox" 
                  className="checkbox"
                  checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                  onChange={onSelectAll}
                />
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
                <div className="flex items-center gap-2">
                  <div className="avatar placeholder">
                    <div className="bg-neutral-focus text-neutral-content rounded-full w-8">
                      <span className="text-xs">
                        {getInvoiceTypeIcon(invoice.invoice_type || 'vat_general')}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-sm">{invoice.invoice_number}</div>
                    <div className="text-xs opacity-50">
                      {invoice.invoice_type ? getInvoiceTypeName(invoice.invoice_type) : '普通发票'}
                    </div>
                  </div>
                </div>
              </td>
              <td>{invoice.seller_name}</td>
              <td>{formatDate(invoice.invoice_date)}</td>
              <td className="font-semibold">{formatCurrency(invoice.total_amount)}</td>
              <td>
                <span className={`badge badge-sm ${getStatusBadge(invoice.status)}`}>
                  {invoice.status === 'pending' && '待处理'}
                  {invoice.status === 'processing' && '处理中'}
                  {invoice.status === 'completed' && '已完成'}
                  {invoice.status === 'failed' && '失败'}
                </span>
              </td>
              <td>
                <div className="flex gap-1">
                  <button 
                    className="btn btn-ghost btn-xs"
                    onClick={() => onViewInvoice(invoice.id)}
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <button 
                    className="btn btn-ghost btn-xs"
                    onClick={() => onEditInvoice(invoice)}
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button 
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => onDeleteInvoice(invoice)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InvoiceListTableView;