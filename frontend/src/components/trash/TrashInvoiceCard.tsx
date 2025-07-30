import React from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  FileText, 
  Calendar, 
  DollarSign,
  RotateCcw,
  Trash2,
  MoreVertical,
  Building2,
  User,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { getCategoryIcon, getCategoryDisplayName, getCategoryBadgeStyle } from '../../utils/categoryUtils';

interface DeletedInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  seller_name: string;
  buyer_name?: string;
  total_amount: number;
  status: string;
  source: string;
  invoice_type?: string;
  created_at: string;
  deleted_at: string;
  days_remaining: number;
  days_since_deleted: number;
  tags?: string[];
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

interface TrashInvoiceCardProps {
  invoice: DeletedInvoice;
  isSelected: boolean;
  onSelect: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
}

const TrashInvoiceCard: React.FC<TrashInvoiceCardProps> = ({
  invoice,
  isSelected,
  onSelect,
  onRestore,
  onPermanentDelete
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

  const getDaysRemainingStyle = (days: number) => {
    if (days <= 7) return 'text-error';
    if (days <= 15) return 'text-warning'; 
    return 'text-success';
  };

  const getDaysRemainingBadge = (days: number) => {
    if (days <= 7) return 'badge-error';
    if (days <= 15) return 'badge-warning';
    return 'badge-success';
  };

  return (
    <div className={`card bg-base-100 border transition-all duration-200 ${
      isSelected 
        ? 'border-primary/40 bg-primary/5 shadow-lg' 
        : 'border-base-300 hover:border-error/40 hover:shadow-lg'
    }`}>
      <div className="card-body p-4">
        {/* 顶部：选择框和发票类型 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <input 
              type="checkbox" 
              className="checkbox checkbox-sm flex-shrink-0 mt-0.5"
              checked={isSelected}
              onChange={onSelect}
            />
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-base flex-shrink-0">{getCategoryIcon(invoice)}</span>
                <span className="font-medium text-sm truncate">{invoice.invoice_number}</span>
              </div>
              
              {/* 统一徽章行 - 发票类型、费用类别、删除状态、剩余天数 */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 发票类型徽章 */}
                {invoice.invoice_type && (
                  <div className="badge badge-outline badge-sm font-medium h-5">
                    <span className="truncate max-w-16">{invoice.invoice_type}</span>
                  </div>
                )}
                
                {/* 费用类别徽章 */}
                {(invoice.expense_category || invoice.primary_category_name || invoice.secondary_category_name) ? (
                  <div 
                    className={getCategoryBadgeStyle(invoice).className}
                    style={getCategoryBadgeStyle(invoice).style}
                  >
                    <span className="text-xs">{getCategoryIcon(invoice)}</span>
                    <span className="truncate max-w-20">{getCategoryDisplayName(invoice)}</span>
                  </div>
                ) : (
                  <div className="badge badge-ghost badge-sm font-medium h-5 gap-1">
                    <span className="text-xs">📄</span>
                    <span>未分类</span>
                  </div>
                )}
                
                {/* 删除状态徽章 */}
                <div className="badge badge-error badge-outline badge-sm font-medium h-5">
                  已删除
                </div>
                
                {/* 剩余天数徽章 */}
                <div className={`badge ${getDaysRemainingBadge(invoice.days_remaining || 0)} badge-sm font-medium h-5`}>
                  {Math.ceil(invoice.days_remaining || 0)} 天
                </div>
              </div>
            </div>
          </div>
          
          {/* 操作菜单 */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-circle">
              <MoreVertical className="w-4 h-4" />
            </div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-36">
              <li>
                <button onClick={onRestore} className="text-sm">
                  <RotateCcw className="w-3 h-3" />
                  恢复发票
                </button>
              </li>
              <li>
                <button onClick={onPermanentDelete} className="text-sm text-error">
                  <Trash2 className="w-3 h-3" />
                  永久删除
                </button>
              </li>
            </ul>
          </div>
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

          {/* 删除信息区域 */}
          <div className="bg-error/5 border border-error/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-error" />
                <span className="text-sm font-medium text-error">已删除发票</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-base-content/60" />
                <span className="text-xs text-base-content/60">
                  {invoice.deleted_at 
                    ? format(new Date(invoice.deleted_at), 'MM-dd HH:mm', { locale: zhCN })
                    : '未知时间'
                  }
                </span>
              </div>
            </div>
            
            {/* 倒计时警告 */}
            {(invoice.days_remaining || 0) <= 7 && (
              <div className="mt-2 pt-2 border-t border-error/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="text-xs text-warning font-medium">
                    ⚠️ 将在 {Math.ceil(invoice.days_remaining || 0)} 天后自动永久删除
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 金额和日期 */}
          <div className="bg-base-100 border border-base-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-base-content/60" />
                  <span className="text-sm font-medium">
                    发票日期：{formatDate(invoice.invoice_date)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-success" />
                  <span className="font-bold text-lg text-success">
                    {formatCurrency(invoice.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrashInvoiceCard;