/**
 * 移动端性能包装器组件
 * 提供GPU硬件加速、触摸优化、视口优化等移动端特定优化
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { useDeviceDetection } from '../../hooks/useMediaQuery';

interface MobilePerformanceWrapperProps {
  children: React.ReactNode;
  enableHardwareAcceleration?: boolean;
  enableTouchOptimization?: boolean;
  enableViewportOptimization?: boolean;
  enableScrollOptimization?: boolean;
  className?: string;
}

/**
 * GPU硬件加速工具类
 */
class HardwareAcceleration {
  static enableForElement(element: HTMLElement): void {
    element.style.transform = 'translateZ(0)';
    element.style.backfaceVisibility = 'hidden';
    element.style.perspective = '1000px';
    element.style.willChange = 'transform';
  }

  static disableForElement(element: HTMLElement): void {
    element.style.transform = '';
    element.style.backfaceVisibility = '';
    element.style.perspective = '';
    element.style.willChange = '';
  }

  static enableCompositing(element: HTMLElement): void {
    // 启用CSS合成层
    element.style.transform = 'translateZ(0)';
    element.style.isolation = 'isolate';
  }
}

/**
 * 触摸优化工具类
 */
class TouchOptimization {
  static optimizeElement(element: HTMLElement): void {
    // 优化触摸响应
    element.style.touchAction = 'manipulation';
    element.style.webkitTapHighlightColor = 'transparent';
    element.style.webkitTouchCallout = 'none';
    element.style.webkitUserSelect = 'none';
    element.style.userSelect = 'none';
    
    // 减少触摸延迟
    element.style.cursor = 'pointer';
    
    // 优化滚动
    element.style.webkitOverflowScrolling = 'touch';
  }

  static enableFastClick(element: HTMLElement): void {
    // 移除 300ms 点击延迟
    element.addEventListener('touchstart', () => {}, { passive: true });
  }
}

/**
 * 滚动优化工具类
 */
class ScrollOptimization {
  static optimizeContainer(element: HTMLElement): void {
    // 启用硬件加速滚动
    element.style.webkitOverflowScrolling = 'touch';
    element.style.scrollBehavior = 'smooth';
    
    // 优化滚动性能
    element.style.transform = 'translateZ(0)';
    element.style.willChange = 'scroll-position';
  }

  static enableMomentumScrolling(element: HTMLElement): void {
    element.style.webkitOverflowScrolling = 'touch';
    element.style.overflowX = 'hidden';
    element.style.overflowY = 'auto';
  }
}

/**
 * 视口优化工具类
 */
class ViewportOptimization {
  static setOptimalViewport(): void {
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }
    
    // 优化的视口配置
    viewportMeta.content = [
      'width=device-width',
      'initial-scale=1.0',
      'maximum-scale=5.0',
      'minimum-scale=1.0',
      'user-scalable=yes',
      'viewport-fit=cover'
    ].join(', ');
  }

  static enableSafeArea(): void {
    // 添加安全区域支持
    document.documentElement.style.setProperty(
      '--safe-area-inset-top',
      'env(safe-area-inset-top, 0px)'
    );
    document.documentElement.style.setProperty(
      '--safe-area-inset-right',
      'env(safe-area-inset-right, 0px)'
    );
    document.documentElement.style.setProperty(
      '--safe-area-inset-bottom',
      'env(safe-area-inset-bottom, 0px)'
    );
    document.documentElement.style.setProperty(
      '--safe-area-inset-left',
      'env(safe-area-inset-left, 0px)'
    );
  }
}

