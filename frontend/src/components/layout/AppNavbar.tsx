import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  Settings, 
  LogOut,
  User,
  Mail,
  Trash2,
  Search
} from 'lucide-react';
import { useAuthContext } from "../../contexts/AuthContext"
import ThemeSelector from '../ui/ThemeSelector';

const AppNavbar: React.FC = () => {
  const location = useLocation();
  const { user, signOut } = useAuthContext();

  const navigation = [
    { name: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
    { name: '发票管理', href: '/invoices', icon: FileText },
    { name: '上传发票', href: '/invoices/upload', icon: Upload },
    { name: '回收站', href: '/trash', icon: Trash2 },
    { name: '邮箱配置', href: '/settings/email-config', icon: Mail },
    { name: '扫描任务', href: '/settings/email-scan-jobs', icon: Search },
  ];

  const isActive = (href: string) => {
    return location.pathname === href || 
           (href === '/invoices' && location.pathname.startsWith('/invoices') && location.pathname !== '/invoices/upload') ||
           (href === '/settings/email-config' && location.pathname.startsWith('/settings/email-config')) ||
           (href === '/settings/email-scan-jobs' && location.pathname.startsWith('/settings/email-scan-jobs'));
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="navbar bg-base-100 border-b border-base-200 sticky top-0 z-50 shadow-sm">
      {/* Logo区域 */}
      <div className="navbar-start">
        <Link to="/dashboard" className="btn btn-ghost text-xl font-bold text-primary font-serif">
          📄 发票助手
        </Link>
      </div>
      
      {/* 导航菜单区域 */}
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1 gap-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`flex items-center gap-2 ${isActive(item.href) ? 'active' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      
      {/* 用户区域 */}
      <div className="navbar-end">
        {/* 移动端菜单按钮 */}
        <div className="dropdown lg:hidden">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-square">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow-lg border border-base-200"
          >
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center gap-2 ${isActive(item.href) ? 'active' : ''}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
            <div className="divider my-1"></div>
            <li>
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm">主题切换</span>
                <ThemeSelector showLabel={false} className="scale-90" />
              </div>
            </li>
            <li>
              <Link to="/settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                设置
              </Link>
            </li>
            <li>
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-2 text-error"
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </button>
            </li>
          </ul>
        </div>
        
        {/* 主题切换 - 桌面端 */}
        <div className="hidden lg:flex mr-4">
          <ThemeSelector showLabel={false} />
        </div>
        
        {/* 用户信息 - 仅桌面端显示 */}
        <div className="hidden lg:flex items-center gap-3 mr-3">
          <div className="text-right min-w-0 flex-shrink">
            <div className="font-medium text-sm text-base-content truncate max-w-32">
              {user?.email?.split('@')[0]}
            </div>
            <div className="text-xs text-base-content/60 leading-tight truncate max-w-32">
              {user?.email}
            </div>
          </div>
        </div>
        
        {/* 用户头像下拉菜单 */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar hover:bg-base-200">
            <div className="w-10 rounded-full ring ring-primary/20 ring-offset-base-100 ring-offset-1 hover:ring-primary/40 transition-all bg-primary-content text-primary flex items-center justify-center">
              <span className="text-sm font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          <ul
            tabIndex={0}
            className="mt-3 z-[1] p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-64 border border-base-200"
          >
            {/* 用户信息 */}
            <li className="p-3 hover:bg-transparent">
              <div className="flex items-center gap-3">
                <div className="avatar">
                  <div className="w-12 rounded-full bg-primary-content text-primary flex items-center justify-center">
                    <span className="text-lg font-bold">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-base truncate">
                    {user?.email?.split('@')[0]}
                  </div>
                  <div className="text-xs text-base-content/60 truncate">
                    {user?.email}
                  </div>
                </div>
              </div>
            </li>
            
            <div className="divider my-1"></div>
            
            {/* 个人资料 */}
            <li>
              <Link to="/settings" className="flex items-center gap-2 py-2">
                <User className="w-4 h-4" />
                <span>个人资料</span>
              </Link>
            </li>
            
            {/* 账户设置 */}
            <li>
              <Link to="/settings#security" className="flex items-center gap-2 py-2">
                <Settings className="w-4 h-4" />
                <span>账户设置</span>
              </Link>
            </li>
            
            <div className="divider my-1"></div>
            
            {/* 退出登录 */}
            <li>
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-2 py-2 text-error hover:bg-error/10"
              >
                <LogOut className="w-4 h-4" />
                <span>退出登录</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AppNavbar;