import React from 'react';
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BaseIndicatorCard, StatItem, StatBadge } from './BaseIndicatorCard';

interface UrgentTodoCardProps {
  unreimbursedCount: number;
  unreimbursedAmount: number;
  oldestUnreimbursedDate?: string;
  loading?: boolean;
}

export const UrgentTodoCard: React.FC<UrgentTodoCardProps> = ({
  unreimbursedCount,
  unreimbursedAmount,
  oldestUnreimbursedDate,
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
  
  const calculateDaysAgo = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const daysAgo = calculateDaysAgo(oldestUnreimbursedDate);
  
  const handleClick = () => {
    navigate('/invoices?status=unreimbursed');
  };
  
  return (
    <BaseIndicatorCard
      icon="⏳"
      title="待处理"
      loading={loading}
      onClick={handleClick}
      variant="default"
    >
      <div className="space-y-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <StatItem 
            value={unreimbursedCount} 
            unit="张" 
            size="lg"
          />
          <StatItem 
            value={formatCurrency(unreimbursedAmount)} 
            variant="warning"
            size="md"
          />
        </div>
        
        {daysAgo && (
          <StatBadge icon={<Clock className="w-3 h-3" />}>
            {daysAgo}天前
          </StatBadge>
        )}
      </div>
    </BaseIndicatorCard>
  );
};

export default UrgentTodoCard;