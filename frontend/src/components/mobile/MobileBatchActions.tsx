import React from 'react';
import { Download, Trash2, X, FileText } from 'lucide-react';
import { useDeviceDetection } from '../../hooks/useMediaQuery';

interface MobileBatchActionsProps {
  selectedCount: number;
  onBatchExport: () => void;
  onBatchDelete: () => void;
  onClearSelection: () => void;
  isExporting?: boolean;
  isVisible: boolean;
}

export const MobileBatchActions: React.FC<MobileBatchActionsProps> = ({
  selectedCount,
  onBatchExport,
  onBatchDelete,
  onClearSelection,
  isExporting = false,
  isVisible
}) => {
  const device = useDeviceDetection();

  if (!device.isMobile || !isVisible || selectedCount === 0) {
    return null;
  }

  return (
    <>
      {/* 底部操作面板 */}
      <div className={`
        fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 shadow-2xl z-40
        transform transition-transform duration-300 ease-in-out
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
        safe-area-inset-bottom
      `}>
        {/* 操作面板内容 */}
        <div className="px-4 py-3">
          {/* 选择状态指示 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-base-content">
                已选择 {selectedCount} 张发票
              </span>
            </div>
            <button
              onClick={onClearSelection}
              className="btn btn-ghost btn-sm btn-circle"
              title="取消选择"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 操作按钮组 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 批量导出 */}
            <button
              onClick={onBatchExport}
              disabled={isExporting}
              className="btn btn-primary btn-lg w-full min-h-[48px] gap-3"
            >
              {isExporting ? (
                <div className="loading loading-spinner loading-sm"></div>
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span className="font-medium">
                {isExporting ? '导出中...' : '批量导出'}
              </span>
            </button>

            {/* 批量删除 */}
            <button
              onClick={onBatchDelete}
              className="btn btn-error btn-outline btn-lg w-full min-h-[48px] gap-3"
            >
              <Trash2 className="w-5 h-5" />
              <span className="font-medium">批量删除</span>
            </button>
          </div>

          {/* 提示信息 */}
          <div className="mt-3 text-center">
            <p className="text-xs text-base-content/60">
              <FileText className="w-3 h-3 inline mr-1" />
              长按发票卡片可快速选择多张发票
            </p>
          </div>
        </div>

        {/* 安全区域占位 */}
        <div className="h-safe-area-inset-bottom"></div>
      </div>

      {/* 底部占位空间，防止内容被遮挡 */}
      <div className={`
        ${isVisible ? 'h-32' : 'h-0'}
        transition-all duration-300 ease-in-out
      `} />
    </>
  );
};

export default MobileBatchActions;