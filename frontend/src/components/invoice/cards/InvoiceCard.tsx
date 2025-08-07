import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  Download,
  Loader2,
  Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';
import { useGestures } from '../../../hooks/useGestures';
import { getCategoryIcon, getCategoryDisplayName, getCategoryBadgeStyle } from '../../../utils/categoryUtils';
import { 
  extractTrainTicketInfo, 
  formatTrainRoute, 
  getSeatTypeStyle, 
  isValidTrainTicket,
  isTrainTicketByCategory 
} from '../../../utils/trainTicketUtils';
import { 
  extractFlightTicketInfo, 
  formatFlightRoute, 
  getSeatClassStyle, 
  getAirlineStyle, 
  isValidFlightTicket,
  isFlightTicketByCategory 
} from '../../../utils/flightTicketUtils';

// 视图数据结构 - 来自 invoice_management_view
interface Invoice {
  // 基础发票信息
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
  consumption_date?: string; // 消费日期
  seller_name?: string;
  seller_tax_id?: string;
  buyer_name?: string;
  buyer_tax_id?: string;
  
  // 文件信息
  file_path?: string;
  file_url?: string;
  file_size?: number;
  file_hash?: string;
  source: string;
  source_metadata?: Record<string, any>;
  
  // 验证信息
  is_verified: boolean;
  verified_at?: string;
  verified_by?: string;
  verification_notes?: string;
  
  // 标签和基础分类
  tags?: string[];
  category?: string;
  
  // 计算字段
  remarks?: string; // 从多个来源提取的备注
  expense_category?: string; // 综合判断的费用类别
  category_icon?: string;
  category_color?: string;
  display_amount?: number; // 显示金额
  category_path?: string; // 分类层级路径
  
  // 时间信息
  started_at?: string;
  completed_at?: string;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // 元数据和版本
  extracted_data: Record<string, any>;
  metadata?: Record<string, any>;
  created_by?: string;
  updated_by?: string;
  version: number;
  
  // 兼容字段
  secondary_category_name?: string;
  primary_category_name?: string;
}

interface InvoiceCardProps {
  invoice: Invoice;
  isSelected: boolean;
  onSelect: (invoiceId: string) => void;
  onView: (invoiceId: string) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onStatusChange?: (invoiceId: string, newStatus: string) => Promise<boolean>;
  showActions?: boolean;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
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
  
  // 设备检测 - 用于触控优化
  const device = useDeviceDetection();
  const cardRef = useRef<HTMLDivElement>(null);

  // 同步外部状态变化（实时订阅更新）
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

    // 只允许在 unreimbursed 和 reimbursed 之间切换
    if (!['unreimbursed', 'reimbursed'].includes(currentStatus)) {
      toast.error('此状态不支持切换');
      return;
    }

    const newStatus = currentStatus === 'unreimbursed' ? 'reimbursed' : 'unreimbursed';
    const oldStatus = currentStatus;

