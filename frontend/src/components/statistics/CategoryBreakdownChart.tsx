/**
 * 分类分布图表
 * 基于v_category_statistics和v_hierarchical_category_stats视图
 */
import React, { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { CategoryStat, HierarchicalStat } from '../../hooks/useStatisticsData'

interface CategoryBreakdownChartProps {
  data?: CategoryStat[]
  hierarchicalData?: HierarchicalStat[]
  loading?: boolean
}

type ViewMode = 'flat' | 'hierarchical'
type SortMode = 'amount' | 'count' | 'percentage'

/**
 * 自定义标签组件
 */
const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent, label
}: any) => {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  // 只显示占比大于5%的标签
  if (percent < 0.05) return null

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-xs font-medium"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
    >
      {label}
      <tspan x={x} dy={14}>{`${(percent * 100).toFixed(0)}%`}</tspan>
    </text>
  )
}

/**
 * 自定义 Tooltip
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]
    return (
      <div className="bg-base-100 p-3 rounded-lg shadow-lg border border-base-300">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-base-content/70">
          金额：¥{data.value.toLocaleString()}
        </p>
        <p className="text-sm text-base-content/70">
          数量：{data.payload.count} 张
        </p>
        <p className="text-sm text-primary font-medium">
          占比：{data.payload.percentage.toFixed(1)}%
        </p>
      </div>
    )
  }
  return null
}

/**
 * 分类分布图表组件
 */
