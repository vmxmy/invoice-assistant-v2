/**
 * 独立数据统计页面
 * 提供详细的发票数据分析和可视化展示
 */
import React, { useState } from 'react'
import CompactLayout from '../components/layout/CompactLayout'
import { FilterControlPanel } from '../components/statistics/FilterControlPanel'
import { OverviewStatsGrid } from '../components/statistics/OverviewStatsGrid'
import { TrendAnalysisChart } from '../components/statistics/TrendAnalysisChart'
import { CategoryBreakdownChart } from '../components/statistics/CategoryBreakdownChart'
import { DetailedDataTable } from '../components/statistics/DetailedDataTable'
import { useStatisticsData } from '../hooks/useStatisticsData'

// 筛选器状态接口
export interface StatisticsFilters {
  dateRange: {
    startDate?: string
    endDate?: string
    preset?: 'last3months' | 'last6months' | 'lastyear' | 'all'
  }
  categories: string[]
  invoiceTypes: string[]
  status: string[]
  amountRange: {
    min?: number
    max?: number
  }
}

/**
 * 统计页面主组件
 */
export const StatisticsPage: React.FC = () => {
  // 筛选器状态
  const [filters, setFilters] = useState<StatisticsFilters>({
    dateRange: { preset: 'last6months' },
    categories: [],
    invoiceTypes: [],
    status: [],
    amountRange: {}
  })

  // 获取统计数据
  const {
    overviewStats,
    monthlyTrends,
    categoryStats,
    hierarchicalStats,
    detailedData,
    loading,
    error
  } = useStatisticsData(filters)

  // 处理筛选器变化
  const handleFiltersChange = (newFilters: StatisticsFilters) => {
    setFilters(newFilters)
  }

  // 重置筛选器
  const handleResetFilters = () => {
    setFilters({
      dateRange: { preset: 'last6months' },
      categories: [],
      invoiceTypes: [],
      status: [],
      amountRange: {}
    })
  }

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

        {/* 筛选器控制面板 */}
        <div className="mb-6">
          <FilterControlPanel
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleResetFilters}
            loading={loading}
          />
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
          {/* 概览统计卡片 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">数据概览</h2>
            <OverviewStatsGrid
              stats={overviewStats}
              loading={loading}
              error={error}
            />
          </section>

          {/* 图表分析区域 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* 月度趋势图 */}
            <section>
              <h2 className="text-xl font-semibold mb-4">月度趋势</h2>
              <TrendAnalysisChart
                data={monthlyTrends}
                loading={loading}
                filters={filters}
              />
            </section>

            {/* 分类分布图 */}
            <section>
              <h2 className="text-xl font-semibold mb-4">分类分布</h2>
              <CategoryBreakdownChart
                data={categoryStats}
                hierarchicalData={hierarchicalStats}
                loading={loading}
              />
            </section>
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
              数据更新时间: {overviewStats?.updated_at ? 
                new Date(overviewStats.updated_at).toLocaleString('zh-CN') : 
                '暂无数据'
              }
            </p>
            <p className="mt-2 sm:mt-0">
              统计周期: {filters.dateRange.preset === 'last3months' ? '最近3个月' :
                       filters.dateRange.preset === 'last6months' ? '最近6个月' :
                       filters.dateRange.preset === 'lastyear' ? '最近1年' : '全部数据'}
            </p>
          </div>
        </div>
      </div>
    </CompactLayout>
  )
}

export default StatisticsPage