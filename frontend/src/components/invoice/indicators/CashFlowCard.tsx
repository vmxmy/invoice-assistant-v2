import React from 'react';
import { Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BaseIndicatorCard, StatItem, StatBadge } from './BaseIndicatorCard';

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
  
  return (
    <BaseIndicatorCard
      icon="💰"
      title="收益"
      loading={loading}
      onClick={handleClick}
      variant="success"
    >
      <div className="space-y-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <StatItem 
            value={formatCurrency(reimbursedAmount)} 
            label="已报销"
            variant="success"
            size="md"
          />
          {unreimbursedAmount > 0 && (
            <StatItem 
              value={formatCurrency(unreimbursedAmount)} 
              label="待回"
              variant="warning"
              size="sm"
            />
          )}
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {nextReimbursementDate && (
            <StatBadge icon={<Calendar className="w-3 h-3" />}>
              {formatDate(nextReimbursementDate)}
            </StatBadge>
          )}
        </div>
      </div>
    </BaseIndicatorCard>
  );
};

export default CashFlowCard;