import React from 'react';
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BaseIndicatorCard, StatItem, StatBadge } from './BaseIndicatorCard';

interface OverdueInvoiceCardProps {
  dueSoonCount: number;
  dueSoonAmount: number;
  overdueCount: number;
  overdueAmount: number;
  loading?: boolean;
}

export const OverdueInvoiceCard: React.FC<OverdueInvoiceCardProps> = ({
  dueSoonCount,
  dueSoonAmount,
  overdueCount,
  overdueAmount,
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
  
  const hasDueSoon = dueSoonCount > 0;
  const hasOverdue = overdueCount > 0;
  const hasAny = hasDueSoon || hasOverdue;
  
  const handleClick = () => {
    navigate('/invoices?status=unreimbursed&overdue=true');
  };
  
  // 确定卡片变体
  const getVariant = () => {
    if (hasOverdue) return 'error';
    if (hasDueSoon) return 'warning';
    return 'success';
  };
  
  return (
    <BaseIndicatorCard
      icon="⚠️"
      title="临期/超期"
      loading={loading}
      onClick={handleClick}
      variant={getVariant()}
      borderHighlight={hasAny}
    >
      <div className="space-y-1">
        {hasAny ? (
          <>
            {/* 临期统计 */}
            {hasDueSoon && (
              <div className="flex items-center gap-2 flex-wrap">
                <StatItem 
                  value={dueSoonCount} 
                  unit="张临期" 
                  variant="warning"
                  size="md"
                />
                <StatItem 
                  value={formatCurrency(dueSoonAmount)} 
                  variant="warning"
                  size="sm"
                />
                <span className="text-xs text-base-content/50">(60天)</span>
              </div>
            )}
            
            {/* 超期统计 */}
            {hasOverdue && (
              <div className="flex items-center gap-2 flex-wrap">
                <StatItem 
                  value={overdueCount} 
                  unit="张超期" 
                  variant="error"
                  size="md"
                />
                <StatItem 
                  value={formatCurrency(overdueAmount)} 
                  variant="error"
                  size="sm"
                />
                <span className="text-xs text-base-content/50">(90天)</span>
              </div>
            )}
          </>
        ) : (
          <>
            <StatItem 
              value="0" 
              unit="张临期/超期" 
              variant="success"
              size="lg"
            />
            <StatBadge 
              icon={<Clock className="w-3 h-3" />}
              variant="success"
            >
              全部正常
            </StatBadge>
          </>
        )}
      </div>
    </BaseIndicatorCard>
  );
};

export default OverdueInvoiceCard;