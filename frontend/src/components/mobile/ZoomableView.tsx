import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { useEnhancedGestures } from '../../hooks/useEnhancedGestures';

interface ZoomableViewProps {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  onZoomStart?: (scale: number) => void;
  onZoom?: (scale: number) => void;
  onZoomEnd?: (scale: number) => void;
  onDoubleTap?: (scale: number) => void;
  disabled?: boolean;
  className?: string;
  resetOnDoubleTap?: boolean;
  showZoomControls?: boolean;
  enablePanOnZoom?: boolean;
}

export const ZoomableView: React.FC<ZoomableViewProps> = ({
  children,
  minScale = 0.5,
  maxScale = 5,
  initialScale = 1,
  onZoomStart,
  onZoom,
  onZoomEnd,
  onDoubleTap,
  disabled = false,
  className = '',
  resetOnDoubleTap = true,
  showZoomControls = true,
  enablePanOnZoom = true,
}) => {
  const [currentScale, setCurrentScale] = useState(initialScale);
  const [isZooming, setIsZooming] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [zoomCenter, setZoomCenter] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Motion values
  const scale = useMotionValue(initialScale);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const controls = useAnimation();

  // Transform calculations
  const transformOrigin = useTransform(
    [scale],
    ([s]) => `${zoomCenter.x}px ${zoomCenter.y}px`
  );

  // Constrain pan boundaries based on zoom level
  const constrainPan = useCallback((scale: number, x: number, y: number) => {
    if (!containerRef.current || !contentRef.current) return { x, y };
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const scaledWidth = contentRef.current.offsetWidth * scale;
    const scaledHeight = contentRef.current.offsetHeight * scale;
    
    const maxX = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const maxY = Math.max(0, (scaledHeight - containerRect.height) / 2);
    
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  // Reset to initial state
  const resetZoom = useCallback(async (animate = true) => {
    if (animate) {
      await controls.start({
        scale: initialScale,
        x: 0,
        y: 0,
        transition: { type: 'spring', stiffness: 200, damping: 25 }
      });
    }
    
    scale.set(initialScale);
    x.set(0);
    y.set(0);
    setCurrentScale(initialScale);
    setZoomCenter({ x: 0, y: 0 });
  }, [controls, scale, x, y, initialScale]);

  // Center zoom
  const centerZoom = useCallback(async (targetScale: number) => {
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    setZoomCenter({ x: centerX, y: centerY });
    
    await controls.start({
      scale: targetScale,
      x: 0,
      y: 0,
      transition: { type: 'spring', stiffness: 200, damping: 25 }
    });
    
    scale.set(targetScale);
    x.set(0);
    y.set(0);
    setCurrentScale(targetScale);
  }, [controls, scale, x, y]);

  // Enhanced gestures
  const { touchHandlers } = useEnhancedGestures({
    onPinchStart: (scale, center) => {
      if (disabled) return;
      
      setIsZooming(true);
      setZoomCenter(center);
      onZoomStart?.(scale);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    },
    onPinch: (newScale, center, velocity) => {
      if (disabled) return;
      
      const constrainedScale = Math.max(minScale, Math.min(maxScale, newScale));
      
      scale.set(constrainedScale);
      setCurrentScale(constrainedScale);
      setZoomCenter(center);
      onZoom?.(constrainedScale);

      // Light haptic feedback during zoom
      if (Math.abs(velocity) > 0.5 && 'vibrate' in navigator) {
        navigator.vibrate(5);
      }
    },
    onPinchEnd: (finalScale, center, velocity) => {
      if (disabled) return;
      
      setIsZooming(false);
      
      // Snap to boundaries if needed
      const targetScale = Math.max(minScale, Math.min(maxScale, finalScale));
      
      if (Math.abs(targetScale - finalScale) > 0.1) {
        controls.start({
          scale: targetScale,
          transition: { type: 'spring', stiffness: 300, damping: 25 }
        });
        scale.set(targetScale);
        setCurrentScale(targetScale);
      }

      onZoomEnd?.(targetScale);

      // Reset position if zoomed out too much
      if (targetScale <= initialScale * 1.1) {
        controls.start({
          x: 0,
          y: 0,
          transition: { type: 'spring', stiffness: 200, damping: 25 }
        });
        x.set(0);
        y.set(0);
      }
    },
    onDrag: (position, delta) => {
      if (disabled || !enablePanOnZoom || currentScale <= 1.1) return;
      
      const currentX = x.get() + delta.x;
      const currentY = y.get() + delta.y;
      const constrained = constrainPan(currentScale, currentX, currentY);
      
      x.set(constrained.x);
      y.set(constrained.y);
    },
    onDoubleTap: (position) => {
      if (disabled) return;
      
      const now = Date.now();
      if (now - lastTapTime < 300) return; // Prevent multiple triggers
      setLastTapTime(now);
      
      if (resetOnDoubleTap && currentScale > initialScale * 1.1) {
        // Reset zoom
        resetZoom();
        onDoubleTap?.(initialScale);
      } else {
        // Zoom in
        const targetScale = currentScale < maxScale / 2 ? maxScale / 2 : maxScale;
        setZoomCenter(position);
        centerZoom(targetScale);
        onDoubleTap?.(targetScale);
      }

      // Strong haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    },
  }, {
    enablePinch: true,
    enableDrag: enablePanOnZoom,
    pinchThreshold: 5,
    dragThreshold: 8,
    minScale,
    maxScale,
    enableHaptics: true,
    hapticIntensity: 'light',
    preventScroll: currentScale > 1.1, // Only prevent scroll when zoomed
  });

  // Zoom controls
  const zoomIn = useCallback(() => {
    const targetScale = Math.min(maxScale, currentScale * 1.5);
    centerZoom(targetScale);
  }, [currentScale, maxScale, centerZoom]);

  const zoomOut = useCallback(() => {
    const targetScale = Math.max(minScale, currentScale / 1.5);
    centerZoom(targetScale);
  }, [currentScale, minScale, centerZoom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0' || e.key === 'r') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, zoomIn, zoomOut, resetZoom]);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      {...touchHandlers}
    >
      {/* Content */}
      <motion.div
        ref={contentRef}
        style={{
          scale,
          x,
          y,
          transformOrigin,
        }}
        animate={controls}
        className={`
          w-full h-full origin-center
          ${isZooming ? 'cursor-grabbing' : 'cursor-grab'}
          ${disabled ? 'pointer-events-none' : ''}
        `}
      >
        {children}
      </motion.div>

      {/* Zoom Controls */}
      {showZoomControls && !disabled && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
          <motion.button
            className="w-10 h-10 bg-base-200/90 backdrop-blur-sm rounded-full flex items-center justify-center text-base-content hover:bg-base-300/90 transition-colors"
            onClick={zoomIn}
            disabled={currentScale >= maxScale}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="text-lg font-bold">+</span>
          </motion.button>
          
          <motion.button
            className="w-10 h-10 bg-base-200/90 backdrop-blur-sm rounded-full flex items-center justify-center text-base-content hover:bg-base-300/90 transition-colors"
            onClick={zoomOut}
            disabled={currentScale <= minScale}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <span className="text-lg font-bold">−</span>
          </motion.button>
          
          {currentScale !== initialScale && (
            <motion.button
              className="w-10 h-10 bg-base-200/90 backdrop-blur-sm rounded-full flex items-center justify-center text-base-content hover:bg-base-300/90 transition-colors text-xs"
              onClick={() => resetZoom()}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: 0.7 }}
            >
              1:1
            </motion.button>
          )}
        </div>
      )}

      {/* Zoom Level Indicator */}
      {(isZooming || Math.abs(currentScale - initialScale) > 0.1) && (
        <motion.div
          className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-base-200/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium text-base-content z-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {Math.round(currentScale * 100)}%
        </motion.div>
      )}

      {/* Loading state overlay */}
      {disabled && (
        <div className="absolute inset-0 bg-base-100/50 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="text-base-content/60 text-sm">缩放已禁用</div>
        </div>
      )}
    </div>
  );
};

export default ZoomableView;