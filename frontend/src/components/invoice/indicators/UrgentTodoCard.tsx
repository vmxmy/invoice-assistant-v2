import React from 'react';
import { AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';

interface UrgentTodoCardProps {
  unreimbursedCount: number;
  unreimbursedAmount: number;
  overdueCount?: number;
  overdueAmount?: number;
  oldestUnreimbursedDate?: string;
  loading?: boolean;
}

export const UrgentTodoCard: React.FC<UrgentTodoCardProps> = ({
  unreimbursedCount,
  unreimbursedAmount,
  overdueCount = 0,
  overdueAmount = 0,
  oldestUnreimbursedDate,
  loading = false
}) => {
  const navigate = useNavigate();
  const device = useDeviceDetection();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  const calculateDaysAgo = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const daysAgo = calculateDaysAgo(oldestUnreimbursedDate);
  const hasOverdue = overdueCount > 0;
  
  const handleClick = () => {
    // 导航到发票管理页面，并设置筛选条件为未报销
    navigate('/invoices?status=unreimbursed');
  };
  
  return (
    <div className={`
      bg-base-100 border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-4
      ${hasOverdue ? 'border-warning' : 'border-base-300'}
      ${device.isMobile ? 'h-32' : 'h-28'}
      cursor-pointer
    `}
    onClick={handleClick}
    >
      <div className="flex items-start justify-between h-full">
        <div className="flex-1">
          {/* 标题行 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⏳</span>
            <h3 className="text-sm font-medium text-base-content/80">需要我处理</h3>
          </div>
          
          {/* 主要数据 */}
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="loading loading-spinner loading-sm"></div>
              <span className="text-sm text-base-content/60">加载中...</span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-base-content">
                  {unreimbursedCount}
                </span>
                <span className="text-sm text-base-content/60">张</span>
                <span className="text-lg font-semibold text-warning">
                  {formatCurrency(unreimbursedAmount)}
                </span>
              </div>
              
              {/* 紧急提示 */}
              {hasOverdue && (
                <div className="flex items-center gap-1 text-xs text-warning">
                  <AlertCircle className="w-3 h-3" />
                  <span className="font-medium">
                    {overdueCount}张超期 ({formatCurrency(overdueAmount)})
                  </span>
                </div>
              )}
              
              {/* 时间信息 */}
              {daysAgo && !hasOverdue && (
                <div className="flex items-center gap-1 text-xs text-base-content/60">
                  <Clock className="w-3 h-3" />
                  <span>最早{daysAgo}天前</span>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* 操作提示 */}
        <div className={`
          flex items-center justify-center rounded-lg transition-all duration-200
          ${hasOverdue ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}
          ${device.isMobile ? 'w-12 h-12' : 'w-10 h-10'}
          group-hover:scale-105
        `}>
          <ArrowRight className={`${device.isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
        </div>
      </div>
    </div>
  );
};

export default UrgentTodoCard;