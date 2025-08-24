import React from 'react';
import { useResponsiveNavigation, useNavigationState } from './NavigationProvider';
import MobileTabsNavigation from './MobileTabsNavigation';
import MobileDrawerNavigation from './MobileDrawerNavigation';
import MobileTopNavbar from './MobileTopNavbar';
import AppNavbar from '../layout/AppNavbar';

interface ResponsiveNavigationSystemProps {
  children: React.ReactNode;
  className?: string;
  customTopNavbar?: React.ReactNode;
  showBackButton?: boolean;
  pageTitle?: string;
  showSearch?: boolean;
  showActions?: boolean;
}

const ResponsiveNavigationSystem: React.FC<ResponsiveNavigationSystemProps> = ({
  children,
  className = '',
  customTopNavbar,
  showBackButton = true,
  pageTitle,
  showSearch = true,
  showActions = true
}) => {
  const { 
    shouldShowTabs, 
    shouldShowDrawer, 
    shouldShowDesktopNav, 
    navVariant,
    compactMode 
  } = useResponsiveNavigation();
  
  const { state, controls } = useNavigationState();

  // 计算内容区域的样式
  const getContentClasses = () => {
    const baseClasses = 'flex-1 transition-all duration-300 ease-out';
    
    // 底部导航栏高度补偿
    const bottomPadding = shouldShowTabs ? 
      (navVariant === 'enhanced' ? 'pb-24' : 
       navVariant === 'minimal' ? 'pb-16' : 'pb-18') : '';
    
    // 顶部导航栏补偿
    const topPadding = (shouldShowTabs || shouldShowDrawer) ? 'pt-0' : '';
    
    return `${baseClasses} ${bottomPadding} ${topPadding}`;
  };

  return (
    <div className={`
      min-h-screen bg-base-200 
      flex flex-col
      ${compactMode ? 'compact-layout' : ''}
      ${className}
    `}>
      {/* 顶部导航栏 */}
      {shouldShowDesktopNav ? (
        // 桌面端使用原有导航
        <AppNavbar />
      ) : (
        // 移动端顶部导航
        customTopNavbar || (
          <MobileTopNavbar
            onMenuToggle={shouldShowDrawer ? controls.toggleDrawer : undefined}
            showBackButton={showBackButton}
            showSearch={showSearch}
            showActions={showActions}
            title={pageTitle}
            variant={compactMode ? 'compact' : 'default'}
          />
        )
      )}

      {/* 主要内容区域 */}
      <main className={getContentClasses()}>
        {children}
      </main>

      {/* 底部导航 - 仅在移动端显示 */}
      {shouldShowTabs && (
        <MobileTabsNavigation
          showLabels={!compactMode}
          variant={navVariant}
        />
      )}

      {/* 抽屉导航 - 移动端和平板端 */}
      {shouldShowDrawer && (
        <MobileDrawerNavigation
          isOpen={state.isDrawerOpen}
          onClose={controls.closeDrawer}
        />
      )}

      {/* PWA 安装提示（可选） */}
      <PWAInstallPrompt />

      {/* 网络状态指示器（可选） */}
      <NetworkStatusIndicator />
    </div>
  );
};

// PWA 安装提示组件
const PWAInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // 7天后再次显示提示
    localStorage.setItem('pwa-install-dismissed', 
      (Date.now() + 7 * 24 * 60 * 60 * 1000).toString()
    );
  };

  React.useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() < parseInt(dismissed)) {
      setShowPrompt(false);
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-base-100 rounded-xl shadow-2xl border border-base-300 p-4">
        <div className="flex items-start gap-3">
          <img src="/favicon.svg" alt="发票助手" className="w-10 h-10 rounded-lg" />
          
          <div className="flex-1">
            <h3 className="font-semibold text-base-content">安装发票助手</h3>
            <p className="text-sm text-base-content/70 mt-1">
              添加到主屏幕，获得更好的使用体验
            </p>
            
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="btn btn-primary btn-sm"
              >
                安装
              </button>
              <button
                onClick={handleDismiss}
                className="btn btn-ghost btn-sm"
              >
                稍后
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 网络状态指示器组件
const NetworkStatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showIndicator && isOnline) return null;

  return (
    <div className={`
      fixed top-16 left-4 right-4 z-50 transition-all duration-300
      ${showIndicator ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}
    `}>
      <div className={`
        rounded-lg p-3 text-sm font-medium text-center shadow-lg
        ${isOnline 
          ? 'bg-success text-success-content' 
          : 'bg-warning text-warning-content'
        }
      `}>
        {isOnline ? '✓ 网络连接已恢复' : '⚠️ 网络连接中断，部分功能可能不可用'}
      </div>
    </div>
  );
};

export default ResponsiveNavigationSystem;