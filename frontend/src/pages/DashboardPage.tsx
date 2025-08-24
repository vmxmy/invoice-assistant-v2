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
import { useDeviceDetection } from '../hooks/useMediaQuery'
import { 
  CloudArrowUpIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

export function DashboardPage() {
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const device = useDeviceDetection()
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
      <div className="page-container min-h-screen mobile-full-container">
        <div className="container mx-auto p-4 sm:p-6 max-w-7xl safe-area-top">

        {/* 主内容区 - 移动端响应式优化 */}
        
        {/* 欢迎区域 - 移动端优化 */}
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-2 sm:space-y-0">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold mb-1">欢迎回来！</h1>
            <p className="text-xs sm:text-sm text-base-content/60 truncate">{user?.email}</p>
          </div>
          {!device.isMobile && (
            <p className="text-sm text-base-content/50 hidden sm:block">开始管理您的发票数据</p>
          )}
        </section>

        {/* 统计数据网格 - 移动端优化 */}
        <DashboardStatsSection
          stats={stats}
          loading={statsLoading}
          error={statsError}
          config={statsConfig}
          title="数据概览"
          className={`mb-8 sm:mb-12 ${device.isMobile ? 'px-0' : ''}`}
        />

        {/* 功能模块网格 - 精确响应式断点控制 */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6">功能模块</h2>
          <div className={`grid gap-4 sm:gap-6`} style={{
            gridTemplateColumns: `repeat(${device.getGridColumns()}, 1fr)`
          }}>
            
            {/* 上传发票卡片 - 移动端触摸优化 */}
            <div className={`card bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-xl hover:shadow-2xl transition-all duration-300 ${
              device.isTouchDevice ? 'gesture-feedback card-mobile' : ''
            }`}>
              <div className="card-body p-4 sm:p-6">
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 mr-3 sm:mr-4 text-primary">
                    <CloudArrowUpIcon />
                  </div>
                  <h3 className="card-title text-primary text-base sm:text-lg">上传发票</h3>
                </div>
                <p className="text-xs sm:text-sm text-base-content/70 mb-4 sm:mb-6 flex-1 leading-relaxed">
                  拖拽或点击上传PDF发票文件，自动提取关键信息
                </p>
                <div className="card-actions">
                  <button 
                    className={`btn btn-primary btn-block ${
                      device.isTouchDevice ? 'min-h-[44px] text-sm' : ''
                    }`}
                    onClick={() => navigate('/invoices/upload')}
                  >
                    开始上传
                  </button>
                </div>
              </div>
            </div>

            {/* 发票管理卡片 - 移动端优化 */}
            <div className={`card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 ${
              device.isTouchDevice ? 'gesture-feedback card-mobile' : ''
            }`}>
              <div className="card-body p-4 sm:p-6">
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 mr-3 sm:mr-4 text-base-content">
                    <DocumentTextIcon />
                  </div>
                  <h3 className="card-title text-base sm:text-lg">发票管理</h3>
                </div>
                <p className="text-xs sm:text-sm text-base-content/70 mb-4 sm:mb-6 flex-1 leading-relaxed">
                  查看、搜索和管理所有已上传的发票
                </p>
                <div className="card-actions">
                  <button 
                    className={`btn btn-outline btn-block ${
                      device.isTouchDevice ? 'min-h-[44px] text-sm' : ''
                    }`}
                    onClick={() => navigate('/invoices')}
                  >
                    管理发票
                  </button>
                </div>
              </div>
            </div>

            {/* 数据统计卡片 - 移动端优化 */}
            <div className={`card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 ${
              device.isTouchDevice ? 'gesture-feedback card-mobile' : ''
            }`}>
              <div className="card-body p-4 sm:p-6">
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 mr-3 sm:mr-4 text-accent">
                    <ChartBarIcon />
                  </div>
                  <h3 className="card-title text-base sm:text-lg">数据统计</h3>
                </div>
                <p className="text-xs sm:text-sm text-base-content/70 mb-4 sm:mb-6 flex-1 leading-relaxed">
                  查看发票统计和财务分析报表
                </p>
                <div className="card-actions">
                  <button 
                    className={`btn btn-accent btn-block ${
                      device.isTouchDevice ? 'min-h-[44px] text-sm' : ''
                    }`}
                    onClick={() => navigate('/statistics')}
                  >
                    查看统计
                  </button>
                </div>
              </div>
            </div>

            {/* 智能助手卡片 - 移动端优化 */}
            <div className={`card bg-gradient-to-br from-secondary/10 to-accent/10 border border-secondary/30 shadow-xl hover:shadow-2xl transition-all duration-300 ${
              device.isTouchDevice ? 'gesture-feedback card-mobile' : ''
            }`}>
              <div className="card-body p-4 sm:p-6">
                <div className="flex items-start mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 mr-3 sm:mr-4 text-secondary flex-shrink-0">
                    <CpuChipIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="card-title text-secondary text-base sm:text-lg">智能助手</h3>
                    <div className="badge badge-accent badge-xs mt-1">AI 驱动</div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-base-content/70 mb-4 sm:mb-6 flex-1 leading-relaxed">
                  AI助手帮您智能分析发票数据，提供洞察建议和自动化管理
                </p>
                
                {/* 功能预览 - 移动端优化 */}
                <div className="flex flex-wrap gap-1 sm:gap-2 mb-4">
                  <div className="badge badge-outline badge-xs text-xs">智能问答</div>
                  <div className="badge badge-outline badge-xs text-xs">数据分析</div>
                  <div className="badge badge-outline badge-xs text-xs">趋势预测</div>
                </div>
                
                <div className="card-actions">
                  <button 
                    className={`btn btn-secondary btn-block group ${
                      device.isTouchDevice ? 'min-h-[44px] text-sm' : ''
                    }`}
                    onClick={() => {
                      // 暂时显示即将上线的提示
                      const modal = document.createElement('div');
                      modal.className = `modal modal-open ${device.isMobile ? 'modal-mobile' : ''}`;
                      modal.innerHTML = `
                        <div class="modal-box ${device.isMobile ? 'modal-box-compact' : ''}">
                          <h3 class="font-bold text-lg">🤖 智能助手</h3>
                          <p class="py-4">AI智能助手功能正在开发中，即将为您提供：</p>
                          <ul class="list-disc list-inside space-y-2 text-sm">
                            <li>智能发票数据分析和洞察</li>
                            <li>自然语言查询发票信息</li>
                            <li>财务趋势预测和建议</li>
                            <li>自动分类和标签建议</li>
                          </ul>
                          <div class="modal-action">
                            <button class="btn ${device.isTouchDevice ? 'min-h-[44px]' : ''}" onclick="this.closest('.modal').remove()">了解更多</button>
                          </div>
                        </div>
                        <div class="modal-backdrop" onclick="this.closest('.modal').remove()"></div>
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

        {/* 最近活动 - 移动端响应式优化 */}
        <section>
          <h2 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6">最近活动</h2>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              {activitiesLoading ? (
                <div className="flex justify-center py-8 sm:py-12">
                  <span className="loading loading-spinner loading-md sm:loading-lg"></span>
                </div>
              ) : activities && activities.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg hover:bg-base-200 transition-colors ${
                      device.isTouchDevice ? 'gesture-feedback min-h-[44px]' : ''
                    }`}>
                      <div className={`text-xl sm:text-2xl ${activity.color} flex-shrink-0`}>
                        {activity.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base truncate">{activity.title}</h4>
                        <p className="text-xs sm:text-sm text-base-content/70 line-clamp-2">{activity.description}</p>
                        <p className="text-xs text-base-content/50 mt-1">
                          {new Date(activity.timestamp).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 px-4">
                  <div className="text-6xl sm:text-8xl mb-4 sm:mb-6 opacity-50">📝</div>
                  <h3 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-4">暂无活动记录</h3>
                  <p className="text-sm sm:text-base text-base-content/60 mb-4 sm:mb-6 max-w-md mx-auto leading-relaxed">
                    上传您的第一张发票开始使用吧！系统会自动记录您的操作历史。
                  </p>
                  <button 
                    className={`btn btn-primary ${
                      device.isTouchDevice ? 'min-h-[44px]' : ''
                    }`}
                    onClick={() => navigate('/invoices/upload')}
                  >
                    立即上传发票
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 公告区域 - 移动端响应式优化 */}
        <section className="mt-8 sm:mt-12">
          <h2 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6">最新公告</h2>
          <div className={`grid gap-4 sm:gap-6 ${
            device.isMobile 
              ? 'grid-cols-1' 
              : 'grid-cols-1 md:grid-cols-4'
          }`}>
            {/* 主要公告 - 移动端全宽，桌面端跨2列 */}
            <div className={`card bg-primary text-primary-content ${
              device.isMobile ? '' : 'md:col-span-2'
            } ${device.isTouchDevice ? 'gesture-feedback' : ''}`}>
              <div className="card-body p-4 sm:p-6">
                <h3 className="card-title text-sm sm:text-base">📢 系统升级通知</h3>
                <p className="text-xs sm:text-sm leading-relaxed">我们已成功升级到React + Supabase架构，提供更稳定的服务体验！</p>
                <div className="card-actions justify-end mt-3">
                  <button className={`btn btn-outline btn-sm ${
                    device.isTouchDevice ? 'min-h-[36px]' : ''
                  }`}>了解更多</button>
                </div>
              </div>
            </div>
            
            {/* 次要公告 - 移动端优化 */}
            <div className={`card bg-base-200 ${
              device.isTouchDevice ? 'gesture-feedback' : ''
            }`}>
              <div className="card-body p-4">
                <h3 className="card-title text-xs sm:text-sm">功能更新</h3>
                <p className="text-xs leading-relaxed">新增批量上传功能</p>
              </div>
            </div>
            
            <div className={`card bg-base-200 ${
              device.isTouchDevice ? 'gesture-feedback' : ''
            }`}>
              <div className="card-body p-4">
                <h3 className="card-title text-xs sm:text-sm">维护通知</h3>
                <p className="text-xs leading-relaxed">系统将在深夜进行维护</p>
              </div>
            </div>
          </div>
        </section>

        {/* 移动端快速操作按钮 - 浮动操作按钮 */}
        {device.isMobile && (
          <button 
            className="fab btn btn-primary btn-circle fixed bottom-6 right-6 z-50 w-14 h-14 shadow-lg"
            onClick={() => navigate('/invoices/upload')}
            aria-label="快速上传发票"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        )}

        </div>
      </div>
    </CompactLayout>
  )
}

// 添加默认导出以支持懒加载
export default DashboardPage;