// 优化后的Dashboard组件 - 使用 React Query
import React from 'react'
import { useSignOut } from '../hooks/useAuth'
import { useInvoiceStats } from '../hooks/useInvoices'
import { useAuth } from '../contexts/AuthContext_v2'

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth()
  
  // React Query hooks
  const signOutMutation = useSignOut()
  const { data: stats, isLoading: statsLoading, error: statsError } = useInvoiceStats()

  const handleSignOut = async () => {
    try {
      await signOutMutation.mutateAsync()
      // 登出成功后，React Query会自动清除缓存，用户会被重定向到登录页
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">发票助手</h1>
              <p className="text-gray-600">智能发票管理系统</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {profile?.display_name || user?.email}
                </p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                disabled={signOutMutation.isPending}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm disabled:bg-gray-400"
              >
                {signOutMutation.isPending ? '退出中...' : '退出登录'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* 统计信息卡片 */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">数据概览</h2>
            {statsLoading ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ) : statsError ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">加载统计数据失败</p>
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">总发票数</h3>
                  <p className="text-2xl font-bold text-blue-600">{stats.total_invoices}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">总金额</h3>
                  <p className="text-2xl font-bold text-green-600">¥{stats.total_amount?.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">本月发票</h3>
                  <p className="text-2xl font-bold text-purple-600">{stats.this_month_count}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">供应商数量</h3>
                  <p className="text-2xl font-bold text-orange-600">{stats.unique_sellers}</p>
                </div>
              </div>
            ) : null}
          </div>

          {/* 主要功能区域 */}
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                欢迎使用发票助手！
              </h2>
              <p className="text-gray-600 mb-8">
                您的智能发票管理工具已准备就绪
              </p>
              
              {/* 功能卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                  <div className="text-blue-600 text-4xl mb-4">📄</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">上传发票</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    上传PDF发票文件，自动提取关键信息
                  </p>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                    开始上传
                  </button>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                  <div className="text-green-600 text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">管理发票</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    查看、编辑和搜索您的发票记录
                  </p>
                  <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
                    查看发票
                  </button>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                  <div className="text-purple-600 text-4xl mb-4">📈</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">统计报表</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    查看发票统计信息和分析报表
                  </p>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors">
                    查看统计
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard