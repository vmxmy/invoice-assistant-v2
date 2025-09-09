/**
 * 区域分析图表组件
 * 展示地域分布和区域对比分析 - 使用 Recharts
 */
import React from 'react'
import BaseChart from './BaseChart'
import { CHART_COLOR_PALETTE, getChartColor, DATA_TYPE_COLORS, CHART_COLORS } from './chartColors'
import { 
  BarChart,
  Bar,
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer
} from 'recharts'

interface RegionalData {
  region: string
  count: number
  amount: number
  percentage: number
  avgAmount: number
}

interface RegionalAnalysisChartProps {
  data: RegionalData[]
  loading?: boolean
}

const RegionalAnalysisChart: React.FC<RegionalAnalysisChartProps> = ({
  data = [],
  loading = false
}) => {
  // 使用标准化的调色板
  const colorPalette = CHART_COLOR_PALETTE

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-base-100 border border-base-300 rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-3 text-base">{label || data.region}</p>
          
          {/* 始终显示基本信息 */}
          <div className="space-y-1">
            <p className="text-sm flex justify-between items-center">
              <span>发票数量:</span>
              <span className="font-semibold text-primary">{data.count}张</span>
            </p>
            <p className="text-sm flex justify-between items-center">
              <span>总金额:</span>
              <span className="font-semibold text-secondary">¥{data.amount?.toLocaleString() || '0'}</span>
            </p>
            <p className="text-sm flex justify-between items-center">
              <span>平均金额:</span>
              <span className="font-semibold text-accent">¥{data.avgAmount?.toLocaleString() || '0'}</span>
            </p>
            <p className="text-sm flex justify-between items-center">
              <span>占比:</span>
              <span className="font-semibold text-info">{data.percentage?.toFixed(1) || '0'}%</span>
            </p>
          </div>

          {/* 根据具体图表显示额外信息 */}
          {payload.map((entry: any, index: number) => (
            <div key={index} className="mt-2 pt-2 border-t border-base-300">
              <p className="text-xs text-base-content/60">
                {entry.name === 'count' && '发票数量统计'}
                {entry.name === 'amount' && '总金额统计'}
                {entry.name === 'avgAmount' && '平均金额统计'}
              </p>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  // 格式化金额
  const formatAmount = (value: number) => {
    if (!value || value <= 0) return '0'
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}万`
    }
    return `${value.toLocaleString()}`
  }

  // 过滤有效数据
  const validData = data.filter(item => item.count > 0 && item.amount > 0)

  // 如果没有有效数据，显示空状态
  if (validData.length === 0) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="text-center py-12">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-base-content/80 mb-2">暂无地区数据</p>
            <p className="text-base-content/60 mb-4">当前筛选条件下没有找到任何地区发票记录</p>
            <p className="text-sm text-base-content/40">请尝试调整时间范围或检查数据源</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 区域分布饼图 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4">区域分布</h3>
          <BaseChart height={400} loading={loading}>
            <PieChart>
              <Pie
                data={validData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={150}
                paddingAngle={2}
                dataKey="count"
                nameKey="region"
              >
                {validData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getChartColor(index)} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value, entry: any) => {
                  const item = validData.find(d => d.region === value)
                  return item ? `${value} (${item.percentage?.toFixed(1) || '0'}%)` : value
                }}
              />
            </PieChart>
          </BaseChart>
        </div>
      </div>

      {/* 区域对比分析 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4">区域对比分析</h3>
          <BaseChart height={400} loading={loading}>
            <BarChart data={validData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="region"
                axisLine={false}
                tickLine={false}
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                className="text-xs"
                tickFormatter={formatAmount}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                className="text-xs"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* 总金额 */}
              <Bar 
                yAxisId="left"
                dataKey="amount" 
                name="总金额"
                fill={DATA_TYPE_COLORS.revenue}
                opacity={0.8}
                radius={[4, 4, 0, 0]}
              />
              
              {/* 数量 */}
              <Bar 
                yAxisId="right"
                dataKey="count" 
                name="票数"
                fill={CHART_COLORS.secondary}
                opacity={0.6}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </BaseChart>
        </div>
      </div>

      {/* 平均金额对比 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4">平均金额对比</h3>
          <BaseChart height={300} loading={loading}>
            <BarChart data={validData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="region"
                axisLine={false}
                tickLine={false}
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                className="text-xs"
                tickFormatter={formatAmount}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="avgAmount" 
                name="平均金额"
                fill={CHART_COLORS.accent}
                radius={[4, 4, 0, 0]}
              >
                {validData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={colorPalette[index % colorPalette.length]} 
                  />
                ))}
              </Bar>
            </BarChart>
          </BaseChart>
        </div>
      </div>

      {/* 详细数据表 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4">区域统计详情</h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra table-sm">
              <thead>
                <tr>
                  <th>区域</th>
                  <th>数量</th>
                  <th>总金额</th>
                  <th>平均金额</th>
                  <th>占比</th>
                  <th>排名</th>
                </tr>
              </thead>
              <tbody>
                {validData
                  .sort((a, b) => b.amount - a.amount)
                  .map((item, index) => (
                  <tr key={item.region}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getChartColor(validData.findIndex(d => d.region === item.region)) }}
                        ></div>
                        {item.region}
                      </div>
                    </td>
                    <td>{item.count}张</td>
                    <td>¥{item.amount?.toLocaleString() || '0'}</td>
                    <td>¥{item.avgAmount?.toLocaleString() || '0'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <progress 
                          className="progress progress-primary w-16" 
                          value={item.percentage || 0} 
                          max="100"
                        ></progress>
                        <span className="text-sm">{item.percentage?.toFixed(1) || '0'}%</span>
                      </div>
                    </td>
                    <td>
                      <div className={`badge ${
                        index === 0 ? 'badge-warning' : 
                        index === 1 ? 'badge-info' : 
                        index === 2 ? 'badge-success' : 
                        'badge-neutral'
                      }`}>
                        #{index + 1}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegionalAnalysisChart