/**
 * 月度趋势分析图表
 * 基于v_invoice_monthly_analysis视图数据，使用Recharts LineChart组件
 */
import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import type { MonthlyTrend } from '../../hooks/useStatisticsData'
import type { StatisticsFilters } from '../../pages/StatisticsPage'

interface TrendAnalysisChartProps {
  data?: MonthlyTrend[]
  loading?: boolean
  filters: StatisticsFilters
}

type TrendMetric = 'amount' | 'count' | 'average'

/**
 * 格式化月份显示
 */
const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-')
  return `${month}月`
}

/**
 * 格式化货币
 */
const formatCurrency = (value: number) => {
  if (value >= 10000) {
    return `¥${(value / 10000).toFixed(1)}万`
  }
  return `¥${value.toLocaleString()}`
}

/**
 * 自定义Tooltip组件
 */
const CustomTooltip = ({ active, payload, label, metric }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]
    return (
      <div className="bg-base-100 p-3 rounded-lg shadow-lg border border-base-300">
        <p className="font-medium mb-1">{label}</p>
        <p className="text-primary font-medium">
          {metric === 'count' 
            ? `${data.value} 张`
            : formatCurrency(data.value)
          }
        </p>
      </div>
    )
  }
  return null
}

/**
 * 月度趋势分析图表组件
 */
