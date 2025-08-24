import { useState, useEffect, useRef, useCallback } from 'react';
import { useDeviceDetection } from './useMediaQuery';

interface UseMobileModalOptions {
  /** 是否支持下拉关闭手势 */
  enableSwipeToClose?: boolean;
  /** 是否支持左右滑动切换 */
  enableHorizontalSwipe?: boolean;
  /** 关闭阈值（像素） */
  closeThreshold?: number;
  /** 切换阈值（像素） */
  switchThreshold?: number;
  /** 动画持续时间（毫秒） */
  animationDuration?: number;
  /** 是否启用虚拟键盘适配 */
  keyboardAdaptation?: boolean;
}

interface SwipeState {
  startY: number;
  startX: number;
  currentY: number;
  currentX: number;
  isDragging: boolean;
  direction: 'vertical' | 'horizontal' | null;
}

interface KeyboardState {
  isVisible: boolean;
  height: number;
  initialViewportHeight: number;
}

export function useMobileModal({
  enableSwipeToClose = true,
  enableHorizontalSwipe = false,
  closeThreshold = 100,
  switchThreshold = 80,
  animationDuration = 300,
  keyboardAdaptation = true
}: UseMobileModalOptions = {}) {
  const device = useDeviceDetection();
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // 手势状态
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startY: 0,
    startX: 0,
    currentY: 0,
    currentX: 0,
    isDragging: false,
    direction: null
  });
  
  // 虚拟键盘状态
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    initialViewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0
  });
  
  // 模态框状态
  const [modalState, setModalState] = useState({
    isAnimating: false,
    transform: 'translateY(0px)',
    opacity: 1
  });

  // 检测虚拟键盘状态变化
  useEffect(() => {
    if (!keyboardAdaptation || !device.isMobile) return;

    const initialHeight = window.innerHeight;
    let resizeTimer: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const currentHeight = window.innerHeight;
        const heightDiff = initialHeight - currentHeight;
        const threshold = 150; // 键盘最小高度阈值

        setKeyboardState({
          initialViewportHeight: initialHeight,
          isVisible: heightDiff > threshold,
          height: Math.max(0, heightDiff)
        });
      }, 100);
    };

    // 监听视觉视口变化（更精确的键盘检测）
    if (window.visualViewport) {
      const handleVisualViewportChange = () => {
        const isKeyboardVisible = window.visualViewport!.height < initialHeight - 150;
        const keyboardHeight = initialHeight - window.visualViewport!.height;
        
        setKeyboardState({
          initialViewportHeight: initialHeight,
          isVisible: isKeyboardVisible,
          height: isKeyboardVisible ? keyboardHeight : 0
        });
      };

      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
      
      return () => {
        window.visualViewport?.removeEventListener('resize', handleVisualViewportChange);
        clearTimeout(resizeTimer);
      };
    } else {
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimer);
      };
    }
  }, [keyboardAdaptation, device.isMobile]);

  // 开始触摸
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!device.isMobile || (!enableSwipeToClose && !enableHorizontalSwipe)) return;

    const touch = e.touches[0];
    setSwipeState({
      startY: touch.clientY,
      startX: touch.clientX,
      currentY: touch.clientY,
      currentX: touch.clientX,
      isDragging: true,
      direction: null
    });
  }, [device.isMobile, enableSwipeToClose, enableHorizontalSwipe]);

  // 触摸移动
  const handleTouchMove = useCallback((e: React.TouchEvent, onSwipeLeft?: () => void, onSwipeRight?: () => void) => {
    if (!swipeState.isDragging) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - swipeState.startY;
    const deltaX = touch.clientX - swipeState.startX;
    
    // 确定滑动方向（首次移动超过阈值时）
    if (!swipeState.direction && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      const newDirection = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
      setSwipeState(prev => ({ ...prev, direction: newDirection }));
    }

    // 更新当前位置
    setSwipeState(prev => ({
      ...prev,
      currentY: touch.clientY,
      currentX: touch.clientX
    }));

    // 垂直滑动 - 用于关闭模态框
    if (swipeState.direction === 'vertical' && enableSwipeToClose && deltaY > 0) {
      // 防止过度拖拽
      const dampingFactor = Math.min(1, 1 - deltaY / (window.innerHeight * 0.8));
      const transform = `translateY(${deltaY * dampingFactor}px)`;
      const opacity = Math.max(0.3, 1 - deltaY / 300);

      setModalState({
        isAnimating: false,
        transform,
        opacity
      });

      // 阻止默认滚动行为
      e.preventDefault();
    }

    // 水平滑动 - 用于切换
    if (swipeState.direction === 'horizontal' && enableHorizontalSwipe) {
      const contentElement = contentRef.current;
      if (contentElement) {
        contentElement.style.transform = `translateX(${deltaX}px)`;
        contentElement.style.opacity = (1 - Math.abs(deltaX) / 200).toString();
      }

      // 阻止默认行为
      e.preventDefault();
    }
  }, [swipeState, enableSwipeToClose, enableHorizontalSwipe]);

  // 触摸结束
  const handleTouchEnd = useCallback((
    onClose?: () => void,
    onSwipeLeft?: () => void,
    onSwipeRight?: () => void
  ) => {
    if (!swipeState.isDragging) return;

    const deltaY = swipeState.currentY - swipeState.startY;
    const deltaX = swipeState.currentX - swipeState.startX;
    const velocityY = Math.abs(deltaY);
    const velocityX = Math.abs(deltaX);

    // 垂直滑动处理
    if (swipeState.direction === 'vertical' && enableSwipeToClose) {
      if (deltaY > closeThreshold || velocityY > 50) {
        // 关闭模态框
        setModalState({
          isAnimating: true,
          transform: 'translateY(100%)',
          opacity: 0
        });
        
        setTimeout(() => {
          onClose?.();
          resetModalState();
        }, animationDuration);
      } else {
        // 回弹到原位
        setModalState({
          isAnimating: true,
          transform: 'translateY(0px)',
          opacity: 1
        });
      }
    }

    // 水平滑动处理
    if (swipeState.direction === 'horizontal' && enableHorizontalSwipe) {
      const contentElement = contentRef.current;
      if (contentElement) {
        if (deltaX > switchThreshold && onSwipeRight) {
          // 向右滑动
          contentElement.style.transition = `transform ${animationDuration}ms ease-out`;
          contentElement.style.transform = 'translateX(100%)';
          setTimeout(() => {
            onSwipeRight();
            resetContentTransform();
          }, animationDuration);
        } else if (deltaX < -switchThreshold && onSwipeLeft) {
          // 向左滑动
          contentElement.style.transition = `transform ${animationDuration}ms ease-out`;
          contentElement.style.transform = 'translateX(-100%)';
          setTimeout(() => {
            onSwipeLeft();
            resetContentTransform();
          }, animationDuration);
        } else {
          // 回弹到原位
          contentElement.style.transition = `all ${animationDuration}ms ease-out`;
          contentElement.style.transform = 'translateX(0px)';
          contentElement.style.opacity = '1';
        }
      }
    }

    // 重置手势状态
    setSwipeState({
      startY: 0,
      startX: 0,
      currentY: 0,
      currentX: 0,
      isDragging: false,
      direction: null
    });
  }, [swipeState, enableSwipeToClose, enableHorizontalSwipe, closeThreshold, switchThreshold, animationDuration]);

  // 重置模态框状态
  const resetModalState = useCallback(() => {
    setModalState({
      isAnimating: false,
      transform: 'translateY(0px)',
      opacity: 1
    });
  }, []);

  // 重置内容转换
  const resetContentTransform = useCallback(() => {
    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.style.transition = '';
      contentElement.style.transform = '';
      contentElement.style.opacity = '';
    }
  }, []);

  // 获取模态框样式
  const getModalStyles = useCallback(() => {
    const baseStyles: React.CSSProperties = {
      transform: modalState.transform,
      opacity: modalState.opacity,
      transition: modalState.isAnimating ? `all ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none'
    };

    // 移动端全屏样式
    if (device.isMobile) {
      return {
        ...baseStyles,
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: keyboardState.isVisible ? 
          `${keyboardState.initialViewportHeight - keyboardState.height}px` : 
          '100vh',
        maxWidth: 'none',
        maxHeight: 'none',
        margin: 0,
        borderRadius: 0,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      };
    }

    return baseStyles;
  }, [modalState, animationDuration, device.isMobile, keyboardState]);

  // 获取内容区域样式
  const getContentStyles = useCallback(() => {
    if (device.isMobile) {
      return {
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        overflow: 'hidden'
      };
    }
    
    return {};
  }, [device.isMobile]);

  // 获取滚动区域样式
  const getScrollAreaStyles = useCallback(() => {
    if (device.isMobile) {
      return {
        flex: 1,
        overflowY: 'auto' as const,
        WebkitOverflowScrolling: 'touch',
        paddingBottom: keyboardState.isVisible ? '16px' : '0px'
      };
    }
    
    return {};
  }, [device.isMobile, keyboardState.isVisible]);

  // 触觉反馈
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  return {
    // 状态
    device,
    swipeState,
    keyboardState,
    modalState,
    
    // 事件处理器
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    
    // 样式获取器
    getModalStyles,
    getContentStyles, 
    getScrollAreaStyles,
    
    // 引用
    modalRef,
    contentRef,
    
    // 工具函数
    resetModalState,
    resetContentTransform,
    triggerHapticFeedback,
    
    // 便捷属性
    isMobile: device.isMobile,
    isKeyboardVisible: keyboardState.isVisible,
    isDragging: swipeState.isDragging
  };
}

export default useMobileModal;