/**
 * 分类分布图表
 * 基于v_category_statistics和v_hierarchical_category_stats视图
 */
import React, { useState } from 'react'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryStat, HierarchicalStat } from '../../hooks/useStatisticsData'

interface CategoryBreakdownChartProps {
  data?: CategoryStat[]
  hierarchicalData?: HierarchicalStat[]
  loading?: boolean
}

type ViewMode = 'flat' | 'hierarchical'
type SortMode = 'amount' | 'count' | 'percentage'

/**
 * 自定义 Treemap 内容
 */
const CustomizedContent = (props: any) => {
  const { x, y, width, height, name, value, payload, index, depth, colors } = props
  
  // 获取数据项的完整信息
  const itemData = payload || props
  const percentage = itemData?.percentage || 0
  
  // 根据索引选择颜色，如果没有传递 colors 则使用默认颜色
  const defaultColors = [
    'var(--color-error)',      // error - red
    'var(--color-warning)',    // warning - orange/yellow  
    'var(--color-accent)',     // accent - accent color
    'var(--color-success)',    // success - green
    'var(--color-info)',       // info - blue/cyan
    'var(--color-primary)',    // primary - primary
    'var(--color-secondary)',  // secondary - secondary
    'var(--color-neutral)',    // neutral - gray
    '#8b5cf6',                 // purple fallback
    '#ec4899'                  // pink fallback
  ]
  const colorArray = colors || defaultColors
  
  const color = index !== undefined ? colorArray[index % colorArray.length] : colorArray[0]
  
  // 只在矩形足够大时显示文字
  if (width < 80 || height < 50) return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="var(--color-base-100)"
        strokeWidth={2}
      />
    </g>
  )

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="var(--color-base-100)"
        strokeWidth={2}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - 7}
        textAnchor="middle"
        fill="var(--color-base-100)"
        fontSize={Math.min(14, width / 8)}
        fontWeight="500"
        className="pointer-events-none"
      >
        {name || '未知'}
      </text>
      <text
        x={x + width / 2}
        y={y + height / 2 + 10}
        textAnchor="middle"
        fill="var(--color-base-100)"
        fontSize={Math.min(12, width / 10)}
        fillOpacity={0.9}
        className="pointer-events-none"
      >
        {percentage > 0 ? `${percentage.toFixed(1)}%` : ''}
      </text>
    </g>
  )
}

/**
 * 自定义 Tooltip
 */
