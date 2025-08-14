/**
 * 分类分布图表
 * 基于v_category_statistics和v_hierarchical_category_stats视图
 */
import React, { useState } from 'react'
import type { CategoryStat, HierarchicalStat } from '../../hooks/useStatisticsData'

interface CategoryBreakdownChartProps {
  data?: CategoryStat[]
  hierarchicalData?: HierarchicalStat[]
  loading?: boolean
}

type ViewMode = 'flat' | 'hierarchical'
type SortMode = 'amount' | 'count' | 'percentage'

/**
 * 简单的饼图组件（使用SVG）
 */
const SimplePieChart: React.FC<{
  data: Array<{ label: string; value: number; color: string; percentage: number }>
  size?: number
}> = ({ data, size = 200 }) => {
  const radius = size / 2 - 10
  const centerX = size / 2
  const centerY = size / 2
  
  let cumulativePercentage = 0
  
  const slices = data.map((item) => {
    const startAngle = cumulativePercentage * 2 * Math.PI
    const endAngle = (cumulativePercentage + item.percentage / 100) * 2 * Math.PI
    cumulativePercentage += item.percentage / 100
    
    const x1 = centerX + radius * Math.cos(startAngle)
    const y1 = centerY + radius * Math.sin(startAngle)
    const x2 = centerX + radius * Math.cos(endAngle)
    const y2 = centerY + radius * Math.sin(endAngle)
    
    const largeArc = item.percentage > 50 ? 1 : 0
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ')
    
    return { ...item, path: pathData }
  })
  
  return (
    <svg width={size} height={size} className="mx-auto">
      {slices.map((slice, index) => (
        <g key={index}>
          <path
            d={slice.path}
            fill={slice.color}
            stroke="white"
            strokeWidth="2"
          >
            <title>{`${slice.label}: ${slice.percentage.toFixed(1)}%`}</title>
          </path>
        </g>
      ))}
    </svg>
  )
}

/**
 * 分类分布图表组件
 */
export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  data = [],
  hierarchicalData = [],
  loading = false
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('flat')
  const [sortMode, setSortMode] = useState<SortMode>('amount')

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

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        {/* 图表标题和控制 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold">支出分类分布</h3>
            <p className="text-sm text-base-content/60 mt-1">
              {viewMode === 'flat' ? '扁平分类视图' : '层次分类视图'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {/* 视图切换 */}
            <div className="tabs tabs-boxed">
              <button
                className={`tab tab-sm ${viewMode === 'flat' ? 'tab-active' : ''}`}
                onClick={() => setViewMode('flat')}
              >
                扁平
              </button>
              <button
                className={`tab tab-sm ${viewMode === 'hierarchical' ? 'tab-active' : ''}`}
                onClick={() => setViewMode('hierarchical')}
              >
                层次
              </button>
            </div>
            
            {/* 排序方式 */}
            <select
              className="select select-bordered select-sm"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
            >
              <option value="amount">按金额排序</option>
              <option value="count">按数量排序</option>
              <option value="percentage">按占比排序</option>
            </select>
          </div>
        </div>

        {currentData.length > 0 ? (
          <div className="space-y-6">
            {/* 主要分类统计指标卡 - 使用 DaisyUI Stats 组件 */}
            <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
              {currentData.slice(0, 4).map((item, index) => (
                <div key={index} className="stat">
                  <div className="stat-figure text-primary">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                  </div>
                  <div className="stat-title">{item.label}</div>
                  <div className="stat-value text-2xl">
                    {item.value >= 10000 
                      ? `¥${(item.value / 10000).toFixed(1)}万`
                      : `¥${item.value.toLocaleString()}`
                    }
                  </div>
                  <div className="stat-desc">
                    {item.count} 张发票 · {item.percentage.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>

            {/* 饼图和详细分类 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 饼图 */}
              <div className="flex flex-col items-center">
                <SimplePieChart data={currentData} size={200} />
                
                {/* 图例 */}
                <div className="mt-4 space-y-2 w-full max-w-xs">
                  {currentData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span className="font-medium text-base-content/70">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 次要分类列表 */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-base-content/70 mb-3">其他分类明细</h4>
                {currentData.slice(4).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <div>
                        <div className="font-medium text-sm">{item.label}</div>
                        <div className="text-xs text-base-content/60">
                          {item.count} 张发票
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">
                        ¥{item.value >= 10000 
                          ? `${(item.value / 10000).toFixed(1)}万`
                          : item.value.toLocaleString()
                        }
                      </div>
                      <div className="text-xs text-base-content/60">
                        {item.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* 层次视图的子分类展示 */}
                {viewMode === 'hierarchical' && currentData.slice(0, 4).some((item: any) => item.subcategories?.length > 0) && (
                  <div className="mt-4 p-3 bg-base-200 rounded-lg">
                    <h5 className="text-xs font-medium text-base-content/70 mb-2">主要子分类分布</h5>
                    <div className="space-y-2">
                      {currentData.slice(0, 4).map((item: any, idx) => 
                        item.subcategories?.length > 0 && (
                          <div key={idx} className="text-xs">
                            <span className="font-medium">{item.label}:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.subcategories.slice(0, 3).map((sub: any, subIdx: number) => (
                                <span key={subIdx} className="badge badge-outline badge-xs">
                                  {sub.name} ({sub.percentage.toFixed(0)}%)
                                </span>
                              ))}
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