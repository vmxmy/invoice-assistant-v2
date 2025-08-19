import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Trash2, 
  Download, 
  FileText,
  Check,
  ChevronsUp
} from 'lucide-react';
import { useDeviceDetection } from '../../hooks/useMediaQuery';

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  onExport: () => void;
  onMarkStatus?: (status: string) => void;
  isVisible: boolean;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalCount,
  onClearSelection,
  onDelete,
  onExport,
  onMarkStatus,
  isVisible
}) => {
  const device = useDeviceDetection();

  if (!isVisible || selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`
          bulk-action-bar
          ${device.isMobile ? 'fixed bottom-0 left-0 right-0 z-40' : 'sticky bottom-4 mx-4 rounded-lg shadow-lg'}
          bg-base-100 border-t border-base-300
          ${device.isMobile ? '' : 'border rounded-lg'}
        `}
      >
        <div className={`
          flex items-center justify-between gap-4
          ${device.isMobile ? 'p-3 safe-bottom' : 'p-4'}
        `}>
          {/* 左侧：选中信息 */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClearSelection}
              className="btn btn-ghost btn-circle btn-sm touch-safe"
              aria-label="清除选择"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="bulk-action-count">
              <span className="font-bold text-primary">{selectedCount}</span>
              <span className="text-base-content/60"> / {totalCount} 已选中</span>
            </div>
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-2">
            {/* 移动端：使用图标按钮 */}
            {device.isMobile ? (
              <>
                {onMarkStatus && (
                  <div className="dropdown dropdown-top dropdown-end">
                    <label 
                      tabIndex={0} 
                      className="btn btn-primary btn-circle touch-safe"
                      aria-label="标记状态"
                    >
                      <Check className="w-5 h-5" />
                    </label>
                    <ul 
                      tabIndex={0} 
                      className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-48 mb-2 border border-base-300"
                    >
                      <li><a onClick={() => onMarkStatus('reimbursed')}>标记为已报销</a></li>
                      <li><a onClick={() => onMarkStatus('pending')}>标记为待报销</a></li>
                      <li><a onClick={() => onMarkStatus('rejected')}>标记为已拒绝</a></li>
                    </ul>
                  </div>
                )}
                
                <button
                  onClick={onExport}
                  className="btn btn-info btn-circle touch-safe"
                  aria-label="导出"
                >
                  <Download className="w-5 h-5" />
                </button>
                
                <button
                  onClick={onDelete}
                  className="btn btn-error btn-circle touch-safe"
                  aria-label="删除"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            ) : (
              /* 桌面端：使用文字按钮 */
              <>
                {onMarkStatus && (
                  <div className="dropdown dropdown-top dropdown-end">
                    <label 
                      tabIndex={0} 
                      className="btn btn-primary btn-sm gap-2"
                    >
                      <Check className="w-4 h-4" />
                      标记状态
                      <ChevronsUp className="w-3 h-3" />
                    </label>
                    <ul 
                      tabIndex={0} 
                      className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-48 mb-2 border border-base-300"
                    >
                      <li><a onClick={() => onMarkStatus('reimbursed')}>标记为已报销</a></li>
                      <li><a onClick={() => onMarkStatus('pending')}>标记为待报销</a></li>
                      <li><a onClick={() => onMarkStatus('rejected')}>标记为已拒绝</a></li>
                    </ul>
                  </div>
                )}
                
                <button
                  onClick={onExport}
                  className="btn btn-info btn-sm gap-2"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
                
                <button
                  onClick={onDelete}
                  className="btn btn-error btn-sm gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              </>
            )}
          </div>
        </div>

        {/* 移动端：显示操作提示 */}
        {device.isMobile && selectedCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-base-300 px-3 py-2 bg-base-200/50"
          >
            <p className="text-xs text-base-content/60 text-center">
              左滑删除 · 右滑标记 · 长按多选
            </p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default BulkActionBar;