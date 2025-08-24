import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { Trash2, Star, Archive, Edit, MoreHorizontal } from 'lucide-react';
import { useEnhancedGestures } from '../../hooks/useEnhancedGestures';

interface SwipeAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: 'red' | 'yellow' | 'blue' | 'green' | 'gray';
  action: () => void;
  destructive?: boolean;
}

interface SwipeableItemProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipe?: (direction: 'left' | 'right', actionId?: string) => void;
  disabled?: boolean;
  swipeThreshold?: number;
  snapThreshold?: number;
  className?: string;
}

const defaultLeftActions: SwipeAction[] = [
  {
    id: 'star',
    label: '收藏',
    icon: <Star className="w-5 h-5" />,
    color: 'yellow',
    action: () => console.log('Star action'),
  },
  {
    id: 'archive',
    label: '归档',
    icon: <Archive className="w-5 h-5" />,
    color: 'blue',
    action: () => console.log('Archive action'),
  },
];

const defaultRightActions: SwipeAction[] = [
  {
    id: 'edit',
    label: '编辑',
    icon: <Edit className="w-5 h-5" />,
    color: 'gray',
    action: () => console.log('Edit action'),
  },
  {
    id: 'delete',
    label: '删除',
    icon: <Trash2 className="w-5 h-5" />,
    color: 'red',
    destructive: true,
    action: () => console.log('Delete action'),
  },
];

