import React, { useEffect } from 'react';
import { Download, X, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

export interface DownloadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'downloading' | 'completed' | 'error';
  error?: string;
}

interface DownloadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel?: () => void;
  downloads: DownloadProgress[];
  totalProgress: number; // 总体进度 0-100
  canCancel?: boolean;
  title?: string;
}

export const DownloadProgressModal: React.FC<DownloadProgressModalProps> = ({
  isOpen,
  onClose,
  onCancel,
  downloads,
  totalProgress,
  canCancel = true,
  title = '下载进度'
}) => {
  // 调试日志
  console.log('[DownloadProgressModal] render:', { 
    isOpen, 
    totalProgress, 
    downloadsCount: downloads.length,
    firstDownload: downloads[0],
    allDownloads: downloads
  });
  
  // 控制模态框显示
  useEffect(() => {
    const modal = document.getElementById('download-progress-modal') as HTMLDialogElement;
    if (modal) {
      if (isOpen) {
        modal.showModal();
      } else {
        modal.close();
      }
    }
  }, [isOpen]);

  // 计算统计信息
  const completedCount = downloads.filter(d => d.status === 'completed').length;
  const errorCount = downloads.filter(d => d.status === 'error').length;
  const isAllCompleted = downloads.length > 0 && completedCount === downloads.length;
  const hasErrors = errorCount > 0;

  // 获取状态图标
  const getStatusIcon = (status: DownloadProgress['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full bg-base-300" />;
      case 'downloading':
        return <span className="loading loading-spinner loading-sm text-primary" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-error" />;
    }
  };

  // 获取状态文本
  const getStatusText = (download: DownloadProgress) => {
    switch (download.status) {
      case 'pending':
        return '等待中';
      case 'downloading':
        return `${download.progress}%`;
      case 'completed':
        return '已完成';
      case 'error':
        return download.error || '失败';
    }
  };

  // 获取阶段文本
  const getPhaseText = () => {
    if (totalProgress < 20) {
      return '正在获取下载链接...';
    } else if (totalProgress < 90) {
      return '正在下载文件...';
    } else if (totalProgress < 100) {
      return '正在打包文件...';
    } else {
      return '下载完成';
    }
  };

  return (
    <dialog id="download-progress-modal" className="modal modal-bottom sm:modal-middle">
      <div className="modal-box w-full max-w-lg mx-4 sm:mx-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            {title}
          </h3>
          {!canCancel && !isAllCompleted && (
            <button 
              className="btn btn-sm btn-circle btn-ghost"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 总体进度 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">总体进度</span>
            <span className="text-sm text-base-content/60">
              {completedCount}/{downloads.length} 完成
            </span>
          </div>
          
          {/* 阶段信息 */}
          <div className="text-sm text-primary mb-2">
            {getPhaseText()}
          </div>
          
          {/* 总进度条 */}
          <div className="w-full bg-base-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                hasErrors ? 'bg-error' : 
                isAllCompleted ? 'bg-success' : 'bg-primary'
              }`}
              style={{ width: `${totalProgress}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between mt-2 text-xs text-base-content/60">
            <span>{totalProgress.toFixed(1)}%</span>
            {hasErrors && (
              <span className="text-error flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errorCount} 个文件失败
              </span>
            )}
          </div>
        </div>

        {/* 文件列表 */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {downloads.map((download, index) => (
            <div 
              key={index}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                download.status === 'error' ? 'bg-error/10' : 
                download.status === 'completed' ? 'bg-success/10' : 
                'bg-base-100'
              }`}
            >
              {/* 状态图标 */}
              <div className="flex-shrink-0">
                {getStatusIcon(download.status)}
              </div>
              
              {/* 文件信息 */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {download.fileName}
                </div>
                
                {/* 进度条（仅下载中时显示） */}
                {download.status === 'downloading' && (
                  <div className="w-full bg-base-200 rounded-full h-1.5 mt-1">
                    <div 
                      className="h-1.5 bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${download.progress}%` }}
                    />
                  </div>
                )}
                
                {/* 错误信息 */}
                {download.status === 'error' && download.error && (
                  <div className="text-xs text-error mt-1">
                    {download.error}
                  </div>
                )}
              </div>
              
              {/* 状态文本 */}
              <div className="flex-shrink-0 text-xs text-base-content/60">
                {getStatusText(download)}
              </div>
            </div>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="modal-action">
          {canCancel && !isAllCompleted ? (
            <>
              <button 
                className="btn btn-ghost"
                onClick={onClose}
              >
                隐藏
              </button>
              <button 
                className="btn btn-error btn-outline"
                onClick={onCancel}
              >
                取消下载
              </button>
            </>
          ) : (
            <button 
              className="btn btn-primary"
              onClick={onClose}
            >
              {isAllCompleted ? '完成' : '关闭'}
            </button>
          )}
        </div>
      </div>

      {/* 背景遮罩 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
};

export default DownloadProgressModal;