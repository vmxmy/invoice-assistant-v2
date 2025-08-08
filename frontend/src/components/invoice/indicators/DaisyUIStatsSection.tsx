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

  // 响应式统计布局类 - 使用系统统一样式
  const getStatsClass = () => {
    const baseClass = 'stats bg-base-100 shadow-lg border border-base-200';
    if (device.isMobile) {
      // 移动端垂直布局
      return `${baseClass} stats-vertical lg:stats-horizontal w-full ${className}`;
    }
    // 桌面端水平布局
    return `${baseClass} w-full ${className}`;
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
          className={`stat ${stat.onClick ? 'cursor-pointer hover:bg-base-200/50 transition-all duration-200' : ''}`}
          onClick={stat.onClick}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={stat.onClick ? { scale: 1.02 } : {}}
          whileTap={stat.onClick ? { scale: 0.98 } : {}}
        >
          {stat.icon && (
            <div className="stat-figure text-primary">
              {getIconElement(stat.icon)}
            </div>
          )}
          <div className="stat-title text-base-content/70 font-medium">{stat.title}</div>
          <div className="stat-value text-base-content">
            {stat.value}
          </div>
          {(stat.desc || stat.trendValue) && (
            <div className="stat-desc flex items-center gap-1 text-base-content/60">
              {stat.trend && getTrendIcon(stat.trend)}
              {stat.trendValue && <span className="font-semibold">{stat.trendValue}</span>}
              {stat.desc && <span>{stat.desc}</span>}
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
    title: '现金流状态',
    value: `¥${reimbursed.toLocaleString()}`,
    desc: `已报销 ${percentage}%`,
    icon: <DollarSign className="h-8 w-8 stroke-current opacity-80" />,
    trend: percentage >= 50 ? 'up' : 'down',
    onClick
  };
};

// 辅助函数：创建待办统计
export const createTodoStat = (
  count: number,
  amount: number,
  onClick?: () => void
): StatItem => {
  return {
    id: 'todo',
    title: '待报销',
    value: count,
    desc: `¥${amount.toLocaleString()}`,
    icon: <FileText className="h-8 w-8 stroke-current opacity-80" />,
    onClick
  };
};

// 辅助函数：创建逾期统计
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
    desc: dueSoonCount > 0 ? `${dueSoonCount} 即将到期` : '无即将到期',
    icon: <AlertCircle className="h-8 w-8 stroke-current opacity-80" />,
    trend: overdueCount > 0 ? 'down' : 'neutral',
    onClick
  };
};

// 辅助函数：创建增长统计
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