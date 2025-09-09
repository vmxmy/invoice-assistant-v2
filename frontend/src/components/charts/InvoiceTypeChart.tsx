/**
 * 发票类型分析图表组件
 * 展示发票类型分布和对比分析 - 使用 Recharts
 */
import React from 'react'
import BaseChart from './BaseChart'
import { CHART_COLOR_PALETTE, getChartColor, DATA_TYPE_COLORS } from './chartColors'
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer
} from 'recharts'

interface InvoiceTypeData {
  type: string
  count: number
  amount: number
  avgAmount: number
  percentage: number
}

interface InvoiceTypeChartProps {
  data: InvoiceTypeData[]
  loading?: boolean
}

const InvoiceTypeChart: React.FC<InvoiceTypeChartProps> = ({
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
          <p className="font-medium mb-2">{label || data.type}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name === 'count' && `数量: ${entry.value}张`}
              {entry.name === 'amount' && `金额: ¥${entry.value?.toLocaleString() || '0'}`}
              {entry.name === '消费金额' && `消费金额: ¥${entry.value?.toLocaleString() || '0'}`}
              {entry.name === 'avgAmount' && `平均: ¥${entry.value?.toLocaleString() || '0'}`}
              {entry.name === 'value' && `数量: ${entry.value}张 (${data.percentage}%)`}
            </p>
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 发票类型分布饼图 */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-base-content mb-4">发票类型分布</h3>
            <BaseChart height={350} loading={loading}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="type"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getChartColor(index)} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value, entry: any) => {
                    // value 现在应该是 type 字段的值
                    const item = data.find(d => d.type === value)
                    return item ? `${value} (${item.count}张)` : value
                  }}
                />
              </PieChart>
            </BaseChart>
          </div>
        </div>

        {/* 消费类型金额分布 */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-base-content mb-4">消费金额分布</h3>
            <BaseChart height={350} loading={loading}>
              <BarChart data={data} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  className="text-xs"
                  tickFormatter={formatAmount}
                />
                <YAxis 
                  type="category"
                  dataKey="type"
                  axisLine={false}
                  tickLine={false}
                  className="text-xs"
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="amount" 
                  name="消费金额"
                  radius={[0, 4, 4, 0]}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getChartColor(index)} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </BaseChart>
          </div>
        </div>
      </div>

      {/* 发票类型金额分析 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4">金额分析对比</h3>
          <BaseChart height={400} loading={loading}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="type"
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
                tickFormatter={formatAmount}
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
              
              {/* 平均金额 */}
              <Bar 
                yAxisId="right"
                dataKey="avgAmount" 
                name="平均金额"
                fill={DATA_TYPE_COLORS.actual}
                opacity={0.6}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </BaseChart>
        </div>
      </div>

      {/* 详细数据表 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4">详细统计</h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra table-sm">
              <thead>
                <tr>
                  <th>发票类型</th>
                  <th>数量</th>
                  <th>总金额</th>
                  <th>平均金额</th>
                  <th>占比</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={item.type}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getChartColor(index) }}
                        ></div>
                        {item.type}
                      </div>
                    </td>
                    <td>{item.count}张</td>
                    <td>¥{item.amount?.toLocaleString() || '0'}</td>
                    <td>¥{item.avgAmount?.toLocaleString() || '0'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <progress 
                          className="progress progress-primary w-16" 
                          value={item.percentage} 
                          max="100"
                        ></progress>
                        <span className="text-sm">{item.percentage?.toFixed(1) || '0'}%</span>
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

export default InvoiceTypeChart