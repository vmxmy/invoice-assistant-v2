import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  Settings,
  Upload,
  Mail
} from 'lucide-react';

interface MobileTabsNavigationProps {
  className?: string;
  showLabels?: boolean;
  variant?: 'minimal' | 'standard' | 'enhanced';
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  isMain?: boolean; // 主要功能标记
}

const MobileTabsNavigation: React.FC<MobileTabsNavigationProps> = ({
  className = '',
  showLabels = true,
  variant = 'standard'
}) => {
  const location = useLocation();

  // 主要导航项 - 底部标签栏
  const mainNavigation: NavItem[] = [
    { name: '首页', href: '/dashboard', icon: LayoutDashboard, isMain: true },
    { name: '发票', href: '/invoices', icon: FileText, isMain: true },
    { name: '上传', href: '/invoices/upload', icon: Upload, isMain: true },
    { name: '统计', href: '/statistics', icon: BarChart3, isMain: true }
  ];

  // 次要导航项 - 可扩展
  const secondaryNavigation: NavItem[] = [
    { name: '收件箱', href: '/inbox', icon: Mail, badge: 0 },
    { name: '设置', href: '/settings', icon: Settings }
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    if (href === '/invoices') {
      return location.pathname === '/invoices' || 
             (location.pathname.startsWith('/invoices') && location.pathname !== '/invoices/upload');
    }
    return location.pathname === href;
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'minimal':
        return 'h-14 px-2';
      case 'enhanced':
        return 'h-20 px-4';
      default:
        return 'h-16 px-4';
    }
  };

  const getTabClasses = (href: string, isMainNav: boolean = false) => {
    const baseClasses = `
      flex flex-col items-center justify-center
      rounded-xl transition-all duration-200 ease-out
      active:scale-95 touch-manipulation no-zoom
      relative overflow-hidden
    `;
    
    const activeClasses = isActive(href)
      ? `bg-primary text-primary-content shadow-lg scale-105
         after:absolute after:bottom-0 after:left-1/2 after:w-6 after:h-1 
         after:bg-primary-content after:rounded-full after:transform after:-translate-x-1/2`
      : `text-base-content/60 hover:text-base-content/80 hover:bg-base-200/50`;

    const sizeClasses = isMainNav
      ? variant === 'enhanced' ? 'min-h-[60px] px-3 py-2' 
        : variant === 'minimal' ? 'min-h-[44px] px-2 py-1'
        : 'min-h-[52px] px-3 py-2'
      : 'min-h-[44px] px-2 py-1';

    return `${baseClasses} ${activeClasses} ${sizeClasses}`;
  };

  const getIconSize = () => {
    switch (variant) {
      case 'minimal':
        return 'w-5 h-5';
      case 'enhanced':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  const getTextClasses = () => {
    switch (variant) {
      case 'minimal':
        return 'text-xs mt-1 font-medium';
      case 'enhanced':
        return 'text-sm mt-2 font-semibold';
      default:
        return 'text-xs mt-1 font-medium';
    }
  };

  return (
    <div className={`
      fixed bottom-0 left-0 right-0 z-40
      bg-base-100/95 backdrop-blur-sm
      border-t border-base-200
      safe-area-bottom bottom-nav-safe
      ${getVariantClasses()}
      ${className}
    `}>
      {/* 主导航区域 */}
      <div className="flex items-center justify-between max-w-md mx-auto h-full">
        {mainNavigation.map((item, index) => {
          const Icon = item.icon;
          const isActiveTab = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={getTabClasses(item.href, true)}
              aria-label={item.name}
              style={{ flex: 1 }}
            >
              {/* 图标容器 */}
              <div className="relative">
                <Icon className={`${getIconSize()} transition-all duration-200 ${
                  isActiveTab ? 'animate-pulse' : ''
                }`} />
                
                {/* 徽章指示器 */}
                {item.badge !== undefined && item.badge > 0 && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-error text-error-content 
                                 rounded-full flex items-center justify-center text-xs font-bold
                                 animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </div>
                )}
                
                {/* 上传功能特殊指示器 */}
                {item.href === '/invoices/upload' && (
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 
                                 rounded-full blur-sm opacity-0 group-active:opacity-100 transition-opacity" />
                )}
              </div>
              
              {/* 标签文字 */}
              {showLabels && (
                <span className={`${getTextClasses()} transition-all duration-200 ${
                  isActiveTab ? 'text-primary-content' : ''
                }`}>
                  {item.name}
                </span>
              )}
              
              {/* 活跃状态装饰 */}
              {isActiveTab && variant === 'enhanced' && (
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent 
                               rounded-xl pointer-events-none" />
              )}
            </Link>
          );
        })}
      </div>

      {/* 可选的中央浮动操作按钮 */}
      {variant === 'enhanced' && (
        <Link
          to="/invoices/upload"
          className="absolute -top-8 left-1/2 transform -translate-x-1/2
                     w-16 h-16 bg-primary text-primary-content
                     rounded-full shadow-2xl flex items-center justify-center
                     transition-all duration-300 ease-out
                     hover:scale-110 active:scale-95 touch-manipulation
                     border-4 border-base-100"
          aria-label="快速上传发票"
        >
          <Upload className="w-6 h-6" />
        </Link>
      )}

      {/* 触感反馈指示器 */}
      <div className="absolute top-1 left-1/2 transform -translate-x-1/2 
                     w-12 h-1 bg-base-content/20 rounded-full" />
    </div>
  );
};

export default MobileTabsNavigation;