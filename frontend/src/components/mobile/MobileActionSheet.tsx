import React, { useEffect } from 'react';
import { X, Eye, Download, Trash2, FileText, Share2 } from 'lucide-react';

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actions: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
    disabled?: boolean;
  }>;
}

export const MobileActionSheet: React.FC<MobileActionSheetProps> = ({
  isOpen,
  onClose,
  title = '选择操作',
  actions
}) => {
  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getButtonClass = (variant?: string) => {
    const baseClass = 'btn w-full min-h-[48px] text-left justify-start text-base font-medium';
    
    switch (variant) {
      case 'primary':
        return `${baseClass} btn-primary`;
      case 'success':
        return `${baseClass} btn-success`;
      case 'warning':
        return `${baseClass} btn-warning`;
      case 'error':
        return `${baseClass} btn-error`;
      default:
        return `${baseClass} btn-ghost`;
    }
  };

  return (
    <>
      {/* 遮罩层 */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* 操作面板 */}
      <div className={`
        fixed bottom-0 left-0 right-0 bg-base-100 rounded-t-xl shadow-2xl z-[101]
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        max-h-[80vh] overflow-hidden
      `}>
        {/* 拖拽指示器 */}
        <div className="flex justify-center py-2">
          <div className="w-12 h-1 bg-base-300 rounded-full"></div>
        </div>

        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
          <h3 className="text-lg font-semibold text-base-content">{title}</h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 操作列表 */}
        <div className="px-4 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                action.onClick();
                onClose();
              }}
              disabled={action.disabled}
              className={getButtonClass(action.variant)}
            >
              {action.icon && (
                <span className="mr-3 flex-shrink-0">
                  {action.icon}
                </span>
              )}
              <span className="flex-1">{action.label}</span>
            </button>
          ))}
        </div>

        {/* 取消按钮 */}
        <div className="px-4 pb-4 pt-2 border-t border-base-300">
          <button
            onClick={onClose}
            className="btn btn-outline w-full min-h-[48px] text-base"
          >
            取消
          </button>
        </div>
      </div>
    </>
  );
};

export default MobileActionSheet;