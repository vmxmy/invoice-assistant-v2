// Dashboard 组件 - 主页面
import React from 'react'
import { useSession, useProfile, useSignOut } from '../hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, FileText, Upload, LayoutDashboard } from 'lucide-react'
import { DashboardMain } from './dashboard/DashboardMain'

const Dashboard: React.FC = () => {
  const { data: session } = useSession()
  const { data: profile } = useProfile()
  const signOutMutation = useSignOut()
  const navigate = useNavigate()
  
  const user = session?.user

  const handleSignOut = async () => {
    signOutMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* 使用 daisyUI 的 navbar 组件 */}
      <header className="navbar bg-base-100 shadow-lg sticky top-0 z-50">
        <div className="flex-1">
          <Link to="/dashboard" className="btn btn-ghost text-xl">
            📄 发票助手
          </Link>
        </div>
        
        {/* 导航菜单 */}
        <div className="flex-none gap-2">
          {/* 移动端菜单 */}
          <div className="dropdown lg:hidden">
            <div tabIndex={0} role="button" className="btn btn-ghost">
              <svg
                className="w-5 h-5"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 17 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M1 1h15M1 7h15M1 13h15"
                />
              </svg>
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
            >
              <li>
                <Link to="/dashboard" className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  仪表盘
                </Link>
              </li>
              <li>
                <Link to="/invoices" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  发票管理
                </Link>
              </li>
              <li>
                <Link to="/invoices/upload" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  文件上传
                </Link>
              </li>
            </ul>
          </div>
          
          {/* 桌面端菜单 */}
          <div className="hidden lg:flex">
            <ul className="menu menu-horizontal px-1">
              <li>
                <Link to="/dashboard" className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  仪表盘
                </Link>
              </li>
              <li>
                <Link to="/invoices" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  发票管理
                </Link>
              </li>
              <li>
                <Link to="/invoices/upload" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  文件上传
                </Link>
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
                <Link to="/settings">
                  个人资料
                </Link>
              </li>
              <li>
                <Link to="/settings">
                  设置
                </Link>
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
        <DashboardMain />
      </main>
    </div>
  )
}

export default Dashboard