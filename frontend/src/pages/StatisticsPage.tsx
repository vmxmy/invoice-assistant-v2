/**
 * 独立数据统计页面
 * 提供详细的发票数据分析和可视化展示
 */
import React from 'react'
import CompactLayout from '../components/layout/CompactLayout'
import { DetailedDataTable } from '../components/statistics/DetailedDataTable'
import { useStatisticsData } from '../hooks/useStatisticsData'

// 简化的筛选器接口 - 仅保留必要的时间范围
export interface StatisticsFilters {
  dateRange: {
    preset: 'currentyear' | 'lastyear' | 'all'
  }
  categories: string[]
}

/**
 * 统计页面主组件
 */
export const StatisticsPage: React.FC = () => {
  // 默认显示当年年度数据
  const filters: StatisticsFilters = {
    dateRange: { preset: 'currentyear' },
    categories: []
  }

  // 获取统计数据
  const {
    monthlyTrends,
    categoryStats,
    hierarchicalStats,
    detailedData,
    loading,
    error
  } = useStatisticsData(filters)

  return (
    <CompactLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-base-content">
            数据统计分析
          </h1>
          <p className="text-base-content/60 mt-2">
            全面分析您的发票数据，洞察消费模式和趋势
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6">
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>数据加载失败: {error.message || '请稍后重试'}</span>
            </div>
          </div>
        )}

        {/* 主内容区域 */}
        <div className="space-y-6">

          {/* 图表功能已移除 */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body text-center py-12">
              <h3 className="text-lg font-semibold mb-2">图表功能已移除</h3>
              <p className="text-base-content/60">ECharts相关的图表组件已被移除</p>
            </div>
          </div>

          {/* 详细数据表格 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">详细数据</h2>
            <DetailedDataTable
              data={detailedData}
              loading={loading}
              filters={filters}
            />
          </section>
        </div>

        {/* 页面底部信息 */}
        <div className="mt-12 pt-6 border-t border-base-300">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-base-content/60">
            <p>
              数据更新时间: {new Date().toLocaleString('zh-CN')}
            </p>
            <p className="mt-2 sm:mt-0">
              统计周期: {new Date().getFullYear()}年度
            </p>
          </div>
        </div>
      </div>
    </CompactLayout>
  )
}

export default StatisticsPage