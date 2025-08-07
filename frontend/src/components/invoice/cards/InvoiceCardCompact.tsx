import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  DollarSign,
  Eye,
  Trash2,
  MoreVertical,
  Building2,
  User,
  Download,
  Loader2,
  Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';
import { useGestures } from '../../../hooks/useGestures';
import { getCategoryIcon, getCategoryDisplayName, getCategoryBadgeStyle } from '../../../utils/categoryUtils';

// 使用相同的Invoice接口
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

interface InvoiceCardCompactProps {
  invoice: Invoice;
  isSelected: boolean;
  onSelect: (invoiceId: string) => void;
  onView: (invoiceId: string) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onStatusChange?: (invoiceId: string, newStatus: string) => Promise<boolean>;
  showActions?: boolean;
}

export const InvoiceCardCompact: React.FC<InvoiceCardCompactProps> = ({
  invoice,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  showActions = true
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(invoice.status);
  
  const device = useDeviceDetection();
  const cardRef = useRef<HTMLDivElement>(null);

  // 同步外部状态变化
  useEffect(() => {
    setCurrentStatus(invoice.status);
  }, [invoice.status]);

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
      'unreimbursed': 'badge-warning',
      'reimbursed': 'badge-success'
    };
    return statusMap[status as keyof typeof statusMap] || 'badge-neutral';
  };

  const getStatusText = (status: string) => {
    const statusTextMap = {
      'unreimbursed': '未报销',
      'reimbursed': '已报销'
    };
    return statusTextMap[status as keyof typeof statusTextMap] || status.toUpperCase();
  };

  const handleStatusClick = async () => {
    if (!onStatusChange || isUpdatingStatus) return;

    if (!['unreimbursed', 'reimbursed'].includes(currentStatus)) {
      toast.error('此状态不支持切换');
      return;
    }

    const newStatus = currentStatus === 'unreimbursed' ? 'reimbursed' : 'unreimbursed';
    const oldStatus = currentStatus;

    try {
      setIsUpdatingStatus(true);
      setCurrentStatus(newStatus);
      
      const success = await onStatusChange(invoice.id, newStatus);
      
      if (success) {
        toast.success(`已${newStatus === 'reimbursed' ? '标记为已报销' : '标记为未报销'}`);
      } else {
        setCurrentStatus(oldStatus);
        toast.error('状态更新失败，请重试');
      }
    } catch (error) {
      setCurrentStatus(oldStatus);
      toast.error('状态更新失败，请重试');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePrint = async () => {
    if (!invoice.file_url && !invoice.file_path) {
      toast.error('PDF文件未找到，无法打印');
      return;
    }
    
    try {
      const { supabase } = await import('../../../lib/supabase');
      
      let signedUrl = null;
      
      if (invoice.file_path) {
        const { data, error } = await supabase.storage
          .from('invoice-files')
          .createSignedUrl(invoice.file_path, 60 * 5);
        
        if (error) {
          console.error('生成签名URL失败:', error);
          toast.error('无法生成PDF访问链接');
          return;
        }
        
        signedUrl = data.signedUrl;
      } else if (invoice.file_url) {
        signedUrl = invoice.file_url;
      }
      
      if (!signedUrl) {
        toast.error('无法获取PDF访问链接');
        return;
      }
      
      window.open(signedUrl, '_blank');
      toast.success('已在新窗口中打开PDF文件');
      
    } catch (error) {
      console.error('PDF打印失败:', error);
      toast.error(`PDF访问失败: ${error.message}`);
    }
  };

  // 使用手势处理钩子
  const { touchHandlers, gestureState } = useGestures(
    {
      onSwipeLeft: () => {
        if (cardRef.current && device.isMobile) {
          const moreButton = cardRef.current.querySelector('[role="button"]') as HTMLElement;
          moreButton?.click();
        }
      },
      onSwipeRight: () => {
        if (currentStatus === 'unreimbursed' && onStatusChange && device.isMobile) {
          handleStatusClick();
        }
      },
      onLongPress: () => {
        if (device.isMobile) {
          onSelect(invoice.id);
        }
      },
    },
    {
      swipeThreshold: 60,
      longPressDelay: 500,
      preventScroll: true,
    }
  );

  return (
    <motion.div 
      ref={cardRef}
      className={`
        invoice-card-compact
        ${device.isMobile ? '' : 'hover:scale-[1.01]'}
        ${gestureState.isLongPressing ? 'ring-2 ring-primary ring-opacity-50' : ''}
        ${isSelected ? 'ring-2 ring-primary ring-opacity-30' : ''}
      `}
      {...(device.isMobile ? touchHandlers : {})}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: device.isMobile ? 1 : 1.01 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      {/* 顶部行：选择框、类型图标、发票号码、操作菜单 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* 紧凑选择框 */}
          <label className="cursor-pointer">
            <input 
              type="checkbox" 
              className="checkbox checkbox-sm flex-shrink-0"
              checked={isSelected}
              onChange={() => onSelect(invoice.id)}
            />
          </label>
          
          {/* 类型图标和发票号码 */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-sm flex-shrink-0">{getCategoryIcon(invoice)}</span>
            <span className="font-medium text-sm truncate">{invoice.invoice_number}</span>
          </div>
        </div>
        
        {/* 操作菜单 - 紧凑版 */}
        {showActions && (
          <div className="dropdown dropdown-end dropdown-compact">
            <div 
              tabIndex={0} 
              role="button" 
              className="btn btn-ghost btn-circle btn-compact-sm"
              title="更多操作"
            >
              <MoreVertical className="w-3 h-3" />
            </div>
            <ul tabIndex={0} className="dropdown-content menu shadow bg-base-100 rounded-box w-32 p-1">
              <li>
                <button 
                  onClick={() => onView(invoice.id)} 
                  className="text-xs py-1.5 px-2"
                >
                  <Eye className="w-3 h-3" />
                  查看
                </button>
              </li>
              <li>
                <button 
                  onClick={handlePrint} 
                  className="text-xs py-1.5 px-2"
                  disabled={!invoice.file_url}
                >
                  <Printer className="w-3 h-3" />
                  打印
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onEdit(invoice)} 
                  className="text-xs py-1.5 px-2"
                >
                  <Download className="w-3 h-3" />
                  下载
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onDelete(invoice)} 
                  className="text-xs py-1.5 px-2 text-error"
                >
                  <Trash2 className="w-3 h-3" />
                  删除
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* 徽章行：费用类别、状态 */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {/* 费用类别徽章 */}
        {(invoice.expense_category || invoice.primary_category_name || invoice.secondary_category_name) ? (
          <div 
            className={`${getCategoryBadgeStyle(invoice).className} badge-compact-xs`}
            style={getCategoryBadgeStyle(invoice).style}
          >
            <span className="text-xs">{getCategoryIcon(invoice)}</span>
            <span className="truncate max-w-16">{getCategoryDisplayName(invoice)}</span>
          </div>
        ) : (
          <div className="badge badge-ghost badge-compact-xs">
            <span className="text-xs">📄</span>
            <span>未分类</span>
          </div>
        )}
        
        {/* 状态徽章 - 可点击 */}
        <div 
          className={`
            badge ${getStatusBadge(currentStatus)} badge-compact-xs
            ${onStatusChange && ['unreimbursed', 'reimbursed'].includes(currentStatus) 
              ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200' 
              : ''
            }
            ${isUpdatingStatus ? 'animate-pulse' : ''}
          `}
          onClick={handleStatusClick}
          title={
            onStatusChange && ['unreimbursed', 'reimbursed'].includes(currentStatus)
              ? `点击切换为${currentStatus === 'unreimbursed' ? '已报销' : '未报销'}`
              : '报销状态'
          }
        >
          {isUpdatingStatus ? (
            <div className="flex items-center gap-0.5">
              <Loader2 className="w-2 h-2 animate-spin" />
              <span>...</span>
            </div>
          ) : (
            getStatusText(currentStatus)
          )}
        </div>
      </div>

      {/* 主要信息 - 紧凑布局 */}
      <div className="invoice-info-compact">
        {/* 销售方和购买方 - 单行显示 */}
        <div className="invoice-field-compact">
          <div className="flex items-center gap-1 text-xs text-base-content/60 min-w-0 flex-1">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{invoice.seller_name}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-base-content/60 min-w-0">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate max-w-20">{invoice.buyer_name}</span>
          </div>
        </div>

        {/* 金额和日期 - 单行显示 */}
        <div className="invoice-field-compact">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-base-content/60" />
            <span className="text-xs font-medium">
              {formatDate(invoice.consumption_date || invoice.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-success" />
            <span className="font-bold text-sm text-success">
              {formatCurrency(invoice.total_amount || invoice.amount || 0)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InvoiceCardCompact;