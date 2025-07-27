import React, { memo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Sector
} from 'recharts';

interface SubCategory {
  name: string;
  count: number;
  amount: number;
  percentage: number;
}

interface CategoryData {
  name: string;
  value: number;
  amount: number;
  percentage: number;
  color?: string;
  subcategories?: SubCategory[];
}

interface ElegantHierarchicalPieProps {
  data: CategoryData[];
  title?: string;
  height?: number;
  loading?: boolean;
}

const CHART_COLORS = [
  '#3b82f6', // 蓝色 - 交通
  '#10b981', // 绿色 - 餐饮
  '#f59e0b', // 橙色 - 住宿
  '#ef4444', // 红色 - 办公
  '#8b5cf6', // 紫色 - 其他
];


// 自定义外部标签线
const renderCustomizedLabel = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, outerRadius, payload, percent } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  // 格式化子分类显示
  const subCategoryText = payload.subcategories && payload.subcategories.length > 0
    ? payload.subcategories.map((sub: SubCategory) => `${sub.name}:${sub.count}`).join(' ')
    : '';

  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={payload.color} fill="none" strokeWidth={1.5} />
      <circle cx={ex} cy={ey} r={2} fill={payload.color} stroke="none" />
      <g transform={`translate(${ex + (cos >= 0 ? 1 : -1) * 12}, ${ey})`}>
        <text textAnchor={textAnchor} fill="#333" className="text-sm font-medium">
          {`${payload.name} ${(percent * 100).toFixed(0)}%`}
        </text>
        {subCategoryText && (
          <text textAnchor={textAnchor} fill="#666" className="text-xs" dy={16}>
            {subCategoryText}
          </text>
        )}
        <text textAnchor={textAnchor} fill="#999" className="text-xs" dy={32}>
          {`¥${(payload.amount / 1000).toFixed(1)}k`}
        </text>
      </g>
    </g>
  );
};

// 增强的 Tooltip
const EnhancedTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg shadow-xl p-4 min-w-[240px]">
      <div className="flex items-center gap-2 mb-3">
        <span 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: data.color }}
        />
        <h4 className="font-bold text-base">{data.name}</h4>
        <span className="badge badge-sm badge-primary">{data.percentage}%</span>
      </div>
      
      <div className="space-y-2 text-sm mb-3">
        <div className="flex justify-between">
          <span className="text-base-content/70">发票数量：</span>
          <span className="font-medium">{data.value} 张</span>
        </div>
        <div className="flex justify-between">
          <span className="text-base-content/70">总金额：</span>
          <span className="font-medium">¥{data.amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-base-content/70">平均金额：</span>
          <span className="font-medium">¥{(data.amount / data.value).toFixed(0)}</span>
        </div>
      </div>
      
      {/* 子分类详情 */}
      {data.subcategories && data.subcategories.length > 0 && (
        <div className="border-t border-base-300 pt-3">
          <p className="text-xs font-semibold mb-2 text-base-content/70">明细分类：</p>
          <div className="space-y-2">
            {data.subcategories.map((sub: SubCategory, idx: number) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-base-300" />
                  <span className="text-xs">{sub.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-medium">{sub.count}张</span>
                  <span className="text-base-content/60">¥{(sub.amount / 1000).toFixed(1)}k</span>
                  <span className="badge badge-xs">{sub.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 动态扇形效果
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

export const ElegantHierarchicalPie: React.FC<ElegantHierarchicalPieProps> = memo(({
  data,
  title,
  height = 400,
  loading = false
}) => {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // 处理数据，添加颜色
  const processedData = data.map((item, index) => ({
    ...item,
    color: item.color || CHART_COLORS[index % CHART_COLORS.length]
  }));

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          {title && <h3 className="card-title text-lg mb-4">{title}</h3>}
          <div className="skeleton w-full" style={{ height }}></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          {title && <h3 className="card-title text-lg mb-4">{title}</h3>}
          <div className="w-full flex items-center justify-center" style={{ height }}>
            <div className="text-center text-base-content/50">
              <div className="text-6xl mb-4">📊</div>
              <div className="text-lg font-medium mb-2">暂无数据</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body">
        {title && (
          <h3 className="card-title text-lg mb-4 flex items-center justify-between">
            <span>{title}</span>
            <div className="text-xs text-base-content/50 font-normal">
              总计 {data.reduce((sum, cat) => sum + cat.value, 0)} 张
            </div>
          </h3>
        )}
        
        <div className="w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={processedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
              >
                {processedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="cursor-pointer transition-all duration-200"
                    style={{
                      filter: activeIndex === index ? 'brightness(1.1)' : 
                              activeIndex !== undefined ? 'brightness(0.8)' : 'brightness(1)',
                      opacity: activeIndex === index ? 1 : 
                              activeIndex !== undefined ? 0.7 : 1
                    }}
                  />
                ))}
              </Pie>
              <Tooltip 
                content={<EnhancedTooltip />} 
                wrapperStyle={{ zIndex: 1000 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});

ElegantHierarchicalPie.displayName = 'ElegantHierarchicalPie';

export default ElegantHierarchicalPie;