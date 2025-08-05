import React from 'react';
import { TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';

interface CashFlowCardProps {
  reimbursedAmount: number;
  unreimbursedAmount: number;
  monthlyReimbursedCount: number;
  monthlyReimbursedAmount: number;
  nextReimbursementDate?: string;
  loading?: boolean;
}

export const CashFlowCard: React.FC<CashFlowCardProps> = ({
  reimbursedAmount,
  unreimbursedAmount,
  monthlyReimbursedCount,
  monthlyReimbursedAmount,
  nextReimbursementDate,
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
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };
  
  // 计算报销完成度
  const totalAmount = reimbursedAmount + unreimbursedAmount;
  const completionRate = totalAmount > 0 
    ? Math.round((reimbursedAmount / totalAmount) * 100) 
    : 0;
  
  const handleClick = () => {
    // 导航到发票管理页面，并设置筛选条件为已报销
    navigate('/invoices?status=reimbursed');
  };
  
  return (
    <div className={`
      bg-base-100 border border-base-300 rounded-xl shadow-sm hover:shadow-md 
      transition-all duration-200 p-4 cursor-pointer
      ${device.isMobile ? 'h-32' : 'h-28'}
    `}
    onClick={handleClick}
    >
      <div className="flex items-start justify-between h-full">
        <div className="flex-1">
          {/* 标题行 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💰</span>
            <h3 className="text-sm font-medium text-base-content/80">我的收益</h3>
          </div>
          
          {/* 主要数据 */}
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="loading loading-spinner loading-sm"></div>
              <span className="text-sm text-base-content/60">加载中...</span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-3 mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-success">
                    {formatCurrency(reimbursedAmount)}
                  </span>
                  <span className="text-xs text-base-content/60">已报销</span>
                </div>
                {unreimbursedAmount > 0 && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-base-content/60">待回</span>
                    <span className="text-sm font-medium text-warning">
                      {formatCurrency(unreimbursedAmount)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* 进度条 */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-success rounded-full transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-base-content/70">
                  {completionRate}%
                </span>
              </div>
              
              {/* 次要信息 */}
              <div className="flex items-center gap-3 mt-1">
                {monthlyReimbursedCount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-base-content/60">
                    <TrendingUp className="w-3 h-3" />
                    <span>本月{monthlyReimbursedCount}张</span>
                  </div>
                )}
                {nextReimbursementDate && (
                  <div className="flex items-center gap-1 text-xs text-base-content/60">
                    <Calendar className="w-3 h-3" />
                    <span>下次{formatDate(nextReimbursementDate)}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* 操作提示 */}
        <div className={`
          flex items-center justify-center bg-success/10 rounded-lg 
          transition-all duration-200 text-success
          ${device.isMobile ? 'w-12 h-12' : 'w-10 h-10'}
          group-hover:scale-105
        `}>
          <ArrowRight className={`${device.isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
        </div>
      </div>
    </div>
  );
};

export default CashFlowCard;