export const SwipeableItem: React.FC<SwipeableItemProps> = ({
  children,
  leftActions = defaultLeftActions,
  rightActions = defaultRightActions,
  onSwipe,
  disabled = false,
  swipeThreshold = 80,
  snapThreshold = 40,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const controls = useAnimation();

  // 计算动作按钮的宽度
  const actionWidth = 80; // 每个动作按钮80px宽度
  const leftActionsWidth = leftActions.length * actionWidth;
  const rightActionsWidth = rightActions.length * actionWidth;

  // 计算背景透明度和按钮缩放
  const leftOpacity = useTransform(x, [0, leftActionsWidth], [0, 1]);
  const rightOpacity = useTransform(x, [-rightActionsWidth, 0], [1, 0]);
  
  const leftScale = useTransform(x, [0, leftActionsWidth / 2, leftActionsWidth], [0.8, 0.9, 1]);
  const rightScale = useTransform(x, [-rightActionsWidth, -rightActionsWidth / 2, 0], [1, 0.9, 0.8]);

  // 颜色映射
  const getActionColor = useCallback((color: SwipeAction['color']) => {
    const colors = {
      red: 'bg-error text-error-content',
      yellow: 'bg-warning text-warning-content', 
      blue: 'bg-info text-info-content',
      green: 'bg-success text-success-content',
      gray: 'bg-base-300 text-base-content',
    };
    return colors[color];
  }, []);

  // 关闭滑动菜单
  const closeSwipe = useCallback(async () => {
    await controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } });
    setIsOpen(null);
    x.set(0);
  }, [controls, x]);

  // 打开滑动菜单
  const openSwipe = useCallback(async (direction: 'left' | 'right') => {
    const targetX = direction === 'left' ? leftActionsWidth : -rightActionsWidth;
    await controls.start({ x: targetX, transition: { type: 'spring', stiffness: 300, damping: 25 } });
    setIsOpen(direction);
    x.set(targetX);
  }, [controls, x, leftActionsWidth, rightActionsWidth]);

  // 处理动作执行
  const handleActionClick = useCallback(async (action: SwipeAction, direction: 'left' | 'right') => {
    // 先关闭滑动菜单
    await closeSwipe();
    
    // 执行动作
    action.action();
    onSwipe?.(direction, action.id);

    // 触觉反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(action.destructive ? 50 : 30);
    }
  }, [closeSwipe, onSwipe]);

  // 拖拽处理
  const handleDragStart = useCallback(() => {
    setDragStartX(x.get());
  }, [x]);

  const handleDrag = useCallback((event: any, info: PanInfo) => {
    if (disabled) return;

    const currentX = dragStartX + info.offset.x;
    
    // 限制拖拽范围
    const clampedX = Math.max(-rightActionsWidth, Math.min(leftActionsWidth, currentX));
    x.set(clampedX);
  }, [disabled, dragStartX, x, leftActionsWidth, rightActionsWidth]);

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    if (disabled) return;

    const currentX = x.get();
    const velocity = info.velocity.x;
    const threshold = snapThreshold;

    // 根据速度和位置决定最终状态
    if (Math.abs(velocity) > 500) {
      // 快速滑动
      if (velocity > 0 && leftActions.length > 0) {
        openSwipe('left');
      } else if (velocity < 0 && rightActions.length > 0) {
        openSwipe('right');
      } else {
        closeSwipe();
      }
    } else if (currentX > threshold && leftActions.length > 0) {
      // 向右滑动超过阈值
      if (currentX >= swipeThreshold) {
        // 如果滑动距离足够大，直接执行第一个动作
        const firstAction = leftActions[0];
        handleActionClick(firstAction, 'left');
      } else {
        openSwipe('left');
      }
    } else if (currentX < -threshold && rightActions.length > 0) {
      // 向左滑动超过阈值  
      if (Math.abs(currentX) >= swipeThreshold) {
        // 如果滑动距离足够大，直接执行第一个动作
        const firstAction = rightActions[0];
        handleActionClick(firstAction, 'right');
      } else {
        openSwipe('right');
      }
    } else {
      closeSwipe();
    }
  }, [
    disabled,
    x,
    snapThreshold,
    swipeThreshold,
    leftActions,
    rightActions,
    openSwipe,
    closeSwipe,
    handleActionClick,
  ]);

  // 增强手势支持
  const { touchHandlers } = useEnhancedGestures({
    onSwipeLeft: (velocity, distance) => {
      if (disabled || rightActions.length === 0) return;
      
      if (distance >= swipeThreshold) {
        // 快速滑动直接执行动作
        const firstAction = rightActions[0];
        handleActionClick(firstAction, 'right');
      } else {
        openSwipe('right');
      }
    },
    onSwipeRight: (velocity, distance) => {
      if (disabled || leftActions.length === 0) return;
      
      if (distance >= swipeThreshold) {
        // 快速滑动直接执行动作
        const firstAction = leftActions[0];
        handleActionClick(firstAction, 'left');
      } else {
        openSwipe('left');
      }
    },
    onTap: () => {
      if (isOpen) {
        closeSwipe();
      }
    },
  }, {
    swipeThreshold: snapThreshold,
    swipeVelocityThreshold: 0.3,
    enableHaptics: true,
    hapticIntensity: 'light',
  });

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeSwipe();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, closeSwipe]);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      {...touchHandlers}
    >
      {/* 左侧动作背景 */}
      {leftActions.length > 0 && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 flex items-center"
          style={{
            width: leftActionsWidth,
            opacity: leftOpacity,
            scale: leftScale,
          }}
        >
          {leftActions.map((action, index) => (
            <motion.button
              key={action.id}
              className={`
                flex flex-col items-center justify-center h-full
                transition-colors duration-200 hover:brightness-110
                ${getActionColor(action.color)}
              `}
              style={{ width: actionWidth }}
              onClick={() => handleActionClick(action, 'left')}
              whileTap={{ scale: 0.95 }}
              initial={{ x: -20, opacity: 0 }}
              animate={{ 
                x: 0, 
                opacity: 1,
                transition: { delay: index * 0.05 }
              }}
            >
              <div className="mb-1">
                {action.icon}
              </div>
              <span className="text-xs font-medium">{action.label}</span>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* 右侧动作背景 */}
      {rightActions.length > 0 && (
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex items-center"
          style={{
            width: rightActionsWidth,
            opacity: rightOpacity,
            scale: rightScale,
          }}
        >
          {rightActions.map((action, index) => (
            <motion.button
              key={action.id}
              className={`
                flex flex-col items-center justify-center h-full
                transition-colors duration-200 hover:brightness-110
                ${getActionColor(action.color)}
              `}
              style={{ width: actionWidth }}
              onClick={() => handleActionClick(action, 'right')}
              whileTap={{ scale: 0.95 }}
              initial={{ x: 20, opacity: 0 }}
              animate={{ 
                x: 0, 
                opacity: 1,
                transition: { delay: index * 0.05 }
              }}
            >
              <div className="mb-1">
                {action.icon}
              </div>
              <span className="text-xs font-medium">{action.label}</span>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* 主内容 */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -rightActionsWidth, right: leftActionsWidth }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x }}
        animate={controls}
        className={`
          relative z-10 bg-base-100 
          ${disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
        `}
      >
        {children}
      </motion.div>

      {/* 滑动提示指示器 */}
      {!disabled && (
        <>
          {/* 左侧提示 */}
          {leftActions.length > 0 && (
            <motion.div
              className="absolute left-2 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none z-20"
              initial={{ opacity: 0, x: -10 }}
              animate={{ 
                opacity: isOpen === null ? 0.3 : 0, 
                x: isOpen === null ? 0 : -10,
                transition: { duration: 0.3 }
              }}
            >
              <div className="w-1 h-6 bg-base-content/50 rounded-full" />
            </motion.div>
          )}
          
          {/* 右侧提示 */}
          {rightActions.length > 0 && (
            <motion.div
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none z-20"
              initial={{ opacity: 0, x: 10 }}
              animate={{ 
                opacity: isOpen === null ? 0.3 : 0, 
                x: isOpen === null ? 0 : 10,
                transition: { duration: 0.3 }
              }}
            >
              <div className="w-1 h-6 bg-base-content/50 rounded-full" />
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default SwipeableItem;