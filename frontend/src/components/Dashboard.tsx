// Dashboard 组件 - 主页面
import React, { useState } from 'react'
import { useSession, useProfile, useSignOut } from '../hooks/useAuth'
import { LogOut } from 'lucide-react'
import { DashboardMain } from './dashboard'

const Dashboard: React.FC = () => {
  const { data: session } = useSession()
  const { data: profile } = useProfile()
  const signOutMutation = useSignOut()
  
  const user = session?.user
  const [activeView, setActiveView] = useState<'dashboard' | 'invoices' | 'upload' | 'settings'>('dashboard')

  const handleSignOut = async () => {
    signOutMutation.mutate()
  }

  const handleUploadInvoice = () => {
    setActiveView('upload')
    // TODO: 实现文件上传功能
    console.log('上传发票功能待实现')
  }

  const handleCreateInvoice = () => {
    setActiveView('invoices')
    // TODO: 实现创建发票功能
    console.log('创建发票功能待实现')
  }

  const handleSearchInvoices = () => {
    setActiveView('invoices')
    // TODO: 实现搜索发票功能
    console.log('搜索发票功能待实现')
  }

  const handleExportData = () => {
    // TODO: 实现数据导出功能
    console.log('数据导出功能待实现')
  }

  const handleSettings = () => {
    setActiveView('settings')
    // TODO: 实现设置功能
    console.log('设置功能待实现')
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* 使用 daisyUI 的 navbar 组件 */}
      <header className="navbar bg-base-100 shadow-lg sticky top-0 z-50">
        <div className="flex-1">
          <a 
            className="btn btn-ghost text-xl" 
            onClick={() => setActiveView('dashboard')}
          >
            发票助手
          </a>
        </div>
        
        {/* 导航菜单 */}
        <div className="flex-none gap-2">
          <div className="hidden lg:flex">
            <ul className="menu menu-horizontal px-1">
              <li>
                <a 
                  className={activeView === 'dashboard' ? 'active' : ''}
                  onClick={() => setActiveView('dashboard')}
                >
                  仪表盘
                </a>
              </li>
              <li>
                <a 
                  className={activeView === 'invoices' ? 'active' : ''}
                  onClick={() => setActiveView('invoices')}
                >
                  发票管理
                </a>
              </li>
              <li>
                <a 
                  className={activeView === 'upload' ? 'active' : ''}
                  onClick={() => setActiveView('upload')}
                >
                  文件上传
                </a>
              </li>
            </ul>
          </div>
          
          <div className="text-right">
            <p className="font-bold">
              {profile?.display_name || user?.email}
            </p>
            <p className="text-xs text-base-content/70">{user?.email}</p>
          </div>
          
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full">
                <img
                  alt="User Avatar"
                  src={profile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}`}
                />
              </div>
            </div>
            <ul
              tabIndex={0}
              className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
            >
              <li>
                <a onClick={() => setActiveView('settings')}>
                  个人资料
                </a>
              </li>
              <li>
                <a onClick={() => setActiveView('settings')}>
                  设置
                </a>
              </li>
              <li>
                <a onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                  退出登录
                </a>
              </li>
            </ul>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main>
        {activeView === 'dashboard' && (
          <DashboardMain
            onUploadInvoice={handleUploadInvoice}
            onCreateInvoice={handleCreateInvoice}
            onSearchInvoices={handleSearchInvoices}
            onExportData={handleExportData}
            onSettings={handleSettings}
          />
        )}
        
        {activeView === 'invoices' && (
          <div className="min-h-screen bg-base-200 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-20">
                <h2 className="text-3xl font-bold text-base-content mb-4">
                  发票管理页面
                </h2>
                <p className="text-base-content/60 mb-8">
                  此功能正在开发中，敬请期待...
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveView('dashboard')}
                >
                  返回仪表盘
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeView === 'upload' && (
          <div className="min-h-screen bg-base-200 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-20">
                <h2 className="text-3xl font-bold text-base-content mb-4">
                  文件上传页面
                </h2>
                <p className="text-base-content/60 mb-8">
                  此功能正在开发中，敬请期待...
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveView('dashboard')}
                >
                  返回仪表盘
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeView === 'settings' && (
          <div className="min-h-screen bg-base-200 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-20">
                <h2 className="text-3xl font-bold text-base-content mb-4">
                  设置页面
                </h2>
                <p className="text-base-content/60 mb-8">
                  此功能正在开发中，敬请期待...
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveView('dashboard')}
                >
                  返回仪表盘
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard