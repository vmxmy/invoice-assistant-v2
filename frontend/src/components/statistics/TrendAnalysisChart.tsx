/**
 * 月度趋势分析图表
 * 基于v_invoice_monthly_analysis视图数据，使用SimpleLineChart组件
 */
import React, { useState } from 'react'
import { SimpleLineChart, formatMonth, formatCurrency } from '../ui/SimpleLineChart'
import type { MonthlyTrend } from '../../hooks/useStatisticsData'
import type { StatisticsFilters } from '../../pages/StatisticsPage'

interface TrendAnalysisChartProps {
  data?: MonthlyTrend[]
  loading?: boolean
  filters: StatisticsFilters
}

type TrendMetric = 'amount' | 'count' | 'average'

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
          color: 'rgb(34, 197, 94)', // green-500
          fillColor: 'rgba(34, 197, 94, 0.1)'
        }
      case 'count':
        return {
          title: '月度发票数量',
          unit: '张',
          color: 'rgb(59, 130, 246)', // blue-500
          fillColor: 'rgba(59, 130, 246, 0.1)'
        }
      case 'average':
        return {
          title: '月度平均金额',
          unit: '元',
          color: 'rgb(168, 85, 247)', // purple-500
          fillColor: 'rgba(168, 85, 247, 0.1)'
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

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="loading loading-spinner loading-lg"></div>
              <p className="text-base-content/60">加载趋势数据...</p>
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
              {filters.dateRange.preset === 'last3months' ? '最近3个月' :
               filters.dateRange.preset === 'last6months' ? '最近6个月' :
               filters.dateRange.preset === 'lastyear' ? '最近12个月' : '历史数据'}
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
        <div className="h-80 w-full">
          {chartData.length > 0 ? (
            <div className="h-full flex flex-col">
              {/* 图表 */}
              <div className="flex-1 flex items-center justify-center">
                <SimpleLineChart
                  data={chartData}
                  width={Math.min(800, window.innerWidth - 100)}
                  height={200}
                  strokeColor={metricConfig.color}
                  fillColor={metricConfig.fillColor}
                  showDots={true}
                />
              </div>
              
              {/* X轴标签 */}
              <div className="flex justify-between items-center mt-4 px-4">
                {chartData.map((point, index) => (
                  <div key={index} className="text-xs text-base-content/60 text-center">
                    {formatMonth(point.month)}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-base-content/40 text-4xl mb-4">📈</div>
                <p className="text-base-content/60">暂无趋势数据</p>
                <p className="text-sm text-base-content/40 mt-1">
                  需要至少2个月的数据才能显示趋势
                </p>
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