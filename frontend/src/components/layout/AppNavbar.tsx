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
  X
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
      {/* 移动优先的顶部导航栏 */}
      <div className="bg-base-100 border-b border-base-200 sticky top-0 z-50 shadow-sm">
        {/* 主导航栏 - 简化移动端设计 */}
        <div className="flex items-center justify-between px-4 h-16">
          {/* Logo区域 - 移动端更紧凑 */}
          <Link 
            to="/dashboard" 
            className="flex items-center gap-2 text-primary font-bold text-lg"
            onClick={closeMobileMenu}
          >
            <img src="/favicon.svg" alt="发票助手" className="w-8 h-8" />
            <span className="hidden sm:block">发票助手</span>
          </Link>
          
          {/* 移动端右侧操作区 */}
          <div className="flex items-center gap-2">
            {/* 用户头像 - 移动端更小 */}
            <div className="dropdown dropdown-end">
              <div 
                tabIndex={0} 
                role="button" 
                className="btn btn-ghost btn-circle btn-sm avatar hover:bg-base-200"
              >
                <div className="w-8 h-8 rounded-full bg-primary-content text-primary flex items-center justify-center text-xs font-bold">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              <ul
                tabIndex={0}
                className="mt-3 z-[1] p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-56 border border-base-200"
              >
                {/* 用户信息 - 紧凑版 */}
                <li className="p-2 hover:bg-transparent border-b border-base-200 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-content text-primary flex items-center justify-center text-sm font-bold">
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
                
                {/* 主题切换 */}
                <li>
                  <div className="flex items-center justify-between px-2 py-2">
                    <span className="text-sm">主题切换</span>
                    <ThemeSelector showLabel={false} className="scale-90" />
                  </div>
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
        
        {/* 桌面端水平导航 - 隐藏在移动端 */}
        <div className="hidden md:flex border-t border-base-200 bg-base-50/50">
          <div className="flex items-center justify-center w-full max-w-6xl mx-auto px-4">
            <nav className="flex items-center space-x-1 py-2">
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