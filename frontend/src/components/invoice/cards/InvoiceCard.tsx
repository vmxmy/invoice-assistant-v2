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
  User,
  Download
} from 'lucide-react';
import { getCategoryIcon, getCategoryDisplayName, getCategoryBadgeStyle } from '../../../utils/categoryUtils';

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
  secondary_category_name?: string;
  primary_category_name?: string;
  expense_category?: string;
  category_icon?: string;
  extracted_data?: {
    structured_data?: {
      total_amount?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
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
    <div className="card bg-base-100 border border-base-300 hover:border-primary/40 hover:shadow-lg transition-all duration-200">
      <div className="card-body p-4">
        {/* 顶部：选择框和发票类型 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <input 
              type="checkbox" 
              className="checkbox checkbox-sm flex-shrink-0 mt-0.5"
              checked={isSelected}
              onChange={() => onSelect(invoice.id)}
            />
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="font-medium text-sm truncate">{invoice.invoice_number}</span>
              </div>
              
              {/* 统一徽章行 - 状态、分类、类型统一样式 */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 状态徽章 - 统一使用 badge-sm 尺寸 */}
                <div className={`badge ${getStatusBadge(invoice.status)} badge-sm font-medium h-5`}>
                  {invoice.status.toUpperCase()}
                </div>
                
                {/* 分类徽章 - 根据分类值使用不同背景颜色 */}
                {(invoice.expense_category || invoice.primary_category_name || invoice.secondary_category_name) ? (
                  <div 
                    className={getCategoryBadgeStyle(invoice).className}
                    style={getCategoryBadgeStyle(invoice).style}
                  >
                    <span className="text-xs">{getCategoryIcon(invoice)}</span>
                    <span className="truncate max-w-20">{getCategoryDisplayName(invoice)}</span>
                  </div>
                ) : (
                  <>
                    <div className="badge badge-ghost badge-sm font-medium h-5 gap-1">
                      <span className="text-xs">📄</span>
                      <span>未分类</span>
                    </div>
                    <div className="badge badge-warning badge-outline badge-sm font-medium h-5">
                      待分类
                    </div>
                  </>
                )}
                
                {/* 发票类型徽章 - 统一尺寸 */}
                {invoice.invoice_type && (
                  <div className="badge badge-outline badge-sm font-medium h-5">
                    <span className="truncate max-w-16">{invoice.invoice_type}</span>
                  </div>
                )}
              </div>
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
                    <Download className="w-3 h-3" />
                    下载
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
            <div className="flex items-start gap-2 text-sm">
              <Building2 className="w-3 h-3 text-base-content/60 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-base-content/60">销售方: </span>
                <span className="font-medium break-all">{invoice.seller_name}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <User className="w-3 h-3 text-base-content/60 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-base-content/60">购买方: </span>
                <span className="break-all">{invoice.buyer_name}</span>
              </div>
            </div>
          </div>

          {/* 费用类别显示区域 */}
          {(invoice.expense_category || invoice.primary_category_name || invoice.secondary_category_name) && (
            <div className="bg-base-50 border border-base-200 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-base-content/60">费用类别：</span>
                <div 
                  className={getCategoryBadgeStyle(invoice).className}
                  style={getCategoryBadgeStyle(invoice).style}
                >
                  <span className="text-xs">{getCategoryIcon(invoice)}</span>
                  <span className="font-medium">{getCategoryDisplayName(invoice)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 金额和日期 */}
          <div className="bg-base-100 border border-base-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-base-content/60" />
                  <span className="text-sm font-medium">
                    {invoice.invoice_type === '火车票' ? '发车' : '消费'}：
                    {invoice.consumption_date ? formatDate(invoice.consumption_date) : formatDate(invoice.invoice_date)}
                  </span>
                </div>
                {invoice.consumption_date && invoice.consumption_date !== invoice.invoice_date && (
                  <div className="flex items-center gap-2 ml-6">
                    <span className="text-xs text-base-content/50">
                      开票：{formatDate(invoice.invoice_date)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-success" />
                  <span className="font-bold text-lg text-success">
                    {formatCurrency(
                      invoice.invoice_type === '火车票' && invoice.extracted_data?.structured_data?.total_amount
                        ? parseFloat(invoice.extracted_data.structured_data.total_amount)
                        : invoice.total_amount
                    )}
                  </span>
                </div>
                {invoice.invoice_type === '火车票' && invoice.extracted_data?.structured_data?.total_amount && (
                  <span className="text-xs text-base-content/50">
                    实际金额
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default InvoiceCard;