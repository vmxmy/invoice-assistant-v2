import { useState, useEffect } from 'react';

/**
 * 媒体查询Hook - 用于响应式设计
 * 检测设备屏幕尺寸和特性
 */

// 预定义的断点
export const BREAKPOINTS = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)', 
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
  // 精确移动端断点检测
  mobileSmall: '(max-width: 480px)',     // 小屏手机 - 单列布局
  mobileLarge: '(min-width: 481px) and (max-width: 640px)', // 大屏手机 - 双列布局
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  // 触控设备检测
  touchDevice: '(pointer: coarse)',
  // 屏幕方向
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  // 高度检测
  shortScreen: '(max-height: 600px)',
  tallScreen: '(min-height: 900px)'
} as const;

/**
 * 基础媒体查询Hook
 * @param query - CSS媒体查询字符串
 * @returns boolean - 是否匹配查询条件
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // 检查是否在浏览器环境
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    
    // 设置初始状态
    setMatches(mediaQuery.matches);

    // 监听变化
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // 添加监听器
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // 兼容旧版浏览器
      mediaQuery.addListener(handleChange);
    }

    // 清理函数
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // 兼容旧版浏览器
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

/**
 * 设备类型检测Hook
 * @returns 设备类型和特性对象
 */
export function useDeviceDetection() {
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);
  const isDesktop = useMediaQuery(BREAKPOINTS.desktop);
  const isTouchDevice = useMediaQuery(BREAKPOINTS.touchDevice);
  const isPortrait = useMediaQuery(BREAKPOINTS.portrait);
  const isLandscape = useMediaQuery(BREAKPOINTS.landscape);
  const isShortScreen = useMediaQuery(BREAKPOINTS.shortScreen);
  const isTallScreen = useMediaQuery(BREAKPOINTS.tallScreen);

  // 精确移动端断点检测
  const isMobileSmall = useMediaQuery(BREAKPOINTS.mobileSmall);
  const isMobileLarge = useMediaQuery(BREAKPOINTS.mobileLarge);

  // 具体断点检测
  const isSm = useMediaQuery(BREAKPOINTS.sm);
  const isMd = useMediaQuery(BREAKPOINTS.md);
  const isLg = useMediaQuery(BREAKPOINTS.lg);
  const isXl = useMediaQuery(BREAKPOINTS.xl);
  const is2xl = useMediaQuery(BREAKPOINTS['2xl']);

  return {
    // 设备类型
    isMobile,
    isTablet, 
    isDesktop,
    isTouchDevice,
    
    // 精确移动端断点
    isMobileSmall,  // ≤480px - 单列布局
    isMobileLarge,  // 481px-640px - 双列布局
    
    // 屏幕方向
    isPortrait,
    isLandscape,
    
    // 屏幕高度
    isShortScreen,
    isTallScreen,
    
    // 断点检测
    isSm,
    isMd,
    isLg,
    isXl,
    is2xl,
    
    // 便捷属性
    isSmallDevice: isMobile,
    isMediumDevice: isTablet,
    isLargeDevice: isDesktop,
    
    // 触控优先设备（移动端 + 触控）
    isTouchPrimaryDevice: isMobile || (isTouchDevice && isTablet),
    
    // 适合卡片视图的设备
    preferCardView: isMobile || (isTablet && isPortrait),
    
    // 适合表格视图的设备
    preferTableView: isDesktop || (isTablet && isLandscape),
    
    // 需要更大触控目标的设备
    needsLargeTouchTargets: isMobile || isTouchDevice,
    
    // 屏幕空间受限的设备
    hasLimitedSpace: isMobile || isShortScreen,
    
    // 响应式网格列数计算
    getGridColumns: () => {
      if (isMobileSmall) return 1;        // ≤480px: 1列
      if (isMobileLarge) return 2;        // 481px-640px: 2列  
      if (isTablet) return 2;             // 平板: 2列
      return 4;                           // 桌面: 4列
    },
    
    // 当前设备类型（字符串）
    deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
  };
}

/**
 * 响应式断点Hook
 * @returns 当前匹配的断点信息
 */
export function useBreakpoint() {
  const device = useDeviceDetection();
  
  // 确定当前最大匹配的断点
  let currentBreakpoint = 'base';
  if (device.is2xl) currentBreakpoint = '2xl';
  else if (device.isXl) currentBreakpoint = 'xl';
  else if (device.isLg) currentBreakpoint = 'lg';
  else if (device.isMd) currentBreakpoint = 'md';
  else if (device.isSm) currentBreakpoint = 'sm';

  return {
    ...device,
    currentBreakpoint,
    // 断点比较函数
    isBreakpointAndUp: (breakpoint: string) => {
      const order = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];
      const currentIndex = order.indexOf(currentBreakpoint);
      const targetIndex = order.indexOf(breakpoint);
      return currentIndex >= targetIndex;
    },
    isBreakpointAndDown: (breakpoint: string) => {
      const order = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];
      const currentIndex = order.indexOf(currentBreakpoint);
      const targetIndex = order.indexOf(breakpoint);
      return currentIndex <= targetIndex;
    }
  };
}

/**
 * 屏幕尺寸Hook
 * @returns 当前屏幕的宽度和高度
 */
export function useScreenSize() {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    
    // 初始化
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
}

export default useMediaQuery;