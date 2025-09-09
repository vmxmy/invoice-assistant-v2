/**
 * 趋势分析图表组件
 * 展示月度趋势和增长率分析 - 使用 Recharts
 */
import React from 'react'
import BaseChart from './BaseChart'
import { CHART_COLORS, DATA_TYPE_COLORS } from './chartColors'
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer
} from 'recharts'

interface MonthlyData {
  month: string
  invoiceCount: number
  totalAmount: number
  countGrowthRate?: number
  amountGrowthRate?: number
}

interface TrendAnalysisChartProps {
  data: MonthlyData[]
  loading?: boolean
}

const TrendAnalysisChart: React.FC<TrendAnalysisChartProps> = ({
  data = [],
  loading = false
}) => {
  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-base-100 border border-base-300 rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name === 'invoiceCount' && `票数: ${entry.value}张`}
              {entry.name === 'totalAmount' && `金额: ¥${entry.value?.toLocaleString() || '0'}`}
              {entry.name === 'countGrowthRate' && `票数增长: ${entry.value > 0 ? '+' : ''}${entry.value}%`}
              {entry.name === 'amountGrowthRate' && `金额增长: ${entry.value > 0 ? '+' : ''}${entry.value}%`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // 格式化Y轴金额
  const formatAmount = (value: number) => {
    if (!value || value <= 0) return '0'
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}万`
    }
    return `${value.toLocaleString()}`
  }

  return (
    <div className="space-y-6">
      {/* 月度趋势组合图 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4">月度趋势分析</h3>
          <BaseChart height={400} loading={loading}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                className="text-xs"
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
              
              {/* 柱状图显示金额 */}
              <Bar 
                yAxisId="left"
                dataKey="totalAmount" 
                name="总金额"
                fill={DATA_TYPE_COLORS.revenue}
                opacity={0.8}
                radius={[4, 4, 0, 0]}
              />
              
              {/* 线图显示票数 */}
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="invoiceCount" 
                name="票数"
                stroke={CHART_COLORS.secondary}
                strokeWidth={3}
                dot={{ fill: CHART_COLORS.secondary, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: CHART_COLORS.secondary }}
              />
            </ComposedChart>
          </BaseChart>
        </div>
      </div>

      {/* 增长率分析 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4">增长率分析</h3>
          <BaseChart height={300} loading={loading}>
            <ComposedChart data={data.filter(item => item.countGrowthRate !== undefined)}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                className="text-xs"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                className="text-xs"
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* 票数增长率 */}
              <Line 
                type="monotone" 
                dataKey="countGrowthRate" 
                name="票数增长率"
                stroke={CHART_COLORS.success}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS.success, strokeWidth: 2, r: 3 }}
              />
              
              {/* 金额增长率 */}
              <Line 
                type="monotone" 
                dataKey="amountGrowthRate" 
                name="金额增长率"
                stroke={CHART_COLORS.warning}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS.warning, strokeWidth: 2, r: 3 }}
              />
              
              {/* 零增长参考线 */}
              <Line 
                type="monotone" 
                dataKey={() => 0} 
                name="零增长线"
                stroke={CHART_COLORS.neutralContent}
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                legendType="none"
              />
            </ComposedChart>
          </BaseChart>
        </div>
      </div>

      {/* 数据统计表 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4">详细数据</h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra table-sm">
              <thead>
                <tr>
                  <th>月份</th>
                  <th>票数</th>
                  <th>总金额</th>
                  <th>票数增长</th>
                  <th>金额增长</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.month}>
                    <td>{item.month}</td>
                    <td>{item.invoiceCount}张</td>
                    <td>¥{item.totalAmount?.toLocaleString() || '0'}</td>
                    <td>
                      {item.countGrowthRate !== undefined ? (
                        <span className={`badge ${item.countGrowthRate > 0 ? 'badge-success' : item.countGrowthRate < 0 ? 'badge-error' : 'badge-neutral'}`}>
                          {item.countGrowthRate > 0 ? '+' : ''}{item.countGrowthRate}%
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      {item.amountGrowthRate !== undefined ? (
                        <span className={`badge ${item.amountGrowthRate > 0 ? 'badge-success' : item.amountGrowthRate < 0 ? 'badge-error' : 'badge-neutral'}`}>
                          {item.amountGrowthRate > 0 ? '+' : ''}{item.amountGrowthRate}%
                        </span>
                      ) : '-'}
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

export default TrendAnalysisChart