import React, { memo, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

interface MonthlyData {
  month: string;
  invoices: number;
  amount: number;
}

interface InvoiceTrendChartProps {
  data: MonthlyData[];
  title?: string;
  height?: number;
  loading?: boolean;
}

const COLORS = {
  invoices: '#10b981', // emerald-500
  amount: '#3b82f6',   // blue-500
};

export const InvoiceTrendChart: React.FC<InvoiceTrendChartProps> = memo(({
  data,
  title = '发票趋势总览',
  height = 400,
  loading = false,
}) => {
  // 格式化月份显示
  const formatXAxisTick = (value: string) => {
    if (value.includes('-')) {
      const [year, month] = value.split('-');
      return `${parseInt(month)}月`;
    }
    return value;
  };

  // 格式化月份用于显示
  const formatMonthDisplay = (value: string) => {
    if (value.includes('T')) {
      // 处理 ISO 日期格式
      const date = new Date(value);
      return `${date.getFullYear()}年${date.getMonth() + 1}月`;
    }
    if (value.includes('-')) {
      const [year, month] = value.split('-');
      return `${year}年${parseInt(month)}月`;
    }
    return value;
  };

  // 格式化金额
  const formatCurrency = (value: number) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}万`;
    }
    return value.toLocaleString();
  };

  // 自定义提示框
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    // 格式化标签显示为中文年月
    let formattedLabel = label;
    if (label && label.includes('T')) {
      const date = new Date(label);
      formattedLabel = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    } else if (label && label.includes('-')) {
      const [year, month] = label.split('-');
      formattedLabel = `${year}年${parseInt(month)}月`;
    }
    
    return (
      <div className="bg-base-100 border border-base-300 rounded-lg shadow-lg p-4">
        <p className="text-sm font-semibold text-base-content mb-2">{formattedLabel}</p>
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-base-content/70">{item.name}:</span>
            <span className="font-medium" style={{ color: item.color }}>
              {item.dataKey === 'amount' 
                ? `¥${item.value.toLocaleString()}` 
                : `${item.value}张`
              }
            </span>
          </div>
        ))}
      </div>
    );
  }, []);

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-lg border border-base-300">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">{title}</h3>
          <div className="skeleton w-full" style={{ height }}></div>
        </div>
      </div>
    );
  }

  // 检查是否有数据
  if (!data || data.length === 0) {
    return (
      <div className="card bg-base-100 shadow-lg border border-base-300">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">{title}</h3>
          <div className="w-full flex items-center justify-center" style={{ height }}>
            <div className="text-center text-base-content/50">
              <div className="text-6xl mb-4">📊</div>
              <div className="text-lg font-medium mb-2">暂无数据</div>
              <div className="text-sm">开始使用系统后，这里将显示发票趋势</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 对数据按月份排序（从早到晚）
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.month);
    const dateB = new Date(b.month);
    return dateA.getTime() - dateB.getTime();
  });

  // 计算平均值
  const avgInvoices = Math.round(sortedData.reduce((sum, item) => sum + item.invoices, 0) / sortedData.length);
  const avgAmount = Math.round(sortedData.reduce((sum, item) => sum + item.amount, 0) / sortedData.length);

  return (
    <div className="card bg-base-100 shadow-lg border border-base-300">
      <div className="card-body">
        <div className="flex items-center justify-between mb-6">
          <h3 className="card-title text-lg">{title}</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.invoices }} />
              <span className="text-base-content/70">发票数量</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.amount }} />
              <span className="text-base-content/70">总金额</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 发票数量趋势图 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-base-content/80">发票数量趋势</h4>
              <span className="text-xs text-base-content/60">
                平均: {avgInvoices}张/月
              </span>
            </div>
            <div style={{ height: height / 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={formatXAxisTick}
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                    label={{ 
                      value: '发票数量（张）', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 12 }
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine 
                    y={avgInvoices} 
                    stroke={COLORS.invoices} 
                    strokeDasharray="5 5" 
                    opacity={0.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="invoices"
                    name="发票数量"
                    stroke={COLORS.invoices}
                    strokeWidth={3}
                    dot={{ fill: COLORS.invoices, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 总金额趋势图 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-base-content/80">总金额趋势</h4>
              <span className="text-xs text-base-content/60">
                平均: ¥{formatCurrency(avgAmount)}/月
              </span>
            </div>
            <div style={{ height: height / 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={formatXAxisTick}
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                    tickFormatter={formatCurrency}
                    label={{ 
                      value: '总金额（¥）', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 12 }
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine 
                    y={avgAmount} 
                    stroke={COLORS.amount} 
                    strokeDasharray="5 5" 
                    opacity={0.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="总金额"
                    stroke={COLORS.amount}
                    strokeWidth={3}
                    dot={{ fill: COLORS.amount, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 汇总统计 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-4 border-t border-base-300">
          <div className="text-center">
            <div className="text-xs text-base-content/60 mb-1">总发票数</div>
            <div className="text-lg font-semibold text-success">
              {sortedData.reduce((sum, item) => sum + item.invoices, 0)}张
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-base-content/60 mb-1">总金额</div>
            <div className="text-lg font-semibold text-info">
              ¥{formatCurrency(sortedData.reduce((sum, item) => sum + item.amount, 0))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-base-content/60 mb-1">最高月份</div>
            <div className="text-lg font-semibold text-warning">
              {formatMonthDisplay(sortedData.reduce((max, item) => item.invoices > max.invoices ? item : max).month)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-base-content/60 mb-1">增长趋势</div>
            <div className="text-lg font-semibold text-primary">
              {sortedData.length >= 2 && sortedData[sortedData.length - 1].invoices > sortedData[sortedData.length - 2].invoices 
                ? '↑' : '↓'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

InvoiceTrendChart.displayName = 'InvoiceTrendChart';

export default InvoiceTrendChart;