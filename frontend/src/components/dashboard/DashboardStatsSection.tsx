/**
 * 通用仪表板指标卡组件
 * 可在首页和发票管理页共用
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  DaisyUIStatsSection,
  type StatItem,
  createTodoStat,
  createUrgentActionsStat,
  createMonthlySpendingStat,
  createReimbursementProgressStat
} from '../invoice/indicators/DaisyUIStatsSection'

// 统计数据接口
export interface DashboardStats {
  unreimbursed_count?: number
  unreimbursed_amount?: number
  overdue_unreimbursed_count?: number
  overdue_unreimbursed_amount?: number
  due_soon_unreimbursed_count?: number
  monthly_amount?: number
  monthly_invoices?: number
  amount_growth_rate?: number
  reimbursed_count?: number
  total_invoices?: number
  reimbursed_amount?: number
  total_amount?: number
  updated_at?: string
}

// 指标卡配置类型
export interface StatsConfig {
  // 首页模式：点击跳转到其他页面
  homepage?: {
    onTodoClick?: () => void
    onUrgentClick?: () => void
    onMonthlyClick?: () => void
    onProgressClick?: () => void
  }
  // 管理页模式：点击设置筛选条件
  management?: {
    onTodoClick?: () => void
    onUrgentClick?: () => void
    onMonthlyClick?: () => void
    onProgressClick?: () => void
  }
}

export interface DashboardStatsSectionProps {
  stats?: DashboardStats | null
  loading?: boolean
  error?: any
  config?: StatsConfig
  showTitle?: boolean
  showLastUpdated?: boolean
  showStatusIndicator?: boolean
  title?: string
  className?: string
}

/**
 * 生成指标卡数据的核心函数
 */
const generateStatsItems = (
  stats: DashboardStats | null | undefined,
  config?: StatsConfig,
  navigate?: (path: string) => void
): StatItem[] => {
  if (!stats) return []
  
  // 默认的首页行为 - 需要传入navigate函数
  const getDefaultHomepageActions = () => {
    if (!navigate) return {}
    return {
      onTodoClick: () => navigate('/invoices?status=unreimbursed'),
      onUrgentClick: () => navigate('/invoices?status=unreimbursed&urgent=true'),
      onMonthlyClick: () => navigate('/invoices'),
      onProgressClick: () => navigate('/invoices?status=reimbursed')
    }
  }
  
  // 获取实际的点击处理函数
  const getClickHandlers = () => {
    if (config?.homepage) {
      const defaultActions = getDefaultHomepageActions()
      return {
        onTodoClick: config.homepage.onTodoClick || defaultActions.onTodoClick,
        onUrgentClick: config.homepage.onUrgentClick || defaultActions.onUrgentClick,
        onMonthlyClick: config.homepage.onMonthlyClick || defaultActions.onMonthlyClick,
        onProgressClick: config.homepage.onProgressClick || defaultActions.onProgressClick
      }
    }
    if (config?.management) {
      return {
        onTodoClick: config.management.onTodoClick,
        onUrgentClick: config.management.onUrgentClick,
        onMonthlyClick: config.management.onMonthlyClick,
        onProgressClick: config.management.onProgressClick
      }
    }
    return getDefaultHomepageActions()
  }
  
  const handlers = getClickHandlers()
  
  return [
    // 1. 待报销 - 用户最关心的"我能拿回多少钱"
    createTodoStat(
      stats.unreimbursed_count || 0,
      stats.unreimbursed_amount || 0,
      handlers.onTodoClick
    ),
    // 2. 紧急处理 - 需要立即采取行动的事项
    createUrgentActionsStat(
      stats.overdue_unreimbursed_count || 0,
      stats.overdue_unreimbursed_amount || 0,
      Math.max(0, (stats.due_soon_unreimbursed_count || 0) - (stats.overdue_unreimbursed_count || 0)),
      handlers.onUrgentClick
    ),
    // 3. 本月支出 - 消费监控和预算管理
    createMonthlySpendingStat(
      stats.monthly_amount || 0,
      stats.monthly_invoices || 0,
      stats.amount_growth_rate,
      handlers.onMonthlyClick
    ),
    // 4. 报销进度 - 系统效率和完成感
    createReimbursementProgressStat(
      stats.reimbursed_count || 0,
      stats.total_invoices || 0,
      stats.reimbursed_amount || 0,
      stats.total_amount || 0,
      handlers.onProgressClick
    )
  ]
}

/**
 * 通用的仪表板指标卡组件
 */
export const DashboardStatsSection: React.FC<DashboardStatsSectionProps> = ({
  stats,
  loading = false,
  error,
  config,
  showTitle = true,
  showLastUpdated = true,
  showStatusIndicator = true,
  title = "数据概览",
  className = ""
}) => {
  const navigate = useNavigate()
  const statsItems = generateStatsItems(stats, config, navigate)
  
  return (
    <section className={`mb-6 sm:mb-8 ${className}`}>
      {/* 标题和状态指示器 */}
      {showTitle && (
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{title}</h2>
          {showStatusIndicator && (
            <div className="flex items-center gap-4">
              {/* 实时状态指示器 */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  error ? 'bg-error animate-pulse' : 
                  loading ? 'bg-warning animate-pulse' : 
                  'bg-success'
                }`}></div>
                <span className="text-xs opacity-70">
                  {error ? '连接异常' : 
                   loading ? '同步中...' : 
                   '实时同步'}
                </span>
              </div>
              {error && (
                <div className="alert alert-error alert-sm">
                  <span className="text-xs">📡 数据加载失败</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* 指标卡片 */}
      <DaisyUIStatsSection 
        stats={statsItems}
        loading={loading}
      />
      
      {/* 最后更新时间 */}
      {showLastUpdated && stats?.updated_at && (
        <div className="mt-4 text-xs text-base-content/50 text-center">
          最后更新: {new Date(stats.updated_at).toLocaleString('zh-CN')}
        </div>
      )}
    </section>
  )
}

/**
 * Hook: 生成指标卡配置的辅助函数
 */
export const useStatsConfig = () => {
  const navigate = useNavigate()
  
  // 首页配置
  const createHomepageConfig = (): StatsConfig => ({
    homepage: {
      onTodoClick: () => navigate('/invoices?status=unreimbursed'),
      onUrgentClick: () => navigate('/invoices?status=unreimbursed&urgent=true'),
      onMonthlyClick: () => navigate('/invoices'),
      onProgressClick: () => navigate('/invoices?status=reimbursed')
    }
  })
  
  // 管理页配置
  const createManagementConfig = (
    setSearchFilters: (filters: any) => void
  ): StatsConfig => ({
    management: {
      onTodoClick: () => setSearchFilters({ status: ['unreimbursed'] }),
      onUrgentClick: () => setSearchFilters({ urgent: true }),
      onMonthlyClick: () => setSearchFilters({}), // 显示所有发票
      onProgressClick: () => setSearchFilters({ status: ['reimbursed'] })
    }
  })
  
  return {
    createHomepageConfig,
    createManagementConfig
  }
}

export default DashboardStatsSection