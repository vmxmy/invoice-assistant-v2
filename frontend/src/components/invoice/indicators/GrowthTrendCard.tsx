import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BaseIndicatorCard, StatItem, StatBadge } from './BaseIndicatorCard';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';

interface GrowthTrendCardProps {
  invoiceGrowthRate: number;
  amountGrowthRate: number;
  loading?: boolean;
}

// 自定义趋势指示器组件
interface TrendIndicatorProps {
  value: number;
  variant: 'success' | 'error' | 'default';
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({ value, variant }) => {
  // 根据增长率生成5个柱状条的高度
  const bars = Array.from({ length: 5 }, (_, i) => {
    const position = i - 2; // -2, -1, 0, 1, 2
    const absValue = Math.abs(value);
    
    // 根据值的大小决定哪些柱子应该高亮
    let height = 20; // 默认最低高度
    let isActive = false;
    
    if (value > 0 && position > 0) {
      // 正增长，右侧柱子
      height = position === 1 ? 40 : 60;
      isActive = (position === 1 && absValue > 0) || (position === 2 && absValue > 20);
    } else if (value < 0 && position < 0) {
      // 负增长，左侧柱子
      height = position === -1 ? 40 : 60;
      isActive = (position === -1 && absValue > 0) || (position === -2 && absValue > 20);
    } else if (position === 0) {
      // 中间柱子始终显示
      height = 30;
      isActive = Math.abs(value) <= 5;
    }
    
    return { height, isActive };
  });
  
  const getBarColor = (isActive: boolean) => {
    if (!isActive) return 'bg-base-300';
    
    switch (variant) {
      case 'success': return 'bg-success';
      case 'error': return 'bg-error';
      default: return 'bg-base-content/30';
    }
  };
  
  return (
    <div className="flex items-end gap-0.5 h-8">
      {bars.map((bar, index) => (
        <div
          key={index}
          className={`w-1.5 rounded-t transition-all duration-300 ${getBarColor(bar.isActive)}`}
          style={{ height: `${bar.height}%` }}
        />
      ))}
    </div>
  );
};

export const GrowthTrendCard: React.FC<GrowthTrendCardProps> = ({
  invoiceGrowthRate,
  amountGrowthRate,
  loading = false
}) => {
  const device = useDeviceDetection();
  
  const getGrowthVariant = (rate: number) => {
    if (rate > 0) return 'success';
    if (rate < 0) return 'error';
    return 'default';
  };
  
  const getGrowthIcon = (rate: number) => {
    if (rate > 5) return <TrendingUp className="w-5 h-5 text-success" />;
    if (rate < -5) return <TrendingDown className="w-5 h-5 text-error" />;
    return <Minus className="w-5 h-5 text-base-content/60" />;
  };
  
  const formatRate = (rate: number) => {
    return `${rate >= 0 ? '+' : ''}${rate}%`;
  };
  
  // 选择主要展示的增长率（优先显示金额增长）
  const primaryRate = amountGrowthRate;
  const primaryVariant = getGrowthVariant(primaryRate);
  
  return (
    <BaseIndicatorCard
      icon={getGrowthIcon(primaryRate)}
      title="本月趋势"
      loading={loading}
      variant={primaryVariant}
    >
      <div className="space-y-3">
        {/* 趋势可视化 */}
        <div className="flex items-center gap-4">
          <TrendIndicator value={primaryRate} variant={primaryVariant} />
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className={`
                font-mono tabular-nums font-bold
                ${device.isMobile ? 'text-xl' : 'text-2xl'}
                ${primaryVariant === 'success' ? 'text-success' : 
                  primaryVariant === 'error' ? 'text-error' : 'text-base-content'}
              `}>
                {formatRate(primaryRate)}
              </span>
              <span className="text-xs text-base-content/60">金额</span>
            </div>
          </div>
        </div>
        
        {/* 次要指标 */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-base-content/60">数量:</span>
            <span className={`
              font-medium font-mono
              ${getGrowthVariant(invoiceGrowthRate) === 'success' ? 'text-success' : 
                getGrowthVariant(invoiceGrowthRate) === 'error' ? 'text-error' : 'text-base-content'}
            `}>
              {formatRate(invoiceGrowthRate)}
            </span>
          </div>
          <StatBadge variant="default">
            月同比
          </StatBadge>
        </div>
      </div>
    </BaseIndicatorCard>
  );
};

export default GrowthTrendCard;