/**
 * 仪表板页面
 * 使用原生Tailwind Grid系统和Supabase实时数据
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { useDashboardStats, generateStatCards } from '../hooks/useDashboardStats'
import { useRecentActivities } from '../hooks/useRecentActivities'
import { DashboardStatsSection, useStatsConfig } from '../components/dashboard/DashboardStatsSection'
import { EmptyStateGuide } from '../components/dashboard/EmptyStateGuide'
import CompactLayout from '../components/layout/CompactLayout'
import { 
  CloudArrowUpIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

export function DashboardPage() {
  const { user } = useAuthContext()
  const navigate = useNavigate()
  // 获取实时统计数据
  const { data: stats, loading: statsLoading, error: statsError, refresh } = useDashboardStats() as any
  // 获取最近活动
  const { data: activities, isLoading: activitiesLoading } = useRecentActivities(10)
  // 获取指标卡配置
  const { createHomepageConfig } = useStatsConfig()
  const statsConfig = createHomepageConfig()

  // 检查是否是新用户（没有发票数据）
  const isNewUser = !statsLoading && stats && stats.total_invoices === 0

  // 注意：OnboardingGuard 已经处理了引导流程，这里只处理已完成引导但还没有发票的情况
  // 如果是新用户且没有发票数据，显示空状态引导
  if (isNewUser) {
    return (
      <CompactLayout compactMode="auto">
        <EmptyStateGuide />
      </CompactLayout>
    )
  }

  return (
    <CompactLayout compactMode="auto">
      <div className="page-container min-h-screen">
        <div className="container mx-auto p-6 max-w-7xl">

        {/* 主内容区 - 使用原生Tailwind Grid */}
        
        {/* 欢迎区域 - 精简版 */}
        <section className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">欢迎回来！</h1>
            <p className="text-sm text-base-content/60">{user?.email}</p>
          </div>
          <p className="text-sm text-base-content/50">开始管理您的发票数据</p>
        </section>

        {/* 统计数据网格 - 使用通用组件 */}
        <DashboardStatsSection
          stats={stats}
          loading={statsLoading}
          error={statsError}
          config={statsConfig}
          title="数据概览"
          className="mb-12"
        />

        {/* 功能模块网格 - 移动优先：1列 → 中屏：2列 → 大屏：3列 → 超大屏：4列 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">功能模块</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            
            {/* 上传发票卡片 - 特殊样式突出显示 */}
            <div className="card bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 mr-4 text-primary">
                    <CloudArrowUpIcon />
                  </div>
                  <h3 className="card-title text-primary">上传发票</h3>
                </div>
                <p className="text-sm text-base-content/70 mb-6 flex-1">
                  拖拽或点击上传PDF发票文件，自动提取关键信息
                </p>
                <div className="card-actions">
                  <button 
                    className="btn btn-primary btn-block"
                    onClick={() => navigate('/invoices/upload')}
                  >
                    开始上传
                  </button>
                </div>
              </div>
            </div>

            {/* 其他功能卡片 - 使用DaisyUI card组件 */}
            <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 mr-4 text-base-content">
                    <DocumentTextIcon />
                  </div>
                  <h3 className="card-title">发票管理</h3>
                </div>
                <p className="text-sm text-base-content/70 mb-6 flex-1">
                  查看、搜索和管理所有已上传的发票
                </p>
                <div className="card-actions">
                  <button 
                    className="btn btn-outline btn-block"
                    onClick={() => navigate('/invoices')}
                  >
                    管理发票
                  </button>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 mr-4 text-accent">
                    <ChartBarIcon />
                  </div>
                  <h3 className="card-title">数据统计</h3>
                </div>
                <p className="text-sm text-base-content/70 mb-6 flex-1">
                  查看发票统计和财务分析报表
                </p>
                <div className="card-actions">
                  <button 
                    className="btn btn-accent btn-block"
                    onClick={() => navigate('/statistics')}
                  >
                    查看统计
                  </button>
                </div>
              </div>
            </div>

            {/* 智能助手卡片 - 特殊设计突出AI功能 */}
            <div className="card bg-gradient-to-br from-secondary/10 to-accent/10 border border-secondary/30 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 mr-4 text-secondary">
                    <CpuChipIcon />
                  </div>
                  <div>
                    <h3 className="card-title text-secondary">智能助手</h3>
                    <div className="badge badge-accent badge-xs mt-1">AI 驱动</div>
                  </div>
                </div>
                <p className="text-sm text-base-content/70 mb-6 flex-1">
                  AI助手帮您智能分析发票数据，提供洞察建议和自动化管理
                </p>
                
                {/* 功能预览 */}
                <div className="flex flex-wrap gap-1 mb-4">
                  <div className="badge badge-outline badge-xs">智能问答</div>
                  <div className="badge badge-outline badge-xs">数据分析</div>
                  <div className="badge badge-outline badge-xs">趋势预测</div>
                </div>
                
                <div className="card-actions">
                  <button 
                    className="btn btn-secondary btn-block group"
                    onClick={() => {
                      // 暂时显示即将上线的提示
                      const modal = document.createElement('div');
                      modal.className = 'modal modal-open';
                      modal.innerHTML = `
                        <div class="modal-box">
                          <h3 class="font-bold text-lg">🤖 智能助手</h3>
                          <p class="py-4">AI智能助手功能正在开发中，即将为您提供：</p>
                          <ul class="list-disc list-inside space-y-2 text-sm">
                            <li>智能发票数据分析和洞察</li>
                            <li>自然语言查询发票信息</li>
                            <li>财务趋势预测和建议</li>
                            <li>自动分类和标签建议</li>
                          </ul>
                          <div class="modal-action">
                            <button class="btn" onclick="this.closest('.modal').remove()">了解更多</button>
                          </div>
                        </div>
                        <div class="modal-backdrop" onclick="this.remove()"></div>
                      `;
                      document.body.appendChild(modal);
                    }}
                  >
                    <span className="group-hover:hidden">即将上线</span>
                    <span className="hidden group-hover:block">🚀 敬请期待</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 最近活动 - 单列布局 */}
        <section>
          <h2 className="text-2xl font-bold mb-6">最近活动</h2>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              {activitiesLoading ? (
                <div className="flex justify-center py-12">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              ) : activities && activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg hover:bg-base-200 transition-colors">
                      <div className={`text-2xl ${activity.color}`}>
                        {activity.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{activity.title}</h4>
                        <p className="text-sm text-base-content/70">{activity.description}</p>
                        <p className="text-xs text-base-content/50 mt-1">
                          {new Date(activity.timestamp).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-8xl mb-6 opacity-50">📝</div>
                  <h3 className="text-2xl font-bold mb-4">暂无活动记录</h3>
                  <p className="text-base-content/60 mb-6 max-w-md mx-auto">
                    上传您的第一张发票开始使用吧！系统会自动记录您的操作历史。
                  </p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/invoices/upload')}
                  >
                    立即上传发票
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 演示：不规则布局（跨列） */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6">最新公告</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* 主要公告 - 跨2列 */}
            <div className="md:col-span-2 card bg-primary text-primary-content">
              <div className="card-body">
                <h3 className="card-title">📢 系统升级通知</h3>
                <p>我们已成功升级到React + Supabase架构，提供更稳定的服务体验！</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-outline btn-sm">了解更多</button>
                </div>
              </div>
            </div>
            
            {/* 次要公告 */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-sm">功能更新</h3>
                <p className="text-xs">新增批量上传功能</p>
              </div>
            </div>
            
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-sm">维护通知</h3>
                <p className="text-xs">系统将在深夜进行维护</p>
              </div>
            </div>
          </div>
        </section>

        </div>
      </div>
    </CompactLayout>
  )
}