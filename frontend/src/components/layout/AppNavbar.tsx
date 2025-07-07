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
        
        {/* 桌面端菜单 */}
        <div className="hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
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
            <li className="menu-title">
              <span>{user?.email}</span>
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
      </div>
    </header>
  );
};

export default AppNavbar;