    try {
      setIsUpdatingStatus(true);
      
      // 乐观更新 - 先更新UI
      setCurrentStatus(newStatus);
      
      // 调用后端API
      const success = await onStatusChange(invoice.id, newStatus);
      
      if (success) {
        toast.success(`已${newStatus === 'reimbursed' ? '标记为已报销' : '标记为未报销'}`);
      } else {
        // 失败时回滚状态
        setCurrentStatus(oldStatus);
        toast.error('状态更新失败，请重试');
      }
    } catch (error) {
      // 异常时回滚状态
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
      // 生成带权限的临时访问URL
      const { supabase } = await import('../../../lib/supabase');
      
      let signedUrl = null;
      
      // 如果有file_path，使用它生成签名URL
      if (invoice.file_path) {
        const { data, error } = await supabase.storage
          .from('invoice-files')
          .createSignedUrl(invoice.file_path, 60 * 5); // 5分钟有效期
        
        if (error) {
          console.error('生成签名URL失败:', error);
          toast.error('无法生成PDF访问链接');
          return;
        }
        
        signedUrl = data.signedUrl;
      } else if (invoice.file_url) {
        // 如果只有file_url，尝试直接使用（可能是公共URL）
        signedUrl = invoice.file_url;
      }
      
      if (!signedUrl) {
        toast.error('无法获取PDF访问链接');
        return;
      }
      
      // 在新窗口中打开PDF文件，浏览器会自动显示打印选项
      window.open(signedUrl, '_blank');
      toast.success('已在新窗口中打开PDF文件');
      
    } catch (error) {
      console.error('PDF打印失败:', error);
      toast.error(`PDF访问失败: ${error.message}`);
    }
  };

  const getInvoiceTypeEmoji = (invoice: Invoice) => {
    // 优先检查特定的发票类型
    if (isTrainTicketByCategory(invoice)) {
      return '🚄';
    }
    if (isFlightTicketByCategory(invoice)) {
      return '✈️';
    }
    if (invoice.invoice_type === '餐饮服务') {
      return '🍽️';
    }
    
    // 根据费用类别返回emoji
    const category = (invoice.expense_category || invoice.primary_category_name || invoice.secondary_category_name || '').toLowerCase();
    
    if (category.includes('住宿') || category.includes('酒店')) {
      return '🏨';
    }
    if (category.includes('出租车') || category.includes('网约车') || category.includes('滴滴')) {
      return '🚕';
    }
    if (category.includes('加油') || category.includes('油费')) {
      return '⛽';
    }
    if (category.includes('停车')) {
      return '🅿️';
    }
    if (category.includes('办公') || category.includes('文具')) {
      return '📄';
    }
    if (category.includes('会议') || category.includes('会务')) {
      return '👥';
    }
    
    // 默认返回文档图标
    return '📄';
  };

  // 使用手势处理钩子
  const { touchHandlers, gestureState } = useGestures(
    {
      onSwipeLeft: () => {
        // 左滑 - 显示操作菜单
        if (cardRef.current && device.isMobile) {
          const moreButton = cardRef.current.querySelector('[role="button"]') as HTMLElement;
          moreButton?.click();
        }
      },
      onSwipeRight: () => {
        // 右滑 - 切换报销状态
        if (currentStatus === 'unreimbursed' && onStatusChange && device.isMobile) {
          handleStatusClick();
        }
      },
      onLongPress: () => {
        // 长按 - 选择卡片
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
        card bg-base-100 border border-base-300 hover:border-primary/40 hover:shadow-lg 
        transition-all duration-200
        ${device.isMobile ? 'rounded-lg' : 'rounded-xl'}
        ${device.isMobile ? 'shadow-sm hover:shadow-md' : 'shadow hover:shadow-lg'}
        ${gestureState.isLongPressing ? 'ring-2 ring-primary ring-opacity-50' : ''}
      `}
      {...(device.isMobile ? touchHandlers : {})}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: device.isMobile ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className={`card-body ${device.isMobile ? 'p-4' : 'p-4'}`}>
        {/* 顶部：选择框和发票类型 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* 移动端增大触控区域 - 确保44px最小触控标准 */}
            <label className={`
              cursor-pointer flex items-center justify-center
              ${device.isMobile ? 'min-w-[44px] min-h-[44px] -m-2 p-2' : 'p-1'}
            `}>
              <input 
                type="checkbox" 
                className={`checkbox ${device.isMobile ? 'checkbox-lg' : 'checkbox-sm'} flex-shrink-0`}
                checked={isSelected}
                onChange={() => onSelect(invoice.id)}
              />
            </label>
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-base flex-shrink-0">{getCategoryIcon(invoice)}</span>
                <span className="font-medium text-sm truncate">{invoice.invoice_number}</span>
              </div>
              
              {/* 统一徽章行 - 费用类别、发票状态 */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 费用类别徽章 - 第一位显示，根据分类值使用不同背景颜色 */}
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
                
                {/* 发票状态徽章 - 第二位显示，可点击切换，移动端增大触控区域 */}
                <div 
                  className={`
                    badge ${getStatusBadge(currentStatus)} font-medium 
                    ${device.isMobile ? 'badge-lg h-8 px-4 py-2 text-sm' : 'badge-sm h-5'}
                    ${onStatusChange && ['unreimbursed', 'reimbursed'].includes(currentStatus) 
                      ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 hover:shadow-md select-none' 
                      : ''
                    }
                    ${isUpdatingStatus ? 'animate-pulse' : ''}
                    ${device.isMobile && onStatusChange && ['unreimbursed', 'reimbursed'].includes(currentStatus) 
                      ? 'min-h-[44px] min-w-[80px] flex items-center justify-center' 
                      : ''
                    }
                  `}
                  onClick={handleStatusClick}
                  title={
                    onStatusChange && ['unreimbursed', 'reimbursed'].includes(currentStatus)
                      ? `点击切换为${currentStatus === 'unreimbursed' ? '已报销' : '未报销'}`
                      : '报销状态'
                  }
                >
                  {isUpdatingStatus ? (
                    <div className="flex items-center gap-1">
                      <Loader2 className="w-2 h-2 animate-spin" />
                      <span>更新中</span>
                    </div>
                  ) : (
                    getStatusText(currentStatus)
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 操作菜单 - 移动端优化触控体验 */}
          {showActions && (
            <div className="dropdown dropdown-end">
              <div 
                tabIndex={0} 
                role="button" 
                className={`
                  btn btn-ghost btn-circle
                  ${device.isMobile ? 'btn-lg min-h-[48px] min-w-[48px] p-3' : 'btn-sm'}
                  ${device.isMobile ? 'hover:bg-base-200 active:bg-base-300' : ''}
                `}
                title="更多操作"
              >
                <MoreVertical className={`${device.isMobile ? 'w-6 h-6' : 'w-4 h-4'}`} />
              </div>
              <ul tabIndex={0} className={`
                dropdown-content z-[1] menu shadow bg-base-100 rounded-box
                ${device.isMobile ? 'w-48 p-3' : 'w-36 p-2'}
                ${device.isMobile ? 'border border-base-300' : ''}
              `}>
                <li>
                  <button 
                    onClick={() => onView(invoice.id)} 
                    className={`
                      flex items-center gap-3 w-full rounded-lg transition-colors
                      ${device.isMobile ? 'text-base py-4 px-4 min-h-[48px] font-medium' : 'text-sm py-2 px-3'}
                      ${device.isMobile ? 'hover:bg-base-200 active:bg-base-300' : ''}
                    `}
                  >
                    <Eye className={`${device.isMobile ? 'w-5 h-5' : 'w-3 h-3'} flex-shrink-0`} />
                    <span>查看详情</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={handlePrint} 
                    className={`
                      flex items-center gap-3 w-full rounded-lg transition-colors
                      ${device.isMobile ? 'text-base py-4 px-4 min-h-[48px] font-medium' : 'text-sm py-2 px-3'}
                      ${device.isMobile ? 'hover:bg-base-200 active:bg-base-300' : ''}
                      ${!invoice.file_url ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    disabled={!invoice.file_url}
                  >
                    <Printer className={`${device.isMobile ? 'w-5 h-5' : 'w-3 h-3'} flex-shrink-0`} />
                    <span>打印</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onEdit(invoice)} 
                    className={`
                      flex items-center gap-3 w-full rounded-lg transition-colors
                      ${device.isMobile ? 'text-base py-4 px-4 min-h-[48px] font-medium' : 'text-sm py-2 px-3'}
                      ${device.isMobile ? 'hover:bg-base-200 active:bg-base-300' : ''}
                    `}
                  >
                    <Download className={`${device.isMobile ? 'w-5 h-5' : 'w-3 h-3'} flex-shrink-0`} />
                    <span>下载</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onDelete(invoice)} 
                    className={`
                      flex items-center gap-3 w-full rounded-lg transition-colors text-error
                      ${device.isMobile ? 'text-base py-4 px-4 min-h-[48px] font-medium' : 'text-sm py-2 px-3'}
                      ${device.isMobile ? 'hover:bg-error/10 active:bg-error/20' : ''}
                    `}
                  >
                    <Trash2 className={`${device.isMobile ? 'w-5 h-5' : 'w-3 h-3'} flex-shrink-0`} />
                    <span>删除</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>


        {/* 主要信息 - 移动端调整间距 */}
        <div className={`${device.isMobile ? 'space-y-2' : 'space-y-3'}`}>
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

          {/* 根据费用类别显示专有信息区域 */}
          {isTrainTicketByCategory(invoice) && (() => {
            const trainInfo = extractTrainTicketInfo(invoice);
            const isValid = isValidTrainTicket(trainInfo);
            
            if (!isValid || !trainInfo) {
              return (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-warning">⚠️ 火车票信息解析失败</span>
                  </div>
                </div>
              );
            }
            
            const seatStyle = getSeatTypeStyle(trainInfo.seatType);
            const route = formatTrainRoute(trainInfo.departureStation, trainInfo.arrivalStation);
            
            return (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="badge badge-info badge-sm">
                    <span className="text-xs">🕐</span>
                    <span className="font-medium">
                      {trainInfo.departureTime && trainInfo.departureTimeDetail 
                        ? `${trainInfo.departureTime} ${trainInfo.departureTimeDetail}`
                        : trainInfo.departureTime || '时间未知'
                      }
                    </span>
                  </div>
                  <div className="badge badge-outline badge-sm">
                    <span className="text-xs">🚩</span>
                    <span className="font-medium">{route}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="badge badge-primary badge-sm">
                    <span className="text-xs">🚄</span>
                    <span className="font-medium">{trainInfo.trainNumber}</span>
                  </div>
                  <div className={`badge ${seatStyle.className} badge-sm`}>
                    <span className="text-xs">{seatStyle.icon}</span>
                    <span className="font-medium">{trainInfo.seatType}</span>
                  </div>
                  <div className="badge badge-neutral badge-sm">
                    <span className="text-xs">💺</span>
                    <span className="font-medium">{trainInfo.seatNumber}</span>
                  </div>
                </div>
              </div>
            );
          })()}
          
          {isFlightTicketByCategory(invoice) && (() => {
            const flightInfo = extractFlightTicketInfo(invoice);
            const isValid = isValidFlightTicket(flightInfo);
            
            if (!isValid || !flightInfo) {
              return (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-warning">⚠️ 飞机票信息解析失败</span>
                  </div>
                </div>
              );
            }
            
            const seatClassStyle = getSeatClassStyle(flightInfo.seatClass);
            const airlineStyle = getAirlineStyle(flightInfo.airline);
            const route = formatFlightRoute(flightInfo.departureAirport, flightInfo.arrivalAirport);
            
            return (
              <div className="bg-info/10 border border-info/20 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="badge badge-info badge-sm">
                    <span className="text-xs">🕐</span>
                    <span className="font-medium">
                      {flightInfo.departureTime || '时间未知'}
                    </span>
                  </div>
                  <div className="badge badge-outline badge-sm">
                    <span className="text-xs">✈️</span>
                    <span className="font-medium">{route}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="badge badge-primary badge-sm">
                    <span className="text-xs">✈️</span>
                    <span className="font-medium">{flightInfo.flightNumber}</span>
                  </div>
                  {flightInfo.seatClass && flightInfo.seatClass.trim() && (
                    <div className={`badge ${seatClassStyle.className} badge-sm`}>
                      <span className="text-xs">{seatClassStyle.icon}</span>
                      <span className="font-medium">{flightInfo.seatClass}</span>
                    </div>
                  )}
                  {flightInfo.seatNumber && (
                    <div className="badge badge-neutral badge-sm">
                      <span className="text-xs">💺</span>
                      <span className="font-medium">{flightInfo.seatNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          
          {invoice.invoice_type === '餐饮服务' && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-base-content/60">用餐信息：</span>
                <div className="badge badge-warning badge-sm">
                  <span className="text-xs">🍽️</span>
                  <span className="font-medium">晚餐</span>
                </div>
                <span className="text-xs text-base-content/60">4人用餐</span>
              </div>
            </div>
          )}
          
          {!isTrainTicketByCategory(invoice) && !isFlightTicketByCategory(invoice) && invoice.invoice_type !== '餐饮服务' && (
            <div className="bg-base-100 border border-base-200 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-base-content/60">备注信息：</span>
                <span className="text-sm font-medium">普通发票</span>
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
                    {`消费：${formatDate(invoice.consumption_date || invoice.created_at)}`}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-success" />
                  <span className="font-bold text-lg text-success">
                    {formatCurrency(
                      invoice.invoice_type === '火车票' && invoice.extracted_data?.structured_data?.total_amount
                        ? parseFloat(invoice.extracted_data.structured_data.total_amount)
                        : (invoice.total_amount || invoice.amount || 0)
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
    </motion.div>
  );
};

export default InvoiceCard;