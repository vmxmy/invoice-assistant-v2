import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Upload, 
  Scan, 
  FileText, 
  Camera, 
  FolderOpen,
  X,
  ChevronUp
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}

interface MobileQuickActionsProps {
  actions?: QuickAction[];
  onUploadClick?: () => void;
  onScanClick?: () => void;
  onCameraClick?: () => void;
  onFileClick?: () => void;
}

const defaultActions: QuickAction[] = [
  {
    id: 'upload',
    label: '上传文件',
    icon: <Upload className="w-6 h-6" />,
    color: 'bg-primary',
    onClick: () => {},
  },
  {
    id: 'camera',
    label: '拍照上传',
    icon: <Camera className="w-6 h-6" />,
    color: 'bg-secondary',
    onClick: () => {},
  },
  {
    id: 'scan',
    label: '扫描发票',
    icon: <Scan className="w-6 h-6" />,
    color: 'bg-accent',
    onClick: () => {},
  },
  {
    id: 'file',
    label: '选择文件',
    icon: <FolderOpen className="w-6 h-6" />,
    color: 'bg-info',
    onClick: () => {},
  },
];

const MobileQuickActions: React.FC<MobileQuickActionsProps> = ({
  actions,
  onUploadClick,
  onScanClick,
  onCameraClick,
  onFileClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // 合并默认动作和自定义动作
  const finalActions: QuickAction[] = actions || defaultActions.map(action => ({
    ...action,
    onClick: () => {
      switch (action.id) {
        case 'upload':
          onUploadClick?.();
          break;
        case 'scan':
          onScanClick?.();
          break;
        case 'camera':
          onCameraClick?.();
          break;
        case 'file':
          onFileClick?.();
          break;
        default:
          action.onClick();
      }
      setIsOpen(false);
    }
  }));

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* 背景遮罩 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-20 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* 快捷操作容器 */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* 操作菜单 */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ 
                duration: 0.3,
                type: 'spring',
                damping: 20,
                stiffness: 300
              }}
              className="mb-4 space-y-3"
            >
              {finalActions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`
                    ${action.color} text-white
                    w-14 h-14 rounded-full shadow-lg
                    flex items-center justify-center
                    hover:scale-110 active:scale-95
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    relative group
                  `}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {action.icon}
                  
                  {/* 标签提示 */}
                  <div className="absolute right-full mr-3 px-2 py-1 bg-base-content text-base-100 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {action.label}
                    <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-base-content border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 主按钮 */}
        <motion.button
          onClick={toggleMenu}
          className={`
            w-16 h-16 bg-primary text-primary-content rounded-full shadow-lg
            flex items-center justify-center
            hover:shadow-xl active:scale-95
            transition-all duration-200
            ${isOpen ? 'rotate-45' : 'rotate-0'}
          `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-8 h-8" />
        </motion.button>

        {/* 操作提示 */}
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-base-content text-base-100 text-xs rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
          >
            快速操作
            <ChevronUp className="w-3 h-3 mx-auto" />
          </motion.div>
        )}
      </div>
    </>
  );
};

export default MobileQuickActions;