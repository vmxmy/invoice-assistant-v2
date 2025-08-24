import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  Settings, 
  LogOut,
  User,
  Mail,
  X,
  BarChart3,
  ChevronRight,
  Bell,
  HelpCircle
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import ThemeSelector from '../ui/ThemeSelector';

interface MobileDrawerNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  description?: string;
  group?: 'main' | 'secondary' | 'settings';
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const MobileDrawerNavigation: React.FC<MobileDrawerNavigationProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const location = useLocation();
  const { user, signOut } = useAuthContext();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // 导航组织结构
  const navigationGroups: NavGroup[] = [
    {
      title: '主要功能',
      items: [
        { 
          name: '仪表板', 
          href: '/dashboard', 
          icon: LayoutDashboard,
          description: '数据概览与快速操作',
          group: 'main'
        },
        { 
          name: '发票管理', 
          href: '/invoices', 
          icon: FileText,
          description: '查看和管理所有发票',
          group: 'main'
        },
        { 
          name: '上传发票', 
          href: '/invoices/upload', 
          icon: Upload,
          description: '添加新的发票记录',
          group: 'main'
        },
        { 
          name: '数据统计', 
          href: '/statistics', 
          icon: BarChart3,
          description: '财务分析与报告',
          group: 'main'
        }
      ]
    },
    {
      title: '工具与服务',
      items: [
        { 
          name: '收件箱', 
          href: '/inbox', 
          icon: Mail,
          badge: 0,
          description: '邮件和通知消息',
          group: 'secondary'
        },
        { 
          name: '通知中心', 
          href: '/notifications', 
          icon: Bell,
          badge: 2,
          description: '系统通知和提醒',
          group: 'secondary'
        }
      ]
    },
    {
      title: '设置与帮助',
      items: [
        { 
          name: '用户设置', 
          href: '/settings', 
          icon: Settings,
          description: '账户和应用设置',
          group: 'settings'
        },
        { 
          name: '帮助中心', 
          href: '/help', 
          icon: HelpCircle,
          description: '使用指南和常见问题',
          group: 'settings'
        }
      ]
    }
  ];

  const isActive = (href: string) => {
    return location.pathname === href || 
           (href === '/invoices' && location.pathname.startsWith('/invoices') && location.pathname !== '/invoices/upload');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const handleNavItemClick = () => {
    setIsAnimating(true);
    setTimeout(onClose, 150); // 延迟关闭以显示点击效果
  };

  // 点击外部区域关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 键盘导航支持
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 禁用背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={handleBackdropClick}
        style={{
          animation: isOpen ? 'fadeIn 0.3s ease-out' : 'fadeOut 0.3s ease-out'
        }}
      />

      {/* 抽屉容器 */}
      <div 
        ref={drawerRef}
        className={`
          fixed top-0 left-0 h-full w-80 max-w-[85vw] z-50
          bg-base-100 shadow-2xl
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${className}
        `}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        {/* 抽屉头部 */}
        <div className="flex items-center justify-between p-4 border-b border-base-200 bg-base-100/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="发票助手" className="w-8 h-8" />
            <span className="font-bold text-lg text-primary">发票助手</span>
          </div>
          
          <button
            onClick={onClose}
            className="btn btn-ghost btn-square btn-sm"
            aria-label="关闭菜单"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 用户信息区域 */}
        <div className="p-4 border-b border-base-200 bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-content 
                           flex items-center justify-center text-lg font-bold shrink-0">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base-content truncate">
                {user?.email?.split('@')[0] || '用户'}
              </div>
              <div className="text-sm text-base-content/60 truncate">
                {user?.email || 'user@example.com'}
              </div>
            </div>
          </div>
          
          {/* 快速操作 */}
          <div className="flex gap-2">
            <Link
              to="/settings"
              onClick={handleNavItemClick}
              className="btn btn-outline btn-sm flex-1"
            >
              <User className="w-4 h-4 mr-2" />
              个人中心
            </Link>
            <ThemeSelector showLabel={false} />
          </div>
        </div>

        {/* 导航内容 */}
        <div className="flex-1 overflow-y-auto py-2">
          {navigationGroups.map((group, groupIndex) => (
            <div key={group.title} className="mb-1">
              {/* 分组标题 */}
              <div className="px-4 py-2 text-xs font-semibold text-base-content/50 uppercase tracking-wider">
                {group.title}
              </div>
              
              {/* 导航项 */}
              <div className="space-y-1 px-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={handleNavItemClick}
                      className={`
                        flex items-center gap-3 px-3 py-3 mx-1 rounded-xl
                        transition-all duration-200 ease-out
                        touch-manipulation active:scale-98
                        ${active 
                          ? 'bg-primary text-primary-content shadow-lg' 
                          : 'text-base-content hover:bg-base-200 active:bg-base-300'
                        }
                      `}
                    >
                      {/* 图标容器 */}
                      <div className="relative shrink-0">
                        <Icon className="w-5 h-5" />
                        
                        {/* 徽章指示器 */}
                        {item.badge !== undefined && item.badge > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-error text-error-content 
                                         rounded-full flex items-center justify-center text-xs font-bold
                                         min-w-[16px] text-[10px]">
                            {item.badge > 9 ? '9+' : item.badge}
                          </div>
                        )}
                      </div>
                      
                      {/* 内容区域 */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-base truncate">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className={`text-xs mt-0.5 truncate ${
                            active ? 'text-primary-content/70' : 'text-base-content/50'
                          }`}>
                            {item.description}
                          </div>
                        )}
                      </div>
                      
                      {/* 箭头指示器 */}
                      <ChevronRight className={`w-4 h-4 transition-transform ${
                        active ? 'text-primary-content/70' : 'text-base-content/30'
                      }`} />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 底部操作区域 */}
        <div className="border-t border-base-200 p-4 space-y-3">
          {/* 退出登录 */}
          <button
            onClick={handleSignOut}
            className="w-full btn btn-outline btn-error justify-start"
          >
            <LogOut className="w-4 h-4 mr-3" />
            退出登录
          </button>
          
          {/* 版本信息 */}
          <div className="text-center text-xs text-base-content/40">
            发票助手移动版 v1.0.0
          </div>
        </div>

        {/* 拖拽指示器 */}
        <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 
                       w-6 h-16 bg-base-100 rounded-r-xl border border-l-0 border-base-200
                       flex items-center justify-center shadow-lg">
          <div className="w-1 h-8 bg-base-content/20 rounded-full" />
        </div>
      </div>
    </>
  );
};

export default MobileDrawerNavigation;