import React from 'react';
import { Calendar, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BaseIndicatorCard, StatItem, StatBadge, ProgressBar } from './BaseIndicatorCard';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';

interface CashFlowCardProps {
  reimbursedAmount: number;
  unreimbursedAmount: number;
  nextReimbursementDate?: string;
  loading?: boolean;
}

export const CashFlowCard: React.FC<CashFlowCardProps> = ({
  reimbursedAmount,
  unreimbursedAmount,
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
  
  const handleClick = () => {
    navigate('/invoices?status=reimbursed');
  };
  
  // 计算报销完成百分比
  const totalAmount = reimbursedAmount + unreimbursedAmount;
  const reimbursedPercentage = totalAmount > 0 ? (reimbursedAmount / totalAmount) * 100 : 0;
  
  return (
    <BaseIndicatorCard
      icon={<DollarSign className="w-5 h-5 text-success" />}
      title="资金回流"
      loading={loading}
      onClick={handleClick}
      variant="success"
      borderHighlight={reimbursedAmount > 0}
    >
      <div className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className={`
            font-mono tabular-nums font-bold text-success
            ${device.isMobile ? 'text-xl' : 'text-2xl'}
          `}>
            {formatCurrency(reimbursedAmount)}
          </span>
          <span className="text-xs text-base-content/60">已报销</span>
        </div>
        
        {/* 报销进度可视化 */}
        <div className="space-y-2">
          <ProgressBar 
            value={reimbursedPercentage} 
            variant="success"
            showLabel={true}
            className="h-2"
          />
          
          <div className="flex justify-between text-xs">
            <span className="text-base-content/60">
              待回: {formatCurrency(unreimbursedAmount)}
            </span>
            {nextReimbursementDate && (
              <StatBadge 
                icon={<Calendar className="w-3 h-3" />}
                variant="info"
              >
                下次{formatDate(nextReimbursementDate)}
              </StatBadge>
            )}
          </div>
        </div>
      </div>
    </BaseIndicatorCard>
  );
};

export default CashFlowCard;