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
import { useAuth } from '../../contexts/AuthContext';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

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
    await signOut();
  };

  return (
    <div className="navbar bg-base-100 shadow-sm border-b border-base-300">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
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
                    className={isActive(item.href) ? 'active' : ''}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <Link to="/dashboard" className="btn btn-ghost text-xl">
          📄 发票助手
        </Link>
      </div>
      
      <div className="navbar-center hidden lg:flex">
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
      
      <div className="navbar-end">
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
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
    </div>
  );
};

export default Navbar;