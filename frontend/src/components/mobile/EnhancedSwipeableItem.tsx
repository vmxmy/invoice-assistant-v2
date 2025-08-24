import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  Star, 
  Archive, 
  Edit, 
  Check, 
  X, 
  ChevronRight,
  AlertTriangle,
  BookOpen,
  Tag
} from 'lucide-react';
import { gestureSystemManager, GestureHandler } from '../../services/gestureSystemManager';
import { useTouchFeedback } from '../../hooks/useTouchFeedback';

export interface SwipeAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: 'red' | 'yellow' | 'blue' | 'green' | 'gray' | 'purple' | 'orange';
  action: () => void | Promise<void>;
  destructive?: boolean;
  requiresConfirmation?: boolean;
  confirmationText?: string;
}

interface EnhancedSwipeableItemProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipe?: (direction: 'left' | 'right', actionId: string, action: SwipeAction) => void;
  disabled?: boolean;
  swipeThreshold?: number;
  snapThreshold?: number;
  maxActionsVisible?: number;
  className?: string;
  hapticFeedback?: boolean;
  animationDuration?: number;
  enableQuickAction?: boolean;
  quickActionThreshold?: number;
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
    requiresConfirmation: true,
    confirmationText: '确认删除此项目？',
    action: () => console.log('Delete action'),
  },
];

