/**
 * 概览仪表盘组件
 * 展示关键指标和报销状态分布 - 使用 Recharts
 */
import React from 'react'
import BaseChart from './BaseChart'
import { STATUS_COLORS, getStatusColor, CHART_COLORS } from './chartColors'
import { 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts'

interface OverviewData {
  totalInvoices: number
  totalAmount: number
  avgAmount: number
  monthlyInvoices: number
  reimbursedCount: number
  unreimbursedCount: number
  overdueCount: number
  dueSoonCount: number
  reimbursementRate: number
  monthlyGrowthRate: number
}

interface OverviewDashboardProps {
  data: OverviewData
  loading?: boolean
}

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  data,
  loading = false
}) => {
  // 报销状态数据
  const statusData = [
    { name: '已报销', value: data.reimbursedCount, color: STATUS_COLORS.completed },
    { name: '未报销', value: data.unreimbursedCount, color: STATUS_COLORS.pending },
    { name: '逾期', value: data.overdueCount, color: STATUS_COLORS.failed },
    { name: '即将到期', value: data.dueSoonCount, color: CHART_COLORS.info }
  ].filter(item => item.value > 0)

  // 仪表盘数据 - 转换为百分比
  const reimbursementRatePercent = (data.reimbursementRate || 0) * 100
  const gaugeData = [
    {
      name: '报销完成率',
      value: reimbursementRatePercent,
      fill: getStatusColor(reimbursementRatePercent)
    }
  ]

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-base-100 border border-base-300 rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label || data.name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}张
              {data.name && data.totalCount > 0 && ` (${((entry.value / data.totalCount) * 100).toFixed(1)}%)`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // 格式化金额
  const formatAmount = (amount: number) => {
    if (!amount || amount <= 0) return '0'
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万`
    }
    return amount.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-primary/10 to-primary/5 shadow-md">
          <div className="card-body p-4">
            <div className="stat">
              <div className="stat-title text-xs">总发票数</div>
              <div className="stat-value text-2xl text-primary">{data.totalInvoices}</div>
              <div className="stat-desc text-xs">
                本月 {data.monthlyInvoices} 张
                {data.monthlyGrowthRate !== 0 && (
                  <span className={`ml-1 ${data.monthlyGrowthRate > 0 ? 'text-success' : 'text-error'}`}>
                    {data.monthlyGrowthRate > 0 ? '↗' : '↘'} {Math.abs(data.monthlyGrowthRate)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-secondary/10 to-secondary/5 shadow-md">
          <div className="card-body p-4">
            <div className="stat">
              <div className="stat-title text-xs">总金额</div>
              <div className="stat-value text-2xl text-secondary">¥{formatAmount(data.totalAmount)}</div>
              <div className="stat-desc text-xs">平均 ¥{data.avgAmount?.toLocaleString() || '0'}/张</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-success/10 to-success/5 shadow-md">
          <div className="card-body p-4">
            <div className="stat">
              <div className="stat-title text-xs">已报销</div>
              <div className="stat-value text-2xl text-success">{data.reimbursedCount}</div>
              <div className="stat-desc text-xs">占比 {data.totalInvoices > 0 ? ((data.reimbursedCount / data.totalInvoices) * 100).toFixed(1) : '0'}%</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-warning/10 to-warning/5 shadow-md">
          <div className="card-body p-4">
            <div className="stat">
              <div className="stat-title text-xs">待报销</div>
              <div className="stat-value text-2xl text-warning">{data.unreimbursedCount}</div>
              <div className="stat-desc text-xs">占比 {data.totalInvoices > 0 ? ((data.unreimbursedCount / data.totalInvoices) * 100).toFixed(1) : '0'}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 报销完成率仪表盘 */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-base-content mb-4">报销完成率</h3>
            <BaseChart height={300} loading={loading}>
              <RadialBarChart 
                innerRadius="30%" 
                outerRadius="80%" 
                data={gaugeData}
                startAngle={90} 
                endAngle={450}
              >
                <RadialBar 
                  dataKey="value" 
                  cornerRadius={10} 
                  fill={gaugeData[0].fill}
                />
                <text 
                  x="50%" 
                  y="50%" 
                  textAnchor="middle" 
                  dominantBaseline="middle" 
                  className="text-4xl font-bold fill-current"
                >
                  {reimbursementRatePercent?.toFixed(1) || '0'}%
                </text>
              </RadialBarChart>
            </BaseChart>
            <div className="text-center mt-2">
              <div className={`badge ${
                data.reimbursementRate >= 80 ? 'badge-success' : 
                data.reimbursementRate >= 60 ? 'badge-warning' : 'badge-error'
              }`}>
                {data.reimbursementRate >= 80 ? '优秀' : 
                 data.reimbursementRate >= 60 ? '良好' : '需要改进'}
              </div>
            </div>
          </div>
        </div>

        {/* 报销状态分布 */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-base-content mb-4">报销状态分布</h3>
            <BaseChart height={300} loading={loading}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </BaseChart>
          </div>
        </div>
      </div>

    </div>
  )
}

export default OverviewDashboard