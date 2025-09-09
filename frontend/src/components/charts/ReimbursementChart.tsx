/**
 * 报销管理图表组件
 * 展示报销进度、逾期分析等 - 使用 Recharts
 * 
 * 状态映射定义：
 * - 总体数据：reimbursed = 已完成报销
 * - 月度数据：approved = 已完成报销（与总体数据的 reimbursed 状态对应）
 * 
 * 完成率计算：已完成数量 / 总数量
 */
import React from 'react'
import BaseChart from './BaseChart'
import { STATUS_COLORS, CHART_COLORS } from './chartColors'
import { 
  PieChart, 
  Pie, 
  Cell,
  Tooltip, 
  Legend
} from 'recharts'

interface ReimbursementData {
  totalCount: number
  reimbursedCount: number
  unreimbursedCount: number
  overdueCount: number
  dueSoonCount: number
  reimbursementRate: number
}


interface ReimbursementChartProps {
  data: ReimbursementData
  loading?: boolean
}

const ReimbursementChart: React.FC<ReimbursementChartProps> = ({
  data,
  loading = false
}) => {

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-base-100 border border-base-300 rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label || data.name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name === 'submitted' && `已提交: ${entry.value}张`}
              {entry.name === 'approved' && `已批准(完成): ${entry.value}张`}
              {entry.name === 'rejected' && `已拒绝: ${entry.value}张`}
              {entry.name === 'pending' && `待审批: ${entry.value}张`}
              {entry.name === '报销完成率' && `完成率: ${entry.value.toFixed(1)}%`}
              {entry.name && !['submitted', 'approved', 'rejected', 'pending', '报销完成率'].includes(entry.name) && `${entry.name}: ${entry.value}张`}
              {data.name && data.totalCount > 0 && entry.name !== '报销完成率' && ` (${((entry.value / data.totalCount) * 100).toFixed(1)}%)`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* 报销进度指标 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4">报销进度指标</h3>
          <div className="space-y-4">
            <div className="stat">
              <div className="stat-title">总发票数</div>
              <div className="stat-value text-2xl">{data.totalCount}</div>
              <div className="stat-desc">包含所有状态的发票</div>
            </div>
            
            <div className="stat">
              <div className="stat-title">报销完成率</div>
              <div className="stat-value text-2xl text-success">
                {data.reimbursementRate?.toFixed(1) || '0'}%
              </div>
              <div className="stat-desc">
                已完成 {data.reimbursedCount} / {data.totalCount}
              </div>
              <progress 
                className="progress progress-success w-full" 
                value={data.reimbursementRate} 
                max="100"
              ></progress>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="stat bg-warning/10 rounded-lg p-3">
                <div className="stat-title text-xs">逾期</div>
                <div className="stat-value text-lg text-error">{data.overdueCount}</div>
              </div>
              <div className="stat bg-info/10 rounded-lg p-3">
                <div className="stat-title text-xs">即将到期</div>
                <div className="stat-value text-lg text-warning">{data.dueSoonCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* 提示信息 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4">状态分布图表</h3>
          <div className="text-center py-8">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-base-content/80 mb-2">报销状态分布图表已移动</p>
            <p className="text-base-content/60 mb-4">详细的状态分布图表现在位于概览仪表盘中</p>
            <p className="text-sm text-base-content/40">您可以在概览页面查看完整的报销状态分布饼图</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReimbursementChart