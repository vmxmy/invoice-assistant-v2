import React, { memo, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface MonthlyData {
  month: string;
  invoices: number;
  amount: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface InvoiceChartProps {
  type: 'line' | 'area' | 'bar' | 'pie';
  data: MonthlyData[] | CategoryData[];
  title?: string;
  height?: number;
  loading?: boolean;
}

const TROPICAL_COLORS = [
  'oklch(65% 0.22 160)', // turquoise
  'oklch(70% 0.2 45)',   // coral  
  'oklch(68% 0.18 120)', // lime
  'oklch(65% 0.2 220)',  // ocean blue
  'oklch(65% 0.2 140)',  // palm green
  'oklch(75% 0.2 70)',   // mango yellow
];

export const InvoiceChart: React.FC<InvoiceChartProps> = memo(({
  type,
  data,
  title,
  height = 300,
  loading = false,
}) => {

  const formatXAxisTick = (value: string) => {
    // 简化月份显示
    if (value.includes('-')) {
      const [, month] = value.split('-');
      return `${month}月`;
    }
    return value;
  };

  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-base-100 border border-base-300 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-base-content mb-2">{label}</p>
        {payload.map((item: any, index: number) => {
          const displayName = item.name === 'invoices' ? '发票数量' : 
                             item.name === 'amount' ? '金额' : 
                             item.name === 'value' ? '总额' : item.name;
          const displayValue = item.name === 'amount' || item.name === 'value' 
            ? `¥${item.value.toLocaleString()}` 
            : item.name === 'invoices' ? `${item.value}张` : item.value;
          
          return (
            <p key={index} className="text-sm" style={{ color: item.color }}>
              {`${displayName}: ${displayValue}`}
            </p>
          );
        })}
      </div>
    );
  }, []);

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-lg border border-base-300">
        <div className="card-body">
          {title && <h3 className="card-title text-lg mb-4">{title}</h3>}
          <div className="skeleton w-full" style={{ height }}></div>
        </div>
      </div>
    );
  }

  // 检查是否有数据
  const hasData = data && data.length > 0;
  
  if (!hasData) {
    return (
      <div className="card bg-base-100 shadow-lg border border-base-300">
        <div className="card-body">
          {title && (
            <h3 className="card-title text-lg mb-4 flex items-center justify-between">
              <span>{title}</span>
              <div className="text-xs text-base-content/50 font-normal">
                暂无数据
              </div>
            </h3>
          )}
          
          <div className="w-full flex items-center justify-center" style={{ height }}>
            <div className="text-center text-base-content/50">
              <div className="text-6xl mb-4">📊</div>
              <div className="text-lg font-medium mb-2">暂无数据</div>
              <div className="text-sm">开始使用系统后，这里将显示统计图表</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data as MonthlyData[]}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="month" 
              tickFormatter={formatXAxisTick}
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="invoices"
              stroke={TROPICAL_COLORS[0]}
              strokeWidth={3}
              dot={{ fill: TROPICAL_COLORS[0], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke={TROPICAL_COLORS[1]}
              strokeWidth={3}
              dot={{ fill: TROPICAL_COLORS[1], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data as MonthlyData[]}>
            <defs>
              <linearGradient id="colorInvoices" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TROPICAL_COLORS[0]} stopOpacity={0.8} />
                <stop offset="95%" stopColor={TROPICAL_COLORS[0]} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TROPICAL_COLORS[1]} stopOpacity={0.8} />
                <stop offset="95%" stopColor={TROPICAL_COLORS[1]} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="month" 
              tickFormatter={formatXAxisTick}
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="invoices"
              stroke={TROPICAL_COLORS[0]}
              fillOpacity={1}
              fill="url(#colorInvoices)"
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke={TROPICAL_COLORS[1]}
              fillOpacity={1}
              fill="url(#colorAmount)"
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart data={data as MonthlyData[]}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="month" 
              tickFormatter={formatXAxisTick}
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="invoices" fill={TROPICAL_COLORS[0]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="amount" fill={TROPICAL_COLORS[1]} radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data as CategoryData[]}
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {(data as CategoryData[]).map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={TROPICAL_COLORS[index % TROPICAL_COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        );

      default:
        return <div>不支持的图表类型</div>;
    }
  };

  return (
    <div className="card bg-base-100 shadow-lg border border-base-300">
      <div className="card-body">
        {title && (
          <h3 className="card-title text-lg mb-4 flex items-center justify-between">
            <span>{title}</span>
            <div className="text-xs text-base-content/50 font-normal">
              过去12个月
            </div>
          </h3>
        )}
        
        <div className="w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});

InvoiceChart.displayName = 'InvoiceChart';

export default InvoiceChart;
export type { InvoiceChartProps };