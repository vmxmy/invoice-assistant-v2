import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';
import { useDeviceDetection } from '../../hooks/useMediaQuery';

interface MobileImageViewerProps {
  /** 是否显示查看器 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 图片URL */
  imageUrl: string;
  /** 图片标题 */
  title?: string;
  /** 是否启用缩放手势 */
  enablePinchZoom?: boolean;
  /** 是否启用旋转 */
  enableRotation?: boolean;
  /** 是否显示下载按钮 */
  showDownload?: boolean;
  /** 下载回调 */
  onDownload?: () => void;
}

interface TransformState {
  scale: number;
  translateX: number;
  translateY: number;
  rotation: number;
}

interface TouchState {
  startDistance: number;
  startScale: number;
  startX: number;
  startY: number;
  lastTapTime: number;
  touchCount: number;
}

export const MobileImageViewer: React.FC<MobileImageViewerProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  enablePinchZoom = true,
  enableRotation = true,
  showDownload = false,
  onDownload
}) => {
  const device = useDeviceDetection();
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 变换状态
  const [transform, setTransform] = useState<TransformState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
    rotation: 0
  });
  
  // 触摸状态
  const [touchState, setTouchState] = useState<TouchState>({
    startDistance: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    lastTapTime: 0,
    touchCount: 0
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // 重置变换
  const resetTransform = useCallback(() => {
    setTransform({
      scale: 1,
      translateX: 0,
      translateY: 0,
      rotation: 0
    });
    setIsZoomed(false);
  }, []);

  // 关闭时重置
  useEffect(() => {
    if (!isOpen) {
      resetTransform();
    }
  }, [isOpen, resetTransform]);

  // 获取两点间距离
  const getDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 获取两点中心
  const getCenter = (touch1: Touch, touch2: Touch) => ({
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2
  });

  // 处理触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touches = e.touches;
    
    setTouchState(prev => ({
      ...prev,
      touchCount: touches.length
    }));

    if (touches.length === 1) {
      // 单指触摸 - 检测双击和拖拽
      const touch = touches[0];
      const now = Date.now();
      const timeSinceLastTap = now - touchState.lastTapTime;
      
      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        // 双击缩放
        handleDoubleClick(touch);
      } else {
        // 开始拖拽
        setTouchState(prev => ({
          ...prev,
          startX: touch.clientX - transform.translateX,
          startY: touch.clientY - transform.translateY,
          lastTapTime: now
        }));
        setIsDragging(true);
      }
    } else if (touches.length === 2 && enablePinchZoom) {
      // 双指触摸 - 缩放和旋转
      const touch1 = touches[0];
      const touch2 = touches[1];
      const distance = getDistance(touch1, touch2);
      
      setTouchState(prev => ({
        ...prev,
        startDistance: distance,
        startScale: transform.scale
      }));
      setIsDragging(false);
    }
  }, [transform, touchState.lastTapTime, enablePinchZoom]);

  // 处理触摸移动
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touches = e.touches;

    if (touches.length === 1 && isDragging && isZoomed) {
      // 单指拖拽（仅在缩放时）
      const touch = touches[0];
      const newX = touch.clientX - touchState.startX;
      const newY = touch.clientY - touchState.startY;
      
      setTransform(prev => ({
        ...prev,
        translateX: newX,
        translateY: newY
      }));
    } else if (touches.length === 2 && enablePinchZoom) {
      // 双指缩放
      const touch1 = touches[0];
      const touch2 = touches[1];
      const distance = getDistance(touch1, touch2);
      const center = getCenter(touch1, touch2);
      
      if (touchState.startDistance > 0) {
        const scaleChange = distance / touchState.startDistance;
        const newScale = Math.min(Math.max(touchState.startScale * scaleChange, 0.5), 4);
        
        setTransform(prev => ({
          ...prev,
          scale: newScale
        }));
        
        setIsZoomed(newScale > 1);
      }
    }
  }, [isDragging, isZoomed, touchState, enablePinchZoom]);

  // 处理触摸结束
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setTouchState(prev => ({ ...prev, touchCount: 0 }));
  }, []);

  // 处理双击
  const handleDoubleClick = useCallback((touch: Touch) => {
    if (device.isMobile) {
      // 触觉反馈
      if ('vibrate' in navigator) {
        navigator.vibrate([10]);
      }
    }

    if (transform.scale === 1) {
      // 缩放到2倍
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = touch.clientX - rect.left;
        const centerY = touch.clientY - rect.top;
        const scale = 2;
        
        setTransform({
          scale,
          translateX: (rect.width / 2 - centerX) * (scale - 1),
          translateY: (rect.height / 2 - centerY) * (scale - 1),
          rotation: transform.rotation
        });
        setIsZoomed(true);
      }
    } else {
      // 重置缩放
      resetTransform();
    }
  }, [transform, device.isMobile, resetTransform]);

  // 处理缩放按钮
  const handleZoomIn = () => {
    setTransform(prev => {
      const newScale = Math.min(prev.scale * 1.5, 4);
      setIsZoomed(newScale > 1);
      return { ...prev, scale: newScale };
    });
  };

  const handleZoomOut = () => {
    setTransform(prev => {
      const newScale = Math.max(prev.scale / 1.5, 0.5);
      setIsZoomed(newScale > 1);
      return { ...prev, scale: newScale };
    });
  };

  // 处理旋转
  const handleRotate = () => {
    setTransform(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
    
    if (device.isMobile && 'vibrate' in navigator) {
      navigator.vibrate([15]);
    }
  };

  // 处理关闭
  const handleClose = () => {
    resetTransform();
    onClose();
  };

  // 获取图片变换样式
  const getImageStyle = (): React.CSSProperties => ({
    transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
    transformOrigin: 'center center',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    userSelect: 'none',
    WebkitUserSelect: 'none'
  });

  if (!isOpen) return null;

  return (
    <>
      <div className="mobile-image-viewer-overlay" onClick={handleClose}>
        <div 
          ref={containerRef}
          className="mobile-image-viewer-container"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 顶部工具栏 */}
          <div className="mobile-image-viewer-header">
            {title && (
              <h3 className="mobile-image-viewer-title">{title}</h3>
            )}
            <button 
              className="mobile-image-viewer-close"
              onClick={handleClose}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 图片容器 */}
          <div className="mobile-image-viewer-image-container">
            <img
              ref={imageRef}
              src={imageUrl}
              alt={title || '图片'}
              style={getImageStyle()}
              className="mobile-image-viewer-image"
              draggable={false}
            />
          </div>

          {/* 底部工具栏 */}
          <div className="mobile-image-viewer-toolbar">
            <button 
              className="mobile-image-viewer-tool-btn"
              onClick={handleZoomOut}
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            
            <button 
              className="mobile-image-viewer-tool-btn"
              onClick={handleZoomIn}
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            
            {enableRotation && (
              <button 
                className="mobile-image-viewer-tool-btn"
                onClick={handleRotate}
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
            
            <button 
              className="mobile-image-viewer-tool-btn"
              onClick={resetTransform}
            >
              重置
            </button>
            
            {showDownload && (
              <button 
                className="mobile-image-viewer-tool-btn"
                onClick={onDownload}
              >
                <Download className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* 缩放指示器 */}
          <div className="mobile-image-viewer-zoom-indicator">
            {Math.round(transform.scale * 100)}%
          </div>
        </div>
      </div>

      {/* 样式 */}
      <style jsx>{`
        .mobile-image-viewer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
          animation: fadeIn 0.3s ease-out;
        }

        .mobile-image-viewer-container {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          touch-action: none;
        }

        .mobile-image-viewer-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent);
          color: white;
        }

        .mobile-image-viewer-title {
          font-size: 1.125rem;
          font-weight: 500;
          margin: 0;
          flex: 1;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          padding-right: 16px;
        }

        .mobile-image-viewer-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease-out;
        }

        .mobile-image-viewer-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .mobile-image-viewer-image-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .mobile-image-viewer-image {
          max-width: 100%;
          max-height: 100%;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .mobile-image-viewer-toolbar {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 12px;
          padding: 12px 20px;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 30px;
          backdrop-filter: blur(10px);
          z-index: 10;
        }

        .mobile-image-viewer-tool-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease-out;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .mobile-image-viewer-tool-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.05);
        }

        .mobile-image-viewer-tool-btn:active {
          transform: scale(0.95);
        }

        .mobile-image-viewer-zoom-indicator {
          position: absolute;
          top: 80px;
          right: 20px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
          backdrop-filter: blur(10px);
          transition: opacity 0.3s ease-out;
          opacity: ${isZoomed ? 1 : 0};
          pointer-events: none;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* 触控设备优化 */
        @media (hover: none) and (pointer: coarse) {
          .mobile-image-viewer-close,
          .mobile-image-viewer-tool-btn {
            min-width: 48px;
            min-height: 48px;
          }

          .mobile-image-viewer-toolbar {
            bottom: calc(env(safe-area-inset-bottom) + 20px);
            padding: 16px 24px;
          }
        }

        /* 横屏适配 */
        @media (orientation: landscape) and (max-height: 500px) {
          .mobile-image-viewer-header {
            padding: 12px 16px;
          }
          
          .mobile-image-viewer-toolbar {
            bottom: 12px;
            padding: 8px 16px;
          }
          
          .mobile-image-viewer-tool-btn {
            width: 40px;
            height: 40px;
          }
        }

        /* 暗色模式适配 */
        @media (prefers-color-scheme: dark) {
          .mobile-image-viewer-overlay {
            background: rgba(0, 0, 0, 0.98);
          }
        }
      `}</style>
    </>
  );
};

export default MobileImageViewer;