import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, MoreVertical, ArrowLeft, ArrowRight } from 'lucide-react';
import { useMobileModal } from '../../hooks/useMobileModal';
import { useDeviceDetection } from '../../hooks/useMediaQuery';

interface MobileOptimizedModalProps {
  /** 是否显示模态框 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 模态框标题 */
  title?: string;
  /** 是否显示返回按钮 */
  showBackButton?: boolean;
  /** 返回按钮回调 */
  onBack?: () => void;
  /** 是否显示更多操作菜单 */
  showMoreButton?: boolean;
  /** 更多操作菜单选项 */
  moreOptions?: Array<{ 
    label: string; 
    icon?: React.ReactNode; 
    onClick: () => void;
    variant?: 'default' | 'warning' | 'error';
  }>;
  /** 底部操作按钮 */
  bottomActions?: React.ReactNode;
  /** 是否启用手势关闭 */
  enableSwipeToClose?: boolean;
  /** 是否启用左右滑动切换 */
  enableHorizontalSwipe?: boolean;
  /** 左滑回调 */
  onSwipeLeft?: () => void;
  /** 右滑回调 */
  onSwipeRight?: () => void;
  /** 是否显示切换指示器 */
  showSwipeIndicator?: boolean;
  /** 子组件 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 是否全屏模式（移动端默认全屏） */
  fullScreen?: boolean;
}

