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
import { usePassiveGestures } from '../../../hooks/usePassiveGestures';
import { useTouchFeedback } from '../../../hooks/useTouchFeedback';
import { hapticPresets } from '../../../services/hapticFeedbackManager';
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
  compact?: boolean; // 紧凑模式
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
  statusComponent = 'toggle', // 默认使用 toggle 组件
  compact = false // 默认非紧凑模式
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

  // 触摸反馈配置
  const touchFeedback = useTouchFeedback(
    {
      ripple: true,
      rippleColor: 'rgb(var(--fallback-p))',
      rippleOpacity: 0.1,
      longPress: true,
      longPressThreshold: 600,
      haptic: true,
      hapticTap: 'light',
      hapticLongPress: 'medium',
      mobileOnly: true, // 只在移动端启用
    },
    {
      onTap: () => {
        if (!isSelected) {
          onView(invoice.id);
          hapticPresets.buttonTap(); // 触发查看动作的触觉反馈
        }
      },
      onLongPress: () => {
        // 长按选择/取消选择发票
        onSelect(invoice.id);
        hapticPresets.itemSelect(); // 触发选择动作的触觉反馈
      },
      onLongPressStart: () => {
        // 长按开始时的视觉提示可以在这里添加
      },
      onLongPressCancel: () => {
        // 长按取消时的处理
      },
    }
  );

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

  // 分离金额的整数和小数部分
  const formatCurrencyParts = (amount: number) => {
    const formatted = new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    
    // 移除货币符号并分离整数和小数
    const cleanAmount = formatted.replace('¥', '').trim();
    const parts = cleanAmount.split('.');
    
    return {
      symbol: '¥',
      integer: parts[0] || '0',
      decimal: parts[1] || '00'
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // 使用短格式：MM/DD
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };
  
  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    // 格式：YYYY/MM/DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
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
        hapticPresets.actionSuccess(); // 成功触觉反馈
      } else {
        // 失败时回滚状态
        setCurrentStatus(oldStatus);
        toast.error('状态更新失败，请重试');
        hapticPresets.actionError(); // 错误触觉反馈
      }
    } catch (error) {
      // 异常时回滚状态
      setCurrentStatus(oldStatus);
      toast.error('状态更新失败，请重试');
      hapticPresets.actionError(); // 错误触觉反馈
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

  // 处理日历弹窗显示位置
  const handleCalendarPopoverToggle = useCallback((event: Event) => {
    const popover = event.target as HTMLElement;
    if (!popover) return;

    // 使用 requestAnimationFrame 确保在 DOM 更新后执行
    requestAnimationFrame(() => {
      const rect = popover.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // 检查是否超出视口底部
      const isOverflowingBottom = rect.bottom > viewportHeight;
      const isOverflowingTop = rect.top < 0;
      const isOverflowingRight = rect.right > viewportWidth;
      const isOverflowingLeft = rect.left < 0;
      
      // 计算可用空间
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom + rect.height;
      
      // 动态调整位置
      if (isOverflowingBottom && spaceAbove > rect.height) {
        // 如果底部溢出且上方有足够空间，向上显示
        popover.style.top = 'auto';
        popover.style.bottom = `${viewportHeight - rect.top + 10}px`;
        popover.style.maxHeight = `${Math.min(spaceAbove - 20, 400)}px`;
        popover.style.overflowY = 'auto';
      } else if (isOverflowingBottom) {
        // 如果底部溢出但上方空间不足，限制高度
        popover.style.maxHeight = `${viewportHeight - rect.top - 20}px`;
        popover.style.overflowY = 'auto';
      }
      
      // 处理水平方向溢出
      if (isOverflowingRight) {
        popover.style.left = 'auto';
        popover.style.right = '10px';
      } else if (isOverflowingLeft) {
        popover.style.left = '10px';
      }
      
      // 确保弹窗始终在视口内
      if (device.isMobile) {
        popover.style.maxWidth = `${Math.min(viewportWidth - 20, 350)}px`;
      }
    });
  }, [device.isMobile]);

  const handlePrint = async () => {
    if (!invoice.file_url && !invoice.file_path) {
      toast.error('PDF文件未找到，无法打印');
      hapticPresets.actionError(); // 错误触觉反馈
      return;
    }
    
    hapticPresets.buttonTap(); // 操作开始触觉反馈
    
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
          hapticPresets.actionError(); // 错误触觉反馈
          return;
        }
      }
      
      if (!signedUrl) {
        toast.error('无法获取PDF访问链接');
        hapticPresets.actionError(); // 错误触觉反馈
        return;
      }
      
      // 在新窗口中打开PDF文件，添加安全属性
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
      toast.success('已在新窗口中打开PDF文件');
      hapticPresets.actionSuccess(); // 成功触觉反馈
      
    } catch (error) {
      console.error('PDF打印失败:', error);
      toast.error(`PDF访问失败: ${error.message}`);
      hapticPresets.actionError(); // 错误触觉反馈
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

  // 桌面端手势处理 - 始终调用但有条件使用
  const { touchHandlers, gestureState } = useGestures(
    {
      onSwipeLeft: () => {
        // 左滑 - 显示操作菜单
        if (cardRef.current && !device.isMobile) { // 只在桌面端处理
          const moreButton = cardRef.current.querySelector('[role="button"]') as HTMLElement;
          moreButton?.click();
          hapticPresets.buttonTap(); // 添加触觉反馈
        }
      },
      onSwipeRight: () => {
        // 右滑 - 切换到下一个可用状态
        if (onStatusChange && !device.isMobile) { // 只在桌面端处理
          const statusConfig = getStatusConfig(currentStatus);
          if (statusConfig && statusConfig.can_transition_to && statusConfig.can_transition_to.length > 0) {
            // 选择第一个可转换的状态
            const nextStatus = statusConfig.can_transition_to[0];
            handleStatusChange(nextStatus);
            hapticPresets.switchToggle(); // 添加状态切换的触觉反馈
          }
        }
      },
      onLongPress: () => {
        // 长按 - 选择卡片
        if (!device.isMobile) { // 只在桌面端处理
          onSelect(invoice.id);
          hapticPresets.itemSelect(); // 添加选择的触觉反馈
        }
      },
    },
    {
      swipeThreshold: 60,
      longPressDelay: 500,
      preventScroll: false, // 改为false以支持passive优化
    }
  );

  // 移动端使用passive手势处理
  const { setGestureRef, gestureState: passiveGestureState } = usePassiveGestures(
    {
      onSwipeLeft: () => {
        // 左滑 - 显示操作菜单
        if (cardRef.current && device.isMobile) {
          const moreButton = cardRef.current.querySelector('[role="button"]') as HTMLElement;
          moreButton?.click();
          hapticPresets.buttonTap(); // 添加触觉反馈
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
            hapticPresets.switchToggle(); // 添加状态切换的触觉反馈
          }
        }
      },
      onLongPress: () => {
        // 长按 - 选择卡片
        if (device.isMobile) {
          onSelect(invoice.id);
          hapticPresets.itemSelect(); // 添加选择的触觉反馈
        }
      },
    },
    {
      swipeThreshold: 60,
      longPressDelay: 500,
    }
  );

  // 合并手势状态
  const finalGestureState = device.isMobile ? passiveGestureState : (gestureState || { isLongPressing: false, isSwiping: false });

  // 设置手势ref回调
  const setCardRef = useCallback((element: HTMLDivElement | null) => {
    cardRef.current = element;
    if (device.isMobile && element) {
      setGestureRef(element);
    }
  }, [device.isMobile, setGestureRef]);

  // 提取touchFeedback中的事件处理器
  const {
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onMouseLeave,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    onKeyDown,
    onKeyUp,
    onClick,
    ...touchFeedbackProps
  } = touchFeedback;


  return (
    <motion.div 
      ref={setCardRef}
      className={`
        card card-compact bg-base-100 shadow-sm border border-base-200/60 group relative
        hover:border-primary/30 hover:shadow-md transition-all duration-300 ease-out overflow-hidden
        w-full
        ${finalGestureState.isLongPressing || touchFeedback.isLongPressing ? 'ring-2 ring-primary/20 shadow-lg scale-[1.01]' : ''}
        ${isSelected ? 'border-primary/50 bg-primary/5 shadow-lg ring-2 ring-primary/20' : ''}
        ${touchFeedback.isPressed ? 'bg-primary/5' : ''}
      `}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      layout
      transition={{
        layout: { duration: 0.2, ease: "easeInOut" }
      }}
    >
      <div className={`card-body w-full ${compact ? 'p-2' : 'p-3 sm:p-4'}`}>
        {/* 优化后的顶部行：选择框 + 状态和类别徽章 + 三点菜单 */}
        {device.isMobile && !compact ? (
          // 移动端布局：垂直排列
          <div className="space-y-2 mb-2">
            {/* 第一行：选择框 + 状态 + 三点菜单 */}
            <div className="flex items-center justify-between gap-2">
              {/* 左侧：选择框 */}
              <label className={`
                cursor-pointer flex items-center justify-center flex-shrink-0
                transition-all duration-200 hover:bg-primary/5 rounded-lg p-1
                ${isSelected ? 'bg-primary/10' : ''}
              `}
                aria-label={`选择发票 ${invoice.invoice_number}`}
              >
                <input 
                  type="checkbox" 
                  className={`
                    checkbox-xs
                    border-2 border-base-300/70 
                    checked:border-primary checked:bg-primary
                    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 
                    transition-all duration-200 flex-shrink-0
                  `}
                  checked={isSelected}
                  onChange={() => onSelect(invoice.id)}
                  aria-checked={isSelected}
                  aria-describedby={`invoice-${invoice.id}-info`}
                />
              </label>
              
              {/* 中间：状态组件 */}
              <div className="flex-1">
                {statusComponent === 'toggle' ? (
                <InvoiceStatusToggle
                  status={currentStatus}
                  onStatusChange={onStatusChange ? handleStatusChange : undefined}
                  size="xs"
                  disabled={!onStatusChange}
                  loading={isUpdatingStatus}
                />
              ) : statusComponent === 'switch' ? (
                <InvoiceStatusSwitch
                  status={currentStatus}
                  onStatusChange={onStatusChange ? handleStatusChange : undefined}
                  size="xs"
                  disabled={!onStatusChange}
                  loading={isUpdatingStatus}
                />
              ) : (
                <InvoiceStatusBadge
                  status={currentStatus}
                  onStatusChange={onStatusChange ? handleStatusChange : undefined}
                  size="xs"
                  interactive={!!onStatusChange}
                  showDropdownArrow={true}
                />
              )}
              </div>
              
              {/* 右侧：三点菜单 */}
              {showActions && (
                <div className="flex-shrink-0">
                  <div className="dropdown dropdown-end">
                    <div
                      tabIndex={0} 
                      role="button"
                      className="btn btn-xs btn-ghost text-base-content/80 hover:text-base-content cursor-pointer"
                      title="更多操作"
                      aria-label={`发票操作菜单`}
                      aria-haspopup="true"
                      aria-expanded="false"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <MoreVertical className="w-3 h-3" />
                    </div>
                    
                    <ul 
                      tabIndex={0} 
                      className="dropdown-content menu p-2 shadow bg-base-100 rounded-box invoice-dropdown-menu border border-base-300/50"
                      role="menu"
                      aria-labelledby={`menu-button-${invoice.id}`}
                    >
                      <li>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint();
                          }}
                          className={`
                            flex items-center gap-2 rounded-md w-full text-left
                            ${!invoice.file_url && !invoice.file_path ? 'opacity-50 cursor-not-allowed' : 'hover:bg-info/10'}
                            invoice-menu-item
                          `}
                          disabled={!invoice.file_url && !invoice.file_path}
                        >
                          <Printer className="w-3 h-3 text-info" />
                          <span>打印</span>
                        </button>
                      </li>
                      
                      <li>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(invoice);
                          }}
                          className="flex items-center gap-2 hover:bg-warning/10 rounded-md w-full text-left invoice-menu-item"
                        >
                          <Download className="w-3 h-3 text-warning" />
                          <span>下载</span>
                        </button>
                      </li>
                        
                      <li>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(invoice);
                          }}
                          className="flex items-center gap-2 text-error hover:bg-error/10 rounded-md w-full text-left invoice-menu-item"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>删除</span>
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
            
            {/* 第二行：费用类别徽章 */}
            <div className="w-full">
              {(invoice.expense_category || invoice.primary_category_name || invoice.secondary_category_name) ? (
                <div className={`
                  inline-flex items-center gap-1
                  ${getCategoryBadgeStyle(invoice).className}
                  badge-xs
                  transition-all duration-200 hover:scale-105
                `}
                >
                  <span className="opacity-90">{getCategoryIcon(invoice)}</span>
                  <span className={`truncate ${compact ? 'max-w-16' : 'max-w-20'}`}>{getCategoryDisplayName(invoice)}</span>
                </div>
              ) : (
                <div className="badge badge-ghost badge-xs inline-flex items-center gap-1">
                  <span className="opacity-70">📄</span>
                  <span className="text-xs">未分类</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          // 桌面端和紧凑模式布局：单行显示
          <div className={`flex items-center justify-between gap-1 sm:gap-2 ${compact ? 'mb-2' : 'mb-2 sm:mb-3'}`}>
            {/* 左侧：选择框 */}
            <label className={`
              cursor-pointer flex items-center justify-center flex-shrink-0
              transition-all duration-200 hover:bg-primary/5 rounded-lg p-1
              ${isSelected ? 'bg-primary/10' : ''}
            `}
              aria-label={`选择发票 ${invoice.invoice_number}`}
            >
              <input 
                type="checkbox" 
                className={`
                  ${compact ? 'checkbox-xs' : 'checkbox-sm'}
                  border-2 border-base-300/70 
                  checked:border-primary checked:bg-primary
                  focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 
                  transition-all duration-200 flex-shrink-0
                `}
                checked={isSelected}
                onChange={() => onSelect(invoice.id)}
                aria-checked={isSelected}
                aria-describedby={`invoice-${invoice.id}-info`}
              />
            </label>
            
            {/* 中间：状态和类别徽章组合 */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* 状态组件 */}
              <div className="flex-shrink-0">
                {statusComponent === 'toggle' ? (
                  <InvoiceStatusToggle
                    status={currentStatus}
                    onStatusChange={onStatusChange ? handleStatusChange : undefined}
                    size={compact ? "xs" : "sm"}
                    disabled={!onStatusChange}
                    loading={isUpdatingStatus}
                  />
                ) : statusComponent === 'switch' ? (
                  <InvoiceStatusSwitch
                    status={currentStatus}
                    onStatusChange={onStatusChange ? handleStatusChange : undefined}
                    size={compact ? "xs" : "sm"}
                    disabled={!onStatusChange}
                    loading={isUpdatingStatus}
                  />
                ) : (
                  <InvoiceStatusBadge
                    status={currentStatus}
                    onStatusChange={onStatusChange ? handleStatusChange : undefined}
                    size={compact ? "xs" : "sm"}
                    interactive={!!onStatusChange}
                    showDropdownArrow={true}
                  />
                )}
              </div>
              
              {/* 费用类别徽章 - 在同一行右侧显示 */}
              <div className="flex-shrink-0 ml-auto">
                {(invoice.expense_category || invoice.primary_category_name || invoice.secondary_category_name) ? (
                  <div className={`
                    inline-flex items-center ${compact ? 'gap-1' : 'gap-1.5'}
                    ${getCategoryBadgeStyle(invoice).className}
                    ${compact ? 'badge-xs' : 'badge-sm'}
                    transition-all duration-200 hover:scale-105
                  `}
                  >
                    <span className="opacity-90">{getCategoryIcon(invoice)}</span>
                    <span className={`truncate ${compact ? 'max-w-16' : 'max-w-20'}`}>{getCategoryDisplayName(invoice)}</span>
                  </div>
                ) : (
                  <div className={`badge badge-ghost ${compact ? 'badge-xs' : 'badge-sm'} inline-flex items-center gap-1`}>
                    <span className="opacity-70">📄</span>
                    <span className={compact ? 'text-xs' : ''}>未分类</span>
                  </div>
                )}
              </div>
            </div>
          
          {/* 右侧：三点菜单 */}
          {showActions && (
            <div className="flex-shrink-0">
              <div className="dropdown dropdown-end">
                <div
                  tabIndex={0} 
                  role="button"
                  className={`
                    ${compact ? 'btn btn-xs btn-ghost' : 'btn btn-sm btn-ghost'}
                    text-base-content/80 hover:text-base-content cursor-pointer
                  `}
                  title="更多操作"
                  aria-label={`发票操作菜单`}
                  aria-haspopup="true"
                  aria-expanded="false"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <MoreVertical className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
                </div>
                
                <ul 
                  tabIndex={0} 
                  className="
                    dropdown-content menu p-2 shadow bg-base-100 rounded-box
                    invoice-dropdown-menu border border-base-300/50
                  "
                  role="menu"
                  aria-labelledby={`menu-button-${invoice.id}`}
                >
                  <li>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrint();
                      }}
                      className={`
                        flex items-center gap-2 rounded-md w-full text-left
                        ${!invoice.file_url && !invoice.file_path ? 'opacity-50 cursor-not-allowed' : 'hover:bg-info/10'}
                        invoice-menu-item
                      `}
                      disabled={!invoice.file_url && !invoice.file_path}
                    >
                      <Printer className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-info`} />
                      <span>打印</span>
                    </button>
                  </li>
                  
                  <li>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(invoice);
                      }}
                      className="
                        flex items-center gap-2 hover:bg-warning/10 rounded-md w-full text-left
                        invoice-menu-item
                      "
                    >
                      <Download className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-warning`} />
                      <span>下载</span>
                    </button>
                  </li>
                    
                  <div className="divider my-1"></div>
                  
                  <li>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('确定要删除这张发票吗？此操作无法撤销。')) {
                          onDelete(invoice);
                        }
                      }}
                      className="
                        flex items-center gap-2 text-error hover:bg-error/10 rounded-md w-full text-left
                        invoice-menu-item
                      "
                    >
                      <Trash2 className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
                      <span>删除</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          )}
          </div>
        )}

        {/* 优化后的紧凑信息区域 */}
        <div className="space-y-2">
          {/* 核心信息：金额、日期和企业信息合并 - 响应式布局 */}
          <div className={`${compact ? 'stats stats-horizontal shadow-sm' : device.isMobile ? 'stats shadow' : 'stats stats-horizontal shadow'} w-full`}>
            {device.isMobile && !compact ? (
              // 移动端布局: 金额和日期垂直排列
              <div className="stat px-3 py-2">
                <div className="space-y-2">
                  {/* 第一行: 金额 */}
                  <div className="stat-value">
                        {(() => {
                  // 火车票特殊处理：先尝试从提取的火车票信息中获取金额
                  let amount = 0;
                  
                  if (isTrainTicketByCategory(invoice)) {
                    const trainInfo = extractTrainTicketInfo(invoice);
                    if (trainInfo && trainInfo.fare) {
                      amount = trainInfo.fare;
                    } else {
                      // 如果提取失败，尝试其他字段
                      amount = invoice.total_amount || invoice.amount || 0;
                    }
                  } else {
                    // 非火车票使用常规字段
                    amount = invoice.total_amount || invoice.amount || 0;
                  }
                  
                  // 如果金额为0，显示特殊处理
                  if (amount === 0) {
                    return (
                      <span className={`${compact ? 'text-base' : 'text-lg'} text-base-content/60`}>
                        金额待确认
                      </span>
                    );
                  }
                  
                  const parts = formatCurrencyParts(amount);
                  
                  return (
                    <span className="flex items-baseline">
                      <span className={`${compact || device.isMobile ? 'text-base' : 'text-xl sm:text-2xl'} font-bold`}>
                        {parts.symbol}{parts.integer}
                      </span>
                      <span className={`${compact || device.isMobile ? 'text-xs' : 'text-base sm:text-lg'} opacity-75`}>
                        .{parts.decimal}
                      </span>
                    </span>
                  );
                        })()}
                  </div>
                  {/* 企业信息 - 紧凑显示在金额下方 */}
                  {invoice.seller_name && (
                    <div className={`stat-desc ${compact ? 'text-[10px]' : 'text-xs'} text-base-content/60 truncate`}>
                      <Building2 className="inline w-3 h-3 mr-1 text-primary/70" />
                      {invoice.seller_name}
                    </div>
                  )}
                  
                  {/* 第二行: 日期 */}
                  <div className="stat-value">
                {isUpdatingDate && (
                  <Loader2 className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} animate-spin text-base-content/50`} />
                )}
                {/* Cally日历组件 */}
                {onConsumptionDateChange ? (
                  <>
                    <button
                      popoverTarget={`${calendarId}-popover`}
                      className={`inline-block text-primary hover:text-primary-focus transition-colors ${compact || device.isMobile ? 'text-base' : 'text-lg sm:text-xl'} font-bold hover:underline decoration-dotted underline-offset-4`}
                      style={{ anchorName: `--${calendarId}` }}
                      disabled={isUpdatingDate}
                      title={`点击修改消费日期`}
                    >
                      {formatFullDate(invoice.consumption_date || invoice.created_at)}
                    </button>
                    
                    <div
                      popover="auto"
                      id={`${calendarId}-popover`}
                      className="calendar-popover bg-base-100 rounded-box shadow-lg border border-base-300 p-2"
                      style={{ 
                        positionAnchor: `--${calendarId}`,
                        zIndex: 9999,
                        position: 'fixed',
                        maxHeight: 'min(400px, 80vh)',
                        overflowY: 'auto',
                        inset: 'unset',
                        top: 'anchor(bottom)',
                        left: 'anchor(center)',
                        transform: 'translateX(-50%)',
                        // 使用 CSS 逻辑属性实现自适应位置
                        positionFallback: 'flip-block flip-inline',
                        // 备用方案：如果底部空间不足，自动翻转到顶部
                        bottom: 'auto'
                      }}
                      onToggle={handleCalendarPopoverToggle}
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
                  <span className={`inline-block text-primary ${compact || device.isMobile ? 'text-base' : 'text-lg sm:text-xl'} font-bold`}>
                    {formatFullDate(invoice.consumption_date || invoice.created_at)}
                  </span>
                )}
                  </div>
                </div>
              </div>
            ) : (
              // 桌面端和紧凑模式布局: 分开的stat卡片
              <>
                {/* 发票金额 Stat */}
                <div className={`stat ${compact ? 'px-2 py-1.5' : 'px-3 py-2 sm:px-4 sm:py-3'} flex-1`}>
                  <div className="stat-value">
                    {(() => {
                      // 火车票特殊处理：先尝试从提取的火车票信息中获取金额
                      let amount = 0;
                      
                      if (isTrainTicketByCategory(invoice)) {
                        const trainInfo = extractTrainTicketInfo(invoice);
                        if (trainInfo && trainInfo.fare) {
                          amount = trainInfo.fare;
                        } else {
                          // 如果提取失败，尝试其他字段
                          amount = invoice.total_amount || invoice.amount || 0;
                        }
                      } else {
                        // 非火车票使用常规字段
                        amount = invoice.total_amount || invoice.amount || 0;
                      }
                      
                      // 如果金额为0，显示特殊处理
                      if (amount === 0) {
                        return (
                          <span className={`${compact ? 'text-base' : 'text-lg'} text-base-content/60`}>
                            金额待确认
                          </span>
                        );
                      }
                      
                      const parts = formatCurrencyParts(amount);
                      
                      return (
                        <span className="flex items-baseline">
                          <span className={`${compact ? 'text-base' : 'text-xl sm:text-2xl'} font-bold`}>
                            {parts.symbol}{parts.integer}
                          </span>
                          <span className={`${compact ? 'text-xs' : 'text-base sm:text-lg'} opacity-75`}>
                            .{parts.decimal}
                          </span>
                        </span>
                      );
                    })()}
                  </div>
                  {/* 企业信息 - 紧凑显示在金额下方 */}
                  {invoice.seller_name && (
                    <div className={`stat-desc ${compact ? 'text-[10px]' : 'text-xs'} text-base-content/60 mt-1 truncate`}>
                      <Building2 className="inline w-3 h-3 mr-1 text-primary/70" />
                      {invoice.seller_name}
                    </div>
                  )}
                  {/* 含税信息 - 桌面端显示 */}
                  {!device.isMobile && !compact && !isTrainTicketByCategory(invoice) && invoice.tax_amount && typeof invoice.tax_amount === 'number' && invoice.tax_amount > 0 && (
                    <div className={`${compact ? 'text-[10px]' : 'text-xs'} text-base-content/40 mt-0.5`}>
                      含税 {formatCurrency(invoice.tax_amount)}
                    </div>
                  )}
                </div>

                {/* 消费日期 Stat */}
                <div className={`stat ${compact ? 'px-2 py-1.5' : 'px-3 py-2 sm:px-4 sm:py-3'} flex-1`}>
                  <div className="stat-value flex items-center gap-2">
                    {isUpdatingDate && (
                      <Loader2 className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} animate-spin text-base-content/50`} />
                    )}
                    {/* Cally日历组件 */}
                    {onConsumptionDateChange ? (
                      <>
                        <button
                          popoverTarget={`${calendarId}-popover-desktop`}
                          className={`btn btn-ghost btn-sm p-0 h-auto min-h-0 text-primary hover:text-primary-focus transition-colors ${compact ? 'text-base' : 'text-lg sm:text-xl'} font-bold hover:underline decoration-dotted underline-offset-4`}
                          style={{ anchorName: `--${calendarId}-desktop` }}
                          disabled={isUpdatingDate}
                          title={`点击修改消费日期`}
                        >
                          {formatFullDate(invoice.consumption_date || invoice.created_at)}
                        </button>
                        
                        <div
                          popover="auto"
                          id={`${calendarId}-popover-desktop`}
                          className="calendar-popover bg-base-100 rounded-box shadow-lg border border-base-300 p-2"
                          style={{ 
                            positionAnchor: `--${calendarId}-desktop`,
                            zIndex: 9999,
                            position: 'fixed',
                            maxHeight: 'min(400px, 80vh)',
                            overflowY: 'auto',
                            inset: 'unset',
                            top: 'anchor(bottom)',
                            left: 'anchor(center)',
                            transform: 'translateX(-50%)',
                            // 使用 CSS 逻辑属性实现自适应位置
                            positionFallback: 'flip-block flip-inline',
                            // 备用方案：如果底部空间不足，自动翻转到顶部
                            bottom: 'auto'
                          }}
                          onToggle={handleCalendarPopoverToggle}
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
                      <span className={`text-primary ${compact ? 'text-base' : 'text-lg sm:text-xl'} font-bold`}>
                        {formatFullDate(invoice.consumption_date || invoice.created_at)}
                      </span>
                    )}
                  </div>
                  {/* 购买方信息 - 桌面端显示在日期下方 */}
                  {invoice.buyer_name && !device.isMobile && !compact && (
                    <div className={`stat-desc ${compact ? 'text-[10px]' : 'text-xs'} text-base-content/60 mt-1 truncate`}>
                      <User className="inline w-3 h-3 mr-1 text-accent/70" />
                      {invoice.buyer_name}
                    </div>
                  )}
                  {/* 移动端和紧凑模式隐藏开票日期 */}
                  {!device.isMobile && !compact && invoice.invoice_date && (
                    <div className="stat-desc text-xs text-base-content/40 mt-1">
                      开票日期 {formatFullDate(invoice.invoice_date)}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 火车票行程信息 - 优化设计 */}
          {isTrainTicketByCategory(invoice) && (() => {
            const trainInfo = extractTrainTicketInfo(invoice);
            const isValid = isValidTrainTicket(trainInfo);
            
            if (!isValid || !trainInfo) {
              return (
                <div className="alert alert-warning py-2 px-3">
                  <span className="text-sm">⚠️ 火车票信息解析失败</span>
                </div>
              );
            }
            
            const seatStyle = getSeatTypeStyle(trainInfo.seatType);
            const route = formatTrainRoute(trainInfo.departureStation, trainInfo.arrivalStation);
            
            return (
              <div className={`bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg ${compact ? 'p-2' : 'p-3'} border-l-4 border-blue-400`}>
                {/* 火车票信息 - 单行紧凑显示 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">🚄</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className={`${compact ? 'text-sm' : 'text-base'} font-medium text-base-content truncate`}>
                        {route}
                      </span>
                      <span className={`badge ${compact ? 'badge-xs' : 'badge-sm'} badge-ghost`}>
                        {trainInfo.trainNumber}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`${compact ? 'text-xs' : 'text-sm'} text-base-content/70`}>
                      {trainInfo.departureTime || '时间未知'}
                    </span>
                    {trainInfo.seatNumber && (
                      <span className={`badge ${compact ? 'badge-xs' : 'badge-sm'} badge-outline`}>
                        {trainInfo.seatNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
          
          {/* 飞机票行程信息 - 优化设计 */}
          {isFlightTicketByCategory(invoice) && (() => {
            const flightInfo = extractFlightTicketInfo(invoice);
            const isValid = isValidFlightTicket(flightInfo);
            
            if (!isValid || !flightInfo) {
              return (
                <div className="alert alert-warning py-2 px-3">
                  <span className="text-sm">⚠️ 飞机票信息解析失败</span>
                </div>
              );
            }
            
            const seatClassStyle = getSeatClassStyle(flightInfo.seatClass);
            const route = formatFlightRoute(flightInfo.departureAirport, flightInfo.arrivalAirport);
            
            return (
              <div className={`bg-gradient-to-r from-sky-50 to-sky-100 dark:from-sky-900/20 dark:to-sky-800/20 rounded-lg ${compact ? 'p-2' : 'p-3'} border-l-4 border-sky-400`}>
                {/* 飞机票信息 - 单行紧凑显示 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">✈️</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className={`${compact ? 'text-sm' : 'text-base'} font-medium text-base-content truncate`}>
                        {route}
                      </span>
                      <span className={`badge ${compact ? 'badge-xs' : 'badge-sm'} badge-ghost`}>
                        {flightInfo.flightNumber}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`${compact ? 'text-xs' : 'text-sm'} text-base-content/70`}>
                      {flightInfo.departureTime || '时间未知'}
                    </span>
                    {flightInfo.seatNumber && (
                      <span className={`badge ${compact ? 'badge-xs' : 'badge-sm'} badge-outline`}>
                        {flightInfo.seatNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

        </div>

        {/* 触摸反馈涟漪效果 */}
        {device.isMobile && touchFeedback.rippleElements?.map((ripple) => (
          <span
            key={ripple.key}
            style={ripple.style}
          />
        ))}

        {/* 长按进度指示器 */}
        {device.isMobile && touchFeedback.isLongPressing && (
          <div 
            className="absolute inset-[-2px] pointer-events-none rounded-lg border-2 border-transparent"
            style={touchFeedback.longPressProgressStyle}
          />
        )}
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