const MobilePerformanceWrapper: React.FC<MobilePerformanceWrapperProps> = ({
  children,
  enableHardwareAcceleration = true,
  enableTouchOptimization = true,
  enableViewportOptimization = true,
  enableScrollOptimization = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const device = useDeviceDetection();

  // 应用硬件加速
  useEffect(() => {
    if (!enableHardwareAcceleration || !device.isMobile || !containerRef.current) return;

    const element = containerRef.current;
    HardwareAcceleration.enableForElement(element);
    HardwareAcceleration.enableCompositing(element);

    return () => {
      HardwareAcceleration.disableForElement(element);
    };
  }, [enableHardwareAcceleration, device.isMobile]);

  // 应用触摸优化
  useEffect(() => {
    if (!enableTouchOptimization || !device.isTouchDevice || !containerRef.current) return;

    const element = containerRef.current;
    TouchOptimization.optimizeElement(element);
    TouchOptimization.enableFastClick(element);
  }, [enableTouchOptimization, device.isTouchDevice]);

  // 应用滚动优化
  useEffect(() => {
    if (!enableScrollOptimization || !device.isMobile || !containerRef.current) return;

    const element = containerRef.current;
    ScrollOptimization.optimizeContainer(element);
    ScrollOptimization.enableMomentumScrolling(element);
  }, [enableScrollOptimization, device.isMobile]);

  // 应用视口优化
  useEffect(() => {
    if (!enableViewportOptimization || !device.isMobile) return;

    ViewportOptimization.setOptimalViewport();
    ViewportOptimization.enableSafeArea();
  }, [enableViewportOptimization, device.isMobile]);

  // 性能监控
  useEffect(() => {
    if (!device.isMobile) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
          console.log('📱 移动端性能指标:', {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime
          });
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (e) {
      // 某些浏览器可能不支持所有类型
    }

    return () => observer.disconnect();
  }, [device.isMobile]);

  // 内存清理
  useEffect(() => {
    if (!device.isMobile) return;

    const cleanup = () => {
      // 清理GPU资源
      if (enableHardwareAcceleration && containerRef.current) {
        HardwareAcceleration.disableForElement(containerRef.current);
      }
      
      // 强制垃圾回收（仅开发环境）
      if (process.env.NODE_ENV === 'development' && 'gc' in window) {
        // @ts-ignore
        window.gc();
      }
    };

    // 页面隐藏时清理
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cleanup();
      }
    });

    return cleanup;
  }, [device.isMobile, enableHardwareAcceleration]);

  // 动态CSS类
  const optimizedClassName = [
    className,
    device.isMobile ? 'mobile-optimized' : '',
    device.isTouchDevice ? 'touch-optimized' : '',
    enableHardwareAcceleration ? 'hardware-accelerated' : '',
    'mobile-performance-wrapper'
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={containerRef}
      className={optimizedClassName}
      style={{
        // 基础优化样式
        position: 'relative',
        // 硬件加速相关（由useEffect动态设置）
        ...(enableHardwareAcceleration && device.isMobile ? {
          willChange: 'transform',
        } : {}),
        // 触摸优化相关
        ...(enableTouchOptimization && device.isTouchDevice ? {
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        } : {}),
        // 滚动优化相关
        ...(enableScrollOptimization && device.isMobile ? {
          WebkitOverflowScrolling: 'touch',
        } : {})
      }}
    >
      {children}
    </div>
  );
};

/**
 * 高阶组件版本
 */
export function withMobilePerformance<P extends object>(
  Component: React.ComponentType<P>,
  config: Omit<MobilePerformanceWrapperProps, 'children'> = {}
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <MobilePerformanceWrapper {...config}>
      <Component {...props} />
    </MobilePerformanceWrapper>
  );

  WrappedComponent.displayName = `withMobilePerformance(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * 移动端性能优化Hook
 */
export function useMobilePerformanceOptimization() {
  const device = useDeviceDetection();

  const optimizeElement = useCallback((element: HTMLElement) => {
    if (!device.isMobile) return;

    HardwareAcceleration.enableForElement(element);
    
    if (device.isTouchDevice) {
      TouchOptimization.optimizeElement(element);
    }
  }, [device.isMobile, device.isTouchDevice]);

  const enableScrollOptimization = useCallback((element: HTMLElement) => {
    if (!device.isMobile) return;

    ScrollOptimization.optimizeContainer(element);
  }, [device.isMobile]);

  return {
    optimizeElement,
    enableScrollOptimization,
    device,
    HardwareAcceleration,
    TouchOptimization,
    ScrollOptimization
  };
}

export default MobilePerformanceWrapper;