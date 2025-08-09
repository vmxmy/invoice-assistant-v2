import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
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
import { supabase } from '../../../lib/supabase';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';
import { useGestures } from '../../../hooks/useGestures';
import { InvoiceStatusBadge, type InvoiceStatus } from '../InvoiceStatusBadge';
import { InvoiceStatusSwitch } from '../InvoiceStatusSwitch';
import { InvoiceStatusToggle } from '../InvoiceStatusToggle';
import { useInvoiceStatuses } from '../../../hooks/useInvoiceStatuses';
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
import '../../../styles/compact-design-system.css';

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
  onConsumptionDateChange?: (invoiceId: string, newDate: string) => Promise<boolean>;
  showActions?: boolean;
  statusComponent?: 'badge' | 'switch' | 'toggle'; // 控制使用哪种状态组件
}

const InvoiceCardComponent: React.FC<InvoiceCardProps> = ({
  invoice,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onConsumptionDateChange,
  showActions = true,
  statusComponent = 'toggle' // 默认使用 toggle 组件
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);
  const [calendarId] = useState(() => `cally-${invoice.id}`);
  
  // 获取动态状态配置
  const { getStatusConfig } = useInvoiceStatuses();
  
  // 动态初始化当前状态
  const [currentStatus, setCurrentStatus] = useState<InvoiceStatus>(() => {
    // 检查数据库中是否有此状态配置
    const statusConfig = getStatusConfig(invoice.status);
    if (statusConfig) {
      return invoice.status;
    }
    
    // 兼容旧系统的状态映射
    if (invoice.status === 'unreimbursed') return 'pending';
    if (invoice.status === 'reimbursed') return 'reimbursed';
    
    // 默认返回原状态或 pending
    return invoice.status || 'pending';
  });
  
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

  // 将旧状态映射到新的状态系统
  const mapLegacyStatus = (status: string): InvoiceStatus => {
    if (status === 'unreimbursed') return 'pending';
    if (status === 'reimbursed') return 'reimbursed';
    if (status === 'rejected') return 'rejected';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'processing') return 'processing';
    return 'pending';
  };

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!onStatusChange || isUpdatingStatus) return;

    const oldStatus = currentStatus;
    
    // 获取状态配置以确定如何处理
    const newStatusConfig = getStatusConfig(newStatus);
    const statusLabel = newStatusConfig?.label || newStatus;
    
    // 映射新状态到旧系统（为了兼容性）
    let legacyStatus = newStatus;
    if (newStatus === 'pending') {
      legacyStatus = 'unreimbursed';
    } else if (newStatus === 'reimbursed') {
      legacyStatus = 'reimbursed';
    }
    // 其他状态直接使用新状态值

    try {
      setIsUpdatingStatus(true);
      
      // 乐观更新 - 先更新UI
      setCurrentStatus(newStatus);
      
      // 调用后端API
      const success = await onStatusChange(invoice.id, legacyStatus);
      
      if (success) {
        toast.success(`已标记为${statusLabel}`);
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

  const handleConsumptionDateChange = async (newDate: string) => {
    if (!onConsumptionDateChange || isUpdatingDate) return;

    const oldDate = invoice.consumption_date;
    
    try {
      setIsUpdatingDate(true);
      
      // 调用后端API更新日期
      const success = await onConsumptionDateChange(invoice.id, newDate);
      
      if (success) {
        toast.success('消费日期更新成功');
        setIsEditingDate(false);
        // 关闭日历弹窗
        const popover = document.getElementById(`${calendarId}-popover`);
        if (popover && 'hidePopover' in popover) {
          (popover as any).hidePopover();
        }
      } else {
        toast.error('消费日期更新失败，请重试');
      }
    } catch (error) {
      toast.error('消费日期更新失败，请重试');
    } finally {
      setIsUpdatingDate(false);
    }
  };

  // 处理日历组件的日期变更事件
  const handleCalendarChange = useCallback((event: Event) => {
    const target = event.target as any;
    if (target && target.value) {
      handleConsumptionDateChange(target.value);
    }
  }, [handleConsumptionDateChange]);

  const handlePrint = async () => {
    if (!invoice.file_url && !invoice.file_path) {
      toast.error('PDF文件未找到，无法打印');
      return;
    }
    
    try {
      // 生成带权限的临时访问URL
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
        // 验证URL是否安全
        try {
          const url = new URL(invoice.file_url);
          // 只允许http和https协议
          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('不支持的URL协议');
          }
          // 可选：验证域名白名单
          // const allowedDomains = ['yourdomain.com', 'supabase.co'];
          // if (!allowedDomains.some(domain => url.hostname.endsWith(domain))) {
          //   throw new Error('不允许的域名');
          // }
          signedUrl = invoice.file_url;
        } catch (urlError) {
          console.error('URL验证失败:', urlError);
          toast.error('PDF链接格式无效');
          return;
        }
      }
      
      if (!signedUrl) {
        toast.error('无法获取PDF访问链接');
        return;
      }
      
      // 在新窗口中打开PDF文件，添加安全属性
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
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
        // 右滑 - 切换到下一个可用状态
        if (onStatusChange && device.isMobile) {
          const statusConfig = getStatusConfig(currentStatus);
          if (statusConfig && statusConfig.can_transition_to && statusConfig.can_transition_to.length > 0) {
            // 选择第一个可转换的状态
            const nextStatus = statusConfig.can_transition_to[0];
            handleStatusChange(nextStatus);
          }
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
        invoice-card-compact transition-compact-slow focus-compact group relative
        ${gestureState.isLongPressing ? 'ring-2 ring-primary/20 shadow-lg scale-[1.02]' : ''}
        ${isSelected ? 'selected' : ''}
      `}
      {...(device.isMobile ? touchHandlers : {})}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      whileHover={{ 
        scale: device.isMobile ? 1 : 1.005,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ 
        scale: 0.995,
        transition: { duration: 0.1, ease: "easeInOut" }
      }}
      layout
      transition={{
        layout: { duration: 0.2, ease: "easeInOut" }
      }}
    >
      <div className="invoice-info-compact">
        {/* 顶部行：选择框和操作菜单 */}
        <div className="flex items-center justify-between mb-3">
          {/* 左侧：选择框 */}
          <label className={`
            cursor-pointer flex items-center justify-center flex-shrink-0
            transition-compact hover:bg-primary/5 rounded-lg p-1
            ${isSelected ? 'bg-primary/10' : ''}
          `}
            aria-label={`选择发票 ${invoice.invoice_number}`}
          >
            <input 
              type="checkbox" 
              className={`
                ${device.isMobile ? 'checkbox-compact-touch' : 'checkbox-compact'}
                checkbox border-2 border-base-300/70 
                checked:border-primary checked:bg-primary
                focus-compact transition-compact flex-shrink-0
              `}
              checked={isSelected}
              onChange={() => onSelect(invoice.id)}
              aria-checked={isSelected}
              aria-describedby={`invoice-${invoice.id}-info`}
            />
          </label>
          
          {/* 右侧：三点菜单 */}
          {showActions && (
            <div className={`
              flex-shrink-0
              ${device.isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              transition-opacity duration-300 ease-out
            `}>
              {/* 单独的三点菜单 */}
              <div className="dropdown dropdown-end">
                {/* 三点菜单触发器 - 最小化样式 */}
                <label 
                  tabIndex={0} 
                  className={`
                    cursor-pointer p-1 rounded-lg
                    hover:bg-base-200/50 transition-colors
                  `}
                  title="更多操作"
                  aria-label={`发票 ${invoice.invoice_number} 的操作菜单`}
                  role="button"
                  aria-haspopup="true"
                  aria-expanded="false"
                >
                  <MoreVertical className={`${device.isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-base-content/60 hover:text-base-content`} />
                </label>
                
                {/* DaisyUI原生菜单结构 */}
                <ul 
                  tabIndex={0} 
                  className={`
                    dropdown-content menu p-2 shadow bg-base-100 rounded-box
                    ${device.isMobile ? 'w-52' : 'w-48'} z-[9998]
                    border border-base-300/50
                  `}
                  role="menu"
                  aria-labelledby={`menu-button-${invoice.id}`}
                >
                  <li role="none">
                    <a 
                      onClick={() => onView(invoice.id)}
                      className={`
                        flex items-center gap-2 hover:bg-primary/10
                        ${device.isMobile ? 'py-3' : 'py-2'}
                      `}
                      role="menuitem"
                      tabIndex={0}
                      aria-label="查看发票详情"
                    >
                      <Eye className={`${device.isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-primary`} />
                      <span>查看详情</span>
                    </a>
                  </li>
                  
                  <li>
                      <a 
                        onClick={handlePrint}
                        className={`
                          flex items-center gap-2 
                          ${!invoice.file_url && !invoice.file_path ? 'opacity-50 cursor-not-allowed' : 'hover:bg-info/10'}
                          ${device.isMobile ? 'py-3' : 'py-2'}
                        `}
                        disabled={!invoice.file_url && !invoice.file_path}
                      >
                        <Printer className={`${device.isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-info`} />
                        <span>打印</span>
                      </a>
                    </li>
                    
                    <li>
                      <a 
                        onClick={() => onEdit(invoice)}
                        className={`
                          flex items-center gap-2 hover:bg-warning/10
                          ${device.isMobile ? 'py-3' : 'py-2'}
                        `}
                      >
                        <Download className={`${device.isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-warning`} />
                        <span>下载</span>
                      </a>
                    </li>
                    
                    {/* daisyUI 分隔线 */}
                    <div className="divider my-1"></div>
                    
                    <li>
                      <a 
                        onClick={() => {
                          if (window.confirm('确定要删除这张发票吗？此操作无法撤销。')) {
                            onDelete(invoice);
                          }
                        }}
                        className={`
                          flex items-center gap-2 text-error hover:bg-error/10
                          ${device.isMobile ? 'py-3' : 'py-2'}
                        `}
                      >
                        <Trash2 className={`${device.isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
                        <span>删除</span>
                      </a>
                    </li>
                  </ul>
              </div>
            </div>
          )}
        </div>

        {/* 第二行：分类徽章和状态组件 */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {/* 左侧：费用类别徽章 */}
          {(invoice.expense_category || invoice.primary_category_name || invoice.secondary_category_name) ? (
            <div className={`
              badge-compact-sm inline-flex items-center gap-1.5
              ${getCategoryBadgeStyle(invoice).className}
              shadow-sm ring-1 ring-black/5 transition-compact
              hover:shadow-sm hover:scale-105
            `}
              style={getCategoryBadgeStyle(invoice).style}
            >
              <span className="text-current opacity-90 text-xs">{getCategoryIcon(invoice)}</span>
              <span className="truncate max-w-24 text-current">{getCategoryDisplayName(invoice)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="badge-compact-xs inline-flex items-center gap-1 bg-base-200/50 text-base-content/60 ring-1 ring-base-300/30">
                <span className="opacity-70 text-xs">📄</span>
                <span>未分类</span>
              </div>
              <div className="badge-compact-xs bg-warning/10 text-warning ring-1 ring-warning/20">
                待分类
              </div>
            </div>
          )}
          
          {/* 右侧：状态组件 */}
          {statusComponent === 'toggle' ? (
            <InvoiceStatusToggle
              status={currentStatus}
              onStatusChange={onStatusChange ? handleStatusChange : undefined}
              size="sm"
              disabled={!onStatusChange}
              loading={isUpdatingStatus}
            />
          ) : statusComponent === 'switch' ? (
            <InvoiceStatusSwitch
              status={currentStatus}
              onStatusChange={onStatusChange ? handleStatusChange : undefined}
              size="sm"
              disabled={!onStatusChange}
              loading={isUpdatingStatus}
            />
          ) : (
            <InvoiceStatusBadge
              status={currentStatus}
              onStatusChange={onStatusChange ? handleStatusChange : undefined}
              size="sm"
              interactive={!!onStatusChange}
              showDropdownArrow={true}
            />
          )}
        </div>

        {/* 信息内容区域 - 改进层次结构 */}
        <div className="space-y-4">
          {/* 企业信息卡片 - 简化设计 */}
          {(invoice.seller_name || invoice.buyer_name) && (
            <div className="bg-base-50/30 border border-base-200/50 rounded-lg p-3">
              
              <div className="grid gap-2">
                {invoice.seller_name && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-primary/70" />
                      <span className="text-xs text-base-content/60">销售方</span>
                    </div>
                    <span className="text-sm font-medium text-base-content/90 truncate max-w-40">
                      {invoice.seller_name}
                    </span>
                  </div>
                )}
                
                {invoice.buyer_name && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-accent/70" />
                      <span className="text-xs text-base-content/60">购买方</span>
                    </div>
                    <span className="text-sm font-medium text-base-content/90 truncate max-w-40">
                      {invoice.buyer_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 特殊票据信息区域 - 紧凑设计 */}
          {isTrainTicketByCategory(invoice) && (() => {
            const trainInfo = extractTrainTicketInfo(invoice);
            const isValid = isValidTrainTicket(trainInfo);
            
            if (!isValid || !trainInfo) {
              return (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-2">
                  <span className="text-xs text-warning">⚠️ 火车票信息解析失败</span>
                </div>
              );
            }
            
            const seatStyle = getSeatTypeStyle(trainInfo.seatType);
            const route = formatTrainRoute(trainInfo.departureStation, trainInfo.arrivalStation);
            
            return (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-2">
                <div className="flex items-center gap-1 flex-wrap mb-1">
                  <div className="badge-compact-xs badge badge-info">
                    <span className="text-xs">🕐</span>
                    <span className="font-medium text-xs">
                      {trainInfo.departureTime && trainInfo.departureTimeDetail 
                        ? `${trainInfo.departureTime} ${trainInfo.departureTimeDetail}`
                        : trainInfo.departureTime || '时间未知'
                      }
                    </span>
                  </div>
                  <div className="badge-compact-xs badge badge-outline">
                    <span className="text-xs">🚩</span>
                    <span className="font-medium text-xs">{route}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <div className="badge-compact-xs badge badge-primary">
                    <span className="text-xs">🚄</span>
                    <span className="font-medium text-xs">{trainInfo.trainNumber}</span>
                  </div>
                  <div className={`badge-compact-xs badge ${seatStyle.className}`}>
                    <span className="text-xs">{seatStyle.icon}</span>
                    <span className="font-medium text-xs">{trainInfo.seatType}</span>
                  </div>
                  <div className="badge-compact-xs badge badge-neutral">
                    <span className="text-xs">💺</span>
                    <span className="font-medium text-xs">{trainInfo.seatNumber}</span>
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
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-2">
                  <span className="text-xs text-warning">⚠️ 飞机票信息解析失败</span>
                </div>
              );
            }
            
            const seatClassStyle = getSeatClassStyle(flightInfo.seatClass);
            const route = formatFlightRoute(flightInfo.departureAirport, flightInfo.arrivalAirport);
            
            return (
              <div className="bg-info/10 border border-info/20 rounded-lg p-2">
                <div className="flex items-center gap-1 flex-wrap mb-1">
                  <div className="badge-compact-xs badge badge-info">
                    <span className="text-xs">🕐</span>
                    <span className="font-medium text-xs">
                      {flightInfo.departureTime || '时间未知'}
                    </span>
                  </div>
                  <div className="badge-compact-xs badge badge-outline">
                    <span className="text-xs">✈️</span>
                    <span className="font-medium text-xs">{route}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <div className="badge-compact-xs badge badge-primary">
                    <span className="text-xs">✈️</span>
                    <span className="font-medium text-xs">{flightInfo.flightNumber}</span>
                  </div>
                  {flightInfo.seatClass && flightInfo.seatClass.trim() && (
                    <div className={`badge-compact-xs badge ${seatClassStyle.className}`}>
                      <span className="text-xs">{seatClassStyle.icon}</span>
                      <span className="font-medium text-xs">{flightInfo.seatClass}</span>
                    </div>
                  )}
                  {flightInfo.seatNumber && (
                    <div className="badge-compact-xs badge badge-neutral">
                      <span className="text-xs">💺</span>
                      <span className="font-medium text-xs">{flightInfo.seatNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          
          {invoice.invoice_type === '餐饮服务' && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-2">
              <div className="flex items-center gap-1">
                <span className="field-label">用餐：</span>
                <div className="badge-compact-xs badge badge-warning">
                  <span className="text-xs">🍽️</span>
                  <span className="font-medium text-xs">晚餐</span>
                </div>
                <span className="text-xs text-base-content/60">4人</span>
              </div>
            </div>
          )}

          {/* 金额和日期信息卡片 - 突出显示 */}
          <div className="bg-gradient-to-r from-success/5 to-primary/5 border border-success/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              {/* 日期信息 - 可编辑 */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-info/70" />
                  <span className="text-xs font-medium text-base-content/60 uppercase tracking-wide">
                    消费时间
                  </span>
                  {isUpdatingDate && (
                    <Loader2 className="w-3 h-3 animate-spin text-info/70" />
                  )}
                </div>
                
                {/* Cally日历组件 */}
                {onConsumptionDateChange ? (
                  <>
                    <button
                      popoverTarget={`${calendarId}-popover`}
                      className={`
                        text-left text-sm font-semibold text-base-content/80 hover:text-primary transition-colors
                        hover:underline cursor-pointer btn btn-ghost btn-xs justify-start p-0 h-auto min-h-0
                      `}
                      style={{ anchorName: `--${calendarId}` }}
                      disabled={isUpdatingDate}
                      title="点击修改消费日期"
                    >
                      {formatDate(invoice.consumption_date || invoice.created_at)}
                    </button>
                    
                    <div
                      popover="auto"
                      id={`${calendarId}-popover`}
                      className="dropdown bg-base-100 rounded-box shadow-lg border border-base-300 p-2"
                      style={{ positionAnchor: `--${calendarId}` }}
                    >
                      <calendar-date
                        className="cally"
                        value={invoice.consumption_date ? new Date(invoice.consumption_date).toISOString().split('T')[0] : new Date(invoice.created_at).toISOString().split('T')[0]}
                        onchange={handleCalendarChange}
                      >
                        <svg 
                          aria-label="Previous" 
                          className="fill-current size-4" 
                          slot="previous" 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24"
                        >
                          <path d="M15.75 19.5 8.25 12l7.5-7.5"></path>
                        </svg>
                        <svg 
                          aria-label="Next" 
                          className="fill-current size-4" 
                          slot="next" 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24"
                        >
                          <path d="m8.25 4.5 7.5 7.5-7.5 7.5"></path>
                        </svg>
                        <calendar-month></calendar-month>
                      </calendar-date>
                    </div>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-base-content/80">
                    {formatDate(invoice.consumption_date || invoice.created_at)}
                  </span>
                )}
              </div>
              
              {/* 金额信息 */}
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-success/70" />
                  <span className="text-xs font-medium text-base-content/60 uppercase tracking-wide">
                    发票金额
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-success">
                    {formatCurrency(
                      invoice.invoice_type === '火车票' && invoice.extracted_data?.structured_data?.total_amount
                        ? parseFloat(invoice.extracted_data.structured_data.total_amount)
                        : (invoice.total_amount || invoice.amount || 0)
                    )}
                  </span>
                  {invoice.invoice_type === '火车票' && invoice.extracted_data?.structured_data?.total_amount && (
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <div className="w-1.5 h-1.5 bg-success/40 rounded-full"></div>
                      <span className="text-xs text-success/70 font-medium">实际金额</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
};

// 使用React.memo优化性能，只在关键props变化时重新渲染
export const InvoiceCard = React.memo(InvoiceCardComponent, (prevProps, nextProps) => {
  // 自定义比较逻辑
  return (
    prevProps.invoice.id === nextProps.invoice.id &&
    prevProps.invoice.status === nextProps.invoice.status &&
    prevProps.invoice.updated_at === nextProps.invoice.updated_at &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.showActions === nextProps.showActions &&
    prevProps.statusComponent === nextProps.statusComponent
  );
});

export default InvoiceCard;