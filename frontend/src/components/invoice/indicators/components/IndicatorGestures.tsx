import React, { ReactNode } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { GESTURE_CONFIG } from '../../../../constants/animationConfig';

interface IndicatorGesturesProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLongPress?: () => void;
  onTap?: () => void;
  isPressed?: boolean;
  swipeDirection?: 'left' | 'right' | null;
  className?: string;
}

/**
 * 手势处理组件
 * 单一职责：处理滑动、长按等手势交互
 */
export const IndicatorGestures: React.FC<IndicatorGesturesProps> = React.memo(({
  children,
  onSwipeLeft,
  onSwipeRight,
  onLongPress,
  onTap,
  isPressed = false,
  swipeDirection = null,
  className = '',
}) => {
  const handleDragEnd = (_event: any, info: PanInfo) => {
    const threshold = GESTURE_CONFIG.swipeThreshold;
    
    if (info.offset.x < -threshold && onSwipeLeft) {
      onSwipeLeft();
      // 触觉反馈
      if ('vibrate' in navigator && navigator.vibrate) {
        try {
          navigator.vibrate(GESTURE_CONFIG.vibrateDuration);
        } catch (error) {
          console.warn('Vibration API not supported or failed:', error);
        }
      }
    } else if (info.offset.x > threshold && onSwipeRight) {
      onSwipeRight();
      // 触觉反馈
      if ('vibrate' in navigator && navigator.vibrate) {
        try {
          navigator.vibrate(GESTURE_CONFIG.vibrateDuration);
        } catch (error) {
          console.warn('Vibration API not supported or failed:', error);
        }
      }
    }
  };

  const dragEnabled = Boolean(onSwipeLeft || onSwipeRight);

  return (
    <motion.div
      className={className}
      drag={dragEnabled ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={GESTURE_CONFIG.dragElastic}
      onDragEnd={handleDragEnd}
      onTap={onTap}
      onTapStart={() => {
        if (onLongPress) {
          // 长按逻辑由父组件处理
        }
      }}
      animate={{
        scale: isPressed ? 0.98 : 1,
        x: swipeDirection === 'left' ? -20 : swipeDirection === 'right' ? 20 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.div>
  );
});

IndicatorGestures.displayName = 'IndicatorGestures';