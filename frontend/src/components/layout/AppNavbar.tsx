import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  Settings, 
  LogOut,
  User,
  Mail,
  Menu,
  X,
  BarChart3
} from 'lucide-react';
import { useAuthContext } from "../../contexts/AuthContext"
import ThemeSelector from '../ui/ThemeSelector';

const AppNavbar: React.FC = () => {
  const location = useLocation();
  const { user, signOut } = useAuthContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: '首页', href: '/dashboard', icon: LayoutDashboard },
    { name: '发票管理', href: '/invoices', icon: FileText },
    { name: '数据统计', href: '/statistics', icon: BarChart3 },
    { name: '上传发票', href: '/invoices/upload', icon: Upload },
    { name: '收件箱', href: '/inbox', icon: Mail },
  ];

  const isActive = (href: string) => {
    return location.pathname === href || 
           (href === '/invoices' && location.pathname.startsWith('/invoices') && location.pathname !== '/invoices/upload');
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* 合并后的顶部导航栏 */}
      <div className="bg-base-100 border-b border-base-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 relative">
            {/* 左侧：Logo */}
            <div className="flex items-center">
              <Link 
                to="/dashboard" 
                className="flex items-center gap-2 text-primary font-bold text-lg"
                onClick={closeMobileMenu}
              >
                <img src="/favicon.svg" alt="发票助手" className="w-8 h-8" />
                <span className="hidden sm:block">发票助手</span>
              </Link>
            </div>
            
            {/* 中间：导航菜单 - 绝对定位居中 */}
            <nav className="hidden md:flex items-center space-x-1 absolute left-1/2 transform -translate-x-1/2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href) 
                        ? 'bg-primary text-primary-content' 
                        : 'text-base-content hover:bg-base-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            
            {/* 右侧：用户操作区 */}
            <div className="flex items-center gap-2">
              {/* 主题切换器 */}
              <ThemeSelector showLabel={false} />
              
              {/* 用户头像下拉菜单 */}
              <div className="dropdown dropdown-end">
                <button 
                  tabIndex={0} 
                  className="btn btn-ghost btn-square hover:bg-base-200 p-1"
                >
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm font-bold shrink-0">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </button>
                <ul
                  tabIndex={0}
                  className="mt-3 z-[1] p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-56 border border-base-200"
                >
                  {/* 用户信息 */}
                  <li className="p-2 hover:bg-transparent border-b border-base-200 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm font-bold">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {user?.email?.split('@')[0]}
                        </div>
                        <div className="text-xs text-base-content/60 truncate">
                          {user?.email}
                        </div>
                      </div>
                    </div>
                  </li>
                  
                  {/* 收件箱 */}
                  <li>
                    <Link to="/inbox" className="flex items-center gap-2 px-2 py-2">
                      <Mail className="w-4 h-4" />
                      <span>收件箱</span>
                    </Link>
                  </li>
                  
                  {/* 用户中心 */}
                  <li>
                    <Link to="/settings" className="flex items-center gap-2 px-2 py-2">
                      <User className="w-4 h-4" />
                      <span>用户中心</span>
                    </Link>
                  </li>
                  
                  {/* 退出登录 */}
                  <li>
                    <button 
                      onClick={handleSignOut}
                      className="flex items-center gap-2 px-2 py-2 text-error hover:bg-error/10 w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>退出登录</span>
                    </button>
                  </li>
                </ul>
              </div>
              
              {/* 移动端菜单按钮 */}
              <button
                onClick={toggleMobileMenu}
                className="btn btn-ghost btn-square btn-sm md:hidden"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 移动端全屏菜单覆盖层 */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeMobileMenu}
          />
          
          {/* 菜单内容 */}
          <div className="fixed top-16 left-0 right-0 bottom-0 bg-base-100 overflow-y-auto">
            <div className="p-4">
              {/* 移动端导航菜单 */}
              <nav className="space-y-2 mb-6">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                        isActive(item.href) 
                          ? 'bg-primary text-primary-content shadow-lg' 
                          : 'text-base-content hover:bg-base-200 active:bg-base-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-base">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
              
              {/* 移动端底部信息 */}
              <div className="border-t border-base-200 pt-4 mt-6">
                <div className="text-center text-sm text-base-content/60">
                  发票助手 - 移动版
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppNavbar;