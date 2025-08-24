import { useState, useEffect, useRef, useCallback } from 'react';
import { useDeviceDetection } from './useMediaQuery';

interface KeyboardAdjustmentOptions {
  /** 启用自动滚动到焦点元素 */
  autoScroll?: boolean;
  /** 滚动偏移量 */
  scrollOffset?: number;
  /** 启用视口调整 */
  adjustViewport?: boolean;
  /** 调整延迟时间 (ms) */
  adjustDelay?: number;
  /** 自定义键盘高度检测 */
  customKeyboardHeight?: number;
  /** 启用安全区域适配 */
  enableSafeArea?: boolean;
}

interface KeyboardState {
  /** 虚拟键盘是否显示 */
  isVisible: boolean;
  /** 键盘高度 (px) */
  height: number;
  /** 当前焦点的输入元素 */
  activeElement: HTMLElement | null;
  /** 视口高度变化 */
  viewportHeightChange: number;
}

interface KeyboardMethods {
  /** 手动滚动到指定元素 */
  scrollToElement: (element: HTMLElement, offset?: number) => void;
  /** 手动调整视口 */
  adjustViewport: (height: number) => void;
  /** 重置视口 */
  resetViewport: () => void;
  /** 获取安全区域信息 */
  getSafeAreaInsets: () => { top: number; bottom: number; left: number; right: number };
}

/**
 * 虚拟键盘适配系统 Hook
 * 监听虚拟键盘弹出/收起事件，自动调整视图位置避免遮挡
 */
export function useKeyboardAdjustment(
  options: KeyboardAdjustmentOptions = {}
): KeyboardState & KeyboardMethods {
  const {
    autoScroll = true,
    scrollOffset = 20,
    adjustViewport = true,
    adjustDelay = 150,
    customKeyboardHeight,
    enableSafeArea = true
  } = options;

  const device = useDeviceDetection();
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    activeElement: null,
    viewportHeightChange: 0
  });

  const initialViewportHeight = useRef<number>(0);
  const adjustmentTimer = useRef<NodeJS.Timeout>();
  const observer = useRef<ResizeObserver | null>(null);

  // 获取安全区域信息
  const getSafeAreaInsets = useCallback(() => {
    if (!enableSafeArea || typeof window === 'undefined') {
      return { top: 0, bottom: 0, left: 0, right: 0 };
    }

    const computedStyle = window.getComputedStyle(document.documentElement);
    
    return {
      top: parseInt(computedStyle.getPropertyValue('--sat') || '0'),
      bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0'),
      left: parseInt(computedStyle.getPropertyValue('--sal') || '0'),
      right: parseInt(computedStyle.getPropertyValue('--sar') || '0')
    };
  }, [enableSafeArea]);

  // 滚动到指定元素
  const scrollToElement = useCallback((element: HTMLElement, offset = scrollOffset) => {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const safeArea = getSafeAreaInsets();
    const availableHeight = window.innerHeight - keyboardState.height - safeArea.top - safeArea.bottom;
    
    // 检查元素是否被键盘遮挡
    const elementBottom = rect.bottom + offset;
    if (elementBottom > availableHeight) {
      const scrollAmount = elementBottom - availableHeight;
      window.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
      });
    }
  }, [keyboardState.height, scrollOffset, getSafeAreaInsets]);

  // 调整视口
  const adjustViewport = useCallback((height: number) => {
    if (!adjustViewport || typeof document === 'undefined') return;

    const viewport = document.querySelector('meta[name=viewport]') as HTMLMetaElement;
    if (!viewport) return;

    const safeArea = getSafeAreaInsets();
    const adjustedHeight = window.innerHeight - height - safeArea.bottom;

    // 设置CSS变量供组件使用
    document.documentElement.style.setProperty('--keyboard-height', `${height}px`);
    document.documentElement.style.setProperty('--available-height', `${adjustedHeight}px`);
    document.documentElement.style.setProperty('--viewport-adjustment', `${height}px`);
  }, [getSafeAreaInsets]);

  // 重置视口
  const resetViewport = useCallback(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.style.removeProperty('--keyboard-height');
    document.documentElement.style.removeProperty('--available-height');
    document.documentElement.style.removeProperty('--viewport-adjustment');
  }, []);

  // 检测键盘状态变化
  const detectKeyboardChange = useCallback(() => {
    if (typeof window === 'undefined' || !device.isMobile) return;

    const currentHeight = window.innerHeight;
    const heightDiff = initialViewportHeight.current - currentHeight;
    
    // 计算键盘高度（考虑安全区域）
    const safeArea = getSafeAreaInsets();
    const keyboardHeight = customKeyboardHeight || Math.max(0, heightDiff - safeArea.bottom);
    const isKeyboardVisible = keyboardHeight > 100; // 阈值过滤小的高度变化

    const activeElement = document.activeElement as HTMLElement;
    const isInputActive = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    );

    setKeyboardState(prev => ({
      ...prev,
      isVisible: isKeyboardVisible && isInputActive,
      height: isKeyboardVisible ? keyboardHeight : 0,
      activeElement: isInputActive ? activeElement : null,
      viewportHeightChange: heightDiff
    }));

    // 自动调整视口
    if (adjustViewport) {
      if (isKeyboardVisible && isInputActive) {
        adjustViewport(keyboardHeight);
      } else {
        resetViewport();
      }
    }

    // 自动滚动到焦点元素
    if (autoScroll && isKeyboardVisible && isInputActive && activeElement) {
      clearTimeout(adjustmentTimer.current);
      adjustmentTimer.current = setTimeout(() => {
        scrollToElement(activeElement);
      }, adjustDelay);
    }
  }, [
    device.isMobile,
    customKeyboardHeight,
    autoScroll,
    adjustViewport,
    adjustDelay,
    getSafeAreaInsets,
    scrollToElement,
    adjustViewport,
    resetViewport
  ]);

  // 处理输入框焦点事件
  const handleInputFocus = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    if (!target) return;

    setTimeout(() => {
      setKeyboardState(prev => ({
        ...prev,
        activeElement: target
      }));
      detectKeyboardChange();
    }, 50);
  }, [detectKeyboardChange]);

  const handleInputBlur = useCallback(() => {
    clearTimeout(adjustmentTimer.current);
    setTimeout(() => {
      detectKeyboardChange();
    }, 200); // 延迟检测，避免快速切换输入框时误判
  }, [detectKeyboardChange]);

  // Visual Viewport API 支持
  useEffect(() => {
    if (typeof window === 'undefined' || !device.isMobile) return;

    // 记录初始视口高度
    initialViewportHeight.current = window.innerHeight;

    // 优先使用 Visual Viewport API
    if ('visualViewport' in window && window.visualViewport) {
      const viewport = window.visualViewport;
      
      const handleViewportChange = () => {
        const keyboardHeight = window.innerHeight - viewport.height;
        const isKeyboardVisible = keyboardHeight > 100;
        
        const activeElement = document.activeElement as HTMLElement;
        const isInputActive = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.contentEditable === 'true'
        );

        setKeyboardState(prev => ({
          ...prev,
          isVisible: isKeyboardVisible && isInputActive,
          height: isKeyboardVisible ? keyboardHeight : 0,
          activeElement: isInputActive ? activeElement : null,
          viewportHeightChange: keyboardHeight
        }));

        if (adjustViewport) {
          if (isKeyboardVisible && isInputActive) {
            adjustViewport(keyboardHeight);
          } else {
            resetViewport();
          }
        }

        if (autoScroll && isKeyboardVisible && isInputActive && activeElement) {
          clearTimeout(adjustmentTimer.current);
          adjustmentTimer.current = setTimeout(() => {
            scrollToElement(activeElement);
          }, adjustDelay);
        }
      };

      viewport.addEventListener('resize', handleViewportChange);
      return () => viewport.removeEventListener('resize', handleViewportChange);
    }

    // 降级到 window resize 监听
    const handleWindowResize = () => {
      clearTimeout(adjustmentTimer.current);
      adjustmentTimer.current = setTimeout(detectKeyboardChange, 100);
    };

    window.addEventListener('resize', handleWindowResize);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      clearTimeout(adjustmentTimer.current);
    };
  }, [device.isMobile, autoScroll, adjustViewport, adjustDelay, detectKeyboardChange, scrollToElement, adjustViewport, resetViewport]);

  // 监听输入框焦点事件
  useEffect(() => {
    if (typeof document === 'undefined' || !device.isMobile) return;

    // 添加全局输入框事件监听
    document.addEventListener('focusin', handleInputFocus, { passive: true });
    document.addEventListener('focusout', handleInputBlur, { passive: true });

    return () => {
      document.removeEventListener('focusin', handleInputFocus);
      document.removeEventListener('focusout', handleInputBlur);
      clearTimeout(adjustmentTimer.current);
    };
  }, [device.isMobile, handleInputFocus, handleInputBlur]);

  // ResizeObserver 监听文档高度变化（备用方案）
  useEffect(() => {
    if (typeof window === 'undefined' || !device.isMobile) return;
    if ('visualViewport' in window && window.visualViewport) return; // 如果支持 Visual Viewport API，跳过

    observer.current = new ResizeObserver(() => {
      detectKeyboardChange();
    });

    observer.current.observe(document.body);

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [device.isMobile, detectKeyboardChange]);

  // 清理
  useEffect(() => {
    return () => {
      clearTimeout(adjustmentTimer.current);
      resetViewport();
    };
  }, [resetViewport]);

  return {
    ...keyboardState,
    scrollToElement,
    adjustViewport,
    resetViewport,
    getSafeAreaInsets
  };
}

export default useKeyboardAdjustment;