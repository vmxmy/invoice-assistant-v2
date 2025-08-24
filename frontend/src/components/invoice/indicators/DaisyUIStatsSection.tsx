import React from 'react';
import { motion } from 'framer-motion';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Clock,
  FileText,
  Calculator,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export interface StatItem {
  id: string;
  title: string;
  value: string | number;
  desc?: string;
  icon?: React.ReactNode | string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onClick?: () => void;
}

interface DaisyUIStatsSectionProps {
  stats: StatItem[];
  loading?: boolean;
  className?: string;
}

export const DaisyUIStatsSection: React.FC<DaisyUIStatsSectionProps> = ({
  stats,
  loading = false,
  className = ''
}) => {
  const device = useDeviceDetection();
  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') {
      return <ArrowUp className="h-4 w-4 text-success" />;
    }
    if (trend === 'down') {
      return <ArrowDown className="h-4 w-4 text-error" />;
    }
    return null;
  };

  const getIconElement = (icon?: React.ReactNode | string) => {
    if (!icon) return null;
    
    if (typeof icon === 'string') {
      return <span className="text-2xl">{icon}</span>;
    }
    
    return icon;
  };

  // 精确响应式统计布局类 - 基于设备类型和屏幕宽度
  const getStatsClass = () => {
    const baseClass = 'stats bg-base-100 shadow-lg border border-base-200';
    
    // 移动端 (≤480px): 垂直单列布局
    if (device.isMobile) {
      return `${baseClass} stats-vertical w-full ${className} mobile-stats-vertical`;
    }
    
    // 平板端 (481px-768px): 2x2 网格布局
    if (device.isTablet) {
      return `${baseClass} w-full ${className} tablet-stats-grid`;
    }
    
    // 桌面端 (≥769px): 水平单行布局
    return `${baseClass} w-full ${className} desktop-stats-horizontal`;
  };

  if (loading) {
    return (
      <div className={getStatsClass()}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat">
            <div className="animate-pulse">
              <div className="h-4 bg-base-300 rounded w-20 mb-2"></div>
              <div className="h-8 bg-base-300 rounded w-24 mb-2"></div>
              <div className="h-3 bg-base-300 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div 
      className={getStatsClass()}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {stats.map((stat, index) => (
        <motion.div 
          key={stat.id}
          className={`stat ${stat.onClick ? 'cursor-pointer hover:bg-base-200/50 transition-all duration-200' : ''} ${
            device.isTouchDevice ? 'min-h-[44px] gesture-feedback' : ''
          }`}
          onClick={stat.onClick}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={stat.onClick && !device.isTouchDevice ? { scale: 1.02 } : {}}
          whileTap={stat.onClick ? { scale: 0.98 } : {}}
        >
          {stat.icon && (
            <div className="stat-figure text-primary">
              {getIconElement(stat.icon)}
            </div>
          )}
          <div className={`stat-title text-base-content/70 font-medium ${
            device.isMobile ? 'text-xs' : 'text-sm'
          }`}>{stat.title}</div>
          <div className={`stat-value text-base-content ${
            device.isMobile ? 'text-lg' : 'text-2xl'
          }`}>
            {stat.value}
          </div>
          {(stat.desc || stat.trendValue) && (
            <div className={`stat-desc flex items-center gap-1 text-base-content/60 ${
              device.isMobile ? 'text-xs flex-wrap' : 'text-sm'
            }`}>
              {stat.trend && getTrendIcon(stat.trend)}
              {stat.trendValue && <span className="font-semibold">{stat.trendValue}</span>}
              {stat.desc && <span className={device.isMobile ? 'line-clamp-2' : ''}>{stat.desc}</span>}
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
};

// 辅助函数：创建现金流统计
export const createCashFlowStat = (
  reimbursed: number,
  unreimbursed: number,
  onClick?: () => void
): StatItem => {
  const total = reimbursed + unreimbursed;
  const percentage = total > 0 ? Math.round((reimbursed / total) * 100) : 0;
  
  return {
    id: 'cash-flow',
    title: '已报销',
    value: `¥${reimbursed.toLocaleString()}`,
    desc: `报销率 ${percentage}%`,
    icon: <DollarSign className="h-8 w-8 stroke-current opacity-80" />,
    trend: percentage >= 50 ? 'up' : 'down',
    onClick
  };
};

// 辅助函数：创建待办统计（金额为主）
export const createTodoStat = (
  count: number,
  amount: number,
  onClick?: () => void
): StatItem => {
  return {
    id: 'todo',
    title: '待报销',
    value: `¥${amount.toLocaleString()}`,
    desc: `${count} 张发票`,
    icon: <FileText className="h-8 w-8 stroke-current opacity-80" />,
    onClick
  };
};

// 辅助函数：创建逾期统计（原版 - 数量为主）
export const createOverdueStat = (
  overdueCount: number,
  dueSoonCount: number,
  onClick?: () => void
): StatItem => {
  const total = overdueCount + dueSoonCount;
  
  return {
    id: 'overdue',
    title: '逾期提醒',
    value: overdueCount,
    desc: dueSoonCount > 0 ? `${dueSoonCount} 张即将超期 90 天` : '无即将超期',
    icon: <AlertCircle className="h-8 w-8 stroke-current opacity-80" />,
    trend: overdueCount > 0 ? 'down' : 'neutral',
    onClick
  };
};

// 辅助函数：创建逾期金额统计（金额为主）
export const createOverdueAmountStat = (
  overdueCount: number,
  overdueAmount: number,
  dueSoonCount: number,
  dueSoonAmount: number,
  onClick?: () => void
): StatItem => {
  const totalAmount = overdueAmount + dueSoonAmount;
  
  return {
    id: 'overdue',
    title: '逾期提醒',
    value: `¥${overdueAmount.toLocaleString()}`,
    desc: overdueCount > 0 
      ? `${overdueCount} 张已超期 90 天${dueSoonCount > 0 ? `，${dueSoonCount} 张即将超期 90 天` : ''}` 
      : dueSoonCount > 0 
        ? `${dueSoonCount} 张即将超期 90 天` 
        : '无超期发票',
    icon: <AlertCircle className="h-8 w-8 stroke-current opacity-80" />,
    trend: overdueAmount > 0 ? 'down' : 'neutral',
    onClick
  };
};

// 辅助函数：创建增长统计（金额）
export const createGrowthStat = (
  currentMonth: number,
  lastMonth: number,
  onClick?: () => void
): StatItem => {
  const growth = lastMonth > 0 
    ? Math.round(((currentMonth - lastMonth) / lastMonth) * 100)
    : 0;
  
  return {
    id: 'growth',
    title: '本月发票',
    value: `¥${currentMonth.toLocaleString()}`,
    desc: lastMonth > 0 ? `环比上月` : '首月数据',
    icon: <TrendingUp className="h-8 w-8 stroke-current opacity-80" />,
    trend: growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral',
    trendValue: growth !== 0 ? `${Math.abs(growth)}%` : undefined,
    onClick
  };
};

// 辅助函数：创建月度发票统计（金额为主）
export const createMonthlyInvoicesStat = (
  currentMonthCount: number,
  currentMonthAmount: number,
  growthRate?: number,
  onClick?: () => void
): StatItem => {
  return {
    id: 'monthly-invoices',
    title: '本月发票',
    value: `¥${currentMonthAmount.toLocaleString()}`,
    desc: `${currentMonthCount} 张发票`,
    icon: <TrendingUp className="h-8 w-8 stroke-current opacity-80" />,
    trend: growthRate ? (growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'neutral') : 'neutral',
    trendValue: growthRate && growthRate !== 0 ? `${Math.abs(growthRate)}%` : undefined,
    onClick
  };
};

// 辅助函数：创建紧急处理统计（用于首页）
export const createUrgentActionsStat = (
  overdueCount: number,
  overdueAmount: number,
  dueSoonCount: number,
  onClick?: () => void
): StatItem => {
  const totalUrgent = overdueCount + dueSoonCount;
  
  return {
    id: 'urgent-actions',
    title: '紧急处理',
    value: totalUrgent > 0 ? `${totalUrgent} 项` : '无',
    desc: totalUrgent > 0 
      ? `${overdueCount > 0 ? `${overdueCount}张已超期 90 天` : ''}${overdueCount > 0 && dueSoonCount > 0 ? '，' : ''}${dueSoonCount > 0 ? `${dueSoonCount}张即将超期 90 天` : ''}` 
      : '所有发票状态正常',
    icon: <AlertCircle className="h-8 w-8 stroke-current opacity-80" />,
    trend: totalUrgent > 0 ? 'down' : 'neutral',
    onClick
  };
};

// 辅助函数：创建本月支出统计（用于首页）
export const createMonthlySpendingStat = (
  monthlyAmount: number,
  monthlyCount: number,
  growthRate?: number,
  onClick?: () => void
): StatItem => {
  return {
    id: 'monthly-spending',
    title: '本月支出',
    value: `¥${monthlyAmount.toLocaleString()}`,
    desc: `${monthlyCount} 张发票${growthRate ? `，环比${growthRate > 0 ? '↑' : '↓'}${Math.abs(growthRate)}%` : ''}`,
    icon: <Calculator className="h-8 w-8 stroke-current opacity-80" />,
    trend: growthRate ? (growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'neutral') : 'neutral',
    onClick
  };
};

// 辅助函数：创建报销进度统计（用于首页）
export const createReimbursementProgressStat = (
  reimbursedCount: number,
  totalCount: number,
  reimbursedAmount: number,
  totalAmount: number,
  onClick?: () => void
): StatItem => {
  const progressRate = totalCount > 0 ? Math.round((reimbursedCount / totalCount) * 100) : 0;
  
  return {
    id: 'reimbursement-progress',
    title: '报销进度',
    value: `${progressRate}%`,
    desc: `已报销 ${reimbursedCount}/${totalCount} 张，¥${reimbursedAmount.toLocaleString()}`,
    icon: <TrendingUp className="h-8 w-8 stroke-current opacity-80" />,
    trend: progressRate >= 50 ? 'up' : progressRate >= 30 ? 'neutral' : 'down',
    onClick
  };
};