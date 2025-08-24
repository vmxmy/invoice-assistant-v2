import React, { useRef, useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { gestureSystemManager, GestureHandler } from '../../services/gestureSystemManager';
import { useTouchFeedback } from '../../hooks/useTouchFeedback';

export interface PinchZoomRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  resetRotation: () => void;
  resetAll: () => void;
  getCurrentScale: () => number;
  getCurrentRotation: () => number;
}

interface PinchZoomContainerProps {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  scaleStep?: number;
  enableRotation?: boolean;
  enableDoubleTapZoom?: boolean;
  doubleTapScale?: number;
  boundaryEnabled?: boolean;
  showControls?: boolean;
  showZoomIndicator?: boolean;
  disabled?: boolean;
  className?: string;
  onZoomStart?: (scale: number) => void;
  onZoomChange?: (scale: number, rotation: number) => void;
  onZoomEnd?: (scale: number, rotation: number) => void;
  onRotationStart?: (rotation: number) => void;
  onRotationChange?: (rotation: number) => void;
  onRotationEnd?: (rotation: number) => void;
  springConfig?: {
    stiffness: number;
    damping: number;
  };
  enableHapticFeedback?: boolean;
  hapticIntensity?: 'light' | 'medium' | 'heavy';
}

export const PinchZoomContainer = forwardRef<PinchZoomRef, PinchZoomContainerProps>(({
  children,
  minScale = 0.5,
  maxScale = 4.0,
  initialScale = 1.0,
  scaleStep = 0.2,
  enableRotation = false,
  enableDoubleTapZoom = true,
  doubleTapScale = 2.0,
  boundaryEnabled = true,
  showControls = true,
  showZoomIndicator = true,
  disabled = false,
  className = '',
  onZoomStart,
  onZoomChange,
  onZoomEnd,
  onRotationStart,
  onRotationChange,
  onRotationEnd,
  springConfig = { stiffness: 300, damping: 30 },
  enableHapticFeedback = true,
  hapticIntensity = 'light',
}, ref) => {
  const [currentScale, setCurrentScale] = useState(initialScale);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [isPinching, setIsPinching] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const handlerIdRef = useRef<string>(`pinch-zoom-${Math.random().toString(36).substr(2, 9)}`);
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scale = useMotionValue(initialScale);
  const rotation = useMotionValue(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const controls = useAnimation();

  const { triggerFeedback } = useTouchFeedback();

  // 变换效果
  const containerScale = useTransform(scale, (value) => value);
  const containerRotation = useTransform(rotation, (value) => value);

  // 缩放指示器透明度
  const indicatorOpacity = useTransform(scale, [minScale, 1, maxScale], [0.8, 0.3, 0.8]);

  // 边界检查和约束
  const constrainPosition = useCallback((newX: number, newY: number, newScale: number) => {
    if (!boundaryEnabled || !containerRef.current) return { x: newX, y: newY };

    const container = containerRef.current.getBoundingClientRect();
    const content = contentRef.current?.getBoundingClientRect();
    
    if (!content) return { x: newX, y: newY };

    const scaledWidth = content.width * newScale;
    const scaledHeight = content.height * newScale;
    
    const maxX = Math.max(0, (scaledWidth - container.width) / 2);
    const maxY = Math.max(0, (scaledHeight - container.height) / 2);
    
    return {
      x: Math.max(-maxX, Math.min(maxX, newX)),
      y: Math.max(-maxY, Math.min(maxY, newY)),
    };
  }, [boundaryEnabled]);

  // 约束缩放值
  const constrainScale = useCallback((newScale: number) => {
    return Math.max(minScale, Math.min(maxScale, newScale));
  }, [minScale, maxScale]);

  // 显示指示器
  const showIndicatorsTemporarily = useCallback(() => {
    setShowIndicators(true);
    
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
    }
    
    indicatorTimeoutRef.current = setTimeout(() => {
      setShowIndicators(false);
    }, 3000);
  }, []);

  // 缩放到指定比例
  const zoomTo = useCallback(async (
    targetScale: number,
    targetRotation?: number,
    animate: boolean = true
  ) => {
    const constrainedScale = constrainScale(targetScale);
    const finalRotation = targetRotation !== undefined ? targetRotation : currentRotation;
    
    if (animate) {
      await controls.start({
        scale: constrainedScale,
        rotation: finalRotation,
        x: 0,
        y: 0,
        transition: {
          type: 'spring',
          ...springConfig,
        }
      });
    }
    
    scale.set(constrainedScale);
    rotation.set(finalRotation);
    x.set(0);
    y.set(0);
    
    setCurrentScale(constrainedScale);
    setCurrentRotation(finalRotation);
    
    onZoomChange?.(constrainedScale, finalRotation);
    showIndicatorsTemporarily();
  }, [
    constrainScale,
    currentRotation,
    controls,
    springConfig,
    scale,
    rotation,
    x,
    y,
    onZoomChange,
    showIndicatorsTemporarily,
  ]);

  // 公开的方法
  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomTo(currentScale + scaleStep),
    zoomOut: () => zoomTo(currentScale - scaleStep),
    resetZoom: () => zoomTo(initialScale),
    resetRotation: () => zoomTo(currentScale, 0),
    resetAll: () => zoomTo(initialScale, 0),
    getCurrentScale: () => currentScale,
    getCurrentRotation: () => currentRotation,
  }), [currentScale, currentRotation, scaleStep, initialScale, zoomTo]);

  // 处理双击缩放
  const handleDoubleTap = useCallback((position: { x: number; y: number }) => {
    if (!enableDoubleTapZoom) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime;

    if (timeSinceLastTap < 300 && timeSinceLastTap > 50) {
      // 双击检测成功
      const targetScale = currentScale === initialScale ? doubleTapScale : initialScale;
      zoomTo(targetScale, undefined, true);
      
      if (enableHapticFeedback) {
        triggerFeedback('medium');
      }
      
      gestureSystemManager.announceGesture('Double tap zoom', `Scale: ${targetScale.toFixed(1)}x`);
    }
    
    setLastTapTime(now);
  }, [
    enableDoubleTapZoom,
    lastTapTime,
    currentScale,
    initialScale,
    doubleTapScale,
    zoomTo,
    enableHapticFeedback,
    triggerFeedback,
  ]);

  // 注册手势处理器
  useEffect(() => {
    if (!containerRef.current || disabled) return;

    const handler: GestureHandler = {
      id: handlerIdRef.current,
      element: containerRef.current,
      enabled: true,
      zIndex: 5,
      handlers: {
        onPinchStart: (event) => {
          setIsPinching(true);
          onZoomStart?.(currentScale);
          showIndicatorsTemporarily();
          
          if (enableHapticFeedback) {
            triggerFeedback('light');
          }
        },
        onPinch: (event) => {
          if (!event.scale) return;
          
          const newScale = constrainScale(event.scale);
          const constrainedPosition = constrainPosition(
            x.get(),
            y.get(),
            newScale
          );
          
          scale.set(newScale);
          x.set(constrainedPosition.x);
          y.set(constrainedPosition.y);
          
          setCurrentScale(newScale);
          onZoomChange?.(newScale, currentRotation);
          
          // 缩放边界触觉反馈
          if ((newScale <= minScale || newScale >= maxScale) && enableHapticFeedback) {
            triggerFeedback('medium');
          }
        },
        onPinchEnd: (event) => {
          setIsPinching(false);
          const finalScale = event.scale ? constrainScale(event.scale) : currentScale;
          
          onZoomEnd?.(finalScale, currentRotation);
          
          if (enableHapticFeedback) {
            triggerFeedback('light');
          }
          
          gestureSystemManager.announceGesture(
            'Pinch zoom ended', 
            `Scale: ${finalScale.toFixed(2)}x`
          );
        },
        onRotateStart: (event) => {
          if (!enableRotation) return;
          
          setIsRotating(true);
          onRotationStart?.(currentRotation);
          showIndicatorsTemporarily();
        },
        onRotate: (event) => {
          if (!enableRotation || !event.rotation) return;
          
          const newRotation = event.rotation;
          rotation.set(newRotation);
          setCurrentRotation(newRotation);
          
          onRotationChange?.(newRotation);
          
          if (enableHapticFeedback && Math.abs(newRotation) % 90 < 5) {
            triggerFeedback('medium');
          }
        },
        onRotateEnd: (event) => {
          if (!enableRotation) return;
          
          setIsRotating(false);
          const finalRotation = event.rotation || currentRotation;
          
          onRotationEnd?.(finalRotation);
          
          gestureSystemManager.announceGesture(
            'Rotation ended', 
            `Angle: ${finalRotation.toFixed(1)}°`
          );
        },
        onDoubleTap: (event) => {
          handleDoubleTap(event.position);
        },
        onDrag: (event) => {
          if (currentScale <= 1.1 || !event.delta) return;
          
          const newX = x.get() + event.delta.x;
          const newY = y.get() + event.delta.y;
          
          const constrainedPosition = constrainPosition(newX, newY, currentScale);
          
          x.set(constrainedPosition.x);
          y.set(constrainedPosition.y);
        },
      },
      config: {
        enablePinch: true,
        enableRotation: enableRotation,
        enableDrag: true,
        minScale,
        maxScale,
        pinchThreshold: 5,
        rotationThreshold: 5,
        dragThreshold: 5,
        enableHaptics: enableHapticFeedback,
        hapticIntensity,
        conflictStrategy: 'hybrid',
        gesturePriority: ['pinch', 'rotate', 'drag', 'tap'],
      },
    };

    gestureSystemManager.register(handler);

    return () => {
      gestureSystemManager.unregister(handlerIdRef.current);
    };
  }, [
    disabled,
    currentScale,
    currentRotation,
    minScale,
    maxScale,
    enableRotation,
    enableHapticFeedback,
    hapticIntensity,
    constrainScale,
    constrainPosition,
    onZoomStart,
    onZoomChange,
    onZoomEnd,
    onRotationStart,
    onRotationChange,
    onRotationEnd,
    showIndicatorsTemporarily,
    triggerFeedback,
    handleDoubleTap,
    x,
    y,
    scale,
    rotation,
  ]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (indicatorTimeoutRef.current) {
        clearTimeout(indicatorTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
    >
      {/* 主要内容 */}
      <motion.div
        ref={contentRef}
        className="w-full h-full origin-center"
        style={{
          scale: containerScale,
          rotate: containerRotation,
          x,
          y,
        }}
        animate={controls}
      >
        {children}
      </motion.div>

      {/* 缩放指示器 */}
      <AnimatePresence>
        {showZoomIndicator && (isPinching || isRotating || showIndicators) && (
          <motion.div
            className="absolute top-4 left-4 bg-base-100/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg pointer-events-none z-20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <div className="flex items-center gap-2 text-sm">
              <ZoomIn className="w-4 h-4 text-base-content/70" />
              <span className="font-mono text-base-content">
                {(currentScale * 100).toFixed(0)}%
              </span>
              {enableRotation && Math.abs(currentRotation) > 5 && (
                <>
                  <span className="text-base-content/50">|</span>
                  <span className="font-mono text-base-content">
                    {currentRotation.toFixed(0)}°
                  </span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 控制按钮 */}
      <AnimatePresence>
        {showControls && !disabled && (
          <motion.div
            className="absolute bottom-4 right-4 flex flex-col gap-2 z-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {/* 放大按钮 */}
            <motion.button
              className="btn btn-circle btn-primary shadow-lg"
              onClick={() => zoomTo(currentScale + scaleStep)}
              disabled={currentScale >= maxScale}
              whileTap={{ scale: 0.9 }}
              aria-label="放大"
            >
              <ZoomIn className="w-5 h-5" />
            </motion.button>

            {/* 缩小按钮 */}
            <motion.button
              className="btn btn-circle btn-primary shadow-lg"
              onClick={() => zoomTo(currentScale - scaleStep)}
              disabled={currentScale <= minScale}
              whileTap={{ scale: 0.9 }}
              aria-label="缩小"
            >
              <ZoomOut className="w-5 h-5" />
            </motion.button>

            {/* 重置按钮 */}
            <motion.button
              className="btn btn-circle btn-secondary shadow-lg"
              onClick={() => zoomTo(initialScale, 0)}
              disabled={currentScale === initialScale && currentRotation === 0}
              whileTap={{ scale: 0.9 }}
              aria-label="重置"
            >
              <RotateCcw className="w-5 h-5" />
            </motion.button>

            {/* 适应屏幕按钮 */}
            <motion.button
              className="btn btn-circle btn-accent shadow-lg"
              onClick={() => zoomTo(1, 0)}
              whileTap={{ scale: 0.9 }}
              aria-label="适应屏幕"
            >
              <Maximize2 className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 手势提示 */}
      <AnimatePresence>
        {!disabled && currentScale === initialScale && !isPinching && (
          <motion.div
            className="absolute bottom-4 left-4 text-xs text-base-content/50 pointer-events-none z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 2 }}
          >
            <div className="bg-base-100/70 backdrop-blur-sm rounded px-2 py-1">
              双指缩放 · 双击放大
              {enableRotation && ' · 旋转手势'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 禁用状态遮罩 */}
      {disabled && (
        <div className="absolute inset-0 bg-base-100/30 backdrop-blur-sm pointer-events-none z-30" />
      )}

      {/* 调试信息（开发环境） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 bg-base-200/90 p-2 rounded text-xs font-mono opacity-50 pointer-events-none z-10">
          Scale: {currentScale.toFixed(2)}<br />
          Rotation: {currentRotation.toFixed(1)}°<br />
          X: {Math.round(x.get())}<br />
          Y: {Math.round(y.get())}<br />
          Pinching: {isPinching ? 'Yes' : 'No'}
        </div>
      )}
    </div>
  );
});

PinchZoomContainer.displayName = 'PinchZoomContainer';

export default PinchZoomContainer;