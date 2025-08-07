import React, { useState, useEffect } from 'react';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';
import { ResponsiveIndicatorCard, MiniIndicatorCard } from './ResponsiveIndicatorCard';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  MoreVertical
} from 'lucide-react';

interface IndicatorData {
  id: string;
  icon: string | React.ReactNode;
  title: string;
  subtitle?: string;
  value: string | number;
  valuePrefix?: string;
  valueSuffix?: string;
  secondaryValue?: string | number;
  secondaryLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendLabel?: string;
  variant?: 'default' | 'warning' | 'error' | 'success' | 'info' | 'primary';
  onClick?: () => void;
  actionLabel?: string;
  priority?: number; // 优先级，用于移动端排序
}

interface ResponsiveIndicatorSectionProps {
  indicators: IndicatorData[];
  title?: string;
  loading?: boolean;
  layout?: 'grid' | 'carousel' | 'list' | 'auto';
  className?: string;
}

export const ResponsiveIndicatorSection: React.FC<ResponsiveIndicatorSectionProps> = ({
  indicators,
  title,
  loading = false,
  layout = 'auto',
  className = ''
}) => {
  const device = useDeviceDetection();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  // 根据优先级排序指标
  const sortedIndicators = [...indicators].sort((a, b) => 
    (b.priority || 0) - (a.priority || 0)
  );
  
  // 自动选择布局
  const getLayout = () => {
    if (layout !== 'auto') return layout;
    
    if (device.isMobile) {
      return indicators.length > 2 ? 'carousel' : 'grid';
    }
    return 'grid';
  };
  
  const activeLayout = getLayout();
  
  // 处理触摸滑动
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe && currentIndex < indicators.length - 1) {
      setCurrentIndex(currentIndex + 1);
      // 触觉反馈（如果支持）
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      // 触觉反馈（如果支持）
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  };
  
  // 渲染网格布局
  const renderGrid = () => {
    // 响应式网格类
    const getGridClass = () => {
      const count = indicators.length;
      if (count === 1) return 'grid grid-cols-1 max-w-lg mx-auto';
      if (count === 2) return 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4';
      if (count === 3) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4';
      if (count === 4) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4';
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4';
    };
    
    return (
      <div className={getGridClass()}>
        {sortedIndicators.map((indicator, index) => (
          <motion.div
            key={indicator.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <ResponsiveIndicatorCard {...indicator} />
          </motion.div>
        ))}
      </div>
    );
  };
  
  // 渲染轮播布局（移动端）
  const renderCarousel = () => {
    return (
      <div className="relative">
        {/* 轮播容器 */}
        <div 
          className="overflow-hidden touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <motion.div 
            className="flex"
            animate={{ x: `-${currentIndex * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {sortedIndicators.map((indicator) => (
              <div key={indicator.id} className="w-full flex-shrink-0 px-2">
                <ResponsiveIndicatorCard {...indicator} />
              </div>
            ))}
          </motion.div>
        </div>
        
        {/* 导航按钮 */}
        {indicators.length > 1 && (
          <>
            {/* 左箭头 */}
            <button
              className={`
                absolute left-0 top-1/2 -translate-y-1/2 z-10
                btn btn-circle btn-sm btn-ghost
                ${currentIndex === 0 ? 'invisible' : ''}
              `}
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {/* 右箭头 */}
            <button
              className={`
                absolute right-0 top-1/2 -translate-y-1/2 z-10
                btn btn-circle btn-sm btn-ghost
                ${currentIndex === indicators.length - 1 ? 'invisible' : ''}
              `}
              onClick={() => setCurrentIndex(Math.min(indicators.length - 1, currentIndex + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            {/* 分页指示器 */}
            <div className="flex justify-center gap-1.5 mt-4 pb-1">
              {indicators.map((_, index) => (
                <motion.button
                  key={index}
                  className={`
                    rounded-full transition-all duration-300
                    ${index === currentIndex 
                      ? 'w-8 h-2 bg-primary' 
                      : 'w-2 h-2 bg-base-300 hover:bg-base-content/20'}
                  `}
                  onClick={() => setCurrentIndex(index)}
                  whileTap={{ scale: 0.9 }}
                  aria-label={`指标卡片 ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };
  
  // 渲染列表布局（紧凑型）
  const renderList = () => {
    return (
      <div className="space-y-2">
        {sortedIndicators.map((indicator, index) => (
          <motion.div
            key={indicator.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <MiniIndicatorCard
              icon={indicator.icon}
              label={indicator.title}
              value={indicator.value}
              trend={indicator.trend}
              onClick={indicator.onClick}
            />
          </motion.div>
        ))}
      </div>
    );
  };
  
  // 加载状态
  if (loading) {
    return (
      <div className={className}>
        {title && (
          <h2 className="text-lg font-semibold mb-4">{title}</h2>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-base-100 border border-base-300 rounded-xl p-5">
              <div className="animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-base-300 rounded"></div>
                  <div className="h-4 bg-base-300 rounded w-24"></div>
                </div>
                <div className="h-8 bg-base-300 rounded w-32 mb-2"></div>
                <div className="h-3 bg-base-300 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className={className}>
      {/* 标题栏 */}
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
          {device.isMobile && indicators.length > 2 && (
            <button className="btn btn-ghost btn-sm btn-circle">
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      
      {/* 指标内容 */}
      {activeLayout === 'carousel' && renderCarousel()}
      {activeLayout === 'grid' && renderGrid()}
      {activeLayout === 'list' && renderList()}
    </div>
  );
};

// 预设的指标配置
export const createCashFlowIndicator = (
  reimbursedAmount: number,
  unreimbursedAmount: number,
  onClick?: () => void
): IndicatorData => ({
  id: 'cash-flow',
  icon: <DollarSign className="w-5 h-5 text-success" />,
  title: '资金回流',
  subtitle: '本月报销情况',
  value: reimbursedAmount,
  valuePrefix: '¥',
  secondaryValue: unreimbursedAmount,
  secondaryLabel: '待报销',
  trend: reimbursedAmount > 0 ? 'up' : 'neutral',
  trendValue: `${((reimbursedAmount / (reimbursedAmount + unreimbursedAmount)) * 100).toFixed(0)}%`,
  trendLabel: '报销率',
  variant: 'success',
  onClick,
  actionLabel: '查看详情',
  priority: 10
});

export const createUrgentTodoIndicator = (
  count: number,
  amount: number,
  onClick?: () => void
): IndicatorData => ({
  id: 'urgent-todo',
  icon: <AlertCircle className="w-5 h-5 text-warning" />,
  title: '待处理',
  subtitle: '未报销发票',
  value: count,
  valueSuffix: '张',
  secondaryValue: `¥${amount.toFixed(2)}`,
  secondaryLabel: '总金额',
  variant: count > 5 ? 'warning' : 'default',
  onClick,
  actionLabel: '立即处理',
  priority: 9
});

export const createOverdueIndicator = (
  overdueCount: number,
  dueSoonCount: number,
  onClick?: () => void
): IndicatorData => ({
  id: 'overdue',
  icon: <Clock className="w-5 h-5 text-error" />,
  title: '时效提醒',
  value: overdueCount,
  valueSuffix: '张超期',
  secondaryValue: dueSoonCount,
  secondaryLabel: '即将到期',
  variant: overdueCount > 0 ? 'error' : dueSoonCount > 0 ? 'warning' : 'default',
  onClick,
  actionLabel: '查看',
  priority: overdueCount > 0 ? 11 : 8
});

export const createGrowthIndicator = (
  currentMonth: number,
  lastMonth: number,
  onClick?: () => void
): IndicatorData => ({
  id: 'growth',
  icon: <TrendingUp className="w-5 h-5 text-info" />,
  title: '月度趋势',
  value: currentMonth,
  valuePrefix: '¥',
  trend: currentMonth > lastMonth ? 'up' : 'down',
  trendValue: `${Math.abs(((currentMonth - lastMonth) / lastMonth) * 100).toFixed(0)}%`,
  trendLabel: '较上月',
  variant: 'info',
  onClick,
  actionLabel: '分析',
  priority: 7
});

export default ResponsiveIndicatorSection;