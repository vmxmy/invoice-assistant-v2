import React from 'react';
import { 
  FileText, 
  Calendar, 
  DollarSign,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Building2,
  User
} from 'lucide-react';
import { getInvoiceTypeName, getInvoiceTypeIcon } from '../../../config/invoiceFieldsConfig';

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
  invoice_type?: string;
  created_at: string;
  tags: string[];
}

interface InvoiceCardProps {
  invoice: Invoice;
  isSelected: boolean;
  onSelect: (invoiceId: string) => void;
  onView: (invoiceId: string) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  showActions?: boolean;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  showActions = true
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

  return (
    <div className="card bg-base-100 border border-base-300 hover:border-primary/30 transition-all duration-200">
      <div className="card-body p-4">
        {/* 顶部：选择框和发票类型 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              className="checkbox checkbox-sm"
              checked={isSelected}
              onChange={() => onSelect(invoice.id)}
            />
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">{invoice.invoice_number}</span>
              {invoice.invoice_type && (
                <span className="badge badge-sm badge-ghost">
                  {getInvoiceTypeIcon(invoice.invoice_type)} {getInvoiceTypeName(invoice.invoice_type)}
                </span>
              )}
            </div>
          </div>
          
          {/* 操作菜单 */}
          {showActions && (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-circle">
                <MoreVertical className="w-4 h-4" />
              </div>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-36">
                <li>
                  <button onClick={() => onView(invoice.id)} className="text-sm">
                    <Eye className="w-3 h-3" />
                    查看详情
                  </button>
                </li>
                <li>
                  <button onClick={() => onEdit(invoice)} className="text-sm">
                    <Edit className="w-3 h-3" />
                    编辑
                  </button>
                </li>
                <li>
                  <button onClick={() => onDelete(invoice)} className="text-sm text-error">
                    <Trash2 className="w-3 h-3" />
                    删除
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* 主要信息 */}
        <div className="space-y-3">
          {/* 销售方和购买方 */}
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-3 h-3 text-base-content/60" />
              <span className="text-base-content/60">销售方:</span>
              <span className="font-medium truncate">{invoice.seller_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3 h-3 text-base-content/60" />
              <span className="text-base-content/60">购买方:</span>
              <span className="truncate">{invoice.buyer_name}</span>
            </div>
          </div>

          {/* 金额和日期 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-base-content/60" />
              <span className="text-sm">{formatDate(invoice.invoice_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-success" />
              <span className="font-semibold text-success">
                {formatCurrency(invoice.total_amount)}
              </span>
            </div>
          </div>

          {/* 状态 */}
          <div className="flex items-center justify-between">
            <div className={`badge ${getStatusBadge(invoice.status)} badge-sm`}>
              {invoice.status}
            </div>
            <span className="text-xs text-base-content/50">
              {formatDate(invoice.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCard;