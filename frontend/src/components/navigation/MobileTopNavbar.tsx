import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Menu, 
  Search, 
  MoreVertical,
  Settings,
  Bell,
  User,
  Share
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import ThemeSelector from '../ui/ThemeSelector';

interface MobileTopNavbarProps {
  onMenuToggle?: () => void;
  showBackButton?: boolean;
  showSearch?: boolean;
  showActions?: boolean;
  title?: string;
  customTitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'compact' | 'transparent' | 'solid';
}

const MobileTopNavbar: React.FC<MobileTopNavbarProps> = ({
  onMenuToggle,
  showBackButton = false,
  showSearch = true,
  showActions = true,
  title,
  customTitle,
  actions,
  className = '',
  variant = 'default'
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  // 根据路由自动生成标题
  const getPageTitle = (): string => {
    if (title) return title;
    
    const path = location.pathname;
    const titleMap: { [key: string]: string } = {
      '/dashboard': '首页',
      '/invoices': '发票管理',
      '/invoices/upload': '上传发票',
      '/statistics': '数据统计',
      '/inbox': '收件箱',
      '/settings': '设置',
      '/notifications': '通知中心',
      '/help': '帮助中心'
    };
    
    // 动态路由处理
    if (path.includes('/invoices/') && path !== '/invoices/upload') {
      return '发票详情';
    }
    
    return titleMap[path] || '发票助手';
  };

  // 变体样式
  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'h-12 px-3';
      case 'transparent':
        return 'h-14 px-4 bg-transparent border-none';
      case 'solid':
        return 'h-16 px-4 bg-base-100 shadow-lg';
      default:
        return 'h-14 px-4 bg-base-100/95 backdrop-blur-sm border-b border-base-200';
    }
  };

  const handleBackButton = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const canGoBack = showBackButton && location.pathname !== '/dashboard';

  return (
    <div className={`
      sticky top-0 z-40 w-full
      flex items-center justify-between
      status-bar-safe
      ${getVariantClasses()}
      ${className}
    `}>
      {/* 左侧区域 */}
      <div className="flex items-center gap-2">
        {canGoBack ? (
          <button
            onClick={handleBackButton}
            className="btn btn-ghost btn-square btn-sm"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : onMenuToggle ? (
          <button
            onClick={onMenuToggle}
            className="btn btn-ghost btn-square btn-sm"
            aria-label="打开菜单"
          >
            <Menu className="w-5 h-5" />
          </button>
        ) : (
          <Link 
            to="/dashboard" 
            className="flex items-center gap-2 text-primary font-semibold"
          >
            <img src="/favicon.svg" alt="发票助手" className="w-6 h-6" />
            {variant !== 'compact' && <span className="hidden sm:block">发票助手</span>}
          </Link>
        )}
      </div>

      {/* 中间标题区域 */}
      <div className="flex-1 flex items-center justify-center px-2">
        {customTitle || (
          <h1 className="font-semibold text-base text-base-content text-center truncate max-w-[200px]">
            {getPageTitle()}
          </h1>
        )}
      </div>

      {/* 右侧操作区域 */}
      <div className="flex items-center gap-1">
        {actions || (
          <>
            {/* 搜索按钮 */}
            {showSearch && (
              <button
                className="btn btn-ghost btn-square btn-sm"
                aria-label="搜索"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* 通知按钮 */}
            {showActions && (
              <Link
                to="/notifications"
                className="btn btn-ghost btn-square btn-sm relative"
                aria-label="通知"
              >
                <Bell className="w-4 h-4" />
                {/* 通知徽章 */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-error rounded-full" />
              </Link>
            )}

            {/* 主题切换器 */}
            <ThemeSelector showLabel={false} />

            {/* 用户菜单或更多操作 */}
            {showActions && (
              <div className="dropdown dropdown-end">
                <button 
                  tabIndex={0} 
                  className="btn btn-ghost btn-square btn-sm"
                  aria-label="用户菜单"
                >
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-content 
                                 flex items-center justify-center text-xs font-bold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </button>
                
                <ul
                  tabIndex={0}
                  className="mt-3 z-[1] p-2 shadow-xl menu menu-sm dropdown-content 
                           bg-base-100 rounded-xl w-56 border border-base-200"
                >
                  {/* 用户信息 */}
                  <li className="p-2 border-b border-base-200 mb-2">
                    <div className="flex items-center gap-2 pointer-events-none">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-content 
                                     flex items-center justify-center text-sm font-bold">
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
                  
                  {/* 快速操作 */}
                  <li>
                    <Link to="/settings" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>个人中心</span>
                    </Link>
                  </li>
                  
                  <li>
                    <Link to="/settings" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      <span>应用设置</span>
                    </Link>
                  </li>
                  
                  <li>
                    <button className="flex items-center gap-2 w-full text-left">
                      <Share className="w-4 h-4" />
                      <span>分享应用</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* 进度指示器 - 用于页面加载状态 */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/20 overflow-hidden">
        <div className="h-full bg-primary transform -translate-x-full transition-transform duration-300" 
             id="page-progress" />
      </div>
    </div>
  );
};

export default MobileTopNavbar;