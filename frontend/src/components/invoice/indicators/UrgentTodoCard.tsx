import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BaseIndicatorCard, StatItem, StatBadge } from './BaseIndicatorCard';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';
import { AnimatedCount, AnimatedCurrency } from '../../ui/AnimatedNumber';

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
  
  const handleClick = () => {
    navigate('/invoices?status=unreimbursed');
  };
  
  return (
    <BaseIndicatorCard
      icon={<AlertCircle className="w-5 h-5 text-warning" />}
      title="待报销发票"
      loading={loading}
      onClick={handleClick}
      variant="warning"
      borderHighlight={unreimbursedCount > 0}
    >
      <div className="space-y-2">
        <div className="flex items-baseline gap-3">
          <AnimatedCount 
            value={unreimbursedCount}
            className={`
              font-mono tabular-nums font-bold text-warning
              ${device.isMobile ? 'text-2xl' : 'text-3xl'}
            `}
            enableAnimation={!loading}
          />
          <span className="text-base-content/60 text-xs">张待处理</span>
        </div>
        
        <div className="space-y-1">
          <div className="text-base font-medium text-base-content/80">
            <AnimatedCurrency 
              value={unreimbursedAmount}
              enableAnimation={!loading}
            />
          </div>
          
          {daysAgo && (
            <StatBadge 
              icon={<Clock className="w-3 h-3" />}
              variant="warning"
            >
              最早{daysAgo}天前
            </StatBadge>
          )}
        </div>
      </div>
    </BaseIndicatorCard>
  );
};

export default UrgentTodoCard;