const CustomTooltip = ({ active, payload, selectedMetric }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]
    const payloadData = data.payload
    
    return (
      <div className="bg-base-100 p-3 rounded-lg shadow-lg border border-base-300">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-base-content/70">
          金额：¥{payloadData.amount?.toLocaleString() || 0}
        </p>
        <p className="text-sm text-base-content/70">
          数量：{payloadData.count} 张
        </p>
        <p className="text-sm text-base-content/70">
          均值：¥{payloadData.count > 0 ? Math.round(payloadData.amount / payloadData.count).toLocaleString() : 0}
        </p>
        <p className="text-sm text-primary font-medium">
          {selectedMetric === 'amount' && `金额占比：${payloadData.percentage.toFixed(1)}%`}
          {selectedMetric === 'count' && `数量占比：${payloadData.percentage.toFixed(1)}%`}
          {selectedMetric === 'average' && `均值占比：${payloadData.percentage.toFixed(1)}%`}
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

  // 颜色配置 - 使用DaisyUI v5正确的CSS变量格式
  const colors = [
    'var(--color-error)',      // error - red
    'var(--color-warning)',    // warning - orange/yellow  
    'var(--color-accent)',     // accent - accent color
    'var(--color-success)',    // success - green
    'var(--color-info)',       // info - blue/cyan
    'var(--color-primary)',    // primary - primary
    'var(--color-secondary)',  // secondary - secondary
    'var(--color-neutral)',    // neutral - gray
    '#8b5cf6',                 // purple fallback
    '#ec4899'                  // pink fallback
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

    // 计算总和用于百分比计算
    const totalAmount = data.reduce((sum, item) => sum + item.total_amount, 0)
    const totalCount = data.reduce((sum, item) => sum + item.invoice_count, 0)

    return sortedData.slice(0, 8).map((item, index) => {
      // 根据选中指标计算百分比
      let percentage = 0
      let value = 0
      
      switch (selectedMetric) {
        case 'amount':
          percentage = totalAmount > 0 ? (item.total_amount / totalAmount) * 100 : 0
          value = item.total_amount
          break
        case 'count':
          percentage = totalCount > 0 ? (item.invoice_count / totalCount) * 100 : 0
          value = item.invoice_count
          break
        case 'average':
          const avgAmount = item.invoice_count > 0 ? item.total_amount / item.invoice_count : 0
          const totalAvg = data.reduce((sum, d) => sum + (d.invoice_count > 0 ? d.total_amount / d.invoice_count : 0), 0)
          percentage = totalAvg > 0 ? (avgAmount / totalAvg) * 100 : 0
          value = avgAmount
          break
      }

      return {
        name: item.category_name || '未知分类',  // Recharts 使用 name 作为默认标签
        label: item.category_name || '未知分类',
        value: value,
        count: item.invoice_count,
        amount: item.total_amount,  // 保留原始金额
        percentage: percentage,
        color: colors[index % colors.length],
        fill: colors[index % colors.length]  // Treemap 需要 fill 属性
      }
    })
  }

  // 处理层次化数据
  const getHierarchicalData = () => {
    if (!hierarchicalData || hierarchicalData.length === 0) return []

    // 计算总和用于百分比计算
    const totalAmount = hierarchicalData.reduce((sum, item) => sum + item.primary_amount, 0)
    const totalCount = hierarchicalData.reduce((sum, item) => sum + item.primary_count, 0)

    return hierarchicalData.slice(0, 6).map((item, index) => {
      // 根据选中指标计算百分比
      let percentage = 0
      let value = 0
      
      switch (selectedMetric) {
        case 'amount':
          percentage = totalAmount > 0 ? (item.primary_amount / totalAmount) * 100 : 0
          value = item.primary_amount
          break
        case 'count':
          percentage = totalCount > 0 ? (item.primary_count / totalCount) * 100 : 0
          value = item.primary_count
          break
        case 'average':
          const avgAmount = item.primary_count > 0 ? item.primary_amount / item.primary_count : 0
          const totalAvg = hierarchicalData.reduce((sum, d) => sum + (d.primary_count > 0 ? d.primary_amount / d.primary_count : 0), 0)
          percentage = totalAvg > 0 ? (avgAmount / totalAvg) * 100 : 0
          value = avgAmount
          break
      }

      return {
        name: item.primary_category,  // Recharts 使用 name 作为默认标签
        label: item.primary_category,
        value: value,
        count: item.primary_count,
        amount: item.primary_amount,  // 保留原始金额
        percentage: percentage,
        color: colors[index % colors.length],
        fill: colors[index % colors.length],  // Treemap 需要 fill 属性
        subcategories: item.subcategories
      }
    })
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
                  {selectedMetric === 'count' && `¥${topStats.first.amount >= 10000 ? `${(topStats.first.amount / 10000).toFixed(1)}万` : topStats.first.amount.toLocaleString()}`}
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
                  {selectedMetric === 'count' && `¥${topStats.second.amount >= 10000 ? `${(topStats.second.amount / 10000).toFixed(1)}万` : topStats.second.amount.toLocaleString()}`}
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
                  {selectedMetric === 'count' && `¥${topStats.third.amount >= 10000 ? `${(topStats.third.amount / 10000).toFixed(1)}万` : topStats.third.amount.toLocaleString()}`}
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
                {/* Recharts Treemap - 矩形树图 */}
                <div className="h-80 w-full">
                  <ResponsiveContainer>
                    <Treemap
                    data={currentData}
                    dataKey="value"
                    aspectRatio={4/3}
                    stroke="var(--color-base-100)"
                    content={(props) => <CustomizedContent {...props} colors={colors} />}
                  >
                    <Tooltip content={<CustomTooltip selectedMetric={selectedMetric} />} />
                  </Treemap>
                  </ResponsiveContainer>
                </div>
                
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