export const MobileOptimizedModal: React.FC<MobileOptimizedModalProps> = ({
  isOpen,
  onClose,
  title,
  showBackButton = false,
  onBack,
  showMoreButton = false,
  moreOptions = [],
  bottomActions,
  enableSwipeToClose = true,
  enableHorizontalSwipe = false,
  onSwipeLeft,
  onSwipeRight,
  showSwipeIndicator = false,
  children,
  className = '',
  fullScreen
}) => {
  const device = useDeviceDetection();
  const modalRef = useRef<HTMLDialogElement>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // 移动端模态框功能
  const mobileModal = useMobileModal({
    enableSwipeToClose,
    enableHorizontalSwipe,
    closeThreshold: 120,
    switchThreshold: 100,
    animationDuration: 300,
    keyboardAdaptation: true
  });

  const isMobileMode = device.isMobile || fullScreen;

  // 控制模态框显示
  useEffect(() => {
    const modal = modalRef.current;
    if (modal) {
      if (isOpen) {
        modal.showModal();
        // 重置状态
        mobileModal.resetModalState();
        mobileModal.resetContentTransform();
      } else {
        modal.close();
        setShowMoreMenu(false);
      }
    }
  }, [isOpen]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // 处理关闭
  const handleClose = () => {
    if (mobileModal.isDragging) return;
    
    if (device.isMobile) {
      mobileModal.triggerHapticFeedback('light');
    }
    
    setShowMoreMenu(false);
    onClose();
  };

  // 处理返回
  const handleBack = () => {
    if (device.isMobile) {
      mobileModal.triggerHapticFeedback('light');
    }
    
    onBack?.();
  };

  // 处理触摸事件
  const handleTouchStart = (e: React.TouchEvent) => {
    setShowMoreMenu(false);
    mobileModal.handleTouchStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    mobileModal.handleTouchMove(e, onSwipeLeft, onSwipeRight);
  };

  const handleTouchEnd = () => {
    mobileModal.handleTouchEnd(handleClose, onSwipeLeft, onSwipeRight);
  };

  // 更多操作菜单选项样式
  const getOptionVariantClass = (variant?: string) => {
    switch (variant) {
      case 'warning':
        return 'text-warning hover:bg-warning/10';
      case 'error':
        return 'text-error hover:bg-error/10';
      default:
        return 'text-base-content hover:bg-base-200';
    }
  };

  return (
    <>
      <dialog 
        ref={modalRef}
        className={`modal ${isMobileMode ? 'modal-mobile' : 'modal-bottom sm:modal-middle'}`}
      >
        <div 
          ref={mobileModal.modalRef}
          className={`modal-box ${className} ${
            isMobileMode ? 'mobile-modal-box' : 'w-full max-w-4xl mx-4 sm:mx-auto h-[90vh] sm:h-auto'
          }`}
          style={mobileModal.getModalStyles()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            ref={mobileModal.contentRef}
            className={isMobileMode ? 'mobile-modal-content' : ''}
            style={mobileModal.getContentStyles()}
          >
            {/* 移动端顶部导航栏 */}
            {isMobileMode ? (
              <div className="mobile-modal-header">
                {/* 手势指示器 */}
                {enableSwipeToClose && (
                  <div className="swipe-indicator">
                    <div className="swipe-handle"></div>
                  </div>
                )}
                
                {/* 导航栏 */}
                <div className="modal-navbar">
                  <div className="navbar-start">
                    {showBackButton ? (
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={handleBack}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    ) : (
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={handleClose}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="navbar-center flex-1">
                    {title && (
                      <h1 className="modal-title">{title}</h1>
                    )}
                    
                    {/* 水平滑动指示器 */}
                    {showSwipeIndicator && enableHorizontalSwipe && (
                      <div className="swipe-navigation">
                        <div className="flex items-center gap-2 text-base-content/50">
                          <ArrowLeft className="w-4 h-4" />
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                            <div className="w-2 h-2 rounded-full bg-base-300"></div>
                            <div className="w-2 h-2 rounded-full bg-base-300"></div>
                          </div>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="navbar-end">
                    {showMoreButton && moreOptions.length > 0 && (
                      <div className="dropdown dropdown-end">
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => setShowMoreMenu(!showMoreMenu)}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {showMoreMenu && (
                          <div className="dropdown-content menu bg-base-100 rounded-box shadow-lg w-52 mt-2">
                            {moreOptions.map((option, index) => (
                              <button
                                key={index}
                                className={`menu-item ${getOptionVariantClass(option.variant)}`}
                                onClick={() => {
                                  option.onClick();
                                  setShowMoreMenu(false);
                                }}
                              >
                                {option.icon && <span className="w-4 h-4">{option.icon}</span>}
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* 桌面端顶部 */
              <>
                <form method="dialog">
                  <button 
                    className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10"
                    onClick={handleClose}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
                
                {title && (
                  <h3 className="font-bold text-lg mb-4 pr-12">
                    {title}
                  </h3>
                )}
              </>
            )}

            {/* 内容区域 */}
            <div 
              className={isMobileMode ? 'mobile-modal-scroll-area' : 'py-4 overflow-y-auto max-h-[calc(90vh-180px)] sm:max-h-[calc(80vh-180px)]'}
              style={mobileModal.getScrollAreaStyles()}
            >
              {children}
            </div>

            {/* 底部操作栏 */}
            {bottomActions && (
              <div className={`modal-actions ${isMobileMode ? 'mobile-modal-bottom' : 'modal-action'}`}>
                {bottomActions}
              </div>
            )}
          </div>
        </div>

        {/* 背景遮罩 */}
        <form method="dialog" className="modal-backdrop">
          <button onClick={handleClose}>close</button>
        </form>
      </dialog>

      {/* 移动端样式 */}
      <style jsx>{`
        .modal-mobile {
          padding: 0;
        }
        
        .mobile-modal-box {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          max-width: none;
          max-height: none;
          margin: 0;
          border-radius: 0;
          padding: 0;
        }
        
        .mobile-modal-content {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        
        .mobile-modal-header {
          flex-shrink: 0;
          background: rgba(var(--fallback-b1));
          border-bottom: 1px solid rgba(var(--fallback-bc) / 0.1);
        }
        
        .swipe-indicator {
          display: flex;
          justify-content: center;
          padding: 8px 0;
        }
        
        .swipe-handle {
          width: 36px;
          height: 4px;
          background: rgba(var(--fallback-bc) / 0.3);
          border-radius: 2px;
        }
        
        .modal-navbar {
          display: flex;
          align-items: center;
          min-height: 60px;
          padding: 0 16px;
          gap: 16px;
        }
        
        .navbar-start {
          display: flex;
          align-items: center;
        }
        
        .navbar-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        
        .navbar-end {
          display: flex;
          align-items: center;
        }
        
        .modal-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: rgba(var(--fallback-bc));
          text-align: center;
          margin: 0;
        }
        
        .swipe-navigation {
          margin-top: 4px;
        }
        
        .mobile-modal-scroll-area {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 16px;
        }
        
        .mobile-modal-bottom {
          flex-shrink: 0;
          padding: 16px;
          background: rgba(var(--fallback-b1));
          border-top: 1px solid rgba(var(--fallback-bc) / 0.1);
        }
        
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        
        .mobile-modal-bottom .modal-actions {
          justify-content: stretch;
        }
        
        .mobile-modal-bottom .modal-actions .btn {
          flex: 1;
          min-height: 48px;
          font-weight: 500;
        }
        
        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          width: 100%;
          text-align: left;
          border: none;
          background: none;
          cursor: pointer;
          transition: all 0.2s ease-out;
          font-size: 0.875rem;
          border-radius: 8px;
          margin: 2px;
        }
        
        .dropdown-content {
          animation: slideDown 0.2s ease-out;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* 触控设备优化 */
        @media (hover: none) and (pointer: coarse) {
          .modal-navbar .btn {
            min-width: 44px;
            min-height: 44px;
          }
          
          .menu-item {
            min-height: 48px;
            padding: 16px;
            font-size: 1rem;
          }
        }
        
        /* 安全区域适配 */
        .mobile-modal-box {
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
        }
        
        /* 键盘适配 */
        @media (max-height: 600px) {
          .mobile-modal-scroll-area {
            padding: 8px 16px;
          }
          
          .mobile-modal-bottom {
            padding: 12px 16px;
          }
        }
      `}</style>
    </>
  );
};

export default MobileOptimizedModal;