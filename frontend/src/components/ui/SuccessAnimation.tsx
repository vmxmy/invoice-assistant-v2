import React, { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessAnimationProps {
  show: boolean;
  message?: string;
  duration?: number;
  onComplete?: () => void;
  autoClose?: boolean;
  position?: 'center' | 'top' | 'bottom';
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  show,
  message = '操作成功',
  duration = 2000,
  onComplete,
  autoClose = true,
  position = 'center'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      // 小延迟确保动画正常显示
      setTimeout(() => setIsVisible(true), 10);
      
      if (autoClose) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => {
            setShouldRender(false);
            onComplete?.();
          }, 300); // 等待退出动画完成
        }, duration);
        
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [show, duration, autoClose, onComplete]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setShouldRender(false);
      onComplete?.();
    }, 300);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'items-start pt-20';
      case 'bottom':
        return 'items-end pb-20';
      default:
        return 'items-center';
    }
  };

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-50 flex justify-center ${getPositionClasses()}`}>
      {/* 背景遮罩 */}
      <div 
        className={`absolute inset-0 bg-black/20 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* 成功卡片 */}
      <div className={`relative bg-base-100 rounded-lg shadow-xl p-6 mx-4 max-w-sm w-full transform transition-all duration-300 ${
        isVisible 
          ? 'opacity-100 scale-100 translate-y-0' 
          : 'opacity-0 scale-95 translate-y-4'
      }`}>
        {/* 关闭按钮 */}
        {!autoClose && (
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 btn btn-ghost btn-sm btn-circle"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        {/* 成功图标和动画 */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            {/* 背景圆圈动画 */}
            <div className={`w-16 h-16 bg-success/20 rounded-full transition-all duration-500 ${
              isVisible ? 'scale-100' : 'scale-0'
            }`} />
            
            {/* 成功图标 */}
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 delay-200 ${
              isVisible ? 'scale-100 rotate-0' : 'scale-0 rotate-180'
            }`}>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            
            {/* 外层光环效果 */}
            <div className={`absolute inset-0 w-16 h-16 border-2 border-success/30 rounded-full transition-all duration-1000 ${
              isVisible ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
            }`} />
          </div>
          
          {/* 成功消息 */}
          <p className={`text-lg font-medium text-base-content transition-all duration-500 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};

// 简化版本的成功提示组件
export const SuccessToast: React.FC<{
  show: boolean;
  message?: string;
  onComplete?: () => void;
}> = ({ show, message = '操作成功', onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 300);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show && !isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="alert alert-success shadow-lg">
        <CheckCircle className="w-5 h-5" />
        <span>{message}</span>
      </div>
    </div>
  );
};

// 模态框内的成功状态组件
export const ModalSuccessState: React.FC<{
  message?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}> = ({ 
  message = '操作完成', 
  onClose,
  showCloseButton = true 
}) => {
  return (
    <div className="text-center py-8">
      {/* 成功图标 */}
      <div className="mb-4 flex justify-center">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center animate-pulse">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
      </div>
      
      {/* 成功消息 */}
      <h3 className="text-lg font-semibold text-base-content mb-2">
        {message}
      </h3>
      
      <p className="text-base-content/70 mb-6">
        操作已成功完成
      </p>
      
      {/* 关闭按钮 */}
      {showCloseButton && onClose && (
        <button 
          onClick={onClose}
          className="btn btn-primary"
        >
          确定
        </button>
      )}
    </div>
  );
};

export default SuccessAnimation;