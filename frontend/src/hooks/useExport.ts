import { useState, useCallback, useRef } from 'react';
import { exportService, ExportError } from '../services/exportService';
import type { Invoice } from '../types/index';
import type { DownloadProgress } from '../components/ui/DownloadProgressModal';
import { notify } from '../utils/notifications';
import { prepareBatchDownloadFiles } from '../utils/fileNameGenerator';

interface UseExportState {
  isExporting: boolean;
  downloads: DownloadProgress[];
  totalProgress: number;
  error: string | null;
  isProgressModalOpen: boolean;
}

interface UseExportActions {
  downloadSingle: (invoice: Invoice) => Promise<void>;
  downloadBatch: (invoices: Invoice[]) => Promise<void>;
  cancelDownload: () => void;
  openProgressModal: () => void;
  closeProgressModal: () => void;
  clearError: () => void;
}

export interface UseExportReturn extends UseExportState, UseExportActions {}

export const useExport = (): UseExportReturn => {
  const [state, setState] = useState<UseExportState>({
    isExporting: false,
    downloads: [],
    totalProgress: 0,
    error: null,
    isProgressModalOpen: false
  });

  // 生成唯一标识符来追踪这个hook实例
  const hookId = useRef(Math.random().toString(36).substring(2, 8));
  console.log(`[useExport:${hookId.current}] Hook instance created`);

  // 使用ref存储状态，避免闭包问题
  const stateRef = useRef(state);
  stateRef.current = state;

  // 更新状态的辅助函数
  const updateState = useCallback((updates: Partial<UseExportState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // 进度回调函数
  const handleProgress = useCallback((downloads: DownloadProgress[], totalProgress: number) => {
    console.log(`[useExport:${hookId.current}] handleProgress:`, { 
      downloadsCount: downloads.length, 
      totalProgress,
      firstDownload: downloads[0]
    });
    updateState({ downloads, totalProgress });
  }, [updateState]);

  // 下载单个发票
  const downloadSingle = useCallback(async (invoice: Invoice) => {
    try {
      updateState({
        isExporting: true,
        downloads: [],
        totalProgress: 0,
        error: null,
        isProgressModalOpen: true
      });

      // 设置进度回调
      exportService.setProgressCallback(handleProgress);

      // 开始下载
      await exportService.downloadSingle(invoice);

      // 下载成功通知
      notify.success(`发票 ${invoice.invoice_number} 下载成功`);

      // 延迟关闭进度模态框
      setTimeout(() => {
        updateState({ isProgressModalOpen: false });
      }, 1500);

    } catch (error: any) {
      const errorMessage = error instanceof ExportError 
        ? error.message 
        : '下载失败，请重试';

      updateState({ error: errorMessage });
      notify.error(errorMessage);

      console.error('单个下载失败:', error);
    } finally {
      updateState({ isExporting: false });
    }
  }, [updateState, handleProgress]);

  // 批量下载发票
  const downloadBatch = useCallback(async (invoices: Invoice[]) => {
    if (invoices.length === 0) {
      notify.warning('请选择要下载的发票');
      return;
    }

    try {
      // 使用相同的文件名生成逻辑
      const fileInfos = prepareBatchDownloadFiles(invoices);
      const initialDownloads: DownloadProgress[] = fileInfos.map(info => ({
        fileName: info.fileName,
        progress: 0,
        status: 'pending'
      }));
      
      updateState({
        isExporting: true,
        downloads: initialDownloads,
        totalProgress: 0,
        error: null,
        isProgressModalOpen: true
      });

      console.log(`[useExport:${hookId.current}] Setting isProgressModalOpen to true for batch download`);

      // 设置进度回调
      exportService.setProgressCallback(handleProgress);

      // 测试进度回调是否工作
      setTimeout(() => {
        console.log('[useExport] Testing progress callback with dummy data');
        const testDownloads = initialDownloads.map(d => ({ ...d, progress: 50, status: 'downloading' as const }));
        handleProgress(testDownloads, 50);
      }, 1000);

      // 开始批量下载
      await exportService.downloadBatch(invoices);

      // 下载成功通知
      notify.success(`成功导出 ${invoices.length} 张发票`);

      // 延迟关闭进度模态框
      setTimeout(() => {
        updateState({ isProgressModalOpen: false });
      }, 1500);

    } catch (error: any) {
      const errorMessage = error instanceof ExportError 
        ? error.message 
        : '批量下载失败，请重试';

      updateState({ error: errorMessage });
      notify.error(errorMessage);

      console.error('批量下载失败:', error);
    } finally {
      updateState({ isExporting: false });
    }
  }, [updateState, handleProgress]);

  // 取消下载
  const cancelDownload = useCallback(() => {
    exportService.cancelDownload();
    updateState({
      isExporting: false,
      isProgressModalOpen: false,
      error: '下载已取消'
    });
    notify.info('下载已取消');
  }, [updateState]);

  // 打开进度模态框
  const openProgressModal = useCallback(() => {
    updateState({ isProgressModalOpen: true });
  }, [updateState]);

  // 关闭进度模态框
  const closeProgressModal = useCallback(() => {
    // 如果正在下载，不允许关闭
    if (stateRef.current.isExporting) {
      return;
    }
    updateState({ isProgressModalOpen: false });
  }, [updateState]);

  // 清除错误
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  return {
    // 状态
    isExporting: state.isExporting,
    downloads: state.downloads,
    totalProgress: state.totalProgress,
    error: state.error,
    isProgressModalOpen: state.isProgressModalOpen,
    
    // 操作
    downloadSingle,
    downloadBatch,
    cancelDownload,
    openProgressModal,
    closeProgressModal,
    clearError
  };
};