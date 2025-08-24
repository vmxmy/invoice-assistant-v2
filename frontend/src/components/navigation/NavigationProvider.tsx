import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDeviceDetection } from '../../hooks/useMediaQuery';

// 导航偏好设置类型
interface NavigationPreferences {
  mobileNavType: 'tabs' | 'drawer' | 'hybrid';
  showLabels: boolean;
  compactMode: boolean;
  autoHideNav: boolean;
  tabsVariant: 'minimal' | 'standard' | 'enhanced';
}

// 导航状态类型
interface NavigationState {
  isDrawerOpen: boolean;
  activeTab: string;
  navigationHistory: string[];
  canGoBack: boolean;
  pageTitle: string;
}

// 导航控制器类型
interface NavigationControls {
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  goBack: () => void;
  setActiveTab: (tab: string) => void;
  updatePageTitle: (title: string) => void;
  resetNavigation: () => void;
}

// 上下文类型
interface NavigationContextType {
  preferences: NavigationPreferences;
  state: NavigationState;
  controls: NavigationControls;
  deviceInfo: {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    orientation: 'portrait' | 'landscape';
  };
  updatePreferences: (prefs: Partial<NavigationPreferences>) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: React.ReactNode;
}

const STORAGE_KEY = 'navigation-preferences';
const HISTORY_KEY = 'navigation-history';
const MAX_HISTORY_LENGTH = 50;

// 默认偏好设置
const defaultPreferences: NavigationPreferences = {
  mobileNavType: 'hybrid',
  showLabels: true,
  compactMode: false,
  autoHideNav: false,
  tabsVariant: 'standard'
};

// 页面标题映射
const PAGE_TITLES: { [key: string]: string } = {
  '/dashboard': '首页',
  '/invoices': '发票管理',
  '/invoices/upload': '上传发票',
  '/statistics': '数据统计',
  '/inbox': '收件箱',
  '/settings': '设置',
  '/notifications': '通知中心',
  '/help': '帮助中心'
};

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const device = useDeviceDetection();

  // 偏好设置状态
  const [preferences, setPreferences] = useState<NavigationPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
    } catch {
      return defaultPreferences;
    }
  });

  // 导航状态
  const [state, setState] = useState<NavigationState>(() => {
    const history = loadNavigationHistory();
    return {
      isDrawerOpen: false,
      activeTab: location.pathname,
      navigationHistory: history,
      canGoBack: history.length > 1,
      pageTitle: getPageTitle(location.pathname)
    };
  });

  // 加载导航历史
  function loadNavigationHistory(): string[] {
    try {
      const saved = sessionStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [location.pathname];
    } catch {
      return [location.pathname];
    }
  }

  // 保存导航历史
  const saveNavigationHistory = useCallback((history: string[]) => {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn('Failed to save navigation history:', error);
    }
  }, []);

  // 获取页面标题
  function getPageTitle(pathname: string): string {
    // 动态路由处理
    if (pathname.includes('/invoices/') && pathname !== '/invoices/upload') {
      return '发票详情';
    }
    return PAGE_TITLES[pathname] || '发票助手';
  }

  // 更新偏好设置
  const updatePreferences = useCallback((newPrefs: Partial<NavigationPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPrefs };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save navigation preferences:', error);
      }
      return updated;
    });
  }, []);

  // 导航控制器
  const controls: NavigationControls = {
    openDrawer: () => {
      setState(prev => ({ ...prev, isDrawerOpen: true }));
    },

    closeDrawer: () => {
      setState(prev => ({ ...prev, isDrawerOpen: false }));
    },

    toggleDrawer: () => {
      setState(prev => ({ ...prev, isDrawerOpen: !prev.isDrawerOpen }));
    },

    goBack: () => {
      const history = state.navigationHistory;
      if (history.length > 1) {
        const newHistory = [...history];
        newHistory.pop(); // 移除当前页面
        const previousPage = newHistory[newHistory.length - 1];
        
        setState(prev => ({
          ...prev,
          navigationHistory: newHistory,
          canGoBack: newHistory.length > 1,
          activeTab: previousPage
        }));
        
        saveNavigationHistory(newHistory);
        navigate(previousPage);
      } else {
        navigate('/dashboard');
      }
    },

    setActiveTab: (tab: string) => {
      setState(prev => ({ ...prev, activeTab: tab }));
    },

    updatePageTitle: (title: string) => {
      setState(prev => ({ ...prev, pageTitle: title }));
    },

    resetNavigation: () => {
      const newHistory = ['/dashboard'];
      setState(prev => ({
        ...prev,
        navigationHistory: newHistory,
        canGoBack: false,
        activeTab: '/dashboard',
        isDrawerOpen: false
      }));
      saveNavigationHistory(newHistory);
    }
  };

  // 监听路由变化，更新导航状态
  useEffect(() => {
    const currentPath = location.pathname;
    
    setState(prev => {
      const newHistory = [...prev.navigationHistory];
      
      // 如果不是当前页面，添加到历史
      if (newHistory[newHistory.length - 1] !== currentPath) {
        newHistory.push(currentPath);
        
        // 限制历史记录长度
        if (newHistory.length > MAX_HISTORY_LENGTH) {
          newHistory.splice(0, newHistory.length - MAX_HISTORY_LENGTH);
        }
      }
      
      const updatedState = {
        ...prev,
        activeTab: currentPath,
        navigationHistory: newHistory,
        canGoBack: newHistory.length > 1,
        pageTitle: getPageTitle(currentPath),
        isDrawerOpen: false // 路由变化时关闭抽屉
      };

      // 保存历史记录
      saveNavigationHistory(newHistory);
      
      return updatedState;
    });
  }, [location.pathname, saveNavigationHistory]);

  // 监听设备类型变化，自动调整导航偏好
  useEffect(() => {
    if (device.isMobile && preferences.mobileNavType === 'hybrid') {
      // 移动设备自动选择最佳导航模式
      updatePreferences({
        tabsVariant: device.isShortScreen ? 'minimal' : 'standard',
        compactMode: device.isShortScreen
      });
    }
  }, [device.isMobile, device.isShortScreen, preferences.mobileNavType, updatePreferences]);

  // 设备信息
  const deviceInfo = {
    isMobile: device.isMobile,
    isTablet: device.isTablet,
    isDesktop: device.isDesktop,
    orientation: device.isPortrait ? 'portrait' as const : 'landscape' as const
  };

  // 上下文值
  const contextValue: NavigationContextType = {
    preferences,
    state,
    controls,
    deviceInfo,
    updatePreferences
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
};

// Hook 使用导航上下文
export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

// 导航偏好设置 Hook
export const useNavigationPreferences = () => {
  const { preferences, updatePreferences } = useNavigation();
  return { preferences, updatePreferences };
};

// 导航状态 Hook  
export const useNavigationState = () => {
  const { state, controls } = useNavigation();
  return { state, controls };
};

// 设备感知导航 Hook
export const useResponsiveNavigation = () => {
  const { preferences, deviceInfo } = useNavigation();
  
  const shouldShowTabs = deviceInfo.isMobile && 
    (preferences.mobileNavType === 'tabs' || preferences.mobileNavType === 'hybrid');
  
  const shouldShowDrawer = preferences.mobileNavType === 'drawer' || 
    (preferences.mobileNavType === 'hybrid' && deviceInfo.isTablet);
  
  const shouldShowDesktopNav = deviceInfo.isDesktop;
  
  return {
    shouldShowTabs,
    shouldShowDrawer,
    shouldShowDesktopNav,
    navVariant: preferences.tabsVariant,
    compactMode: preferences.compactMode
  };
};

export default NavigationProvider;