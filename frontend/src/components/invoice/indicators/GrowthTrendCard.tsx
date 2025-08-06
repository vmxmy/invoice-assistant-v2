import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { BaseIndicatorCard, StatBadge } from './BaseIndicatorCard';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';
import { AnimatedCurrency } from '../../ui/AnimatedNumber';
import { SimpleLineChart, formatMonth, formatCurrency } from '../../ui/SimpleLineChart';
import { supabaseStats, RecentMonthlyStats } from '../../../services/supabaseStats';
import { useAuthContext } from '../../../contexts/AuthContext';

interface GrowthTrendCardProps {
  loading?: boolean;
}

export const GrowthTrendCard: React.FC<GrowthTrendCardProps> = ({
  loading = false
}) => {
  const device = useDeviceDetection();
  const { user } = useAuthContext();
  const [monthlyData, setMonthlyData] = useState<RecentMonthlyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await supabaseStats.getRecentMonthlyStats(user.id);
        
        // 获取当前年份
        const currentYear = new Date().getFullYear();
        
        // 只筛选当前年度的数据
        const currentYearData = data.filter(item => {
          return item.month.startsWith(currentYear.toString());
        });
        
        // 如果当前年度没有数据，创建12个月的空数据
        if (currentYearData.length === 0) {
          const emptyData = [];
          for (let month = 1; month <= 12; month++) {
            emptyData.push({
              month: `${currentYear}-${month.toString().padStart(2, '0')}`,
              invoice_count: 0,
              total_amount: 0
            });
          }
          setMonthlyData(emptyData);
        } else {
          // 补全当前年度所有月份的数据
          const allMonths = [];
          for (let month = 1; month <= 12; month++) {
            const monthStr = `${currentYear}-${month.toString().padStart(2, '0')}`;
            const existingData = currentYearData.find(item => item.month === monthStr);
            
            allMonths.push(existingData || {
              month: monthStr,
              invoice_count: 0,
              total_amount: 0
            });
          }
          
          // 确保数据按时间顺序排列
          const sortedData = allMonths.sort((a, b) => a.month.localeCompare(b.month));
          setMonthlyData(sortedData);

          // 计算总金额
          const total = sortedData.reduce((sum, item) => sum + item.total_amount, 0);
          setTotalAmount(total);

          // 计算增长率（最近一个月与上个月比较）
          const currentMonthIndex = new Date().getMonth(); // 0-11
          if (currentMonthIndex > 0) {
            const currentMonthData = sortedData[currentMonthIndex];
            const previousMonthData = sortedData[currentMonthIndex - 1];
            
            if (previousMonthData.total_amount > 0) {
              const rate = ((currentMonthData.total_amount - previousMonthData.total_amount) / previousMonthData.total_amount) * 100;
              setGrowthRate(Math.round(rate));
            }
          }
        }
      } catch (error) {
        console.error('获取年度趋势数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthlyData();
  }, [user?.id]);

  const getGrowthIcon = () => {
    if (growthRate > 0) return <TrendingUp className="w-5 h-5 text-success" />;
    if (growthRate < 0) return <TrendingDown className="w-5 h-5 text-error" />;
    return <Calendar className="w-5 h-5 text-primary" />;
  };

  const getGrowthVariant = () => {
    if (growthRate > 0) return 'success';
    if (growthRate < 0) return 'error';
    return 'default';
  };

  // 转换数据格式用于折线图
  const chartData = monthlyData.map(item => ({
    month: formatMonth(item.month),
    amount: item.total_amount
  }));

  return (
    <BaseIndicatorCard
      icon={getGrowthIcon()}
      title="年度趋势"
      loading={loading || isLoading}
      variant={getGrowthVariant()}
    >
      <div className="space-y-4">
        {/* 主要指标 */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <AnimatedCurrency 
                value={totalAmount}
                className={`
                  font-mono tabular-nums font-bold
                  ${device.isMobile ? 'text-xl' : 'text-2xl'}
                  text-primary
                `}
                enableAnimation={!loading && !isLoading}
              />
            </div>
            <div className="text-xs text-base-content/60 mt-1">
              {new Date().getFullYear()}年度累计
            </div>
          </div>
          
          {growthRate !== 0 && (
            <div className="text-right">
              <div className={`
                font-mono text-sm font-medium
                ${growthRate > 0 ? 'text-success' : 'text-error'}
              `}>
                {growthRate > 0 ? '+' : ''}{growthRate}%
              </div>
              <div className="text-xs text-base-content/60">
                月环比
              </div>
            </div>
          )}
        </div>

        {/* 折线图 */}
        <div className="pt-2">
          {chartData.length > 0 ? (
            <SimpleLineChart
              data={chartData}
              width={device.isMobile ? 260 : 280}
              height={device.isMobile ? 50 : 60}
              strokeColor="rgb(99, 102, 241)" // indigo-500
              fillColor="rgba(99, 102, 241, 0.1)"
              showDots={!device.isMobile}
            />
          ) : (
            <div className="flex items-center justify-center h-12">
              <span className="text-xs text-base-content/40">暂无年度数据</span>
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-base-content/60">
            {new Date().getFullYear()}年 1-12月
          </span>
          <StatBadge variant="default">
            年度汇总
          </StatBadge>
        </div>
      </div>
    </BaseIndicatorCard>
  );
};

export default GrowthTrendCard;