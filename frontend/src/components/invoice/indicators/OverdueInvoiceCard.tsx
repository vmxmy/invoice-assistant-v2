import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BaseIndicatorCard, StatItem, StatBadge, ProgressBar } from './BaseIndicatorCard';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';

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
  const device = useDeviceDetection();
  
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
  
  // 计算紧急程度分数（0-100）
  const totalCount = dueSoonCount + overdueCount;
  const urgencyScore = totalCount > 0 ? 
    ((overdueCount * 2 + dueSoonCount) / (totalCount * 2)) * 100 : 0;
  
  // 根据变体选择图标
  const icon = hasOverdue ? 
    <AlertTriangle className="w-5 h-5 text-error animate-pulse" /> : 
    <AlertTriangle className="w-5 h-5 text-warning" />;
  
  return (
    <BaseIndicatorCard
      icon={icon}
      title="需关注发票"
      loading={loading}
      onClick={handleClick}
      variant={getVariant()}
      borderHighlight={hasAny}
    >
      <div className="space-y-3">
        {hasAny ? (
          <>
            {/* 紧急程度可视化 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-base-content/60">紧急程度</span>
                <span className="font-medium">{Math.round(urgencyScore)}%</span>
              </div>
              <ProgressBar 
                value={urgencyScore} 
                variant={getVariant()}
                className="h-2"
              />
            </div>
            
            {/* 详细统计 */}
            <div className="space-y-2">
              {hasOverdue && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`
                      font-mono tabular-nums font-bold text-error
                      ${device.isMobile ? 'text-lg' : 'text-xl'}
                    `}>
                      {overdueCount}
                    </span>
                    <span className="text-xs text-error">张超期</span>
                  </div>
                  <span className="text-sm font-medium text-error">
                    {formatCurrency(overdueAmount)}
                  </span>
                </div>
              )}
              
              {hasDueSoon && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`
                      font-mono tabular-nums font-bold text-warning
                      ${device.isMobile ? 'text-lg' : 'text-xl'}
                    `}>
                      {dueSoonCount}
                    </span>
                    <span className="text-xs text-warning">张临期</span>
                  </div>
                  <span className="text-sm font-medium text-warning">
                    {formatCurrency(dueSoonAmount)}
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <span className={`
                font-mono tabular-nums font-bold text-success
                ${device.isMobile ? 'text-2xl' : 'text-3xl'}
              `}>
                0
              </span>
              <span className="text-xs text-base-content/60">张需关注</span>
            </div>
            <StatBadge 
              icon={<Clock className="w-3 h-3" />}
              variant="success"
            >
              全部正常
            </StatBadge>
          </div>
        )}
      </div>
    </BaseIndicatorCard>
  );
};

export default OverdueInvoiceCard;