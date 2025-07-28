import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home,
  FileText, 
  Plus, 
  Settings, 
  LogOut,
  User,
  Search,
  BarChart3,
  Zap
} from 'lucide-react';
import { useSession, useProfile, useSignOut } from '../../hooks/useAuth';
import ThemeSelector from '../ui/ThemeSelector';

const NewAppNavbar: React.FC = () => {
  const location = useLocation();
  const { data: session } = useSession();
  const { data: profile } = useProfile();
  const signOutMutation = useSignOut();
  
  const user = session?.user;
  
  // 全局快捷键监听
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K 全局搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchAction = quickActions.find(action => action.hotkey === 'Ctrl+K');
        if (searchAction?.action) {
          searchAction.action();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 简化的主导航 - 更符合C端用户习惯
  const navigation = [
    { 
      name: '首页', 
      href: '/dashboard', 
      icon: Home,
      description: '发票总览和快速操作',
      isCore: true
    },
    { 
      name: '发票管理', 
      href: '/invoices', 
      icon: FileText,
      description: '查看和管理所有发票',
      isCore: true
    },
    { 
      name: '添加发票', 
      href: '/invoices/upload', 
      icon: Plus,
      description: '上传新发票',
      highlight: true,
      isCore: true
    },
  ];

  // 快速操作 - 增强功能
  const quickActions = [
    {
      name: '全局搜索',
      icon: Search,
      action: () => {
        // 触发全局搜索焦点
        const searchInput = document.querySelector('input[placeholder*="搜索"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        } else {
          // 如果在非搜索页面，跳转到发票页面
          window.location.href = '/invoices';
        }
      },
      hotkey: 'Ctrl+K'
    },
    {
      name: '数据分析',
      icon: BarChart3,
      href: '/analytics',
      description: '查看详细图表和统计分析'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname === href || 
           (href === '/invoices' && location.pathname.startsWith('/invoices') && location.pathname !== '/invoices/upload');
  };

  const handleSignOut = async () => {
    signOutMutation.mutate();
  };

  return (
    <div className="navbar bg-base-100 border-b border-base-200 sticky top-0 z-50 shadow-sm">
      {/* Logo区域 - 更现代化 */}
      <div className="navbar-start">
        <Link 
          to="/dashboard" 
          className="btn btn-ghost text-xl font-bold text-primary hover:bg-primary/10 transition-colors"
        >
          <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center mr-2">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <span className="hidden sm:inline bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            发票助手
          </span>
        </Link>
      </div>
      
      {/* 主导航 - 桌面端 */}
      <div className="navbar-center hidden lg:flex">
        <div className="flex items-center gap-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  btn btn-ghost gap-2 transition-all duration-200
                  ${active ? 'btn-primary' : ''}
                  ${item.highlight ? 'btn-outline btn-primary' : ''}
                `}
                title={item.description}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{item.name}</span>
                {item.highlight && (
                  <Zap className="w-3 h-3 text-warning" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* 右侧区域 */}
      <div className="navbar-end">
        {/* 快速操作 - 桌面端 */}
        <div className="hidden lg:flex items-center gap-2 mr-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            
            if (action.href) {
              return (
                <Link
                  key={action.name}
                  to={action.href}
                  className="btn btn-ghost btn-sm gap-1 hover:bg-primary/10"
                  title={action.description || action.name}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden xl:inline text-xs">{action.name}</span>
                </Link>
              );
            }
            
            return (
              <button
                key={action.name}
                className="btn btn-ghost btn-sm gap-1 hover:bg-primary/10"
                onClick={action.action}
                title={`${action.name}${action.hotkey ? ` (${action.hotkey})` : ''}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden xl:inline text-xs">{action.name}</span>
                {action.hotkey && (
                  <kbd className="kbd kbd-xs hidden 2xl:inline-flex">⌘K</kbd>
                )}
              </button>
            );
          })}
          
          <div className="divider divider-horizontal mx-2"></div>
          <div className="tooltip tooltip-bottom" data-tip="切换主题">
            <ThemeSelector showLabel={false} />
          </div>
        </div>

        {/* 移动端菜单 */}
        <div className="dropdown dropdown-end lg:hidden">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-square hover:bg-primary/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <ul className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-64 p-2 shadow-lg border border-base-200">
            {/* 主导航 */}
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center gap-3 ${isActive(item.href) ? 'active' : ''}`}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-base-content/60">{item.description}</div>
                    </div>
                    {item.highlight && <Zap className="w-3 h-3 text-warning" />}
                  </Link>
                </li>
              );
            })}
            
            <div className="divider my-2"></div>
            
            {/* 快速操作 */}
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <li key={action.name}>
                  {action.href ? (
                    <Link to={action.href} className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      {action.name}
                    </Link>
                  ) : (
                    <button onClick={action.action} className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      {action.name}
                    </button>
                  )}
                </li>
              );
            })}
            
            <div className="divider my-2"></div>
            
            {/* 用户相关 */}
            <li>
              <div className="flex items-center justify-between">
                <span className="text-sm">主题</span>
                <ThemeSelector showLabel={false} className="scale-90" />
              </div>
            </li>
            <li>
              <Link to="/settings" className="flex items-center gap-3">
                <Settings className="w-4 h-4" />
                设置
              </Link>
            </li>
            <li>
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-3 text-error"
                disabled={signOutMutation.isLoading}
              >
                <LogOut className="w-4 h-4" />
                {signOutMutation.isLoading ? '退出中...' : '退出登录'}
              </button>
            </li>
          </ul>
        </div>
        
        {/* 用户头像 */}
        <div className="dropdown dropdown-end ml-2">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar hover:bg-primary/10 transition-colors">
            <div className="w-8 rounded-full ring ring-primary/30 ring-offset-base-100 ring-offset-1 hover:ring-primary/50 transition-all">
              <img
                alt="用户头像"
                src={profile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}&backgroundColor=3b82f6&textColor=ffffff`}
                className="rounded-full"
              />
            </div>
            {/* 在线状态指示器 */}
            <div className="absolute -bottom-0 -right-0 w-3 h-3 bg-success rounded-full border-2 border-base-100"></div>
          </div>
          <ul className="mt-3 z-[1] p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-base-200">
            {/* 用户信息 */}
            <li className="p-3 hover:bg-transparent">
              <div className="flex items-center gap-3">
                <div className="avatar">
                  <div className="w-10 rounded-full ring ring-primary/20">
                    <img 
                      src={profile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}&backgroundColor=3b82f6&textColor=ffffff`}
                      alt="用户头像"
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate flex items-center gap-1">
                    {profile?.display_name || user?.email?.split('@')[0]}
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                  </div>
                  <div className="text-xs text-base-content/60 truncate">
                    {user?.email}
                  </div>
                  <div className="text-xs text-success mt-1">
                    已连接
                  </div>
                </div>
              </div>
            </li>
            
            <div className="divider my-1"></div>
            
            <li>
              <Link to="/settings" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>个人设置</span>
              </Link>
            </li>
            
            <li>
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-2 text-error hover:bg-error/10"
                disabled={signOutMutation.isLoading}
              >
                <LogOut className="w-4 h-4" />
                <span>{signOutMutation.isLoading ? '退出中...' : '退出登录'}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NewAppNavbar;