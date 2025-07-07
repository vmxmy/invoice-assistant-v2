import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  Settings, 
  LogOut,
  User
} from 'lucide-react';
import { useSession, useProfile, useSignOut } from '../../hooks/useAuth';

const AppNavbar: React.FC = () => {
  const location = useLocation();
  const { data: session } = useSession();
  const { data: profile } = useProfile();
  const signOutMutation = useSignOut();
  
  const user = session?.user;

  const navigation = [
    { name: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
    { name: '发票管理', href: '/invoices', icon: FileText },
    { name: '上传发票', href: '/invoices/upload', icon: Upload },
  ];

  const isActive = (href: string) => {
    return location.pathname === href || 
           (href === '/invoices' && location.pathname.startsWith('/invoices') && location.pathname !== '/invoices/upload');
  };

  const handleSignOut = async () => {
    signOutMutation.mutate();
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
        
        {/* 用户信息 - 仅桌面端显示 */}
        <div className="hidden lg:flex items-center gap-3 mr-3">
          <div className="text-right min-w-0 flex-shrink">
            <div className="font-medium text-sm text-base-content truncate max-w-32">
              {profile?.display_name || user?.email?.split('@')[0]}
            </div>
            <div className="text-xs text-base-content/60 leading-tight truncate max-w-32">
              {user?.email}
            </div>
          </div>
        </div>
        
        {/* 用户头像下拉菜单 */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar hover:bg-base-200">
            <div className="w-10 rounded-full ring ring-primary/20 ring-offset-base-100 ring-offset-1 hover:ring-primary/40 transition-all">
              <img
                alt="用户头像"
                src={profile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}&backgroundColor=3b82f6&textColor=ffffff`}
                className="rounded-full object-cover"
              />
            </div>
          </div>
          <ul
            tabIndex={0}
            className="mt-3 z-[1] p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-base-200"
          >
            <li className="menu-title px-2 py-2">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-base-content">
                  {profile?.display_name || user?.email?.split('@')[0]}
                </span>
                <span className="text-xs text-base-content/60 truncate">
                  {user?.email}
                </span>
              </div>
            </li>
            <div className="divider my-1"></div>
            <li>
              <Link to="/settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                账户设置
              </Link>
            </li>
            <li>
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-2 text-error hover:bg-error/10"
                disabled={signOutMutation.isLoading}
              >
                <LogOut className="w-4 h-4" />
                {signOutMutation.isLoading ? '退出中...' : '退出登录'}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AppNavbar;