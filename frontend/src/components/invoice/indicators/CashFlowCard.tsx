import React from 'react';
import { Calendar, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BaseIndicatorCard, StatItem, StatBadge, ProgressBar } from './BaseIndicatorCard';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';
import { AnimatedCurrency, AnimatedPercentage } from '../../ui/AnimatedNumber';
import { usePercentageAnimation } from '../../../hooks/useNumberAnimation';

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
  
  // 使用动画钩子获取动画后的百分比
  const { displayNumber: animatedPercentage } = usePercentageAnimation(reimbursedPercentage, {
    enableAnimation: !loading,
    duration: 1000
  });
  
  return (
    <BaseIndicatorCard
      icon={<DollarSign className="w-5 h-5 text-success" />}
      title="已报销发票"
      loading={loading}
      onClick={handleClick}
      variant="success"
      borderHighlight={reimbursedAmount > 0}
    >
      <div className="space-y-3">
        {/* 主要数据显示 */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <AnimatedCurrency 
              value={reimbursedAmount}
              className={`
                font-mono tabular-nums font-bold text-success
                ${device.isMobile ? 'text-xl' : 'text-2xl'}
              `}
              enableAnimation={!loading}
            />
            <span className="text-xs text-base-content/60">已报销</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-base-content/70">
            <span>待回: </span>
            <AnimatedCurrency 
              value={unreimbursedAmount}
              className="font-medium"
              enableAnimation={!loading}
            />
            {nextReimbursementDate && (
              <StatBadge 
                icon={<Calendar className="w-3 h-3" />}
                variant="info"
                className="ml-auto"
              >
                下次{formatDate(nextReimbursementDate)}
              </StatBadge>
            )}
          </div>
        </div>
        
        {/* 报销进度可视化 - 移到底部 */}
        <div className="pt-1">
          <ProgressBar 
            value={animatedPercentage} 
            variant="success"
            showLabel={true}
            className="h-2"
          />
        </div>
      </div>
    </BaseIndicatorCard>
  );
};

export default CashFlowCard;