import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { BaseIndicatorCard, StatItem, StatBadge } from './BaseIndicatorCard';

interface GrowthTrendCardProps {
  invoiceGrowthRate: number;
  amountGrowthRate: number;
  loading?: boolean;
}

export const GrowthTrendCard: React.FC<GrowthTrendCardProps> = ({
  invoiceGrowthRate,
  amountGrowthRate,
  loading = false
}) => {
  
  const getGrowthVariant = (rate: number) => {
    if (rate > 0) return 'success';
    if (rate < 0) return 'error';
    return 'default';
  };
  
  const getGrowthIcon = (rate: number) => {
    if (rate > 0) return <TrendingUp className="w-3 h-3" />;
    if (rate < 0) return <TrendingDown className="w-3 h-3" />;
    return null;
  };
  
  const formatRate = (rate: number) => {
    return `${rate >= 0 ? '+' : ''}${rate}%`;
  };
  
  return (
    <BaseIndicatorCard
      icon="📈"
      title="增长"
      loading={loading}
      variant={getGrowthVariant(invoiceGrowthRate)}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-3 flex-wrap">
          <StatItem 
            value={formatRate(invoiceGrowthRate)} 
            label="数量"
            variant={getGrowthVariant(invoiceGrowthRate)}
            size="md"
          />
          <StatItem 
            value={formatRate(amountGrowthRate)} 
            label="金额"
            variant={getGrowthVariant(amountGrowthRate)}
            size="sm"
          />
        </div>
        
        <StatBadge 
          icon={getGrowthIcon(invoiceGrowthRate)}
          variant={getGrowthVariant(invoiceGrowthRate)}
        >
          月同比
        </StatBadge>
      </div>
    </BaseIndicatorCard>
  );
};

export default GrowthTrendCard;