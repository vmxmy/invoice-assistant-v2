/**
 * 页面切换动画组件
 * 提供多种切换效果，支持路由动画和手势导航
 */

import React, { ReactNode } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { PAGE_TRANSITIONS, animationSystem } from './animationSystem';

// 页面切换方向
export type TransitionDirection = 'forward' | 'backward' | 'up' | 'down';

// 页面切换类型
export type TransitionType = 'slideHorizontal' | 'slideVertical' | 'fade' | 'scale';

// 页面转场配置
export interface PageTransitionConfig {
  type: TransitionType;
  direction: TransitionDirection;
  enableGestures: boolean;
  swipeThreshold: number;
  dragElastic: number;
}

interface PageTransitionsProps {
  children: ReactNode;
  config?: Partial<PageTransitionConfig>;
  className?: string;
}

interface AnimatedPageProps {
  children: ReactNode;
  pageKey: string;
  config: PageTransitionConfig;
}

const DEFAULT_CONFIG: PageTransitionConfig = {
  type: 'slideHorizontal',
  direction: 'forward',
  enableGestures: true,
  swipeThreshold: 50,
  dragElastic: 0.2
};

/**
 * 单个页面动画包装器
 */
const AnimatedPage: React.FC<AnimatedPageProps> = ({ 
  children, 
  pageKey, 
  config 
}) => {
  const navigate = useNavigate();
  
  // 获取优化后的动画配置
  const animationConfig = animationSystem.getOptimizedConfig(
    'page', 
    PAGE_TRANSITIONS[config.type]
  );
  
  // 手势处理
  const handleDragEnd = (_: any, info: PanInfo) => {
    if (!config.enableGestures) return;
    
    const { offset, velocity } = info;
    const threshold = config.swipeThreshold;
    
    // 水平手势导航
    if (Math.abs(offset.x) > threshold || Math.abs(velocity.x) > 500) {
      if (offset.x > 0) {
        // 右滑 - 返回上一页
        navigate(-1);
      } else {
        // 左滑 - 前进（如果有历史记录）
        // 这里可以实现自定义的前进逻辑
      }
    }
  };
  
  return (
    <motion.div
      key={pageKey}
      {...animationConfig}
      initial="initial"
      animate="animate"
      exit="exit"
      drag={config.enableGestures ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={config.dragElastic}
      onDragEnd={handleDragEnd}
      className="page-container"
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden'
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * 页面切换动画容器
 */
export const PageTransitions: React.FC<PageTransitionsProps> = ({
  children,
  config = {},
  className = ''
}) => {
  const location = useLocation();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return (
    <div className={`page-transitions-container ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        <AnimatedPage
          key={location.pathname}
          pageKey={location.pathname}
          config={finalConfig}
        >
          {children}
        </AnimatedPage>
      </AnimatePresence>
    </div>
  );
};

/**
 * 路由切换动画钩子
 */
export const usePageTransition = (config?: Partial<PageTransitionConfig>) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const transitionConfig = { ...DEFAULT_CONFIG, ...config };
  
  // 带动画的导航函数
  const navigateWithTransition = (
    to: string, 
    direction: TransitionDirection = 'forward'
  ) => {
    // 设置过渡方向
    const updatedConfig = { ...transitionConfig, direction };
    
    // 执行导航
    navigate(to, { 
      state: { 
        transitionConfig: updatedConfig 
      } 
    });
  };
  
  // 返回上一页动画
  const goBackWithTransition = () => {
    navigate(-1);
  };
  
  return {
    currentPath: location.pathname,
    navigateWithTransition,
    goBackWithTransition,
    transitionConfig
  };
};

/**
 * 页面切换手势识别组件
 */
interface SwipeNavigationProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  children: ReactNode;
  className?: string;
}

export const SwipeNavigation: React.FC<SwipeNavigationProps> = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  children,
  className = ''
}) => {
  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    
    // 检查是否达到手势阈值
    const exceedsThreshold = (value: number) => 
      Math.abs(value) > threshold || Math.abs(velocity.x) > 500;
    
    // 水平手势
    if (exceedsThreshold(offset.x)) {
      if (offset.x > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (offset.x < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    // 垂直手势
    if (exceedsThreshold(offset.y)) {
      if (offset.y > 0 && onSwipeDown) {
        onSwipeDown();
      } else if (offset.y < 0 && onSwipeUp) {
        onSwipeUp();
      }
    }
  };
  
  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      className={`swipe-navigation ${className}`}
      whileDrag={{ 
        cursor: 'grabbing',
        scale: 0.95
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * 模态框页面切换
 */
interface ModalPageTransitionProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: 'slideUp' | 'scale' | 'fade';
}

export const ModalPageTransition: React.FC<ModalPageTransitionProps> = ({
  isOpen,
  onClose,
  children,
  variant = 'slideUp'
}) => {
  const variants = {
    slideUp: {
      initial: { y: '100%', opacity: 0.9 },
      animate: { y: 0, opacity: 1 },
      exit: { y: '100%', opacity: 0.9 }
    },
    scale: {
      initial: { scale: 0.8, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0.8, opacity: 0 }
    },
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    }
  };
  
  const animationConfig = animationSystem.getOptimizedConfig(
    'modal', 
    variants[variant]
  );
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          
          {/* 模态框内容 */}
          <motion.div
            {...animationConfig}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden'
            }}
          >
            <div 
              className="w-full h-full max-w-md max-h-[80vh] bg-white rounded-lg shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// 导出页面切换相关的CSS类
export const pageTransitionStyles = `
.page-transitions-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.page-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.swipe-navigation {
  touch-action: pan-y pinch-zoom;
}

/* 性能优化 */
.page-transitions-container * {
  will-change: transform;
  backface-visibility: hidden;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .page-container {
    overflow-x: hidden;
  }
}
`;