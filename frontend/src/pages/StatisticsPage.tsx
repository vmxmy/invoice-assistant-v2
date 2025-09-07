/**
 * 数据统计页面
 * 提供完整的发票数据分析和可视化展示
 */
import React, { useState } from 'react'
import CompactLayout from '../components/layout/CompactLayout'
import { DetailedDataTable } from '../components/statistics/DetailedDataTable'
import { useStatisticsData } from '../hooks/useStatisticsData'

// ECharts 图表组件
import OverviewDashboard from '../components/charts/OverviewDashboard'
import TrendAnalysisChart from '../components/charts/TrendAnalysisChart'
import CategoryAnalysisChart from '../components/charts/CategoryAnalysisChart'
import InvoiceTypeChart from '../components/charts/InvoiceTypeChart'
import RegionalAnalysisChart from '../components/charts/RegionalAnalysisChart'
import ReimbursementChart from '../components/charts/ReimbursementChart'

// 筛选器接口
export interface StatisticsFilters {
  dateRange: {
    preset: 'currentyear' | 'lastyear' | 'all'
    startDate?: string
    endDate?: string
  }
  categories: string[]
}

/**
 * 统计页面主组件
 */
export const StatisticsPage: React.FC = () => {
  // 筛选器状态
  const [filters, setFilters] = useState<StatisticsFilters>({
    dateRange: { preset: 'currentyear' },
    categories: []
  })

  // 当前活跃的标签页
  const [activeTab, setActiveTab] = useState<string>('overview')

  // 获取统计数据
  const {
    overviewStats,
    monthlyTrends,
    categoryStats,
    hierarchicalStats,
    invoiceTypeStats,
    regionalStats,
    reimbursementStats,
    detailedData,
    loading,
    error
  } = useStatisticsData(filters)

  // 标签页配置
  const tabs = [
    { id: 'overview', label: '概览仪表盘', icon: '📊' },
    { id: 'trends', label: '趋势分析', icon: '📈' },
    { id: 'categories', label: '分类分析', icon: '🏷️' },
    { id: 'types', label: '类型分析', icon: '📄' },
    { id: 'regions', label: '地区分析', icon: '🗺️' },
    { id: 'reimbursement', label: '报销管理', icon: '💰' },
    { id: 'details', label: '详细数据', icon: '📋' }
  ]

  // 处理筛选器变化
  const handleFilterChange = (newFilters: Partial<StatisticsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  // 转换数据格式以适配图表组件
  const getOverviewData = () => {
    if (!overviewStats) return null
    return {
      totalInvoices: overviewStats.total_invoices,
      totalAmount: overviewStats.total_amount,
      avgAmount: overviewStats.avg_amount,
      monthlyInvoices: overviewStats.monthly_invoices,
      reimbursedCount: overviewStats.reimbursed_count,
      unreimbursedCount: overviewStats.unreimbursed_count,
      reimbursementRate: overviewStats.reimbursement_rate,
      monthlyGrowthRate: overviewStats.amount_growth_rate || 0
    }
  }

  const getMonthlyTrendData = () => {
    return monthlyTrends.map(trend => ({
      month: trend.month_str,
      invoiceCount: trend.invoice_count,
      totalAmount: trend.total_amount,
      countGrowthRate: trend.count_growth_rate,
      amountGrowthRate: trend.amount_growth_rate
    }))
  }

  const getCategoryData = () => {
    return categoryStats.map(stat => ({
      name: stat.category_name,
      value: stat.total_amount,
      count: stat.invoice_count,
      percentage: stat.amount_percentage,
      children: [] // 简化版，不处理子分类
    }))
  }

  const getInvoiceTypeData = () => {
    return invoiceTypeStats.map(stat => ({
      type: stat.invoice_type,
      count: stat.count,
      amount: stat.total_amount,
      avgAmount: stat.avg_amount,
      percentage: stat.count_percentage
    }))
  }

  const getRegionalData = () => {
    return regionalStats.map(stat => ({
      name: stat.region_name,
      value: stat.total_amount,
      count: stat.invoice_count,
      code: stat.region_code,
      province: stat.province_name
    }))
  }

  return (
    <CompactLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* 页面标题和筛选器 */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-base-content">
                数据统计分析
              </h1>
              <p className="text-base-content/60 mt-2">
                全面分析您的发票数据，洞察消费模式和趋势
              </p>
            </div>
            
            {/* 筛选器控件 */}
            <div className="flex flex-wrap gap-2">
              <select
                className="select select-bordered select-sm"
                value={filters.dateRange.preset}
                onChange={(e) => handleFilterChange({
                  dateRange: { preset: e.target.value as any }
                })}
              >
                <option value="currentyear">本年度</option>
                <option value="lastyear">去年度</option>
                <option value="all">全部时间</option>
              </select>
              
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => window.location.reload()}
              >
                刷新数据
              </button>
            </div>
          </div>
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

        {/* 标签页导航 */}
        <div className="tabs tabs-boxed mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab flex-shrink-0 ${activeTab === tab.id ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="space-y-6">
          {/* 概览仪表盘 */}
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">概览仪表盘</h2>
              {getOverviewData() ? (
                <OverviewDashboard 
                  data={getOverviewData()!}
                  loading={loading}
                />
              ) : (
                <div className="card bg-base-100 shadow-md">
                  <div className="card-body text-center py-12">
                    <div className="loading loading-spinner loading-lg"></div>
                    <p className="mt-4">正在加载概览数据...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 趋势分析 */}
          {activeTab === 'trends' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">趋势分析</h2>
              <TrendAnalysisChart 
                data={getMonthlyTrendData()}
                loading={loading}
              />
            </div>
          )}

          {/* 分类分析 */}
          {activeTab === 'categories' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">分类分析</h2>
              <CategoryAnalysisChart 
                data={getCategoryData()}
                loading={loading}
              />
            </div>
          )}

          {/* 类型分析 */}
          {activeTab === 'types' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">发票类型分析</h2>
              <InvoiceTypeChart 
                data={getInvoiceTypeData()}
                loading={loading}
              />
            </div>
          )}

          {/* 地区分析 */}
          {activeTab === 'regions' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">地区分析</h2>
              <RegionalAnalysisChart 
                data={getRegionalData()}
                loading={loading}
              />
            </div>
          )}

          {/* 报销管理 */}
          {activeTab === 'reimbursement' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">报销管理</h2>
              {reimbursementStats ? (
                <ReimbursementChart 
                  data={{
                    totalCount: reimbursementStats.total_count,
                    reimbursedCount: reimbursementStats.reimbursed_count,
                    unreimbursedCount: reimbursementStats.unreimbursed_count,
                    overdueCount: reimbursementStats.overdue_count,
                    dueSoonCount: reimbursementStats.due_soon_count,
                    reimbursementRate: reimbursementStats.reimbursement_rate,
                    avgProcessingDays: reimbursementStats.avg_processing_days,
                    monthlyProgress: reimbursementStats.monthly_progress
                  }}
                  loading={loading}
                />
              ) : (
                <div className="card bg-base-100 shadow-md">
                  <div className="card-body text-center py-12">
                    <div className="loading loading-spinner loading-lg"></div>
                    <p className="mt-4">正在加载报销数据...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 详细数据表格 */}
          {activeTab === 'details' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">详细数据</h2>
              <DetailedDataTable
                data={detailedData}
                loading={loading}
                filters={filters}
              />
            </div>
          )}
        </div>

        {/* 页面底部信息 */}
        <div className="mt-12 pt-6 border-t border-base-300">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-base-content/60">
            <p>
              数据更新时间: {new Date().toLocaleString('zh-CN')}
            </p>
            <p className="mt-2 sm:mt-0">
              统计周期: {
                filters.dateRange.preset === 'currentyear' ? `${new Date().getFullYear()}年度` :
                filters.dateRange.preset === 'lastyear' ? `${new Date().getFullYear() - 1}年度` :
                '全部时间'
              }
            </p>
          </div>
        </div>
      </div>
    </CompactLayout>
  )
}

export default StatisticsPage