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
import { InvoiceStatusBadge, type InvoiceStatus } from '../InvoiceStatusBadge';
import { InvoiceStatusSwitch } from '../InvoiceStatusSwitch';
import { useInvoiceStatuses } from '../../../hooks/useInvoiceStatuses';
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

interface InvoiceCardOptimizedProps {
  invoice: Invoice;
  isSelected: boolean;
  onSelect: (invoiceId: string) => void;
  onView: (invoiceId: string) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onStatusChange?: (invoiceId: string, newStatus: string) => Promise<boolean>;
  showActions?: boolean;
  statusComponent?: 'badge' | 'switch';
  variant?: 'default' | 'ultra-compact';
}

export const InvoiceCardOptimized: React.FC<InvoiceCardOptimizedProps> = ({
  invoice,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  showActions = true,
  statusComponent = 'switch',
  variant = 'default'
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { getStatusConfig } = useInvoiceStatuses();
  
  const [currentStatus, setCurrentStatus] = useState<InvoiceStatus>(() => {
    const statusConfig = getStatusConfig(invoice.status);
    if (statusConfig) return invoice.status;
    if (invoice.status === 'unreimbursed') return 'pending';
    if (invoice.status === 'reimbursed') return 'reimbursed';
    return invoice.status || 'pending';
  });
  
  const device = useDeviceDetection();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentStatus(invoice.status);
  }, [invoice.status]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return device.isMobile 
      ? date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
      : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!onStatusChange || isUpdatingStatus) return;

    const oldStatus = currentStatus;
    const newStatusConfig = getStatusConfig(newStatus);
    const statusLabel = newStatusConfig?.label || newStatus;
    
    let legacyStatus = newStatus;
    if (newStatus === 'pending') {
      legacyStatus = 'unreimbursed';
    } else if (newStatus === 'reimbursed') {
      legacyStatus = 'reimbursed';
    }

    try {
      setIsUpdatingStatus(true);
      setCurrentStatus(newStatus);
      
      const success = await onStatusChange(invoice.id, legacyStatus);
      
      if (success) {
        toast.success(`已标记为${statusLabel}`);
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

  const { touchHandlers, gestureState } = useGestures(
    {
      onSwipeLeft: () => {
        if (cardRef.current && device.isMobile) {
          const moreButton = cardRef.current.querySelector('[role="button"]') as HTMLElement;
          moreButton?.click();
        }
      },
      onSwipeRight: () => {
        if (onStatusChange && device.isMobile) {
          const statusConfig = getStatusConfig(currentStatus);
          if (statusConfig && statusConfig.can_transition_to && statusConfig.can_transition_to.length > 0) {
            const nextStatus = statusConfig.can_transition_to[0];
            handleStatusChange(nextStatus);
          }
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

  const isUltraCompact = variant === 'ultra-compact';

  return (
    <motion.div 
      ref={cardRef}
      className={`
        invoice-card-compact
        ${isUltraCompact ? 'p-3' : device.isMobile ? 'p-4' : 'p-3'}
        ${gestureState.isLongPressing ? 'ring-2 ring-primary/30 shadow-lg scale-[1.02]' : ''}
        ${isSelected ? 'ring-2 ring-primary/40 bg-primary/5 border-primary/30' : ''}
        group relative
      `}
      {...(device.isMobile ? touchHandlers : {})}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      whileHover={{ 
        scale: device.isMobile ? 1 : 1.01,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: 0.1, ease: "easeInOut" }
      }}
      layout
    >
      {/* 选中状态指示器 */}
      {isSelected && (
        <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-primary to-primary/70 rounded-l-2xl" />
      )}
      
      {/* 顶部行：选择框 + 基本信息 + 操作菜单 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* 选择框和基本信息 */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* 优化的选择框 */}
          <label className={`
            cursor-pointer flex items-center justify-center
            transition-all duration-200 ease-out
            hover:bg-primary/8 rounded-xl
            ${device.isMobile ? 'p-2 -m-2' : 'p-1 -m-1'}
          `}>
            <input 
              type="checkbox" 
              className={`
                ${device.isMobile ? 'invoice-checkbox-mobile' : 'invoice-checkbox-compact'}
                flex-shrink-0
              `}
              checked={isSelected}
              onChange={() => onSelect(invoice.id)}
            />
          </label>
          
          {/* 发票基本信息 */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* 类型图标 */}
            <div className={`
              ${device.isMobile ? 'icon-container-compact-md' : 'icon-container-compact-sm'}
              bg-gradient-to-br from-primary/10 to-accent/10
              border-primary/15 text-lg flex-shrink-0
            `}>
              {getCategoryIcon(invoice)}
            </div>
            
            {/* 发票号码和日期 */}
            <div className="flex-1 min-w-0">
              <h3 className={`
                font-semibold text-base-content/90 truncate 
                ${device.isMobile ? 'text-base' : 'text-sm'}
              `}>
                {invoice.invoice_number}
              </h3>
              <p className="text-xs text-base-content/60 truncate">
                {formatDate(invoice.invoice_date)}
              </p>
            </div>
          </div>
        </div>
        
        {/* 操作菜单 */}
        {showActions && (
          <div className="dropdown dropdown-compact flex-shrink-0">
            <motion.div 
              tabIndex={0} 
              role="button" 
              className={`
                btn btn-ghost btn-circle
                ${device.isMobile ? 'btn-compact-touch' : 'btn-compact-sm'}
                border-0 hover:bg-base-200/70
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="更多操作"
            >
              <MoreVertical className={device.isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
            </motion.div>
            
            <ul className={`
              dropdown-content z-50 menu 
              ${device.isMobile ? 'dropdown-mobile' : ''}
            `}>
              <li>
                <button onClick={() => onView(invoice.id)} className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary/70" />
                  <span>查看</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={handlePrint} 
                  disabled={!invoice.file_url && !invoice.file_path}
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4 text-info/70" />
                  <span>打印</span>
                </button>
              </li>
              <li>
                <button onClick={() => onEdit(invoice)} className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-success/70" />
                  <span>下载</span>
                </button>
              </li>
              <div className="divider my-0.5 opacity-30"></div>
              <li>
                <button onClick={() => onDelete(invoice)} className="flex items-center gap-2 text-error">
                  <Trash2 className="w-4 h-4" />
                  <span>删除</span>
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* 徽章行：类别 + 状态 */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {/* 费用类别徽章 */}
        {(invoice.expense_category || invoice.primary_category_name || invoice.secondary_category_name) ? (
          <div className={`
            inline-flex items-center gap-1.5 px-2.5 py-1
            ${device.isMobile ? 'badge-compact-md' : 'badge-compact-sm'}
            ${getCategoryBadgeStyle(invoice).className}
            shadow-sm ring-1 ring-black/5
            transition-all duration-200
            hover:shadow-md hover:scale-105
          `}
            style={getCategoryBadgeStyle(invoice).style}
          >
            <span className="text-current opacity-90">{getCategoryIcon(invoice)}</span>
            <span className="truncate-compact text-current font-medium">
              {getCategoryDisplayName(invoice)}
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 badge-compact-sm bg-base-200/60 text-base-content/60 ring-1 ring-base-300/30">
            <span>📄</span>
            <span>未分类</span>
          </div>
        )}
        
        {/* 状态组件 */}
        {statusComponent === 'switch' ? (
          <InvoiceStatusSwitch
            status={currentStatus}
            onStatusChange={onStatusChange ? handleStatusChange : undefined}
            size={device.isMobile ? 'md' : 'sm'}
            disabled={!onStatusChange}
            loading={isUpdatingStatus}
          />
        ) : (
          <InvoiceStatusBadge
            status={currentStatus}
            onStatusChange={onStatusChange ? handleStatusChange : undefined}
            size={device.isMobile ? 'md' : 'sm'}
            interactive={!!onStatusChange}
            showDropdownArrow={true}
          />
        )}
      </div>

      {/* 主要信息区域 - 紧凑布局 */}
      <div className="invoice-info-compact">
        {/* 企业信息行 */}
        <div className="invoice-field-compact">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Building2 className="w-3.5 h-3.5 text-base-content/50 flex-shrink-0" />
            <span className="field-value truncate">{invoice.seller_name}</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0 max-w-32">
            <User className="w-3.5 h-3.5 text-base-content/50 flex-shrink-0" />
            <span className="field-value truncate text-xs">{invoice.buyer_name}</span>
          </div>
        </div>

        {/* 金额和日期行 */}
        <div className="invoice-field-compact">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-info/60 flex-shrink-0" />
            <span className="field-value text-info">
              {formatDate(invoice.consumption_date || invoice.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-success flex-shrink-0" />
            <span className="font-bold text-success text-base">
              {formatCurrency(invoice.total_amount || invoice.amount || 0)}
            </span>
          </div>
        </div>

        {/* 验证状态（如果需要显示） */}
        {invoice.is_verified && !isUltraCompact && (
          <div className="flex items-center gap-1.5 pt-2">
            <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
            <span className="text-xs text-success font-medium">已验证</span>
          </div>
        )}
      </div>

      {/* 加载状态覆盖层 */}
      {isUpdatingStatus && (
        <div className="absolute inset-0 bg-base-100/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-primary">更新中...</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default InvoiceCardOptimized;