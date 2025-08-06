import React from 'react';

interface DataPoint {
  month: string;
  amount: number;
}

interface SimpleLineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  showDots?: boolean;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  width = 200,
  height = 60,
  strokeColor = 'rgb(34, 197, 94)', // green-500
  fillColor = 'rgba(34, 197, 94, 0.1)',
  showDots = true
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <span className="text-xs text-base-content/40">暂无数据</span>
      </div>
    );
  }

  // 计算数据范围
  const amounts = data.map(d => d.amount);
  const minAmount = Math.min(...amounts);
  const maxAmount = Math.max(...amounts);
  const range = maxAmount - minAmount;

  // 如果所有数值相同，设置一个最小范围以避免除零
  const safeRange = range === 0 ? maxAmount || 1 : range;

  // 计算SVG路径点
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((point.amount - minAmount) / safeRange) * height;
    return { x, y, amount: point.amount, month: point.month };
  });

  // 生成路径字符串
  const pathData = points.reduce((path, point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${path} ${command} ${point.x} ${point.y}`;
  }, '');

  // 生成填充区域路径
  const fillPathData = `${pathData} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className="relative">
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* 填充区域 */}
        <path
          d={fillPathData}
          fill={fillColor}
          stroke="none"
        />
        
        {/* 主线条 */}
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* 数据点 */}
        {showDots && points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={2.5}
            fill={strokeColor}
            stroke="white"
            strokeWidth={1}
            className="hover:r-4 transition-all cursor-pointer"
          >
            <title>{`${point.month}: ¥${point.amount.toLocaleString()}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
};

// 格式化月份显示
export const formatMonth = (monthStr: string): string => {
  try {
    const date = new Date(monthStr + '-01');
    // 只显示月份，不显示年份
    return (date.getMonth() + 1) + '月';
  } catch {
    return monthStr;
  }
};

// 格式化金额显示
export const formatCurrency = (amount: number): string => {
  if (amount >= 10000) {
    return `¥${(amount / 10000).toFixed(1)}万`;
  }
  return `¥${amount.toLocaleString()}`;
};

export default SimpleLineChart;