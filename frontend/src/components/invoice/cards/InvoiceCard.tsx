import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
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
      'draft': 'badge-warning',
      'pending': 'badge-info', 
      'completed': 'badge-success',
      'failed': 'badge-error',
      'unreimbursed': 'badge-warning',
      'reimbursed': 'badge-success',
      'voided': 'badge-error'
    };
    return statusMap[status as keyof typeof statusMap] || 'badge-neutral';
  };

  const getStatusText = (status: string) => {
    const statusTextMap = {
      'draft': '草稿',
      'pending': '待处理', 
      'completed': '已完成',
      'failed': '失败',
      'unreimbursed': '未报销',
      'reimbursed': '已报销',
      'voided': '已作废'
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
                <span className="text-base flex-shrink-0">{getCategoryIcon(invoice)}</span>
                <span className="font-medium text-sm truncate">{invoice.invoice_number}</span>
              </div>
              
              {/* 统一徽章行 - 发票类型、费用类别、发票状态 */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 发票类型徽章 - 第一位显示 */}
                {invoice.invoice_type && (
                  <div className="badge badge-outline badge-sm font-medium h-5">
                    <span className="truncate max-w-16">{invoice.invoice_type}</span>
                  </div>
                )}
                
                {/* 费用类别徽章 - 第二位显示，根据分类值使用不同背景颜色 */}
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
                
                {/* 发票状态徽章 - 第三位显示，可点击切换 */}
                <div 
                  className={`
                    badge ${getStatusBadge(currentStatus)} badge-sm font-medium h-5 
                    ${onStatusChange && ['unreimbursed', 'reimbursed'].includes(currentStatus) 
                      ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 hover:shadow-md' 
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
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
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
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
            <div className="bg-base-50 border border-base-200 rounded-lg p-3 mb-3">
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
                    {invoice.consumption_date 
                      ? `消费：${formatDate(invoice.consumption_date)}`
                      : `开票：${formatDate(invoice.invoice_date)}`
                    }
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
    </div>
  );
};

export default InvoiceCard;