export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  data = [],
  hierarchicalData = [],
  loading = false
}) => {
  // 固定使用层次模式
  const viewMode: ViewMode = 'hierarchical'
  const [sortMode, setSortMode] = useState<SortMode>('amount')
  const [selectedMetric, setSelectedMetric] = useState<'amount' | 'count' | 'average'>('amount')

  // 颜色配置 - 使用设计系统 tokens
  const colors = [
    'var(--chart-error)',     // red
    'var(--chart-warning)',   // orange/yellow  
    'var(--chart-accent)',    // accent color
    'var(--chart-success)',   // green
    'var(--chart-info)',      // blue/cyan
    'var(--chart-primary)',   // primary
    'var(--chart-secondary)', // secondary
    'hsl(var(--p) / 0.8)',    // primary variant
    'var(--chart-neutral)',   // gray
    'hsl(var(--a) / 0.6)'     // accent variant
  ]

  // 处理扁平化数据
  const getFlatData = () => {
    if (!data || data.length === 0) return []

    let sortedData = [...data]
    
    switch (sortMode) {
      case 'amount':
        sortedData.sort((a, b) => b.total_amount - a.total_amount)
        break
      case 'count':
        sortedData.sort((a, b) => b.invoice_count - a.invoice_count)
        break
      case 'percentage':
        sortedData.sort((a, b) => b.amount_percentage - a.amount_percentage)
        break
    }

    return sortedData.slice(0, 8).map((item, index) => ({
      name: item.category_name || '未知分类',  // Recharts 使用 name 作为默认标签
      label: item.category_name || '未知分类',
      value: item.total_amount,
      count: item.invoice_count,
      percentage: item.amount_percentage,
      color: colors[index % colors.length]
    }))
  }

  // 处理层次化数据
  const getHierarchicalData = () => {
    if (!hierarchicalData || hierarchicalData.length === 0) return []

    return hierarchicalData.slice(0, 6).map((item, index) => ({
      name: item.primary_category,  // Recharts 使用 name 作为默认标签
      label: item.primary_category,
      value: item.primary_amount,
      count: item.primary_count,
      percentage: item.primary_percentage,
      color: colors[index % colors.length],
      subcategories: item.subcategories
    }))
  }

  const currentData = viewMode === 'flat' ? getFlatData() : getHierarchicalData()
  const totalValue = currentData.reduce((sum, item) => sum + item.value, 0)
  const totalCount = currentData.reduce((sum, item) => sum + item.count, 0)

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="loading loading-spinner loading-lg"></div>
              <p className="text-base-content/60">加载分类数据...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 获取当前指标的配置
  const getMetricConfig = () => {
    switch (selectedMetric) {
      case 'amount':
        return {
          title: '分类金额',
          unit: '元',
          color: 'var(--chart-success)',
          fillColor: 'var(--chart-success-fill)',
          variant: 'success' as const
        }
      case 'count':
        return {
          title: '分类数量',
          unit: '张',
          color: 'var(--chart-info)',
          fillColor: 'var(--chart-info-fill)',
          variant: 'info' as const
        }
      case 'average':
        return {
          title: '分类均值',
          unit: '元',
          color: 'var(--chart-accent)',
          fillColor: 'var(--chart-accent-fill)',
          variant: 'accent' as const
        }
    }
  }

  const metricConfig = getMetricConfig()

  // 获取前三名分类的统计
  const getTopStats = () => {
    if (currentData.length === 0) return null
    
    const top3 = currentData.slice(0, 3)
    return {
      first: top3[0] || null,
      second: top3[1] || null,
      third: top3[2] || null
    }
  }

  const topStats = getTopStats()

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        {/* 图表标题和指标切换 - 与月度趋势保持一致 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold">{metricConfig.title}分布</h3>
            <p className="text-sm text-base-content/60 mt-1">
              按类别层次结构展示
            </p>
          </div>
          
          {/* 指标选择器 - 与月度趋势相同的样式 */}
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

        {/* 前三名分类统计摘要 - 与月度趋势保持一致的格式 */}
        {topStats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {topStats.first && (
              <div className="stat">
                <div className="stat-title">{topStats.first.label}</div>
                <div className="stat-value text-lg">
                  {selectedMetric === 'amount' && `¥${topStats.first.value >= 10000 ? `${(topStats.first.value / 10000).toFixed(1)}万` : topStats.first.value.toLocaleString()}`}
                  {selectedMetric === 'count' && `${topStats.first.count} 张`}
                  {selectedMetric === 'average' && `¥${(topStats.first.value / topStats.first.count).toFixed(0)}`}
                </div>
                <div className="stat-desc">
                  {selectedMetric === 'amount' && `${topStats.first.count} 张发票`}
                  {selectedMetric === 'count' && `¥${topStats.first.value >= 10000 ? `${(topStats.first.value / 10000).toFixed(1)}万` : topStats.first.value.toLocaleString()}`}
                  {selectedMetric === 'average' && `${topStats.first.count} 张发票`}
                  · {topStats.first.percentage.toFixed(1)}%
                </div>
              </div>
            )}
            
            {topStats.second && (
              <div className="stat">
                <div className="stat-title">{topStats.second.label}</div>
                <div className="stat-value text-lg">
                  {selectedMetric === 'amount' && `¥${topStats.second.value >= 10000 ? `${(topStats.second.value / 10000).toFixed(1)}万` : topStats.second.value.toLocaleString()}`}
                  {selectedMetric === 'count' && `${topStats.second.count} 张`}
                  {selectedMetric === 'average' && `¥${(topStats.second.value / topStats.second.count).toFixed(0)}`}
                </div>
                <div className="stat-desc">
                  {selectedMetric === 'amount' && `${topStats.second.count} 张发票`}
                  {selectedMetric === 'count' && `¥${topStats.second.value >= 10000 ? `${(topStats.second.value / 10000).toFixed(1)}万` : topStats.second.value.toLocaleString()}`}
                  {selectedMetric === 'average' && `${topStats.second.count} 张发票`}
                  · {topStats.second.percentage.toFixed(1)}%
                </div>
              </div>
            )}
            
            {topStats.third && (
              <div className="stat">
                <div className="stat-title">{topStats.third.label}</div>
                <div className="stat-value text-lg">
                  {selectedMetric === 'amount' && `¥${topStats.third.value >= 10000 ? `${(topStats.third.value / 10000).toFixed(1)}万` : topStats.third.value.toLocaleString()}`}
                  {selectedMetric === 'count' && `${topStats.third.count} 张`}
                  {selectedMetric === 'average' && `¥${(topStats.third.value / topStats.third.count).toFixed(0)}`}
                </div>
                <div className="stat-desc">
                  {selectedMetric === 'amount' && `${topStats.third.count} 张发票`}
                  {selectedMetric === 'count' && `¥${topStats.third.value >= 10000 ? `${(topStats.third.value / 10000).toFixed(1)}万` : topStats.third.value.toLocaleString()}`}
                  {selectedMetric === 'average' && `${topStats.third.count} 张发票`}
                  · {topStats.third.percentage.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        )}

        {currentData.length > 0 ? (
          <div className="space-y-6">
            {/* 主图表区域 - 与月度趋势保持一致 */}
            <div className="w-full overflow-x-auto overflow-y-hidden">
              <div className="min-w-[400px] py-4">
                {/* Recharts 饼图 - 居中显示 */}
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={currentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {currentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* 子分类展示 */}
                {currentData.some((item: any) => item.subcategories?.length > 0) && (
                  <div className="mt-6 p-4 bg-base-200 rounded-lg">
                    <h5 className="text-sm font-medium text-base-content/70 mb-3">子分类分布</h5>
                    <div className="space-y-3">
                      {currentData.slice(0, 3).map((item: any, idx) => 
                        item.subcategories?.length > 0 && (
                          <div key={idx}>
                            <div className="font-medium text-sm mb-2">{item.label}</div>
                            <div className="flex flex-wrap gap-2">
                              {item.subcategories.slice(0, 5).map((sub: any, subIdx: number) => (
                                <span key={subIdx} className="badge badge-outline">
                                  {sub.name} 
                                  <span className="ml-1 font-medium">{sub.percentage.toFixed(0)}%</span>
                                </span>
                              ))}
                              {item.subcategories.length > 5 && (
                                <span className="badge badge-ghost">
                                  +{item.subcategories.length - 5} 更多
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="text-base-content/40 text-4xl mb-4">📊</div>
              <p className="text-base-content/60">暂无分类数据</p>
              <p className="text-sm text-base-content/40 mt-1">
                请先为发票添加分类信息
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CategoryBreakdownChart