export const EnhancedSwipeableItem: React.FC<EnhancedSwipeableItemProps> = ({
  children,
  leftActions = defaultLeftActions,
  rightActions = defaultRightActions,
  onSwipe,
  disabled = false,
  swipeThreshold = 80,
  snapThreshold = 40,
  maxActionsVisible = 3,
  className = '',
  hapticFeedback = true,
  animationDuration = 0.3,
  enableQuickAction = true,
  quickActionThreshold = 120,
}) => {
  const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<SwipeAction | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const handlerIdRef = useRef<string>(`swipeable-${Math.random().toString(36).substr(2, 9)}`);
  const x = useMotionValue(0);
  const controls = useAnimation();

  const { triggerFeedback } = useTouchFeedback();

  // 限制显示的动作数量
  const visibleLeftActions = leftActions.slice(0, maxActionsVisible);
  const visibleRightActions = rightActions.slice(0, maxActionsVisible);

  // 计算动作按钮的宽度
  const actionWidth = 80;
  const leftActionsWidth = visibleLeftActions.length * actionWidth;
  const rightActionsWidth = visibleRightActions.length * actionWidth;

  // 计算背景效果
  const leftOpacity = useTransform(x, [0, leftActionsWidth], [0, 1]);
  const rightOpacity = useTransform(x, [-rightActionsWidth, 0], [1, 0]);
  
  const leftScale = useTransform(
    x, 
    [0, leftActionsWidth / 3, leftActionsWidth], 
    [0.8, 0.95, 1]
  );
  const rightScale = useTransform(
    x, 
    [-rightActionsWidth, -rightActionsWidth / 3, 0], 
    [1, 0.95, 0.8]
  );

  // 快速动作指示器
  const quickActionOpacity = useTransform(
    x,
    enableQuickAction 
      ? [-quickActionThreshold, -rightActionsWidth, rightActionsWidth, quickActionThreshold]
      : [0, 0, 0, 0],
    [1, 0, 0, 1]
  );

  // 颜色映射
  const getActionColor = useCallback((color: SwipeAction['color']) => {
    const colors = {
      red: 'bg-error text-error-content hover:bg-error/90',
      yellow: 'bg-warning text-warning-content hover:bg-warning/90', 
      blue: 'bg-info text-info-content hover:bg-info/90',
      green: 'bg-success text-success-content hover:bg-success/90',
      gray: 'bg-base-300 text-base-content hover:bg-base-200',
      purple: 'bg-secondary text-secondary-content hover:bg-secondary/90',
      orange: 'bg-accent text-accent-content hover:bg-accent/90',
    };
    return colors[color];
  }, []);

  // 关闭滑动菜单
  const closeSwipe = useCallback(async () => {
    await controls.start({ 
      x: 0, 
      transition: { 
        type: 'spring', 
        stiffness: 300, 
        damping: 30,
        duration: animationDuration 
      } 
    });
    setIsOpen(null);
    setSwipeDirection(null);
    x.set(0);
  }, [controls, x, animationDuration]);

  // 打开滑动菜单
  const openSwipe = useCallback(async (direction: 'left' | 'right') => {
    const targetX = direction === 'left' ? leftActionsWidth : -rightActionsWidth;
    await controls.start({ 
      x: targetX, 
      transition: { 
        type: 'spring', 
        stiffness: 300, 
        damping: 30,
        duration: animationDuration 
      } 
    });
    setIsOpen(direction);
    setSwipeDirection(direction);
    x.set(targetX);

    if (hapticFeedback) {
      triggerFeedback('light');
    }
  }, [controls, x, leftActionsWidth, rightActionsWidth, animationDuration, hapticFeedback, triggerFeedback]);

  // 执行动作
  const executeAction = useCallback(async (action: SwipeAction, direction: 'left' | 'right') => {
    if (isPerformingAction) return;

    if (action.requiresConfirmation) {
      setShowConfirmation(action);
      return;
    }

    setIsPerformingAction(true);

    try {
      // 先关闭滑动菜单
      await closeSwipe();
      
      // 执行动作
      await action.action();
      onSwipe?.(direction, action.id, action);

      // 触觉反馈
      if (hapticFeedback) {
        triggerFeedback(action.destructive ? 'heavy' : 'medium');
      }

      // 手势播报
      gestureSystemManager.announceGesture(`${action.label} action completed`);

    } catch (error) {
      console.error(`Action ${action.id} failed:`, error);
      
      if (hapticFeedback) {
        triggerFeedback('heavy');
      }
    } finally {
      setIsPerformingAction(false);
    }
  }, [closeSwipe, onSwipe, hapticFeedback, triggerFeedback, isPerformingAction]);

  // 确认动作执行
  const confirmAction = useCallback(async () => {
    if (showConfirmation) {
      await executeAction(showConfirmation, isOpen || 'right');
      setShowConfirmation(null);
    }
  }, [showConfirmation, executeAction, isOpen]);

  // 注册手势处理器
  useEffect(() => {
    if (!containerRef.current || disabled) return;

    const handler: GestureHandler = {
      id: handlerIdRef.current,
      element: containerRef.current,
      enabled: true,
      zIndex: 1,
      handlers: {
        onSwipeLeft: (event) => {
          if (visibleRightActions.length === 0) return;
          
          const distance = event.distance || 0;
          
          if (enableQuickAction && distance >= quickActionThreshold) {
            // 快速动作：直接执行第一个动作
            const firstAction = visibleRightActions[0];
            executeAction(firstAction, 'right');
          } else if (distance >= swipeThreshold) {
            // 显示动作菜单
            openSwipe('right');
          }
        },
        onSwipeRight: (event) => {
          if (visibleLeftActions.length === 0) return;
          
          const distance = event.distance || 0;
          
          if (enableQuickAction && distance >= quickActionThreshold) {
            // 快速动作：直接执行第一个动作
            const firstAction = visibleLeftActions[0];
            executeAction(firstAction, 'left');
          } else if (distance >= swipeThreshold) {
            // 显示动作菜单
            openSwipe('left');
          }
        },
        onDragStart: (event) => {
          setDragStartX(event.position.x);
        },
        onDrag: (event) => {
          if (!event.delta) return;
          
          const currentX = dragStartX + event.delta.x;
          
          // 限制拖拽范围并添加阻尼效果
          let clampedX = Math.max(-rightActionsWidth * 1.2, Math.min(leftActionsWidth * 1.2, currentX));
          
          // 在边界处添加阻尼效果
          const damping = 0.3;
          if (clampedX > leftActionsWidth) {
            clampedX = leftActionsWidth + (clampedX - leftActionsWidth) * damping;
          } else if (clampedX < -rightActionsWidth) {
            clampedX = -rightActionsWidth + (clampedX + rightActionsWidth) * damping;
          }
          
          x.set(clampedX);
        },
        onDragEnd: (event) => {
          const currentX = x.get();
          const velocity = event.velocity?.x || 0;
          const threshold = snapThreshold;

          // 根据速度和位置决定最终状态
          if (Math.abs(velocity) > 0.5) {
            // 基于速度的快速滑动
            if (velocity > 0 && visibleLeftActions.length > 0) {
              if (velocity > 1 && enableQuickAction) {
                const firstAction = visibleLeftActions[0];
                executeAction(firstAction, 'left');
              } else {
                openSwipe('left');
              }
            } else if (velocity < 0 && visibleRightActions.length > 0) {
              if (velocity < -1 && enableQuickAction) {
                const firstAction = visibleRightActions[0];
                executeAction(firstAction, 'right');
              } else {
                openSwipe('right');
              }
            } else {
              closeSwipe();
            }
          } else if (currentX > threshold && visibleLeftActions.length > 0) {
            // 向右滑动超过阈值
            if (currentX >= quickActionThreshold && enableQuickAction) {
              const firstAction = visibleLeftActions[0];
              executeAction(firstAction, 'left');
            } else {
              openSwipe('left');
            }
          } else if (currentX < -threshold && visibleRightActions.length > 0) {
            // 向左滑动超过阈值
            if (Math.abs(currentX) >= quickActionThreshold && enableQuickAction) {
              const firstAction = visibleRightActions[0];
              executeAction(firstAction, 'right');
            } else {
              openSwipe('right');
            }
          } else {
            closeSwipe();
          }
        },
        onTap: () => {
          if (isOpen) {
            closeSwipe();
          }
        },
      },
      config: {
        swipeThreshold: snapThreshold,
        dragThreshold: 5,
        enableHaptics: hapticFeedback,
        hapticIntensity: 'light',
        conflictStrategy: 'priority',
        gesturePriority: ['drag', 'swipe', 'tap'],
      },
    };

    gestureSystemManager.register(handler);

    return () => {
      gestureSystemManager.unregister(handlerIdRef.current);
    };
  }, [
    disabled,
    visibleLeftActions,
    visibleRightActions,
    swipeThreshold,
    snapThreshold,
    quickActionThreshold,
    enableQuickAction,
    hapticFeedback,
    dragStartX,
    x,
    leftActionsWidth,
    rightActionsWidth,
    executeAction,
    openSwipe,
    closeSwipe,
    isOpen,
  ]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeSwipe();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, closeSwipe]);

  return (
    <>
      <div 
        ref={containerRef}
        className={`relative overflow-hidden ${className}`}
      >
        {/* 左侧动作背景 */}
        {visibleLeftActions.length > 0 && (
          <motion.div
            className="absolute left-0 top-0 bottom-0 flex items-center"
            style={{
              width: leftActionsWidth,
              opacity: leftOpacity,
              scale: leftScale,
            }}
          >
            {visibleLeftActions.map((action, index) => (
              <motion.button
                key={action.id}
                className={`
                  flex flex-col items-center justify-center h-full
                  transition-all duration-200 active:scale-95
                  ${getActionColor(action.color)}
                  ${isPerformingAction ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                style={{ width: actionWidth }}
                onClick={() => executeAction(action, 'left')}
                disabled={isPerformingAction}
                whileTap={{ scale: 0.95 }}
                initial={{ x: -20, opacity: 0 }}
                animate={{ 
                  x: 0, 
                  opacity: 1,
                  transition: { delay: index * 0.05 }
                }}
                aria-label={action.label}
              >
                <motion.div 
                  className="mb-1"
                  animate={isPerformingAction ? { rotate: 360 } : {}}
                  transition={isPerformingAction ? { repeat: Infinity, duration: 1 } : {}}
                >
                  {action.icon}
                </motion.div>
                <span className="text-xs font-medium">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* 右侧动作背景 */}
        {visibleRightActions.length > 0 && (
          <motion.div
            className="absolute right-0 top-0 bottom-0 flex items-center"
            style={{
              width: rightActionsWidth,
              opacity: rightOpacity,
              scale: rightScale,
            }}
          >
            {visibleRightActions.map((action, index) => (
              <motion.button
                key={action.id}
                className={`
                  flex flex-col items-center justify-center h-full
                  transition-all duration-200 active:scale-95
                  ${getActionColor(action.color)}
                  ${isPerformingAction ? 'opacity-50 cursor-not-allowed' : ''}
                  ${action.destructive ? 'ring-2 ring-error/20' : ''}
                `}
                style={{ width: actionWidth }}
                onClick={() => executeAction(action, 'right')}
                disabled={isPerformingAction}
                whileTap={{ scale: 0.95 }}
                initial={{ x: 20, opacity: 0 }}
                animate={{ 
                  x: 0, 
                  opacity: 1,
                  transition: { delay: index * 0.05 }
                }}
                aria-label={action.label}
              >
                <motion.div 
                  className="mb-1"
                  animate={isPerformingAction ? { rotate: 360 } : {}}
                  transition={isPerformingAction ? { repeat: Infinity, duration: 1 } : {}}
                >
                  {action.icon}
                </motion.div>
                <span className="text-xs font-medium">{action.label}</span>
                {action.destructive && (
                  <div className="absolute top-1 right-1">
                    <AlertTriangle className="w-3 h-3 text-error" />
                  </div>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* 快速动作指示器 */}
        {enableQuickAction && !disabled && (
          <motion.div
            className="absolute inset-y-0 left-0 right-0 flex items-center justify-center pointer-events-none z-20"
            style={{ opacity: quickActionOpacity }}
          >
            <div className="bg-primary/90 text-primary-content px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              快速操作
            </div>
          </motion.div>
        )}

        {/* 主内容 */}
        <motion.div
          style={{ x }}
          animate={controls}
          className={`
            relative z-10 bg-base-100 
            ${disabled ? 'cursor-default opacity-60' : 'cursor-grab active:cursor-grabbing'}
            ${isPerformingAction ? 'pointer-events-none' : ''}
          `}
        >
          {children}
        </motion.div>

        {/* 滑动提示指示器 */}
        {!disabled && !isOpen && (
          <>
            {/* 左侧提示 */}
            {visibleLeftActions.length > 0 && (
              <motion.div
                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none z-20"
                initial={{ opacity: 0, x: -10 }}
                animate={{ 
                  opacity: 0.3, 
                  x: 0,
                  transition: { duration: 0.5, delay: 1 }
                }}
              >
                <ChevronRight className="w-4 h-4 text-base-content/50" />
              </motion.div>
            )}
            
            {/* 右侧提示 */}
            {visibleRightActions.length > 0 && (
              <motion.div
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none z-20 rotate-180"
                initial={{ opacity: 0, x: 10 }}
                animate={{ 
                  opacity: 0.3, 
                  x: 0,
                  transition: { duration: 0.5, delay: 1 }
                }}
              >
                <ChevronRight className="w-4 h-4 text-base-content/50" />
              </motion.div>
            )}
          </>
        )}

        {/* 禁用状态遮罩 */}
        {disabled && (
          <div className="absolute inset-0 bg-base-100/30 backdrop-blur-sm pointer-events-none z-30" />
        )}
      </div>

      {/* 确认对话框 */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-base-100 rounded-xl p-6 max-w-sm w-full shadow-xl"
            >
              <div className="flex items-center mb-4">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center mr-4
                  ${getActionColor(showConfirmation.color).split(' ')[0]}
                `}>
                  {showConfirmation.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-base-content">
                    {showConfirmation.label}
                  </h3>
                  <p className="text-sm text-base-content/70">
                    {showConfirmation.confirmationText}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmation(null)}
                  className="flex-1 btn btn-ghost"
                  disabled={isPerformingAction}
                >
                  <X className="w-4 h-4 mr-2" />
                  取消
                </button>
                <button
                  onClick={confirmAction}
                  disabled={isPerformingAction}
                  className={`
                    flex-1 btn
                    ${showConfirmation.destructive ? 'btn-error' : 'btn-primary'}
                    ${isPerformingAction ? 'loading' : ''}
                  `}
                >
                  {!isPerformingAction && (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  确认
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default EnhancedSwipeableItem;