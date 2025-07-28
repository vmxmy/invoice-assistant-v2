/**
 * 仪表板页面
 * 使用原生Tailwind Grid系统和Supabase实时数据
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { useDashboardStats, generateStatCards } from '../hooks/useDashboardStats'
import { StatCardGrid } from '../components/dashboard/StatCard'
import Layout from '../components/layout/Layout'

export function DashboardPage() {
  const { user } = useAuthContext()
  const navigate = useNavigate()
  // 获取实时统计数据
  const { data: stats, loading: statsLoading, error: statsError, refresh } = useDashboardStats() as any

  // 生成统计卡片数据
  const statCards = generateStatCards(stats)

  return (
    <Layout>
      <div className="page-container min-h-screen">
        <div className="container mx-auto p-6 max-w-7xl">

        {/* 主内容区 - 使用原生Tailwind Grid */}
        
        {/* 欢迎区域 */}
        <section className="text-center py-8 mb-12">
          <h1 className="text-4xl font-bold mb-4">欢迎回来！</h1>
          <p className="text-lg text-base-content/70 mb-2">{user?.email}</p>
          <p className="text-base-content/50">开始管理您的发票数据</p>
        </section>

        {/* 统计数据网格 - 使用实时数据 */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">数据概览</h2>
            <div className="flex items-center gap-4">
              {/* 实时状态指示器 */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  statsError ? 'bg-error animate-pulse' : 
                  statsLoading ? 'bg-warning animate-pulse' : 
                  'bg-success'
                }`}></div>
                <span className="text-xs opacity-70">
                  {statsError ? '连接异常' : 
                   statsLoading ? '同步中...' : 
                   '实时同步'}
                </span>
              </div>
              {statsError && (
                <div className="alert alert-error alert-sm">
                  <span className="text-xs">📡 数据加载失败</span>
                </div>
              )}
            </div>
          </div>
          
          <StatCardGrid 
            stats={statCards}
            loading={statsLoading}
          />
          
          {stats && (
            <div className="mt-4 text-xs text-base-content/50 text-center">
              最后更新: {new Date(stats.updated_at).toLocaleString('zh-CN')}
            </div>
          )}
        </section>

        {/* 功能模块网格 - 移动优先：1列 → 中屏：2列 → 大屏：3列 → 超大屏：4列 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">功能模块</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            
            {/* 上传发票卡片 - 特殊样式突出显示 */}
            <div className="card bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center mb-4">
                  <div className="text-4xl mr-4">📤</div>
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
                  <div className="text-4xl mr-4">📄</div>
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
                  <div className="text-4xl mr-4">📧</div>
                  <h3 className="card-title">邮箱导入</h3>
                </div>
                <p className="text-sm text-base-content/70 mb-6 flex-1">
                  配置邮箱自动导入发票附件
                </p>
                <div className="card-actions">
                  <button className="btn btn-secondary btn-block">配置邮箱</button>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center mb-4">
                  <div className="text-4xl mr-4">📊</div>
                  <h3 className="card-title">数据统计</h3>
                </div>
                <p className="text-sm text-base-content/70 mb-6 flex-1">
                  查看发票统计和财务分析报表
                </p>
                <div className="card-actions">
                  <button className="btn btn-accent btn-block">查看统计</button>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center mb-4">
                  <div className="text-4xl mr-4">🔍</div>
                  <h3 className="card-title">智能搜索</h3>
                </div>
                <p className="text-sm text-base-content/70 mb-6 flex-1">
                  按供应商、金额、日期等条件搜索
                </p>
                <div className="card-actions">
                  <button className="btn btn-info btn-block">开始搜索</button>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center mb-4">
                  <div className="text-4xl mr-4">⚙️</div>
                  <h3 className="card-title">系统设置</h3>
                </div>
                <p className="text-sm text-base-content/70 mb-6 flex-1">
                  个人资料和系统偏好设置
                </p>
                <div className="card-actions">
                  <button className="btn btn-outline btn-block">设置</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 最近活动 - 单列布局 */}
        <section>
          <h2 className="text-2xl font-bold mb-6">最近活动</h2>
          {/* 单个DaisyUI card组件 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
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
    </Layout>
  )
}