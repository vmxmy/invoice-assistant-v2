/**
 * 概览统计网格
 * 复用DashboardStatsSection组件，展示关键统计指标
 */
import React from 'react'
import { DashboardStatsSection, type DashboardStats } from '../dashboard/DashboardStatsSection'
import type { OverviewStats } from '../../hooks/useStatisticsData'

interface OverviewStatsGridProps {
  stats?: OverviewStats | null
  loading?: boolean
  error?: any
}

/**
 * 转换统计数据格式以适配DashboardStatsSection
 */
const convertStatsFormat = (stats: OverviewStats | null | undefined): DashboardStats | null => {
  if (!stats) return null

  return {
    total_invoices: stats.total_invoices,
    total_amount: stats.total_amount,
    unreimbursed_count: stats.unreimbursed_count,
    unreimbursed_amount: stats.unreimbursed_amount,
    overdue_unreimbursed_count: 0, // 统计页面暂不显示过期数据
    overdue_unreimbursed_amount: 0,
    due_soon_unreimbursed_count: 0, // 统计页面暂不显示即将过期数据
    monthly_amount: stats.monthly_amount,
    monthly_invoices: stats.monthly_invoices,
    amount_growth_rate: stats.amount_growth_rate,
    reimbursed_count: stats.reimbursed_count,
    reimbursed_amount: stats.reimbursed_amount,
    updated_at: stats.updated_at
  }
}

/**
 * 概览统计网格组件
 */
export const OverviewStatsGrid: React.FC<OverviewStatsGridProps> = ({
  stats,
  loading,
  error
}) => {
  const dashboardStats = convertStatsFormat(stats)

  return (
    <div className="w-full">
      {/* 使用现有的DashboardStatsSection组件 */}
      <DashboardStatsSection
        stats={dashboardStats}
        loading={loading}
        error={error}
        config={{
          // 统计页面模式：不需要跳转，禁用点击
          management: {
            onTodoClick: () => {}, // 空函数，禁用跳转
            onUrgentClick: () => {},
            onMonthlyClick: () => {},
            onProgressClick: () => {}
          }
        }}
        showTitle={false} // 由父组件提供标题
        showLastUpdated={false} // 由页面底部统一显示
        showStatusIndicator={true}
        className="statistics-overview"
      />

      {/* 额外的统计信息卡片 */}
      {stats && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 平均单张金额 */}
          <div className="stat bg-base-100 rounded-lg shadow-sm">
            <div className="stat-title">平均单张金额</div>
            <div className="stat-value text-2xl">
              ¥{stats.avg_amount?.toFixed(2) || '0.00'}
            </div>
            <div className="stat-desc">
              总金额 / 总张数
            </div>
          </div>

          {/* 报销完成率 */}
          <div className="stat bg-base-100 rounded-lg shadow-sm">
            <div className="stat-title">报销完成率</div>
            <div className="stat-value text-2xl">
              {stats.total_invoices > 0 
                ? ((stats.reimbursed_count / stats.total_invoices) * 100).toFixed(1)
                : '0.0'
              }%
            </div>
            <div className="stat-desc">
              已报销 {stats.reimbursed_count} / 总计 {stats.total_invoices}
            </div>
          </div>

          {/* 月度增长率 */}
          <div className="stat bg-base-100 rounded-lg shadow-sm">
            <div className="stat-title">发票增长率</div>
            <div className={`stat-value text-2xl ${
              (stats.invoice_growth_rate || 0) >= 0 ? 'text-success' : 'text-error'
            }`}>
              {stats.invoice_growth_rate >= 0 ? '+' : ''}
              {stats.invoice_growth_rate?.toFixed(1) || '0.0'}%
            </div>
            <div className="stat-desc">
              相比上月数量变化
            </div>
          </div>

          {/* 金额增长率 */}
          <div className="stat bg-base-100 rounded-lg shadow-sm">
            <div className="stat-title">金额增长率</div>
            <div className={`stat-value text-2xl ${
              (stats.amount_growth_rate || 0) >= 0 ? 'text-success' : 'text-error'
            }`}>
              {stats.amount_growth_rate >= 0 ? '+' : ''}
              {stats.amount_growth_rate?.toFixed(1) || '0.0'}%
            </div>
            <div className="stat-desc">
              相比上月金额变化
            </div>
          </div>
        </div>
      )}

      {/* 数据为空时的提示 */}
      {!loading && !error && (!stats || stats.total_invoices === 0) && (
        <div className="text-center py-12">
          <div className="text-base-content/40 text-lg mb-2">📊</div>
          <p className="text-base-content/60">暂无统计数据</p>
          <p className="text-sm text-base-content/40 mt-1">
            请先上传一些发票数据
          </p>
        </div>
      )}
    </div>
  )
}

export default OverviewStatsGrid