export const TrendAnalysisChart: React.FC<TrendAnalysisChartProps> = ({
  data = [],
  loading = false,
  filters
}) => {
  const [selectedMetric, setSelectedMetric] = useState<TrendMetric>('amount')

  // 转换数据格式以适配SimpleLineChart
  const getChartData = () => {
    if (!data || data.length === 0) return []

    // 按月份正序排列（最老的在前）
    const sortedData = [...data].sort((a, b) => a.month_str.localeCompare(b.month_str))

    return sortedData.map(item => ({
      month: item.month_str,
      amount: selectedMetric === 'amount' ? item.total_amount :
              selectedMetric === 'count' ? item.invoice_count :
              item.avg_amount
    }))
  }

  // 获取当前指标的配置
  const getMetricConfig = () => {
    switch (selectedMetric) {
      case 'amount':
        return {
          title: '月度总金额',
          unit: '元',
          color: 'var(--chart-success)',
          fillColor: 'var(--chart-success-fill)',
          variant: 'success' as const
        }
      case 'count':
        return {
          title: '月度发票数量',
          unit: '张',
          color: 'var(--chart-info)',
          fillColor: 'var(--chart-info-fill)',
          variant: 'info' as const
        }
      case 'average':
        return {
          title: '月度平均金额',
          unit: '元',
          color: 'var(--chart-accent)',
          fillColor: 'var(--chart-accent-fill)',
          variant: 'accent' as const
        }
    }
  }

  const chartData = getChartData()
  const metricConfig = getMetricConfig()
  
  // 计算趋势统计
  const getTrendStats = () => {
    if (!data || data.length < 2) return null

    const recent = data[0] // 最近月份
    const previous = data[1] // 前一个月份

    const currentValue = selectedMetric === 'amount' ? recent.total_amount :
                        selectedMetric === 'count' ? recent.invoice_count :
                        recent.avg_amount

    const previousValue = selectedMetric === 'amount' ? previous.total_amount :
                         selectedMetric === 'count' ? previous.invoice_count :
                         previous.avg_amount

    const growthRate = selectedMetric === 'amount' ? recent.amount_growth_rate :
                      selectedMetric === 'count' ? recent.count_growth_rate :
                      null

    return {
      current: currentValue,
      previous: previousValue,
      growth: growthRate,
      isPositive: (growthRate || 0) >= 0
    }
  }

  const trendStats = getTrendStats()
  
  // 生成数据洞察
  const generateInsight = () => {
    if (!trendStats) return null
    
    const { growth, isPositive, current } = trendStats
    
    if (growth === null) return null
    
    const absGrowth = Math.abs(growth)
    let insightText = ''
    let actionText = ''
    let variant: 'info' | 'success' | 'warning' | 'error' = 'info'
    
    if (selectedMetric === 'amount') {
      if (isPositive) {
        if (absGrowth > 20) {
          insightText = `支出增长较快（+${absGrowth.toFixed(1)}%），需要关注预算控制`
          actionText = '设置月度预算'
          variant = 'warning'
        } else {
          insightText = `支出正常增长（+${absGrowth.toFixed(1)}%），继续保持良好的财务习惯`
          actionText = '查看分类明细'
          variant = 'success'
        }
      } else {
        insightText = `支出下降${absGrowth.toFixed(1)}%，节约效果显著`
        actionText = '查看节约明细'
        variant = 'success'
      }
    } else if (selectedMetric === 'count') {
      if (isPositive && absGrowth > 50) {
        insightText = `发票数量大幅增加（+${absGrowth.toFixed(1)}%），注意及时报销`
        actionText = '处理待报销'
        variant = 'warning'
      } else {
        insightText = `发票数量变化${isPositive ? '+' : ''}${growth.toFixed(1)}%`
        actionText = '查看详情'
        variant = 'info'
      }
    }
    
    return { insightText, actionText, variant }
  }
  
  const insight = generateInsight()

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          {/* 精美的加载状态 */}
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 relative">
                <div className="loading loading-ring loading-lg text-primary"></div>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-base-content">正在分析数据</h3>
                <p className="text-sm text-base-content/60">请稍候，正在为您生成趋势分析...</p>
              </div>
              {/* 骨架屏加载效果 */}
              <div className="mt-8 space-y-3">
                <div className="skeleton h-4 w-24 mx-auto"></div>
                <div className="skeleton h-32 w-full"></div>
                <div className="flex justify-between">
                  <div className="skeleton h-3 w-8"></div>
                  <div className="skeleton h-3 w-8"></div>
                  <div className="skeleton h-3 w-8"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        {/* 图表标题和指标切换 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold">{metricConfig.title}趋势</h3>
            <p className="text-sm text-base-content/60 mt-1">
              {filters?.dateRange?.preset === 'currentyear' ? `${new Date().getFullYear()}年度` :
               filters?.dateRange?.preset === 'lastyear' ? `${new Date().getFullYear() - 1}年度` :
               '历史数据'}
            </p>
          </div>
          
          {/* 指标选择器 */}
          <div className="tabs tabs-boxed">
            <button
              className={`tab ${selectedMetric === 'amount' ? 'tab-active' : ''}`}
              onClick={() => setSelectedMetric('amount')}
            >
              金额
            </button>
            <button
              className={`tab ${selectedMetric === 'count' ? 'tab-active' : ''}`}
              onClick={() => setSelectedMetric('count')}
            >
              数量
            </button>
            <button
              className={`tab ${selectedMetric === 'average' ? 'tab-active' : ''}`}
              onClick={() => setSelectedMetric('average')}
            >
              均值
            </button>
          </div>
        </div>

        {/* 趋势统计摘要 */}
        {trendStats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="stat">
              <div className="stat-title">当前值</div>
              <div className="stat-value text-lg">
                {selectedMetric === 'count' 
                  ? `${trendStats.current}张`
                  : formatCurrency(trendStats.current)
                }
              </div>
            </div>
            
            <div className="stat">
              <div className="stat-title">上月值</div>
              <div className="stat-value text-lg">
                {selectedMetric === 'count' 
                  ? `${trendStats.previous}张`
                  : formatCurrency(trendStats.previous)
                }
              </div>
            </div>
            
            {trendStats.growth !== null && (
              <div className="stat">
                <div className="stat-title">环比增长</div>
                <div className={`stat-value text-lg ${
                  trendStats.isPositive ? 'text-success' : 'text-error'
                }`}>
                  {trendStats.isPositive ? '+' : ''}{trendStats.growth.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        )}

        {/* 主图表区域 */}
        <div className="w-full overflow-x-auto overflow-y-hidden">
          {chartData.length > 0 ? (
            <div className="min-w-[400px] py-4">
              {/* Recharts 图表容器 - 响应式宽度 */}
              <div className="h-80 w-full">
                <ResponsiveContainer>
                  <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={`gradient-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={metricConfig.color} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={metricConfig.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-base-300" />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={formatMonth}
                    className="text-xs"
                    tick={{ fill: 'var(--bc)' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => 
                      selectedMetric === 'count' ? value : 
                      value >= 10000 ? `${(value/10000).toFixed(0)}万` : value
                    }
                    className="text-xs"
                    tick={{ fill: 'var(--bc)' }}
                  />
                  <Tooltip 
                    content={<CustomTooltip metric={selectedMetric} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke={metricConfig.color}
                    strokeWidth={2}
                    fill={`url(#gradient-${selectedMetric})`}
                  />
                </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center max-w-sm mx-auto">
                {/* 专业的空状态设计 */}
                <div className="w-20 h-20 mx-auto mb-6 bg-base-200 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-base-content">暂无趋势数据</h3>
                <p className="text-base-content/60 mb-6 text-sm leading-relaxed">
                  需要至少2个月的发票数据才能生成趋势分析。<br/>
                  开始上传发票，解锁数据洞察功能吧！
                </p>
                <div className="flex gap-3 justify-center">
                  <button className="btn btn-primary btn-sm" 
                          onClick={() => window.location.href = '/invoices/upload'}>
                    📎 上传发票
                  </button>
                  <button className="btn btn-outline btn-sm">
                    📊 查看演示
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        
        {/* 数据点详情 */}
        {chartData.length > 0 && (
          <div className="mt-4">
            <details className="collapse collapse-arrow bg-base-200">
              <summary className="collapse-title text-sm font-medium">
                查看详细数据点
              </summary>
              <div className="collapse-content">
                <div className="overflow-x-auto">
                  <table className="table table-xs">
                    <thead>
                      <tr>
                        <th>月份</th>
                        <th>{metricConfig.title}</th>
                        {selectedMetric !== 'count' && <th>数量</th>}
                        {selectedMetric !== 'average' && <th>平均值</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 6).map((item) => (
                        <tr key={item.month_str}>
                          <td>{formatMonth(item.month_str)}</td>
                          <td>
                            {selectedMetric === 'amount' && formatCurrency(item.total_amount)}
                            {selectedMetric === 'count' && `${item.invoice_count}张`}
                            {selectedMetric === 'average' && formatCurrency(item.avg_amount)}
                          </td>
                          {selectedMetric !== 'count' && <td>{item.invoice_count}张</td>}
                          {selectedMetric !== 'average' && <td>{formatCurrency(item.avg_amount)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}

export default TrendAnalysisChart