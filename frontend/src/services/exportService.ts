import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { api } from './apiClient';
import type { Invoice } from '../types';
import { 
  generateTypeSpecificFileName, 
  generateBatchExportFileName,
  prepareBatchDownloadFiles,
  type DownloadFileInfo 
} from '../utils/fileNameGenerator';
import type { DownloadProgress } from '../components/ui/DownloadProgressModal';

// 下载URL响应接口
interface DownloadUrlResponse {
  download_url: string;
  expires_at: string;
  invoice_id: string;
}

interface BatchDownloadUrlResponse {
  urls: DownloadUrlResponse[];
  batch_id: string;
}

// 下载的文件数据
interface DownloadedFile {
  fileName: string;
  data: Blob;
  invoice: Invoice;
}

// 导出进度回调函数类型
export type ExportProgressCallback = (
  downloads: DownloadProgress[],
  totalProgress: number
) => void;

// 导出错误类型
export class ExportError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ExportError';
  }
}

export class ExportService {
  private abortController?: AbortController;
  private progressCallback?: ExportProgressCallback;

  /**
   * 设置进度回调函数
   */
  setProgressCallback(callback: ExportProgressCallback) {
    console.log('[exportService] Setting progress callback');
    this.progressCallback = callback;
  }

  /**
   * 取消当前下载
   */
  cancelDownload() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }
  }

  /**
   * 下载单个发票
   */
  async downloadSingle(invoice: Invoice): Promise<void> {
    this.abortController = new AbortController();
    
    const downloads: DownloadProgress[] = [{
      fileName: generateTypeSpecificFileName(invoice),
      progress: 0,
      status: 'pending'
    }];

    try {
      // 更新进度：开始获取下载URL
      this.updateProgress(downloads, 0, 'downloading');
      
      // 获取下载URL
      const urlResponse = await this.getDownloadUrl(invoice.id);
      
      // 更新进度：开始下载
      this.updateProgress(downloads, 10, 'downloading');
      
      // 下载文件
      const blob = await this.downloadFile(
        urlResponse.download_url,
        (progress) => this.updateProgress(downloads, 10 + progress * 0.9, 'downloading')
      );
      
      // 保存文件
      saveAs(blob, downloads[0].fileName);
      
      // 更新进度：完成
      this.updateProgress(downloads, 100, 'completed');
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // 用户取消，不显示错误
      }
      
      const errorMessage = error.message || '下载失败';
      downloads[0].status = 'error';
      downloads[0].error = errorMessage;
      this.progressCallback?.(downloads, 0);
      
      throw new ExportError(
        `下载发票失败: ${errorMessage}`,
        'DOWNLOAD_FAILED',
        error
      );
    } finally {
      this.abortController = undefined;
    }
  }

  /**
   * 批量下载发票
   */
  async downloadBatch(invoices: Invoice[]): Promise<void> {
    if (invoices.length === 0) {
      throw new ExportError('没有选择要下载的发票', 'NO_INVOICES');
    }

    this.abortController = new AbortController();
    
    // 准备文件信息
    const fileInfos = prepareBatchDownloadFiles(invoices);
    const downloads: DownloadProgress[] = fileInfos.map(info => ({
      fileName: info.fileName,
      progress: 0,
      status: 'pending'
    }));

    try {
      // 阶段1：获取下载URL (0-20%)
      
      // 初始化进度为0 - 创建新数组以触发React更新
      const updatedDownloads = downloads.map(d => ({
        ...d,
        status: 'downloading' as const,
        progress: 0
      }));
      console.log('[exportService] Initial progress callback with 0%');
      this.progressCallback?.(updatedDownloads, 0);
      
      // 创建一个模拟进度的定时器
      let simulatedProgress = 0;
      const progressInterval = setInterval(() => {
        simulatedProgress = Math.min(simulatedProgress + 2, 18); // 最多到18%
        // 创建新数组以触发React更新
        const progressDownloads = updatedDownloads.map(d => ({
          ...d,
          progress: simulatedProgress,
          status: 'downloading' as const
        }));
        console.log('[exportService] Simulated progress:', simulatedProgress);
        this.progressCallback?.(progressDownloads, simulatedProgress);
      }, 500); // 每500ms增加2%
      
      let urlResponse: BatchDownloadUrlResponse;
      let readyDownloads: DownloadProgress[];
      
      try {
        // 获取所有下载URL
        urlResponse = await this.getBatchDownloadUrls(invoices.map(i => i.id));
        
        // 清除定时器
        clearInterval(progressInterval);
        
        // 更新所有文件状态为准备下载 - 创建新数组
        readyDownloads = downloads.map(d => ({
          ...d,
          status: 'downloading' as const,
          progress: 20
        }));
        this.progressCallback?.(readyDownloads, 20);
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
      
      // 创建URL映射
      const urlMap = new Map(urlResponse.urls.map(url => [url.invoice_id, url.download_url]));
      
      // 并发下载所有文件
      const downloadedFiles: DownloadedFile[] = [];
      const maxConcurrent = 3; // 最大并发数
      
      // 使用最新的downloads数组状态
      let currentDownloads = [...readyDownloads];
      
      for (let i = 0; i < fileInfos.length; i += maxConcurrent) {
        const batch = fileInfos.slice(i, i + maxConcurrent);
        const batchPromises = batch.map(async (fileInfo, batchIndex) => {
          const globalIndex = i + batchIndex;
          const downloadUrl = urlMap.get(fileInfo.invoice.id);
          
          if (!downloadUrl) {
            throw new ExportError(`无法获取发票 ${fileInfo.invoice.invoice_number} 的下载链接`, 'URL_NOT_FOUND');
          }
          
          try {
            // 更新状态为下载中 - 创建新数组
            currentDownloads = currentDownloads.map((d, idx) => 
              idx === globalIndex ? { ...d, status: 'downloading' as const } : d
            );
            this.updateBatchProgress(currentDownloads);
            
            // 下载文件 - 每个文件的进度从20%到90%
            const blob = await this.downloadFile(
              downloadUrl,
              (progress) => {
                // 将0-100的进度映射到20-90
                currentDownloads = currentDownloads.map((d, idx) => 
                  idx === globalIndex ? { ...d, progress: 20 + (progress * 0.7) } : d
                );
                this.updateBatchProgressWithPhase(currentDownloads, 'downloading');
              }
            );
            
            // 更新状态为完成 - 创建新数组
            currentDownloads = currentDownloads.map((d, idx) => 
              idx === globalIndex ? { ...d, status: 'completed' as const, progress: 90 } : d
            );
            this.updateBatchProgressWithPhase(currentDownloads, 'downloading');
            
            return {
              fileName: fileInfo.fileName,
              data: blob,
              invoice: fileInfo.invoice
            };
            
          } catch (error: any) {
            currentDownloads = currentDownloads.map((d, idx) => 
              idx === globalIndex ? { ...d, status: 'error' as const, error: error.message || '下载失败' } : d
            );
            this.updateBatchProgress(currentDownloads);
            throw error;
          }
        });
        
        // 等待当前批次完成
        const batchResults = await Promise.allSettled(batchPromises);
        
        // 收集成功的下载
        batchResults.forEach((result, batchIndex) => {
          if (result.status === 'fulfilled') {
            downloadedFiles.push(result.value);
          }
        });
      }
      
      if (downloadedFiles.length === 0) {
        throw new ExportError('所有文件下载失败', 'ALL_DOWNLOADS_FAILED');
      }
      
      // 阶段3：创建ZIP文件 (90-100%)
      // 更新所有成功下载的文件进度为90%
      currentDownloads = currentDownloads.map(d => {
        if (downloadedFiles.some(df => df.fileName === d.fileName)) {
          return { ...d, progress: 90, status: 'completed' as const };
        }
        return d;
      });
      this.progressCallback?.(currentDownloads, 90);
      
      // 创建ZIP文件
      const zipBlob = await this.createZipFile(downloadedFiles, (progress) => {
        // ZIP进度从90%到100%
        const totalProgress = 90 + (progress * 0.1);
        this.progressCallback?.(currentDownloads, totalProgress);
      });
      
      const zipFileName = generateBatchExportFileName(downloadedFiles.length);
      
      // 更新最终进度为100%
      currentDownloads = currentDownloads.map(d => {
        if (d.status === 'completed') {
          return { ...d, progress: 100 };
        }
        return d;
      });
      this.progressCallback?.(currentDownloads, 100);
      
      // 保存ZIP文件
      saveAs(zipBlob, zipFileName);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // 用户取消，不显示错误
      }
      
      throw new ExportError(
        `批量下载失败: ${error.message || '未知错误'}`,
        'BATCH_DOWNLOAD_FAILED',
        error
      );
    } finally {
      this.abortController = undefined;
    }
  }

  /**
   * 获取单个文件的下载URL
   */
  private async getDownloadUrl(invoiceId: string): Promise<DownloadUrlResponse> {
    try {
      const response = await api.invoices.getDownloadUrl(invoiceId, this.abortController?.signal);
      return response.data;
    } catch (error: any) {
      throw new ExportError(
        `获取下载链接失败: ${error.message || '网络错误'}`,
        'URL_FETCH_FAILED',
        error
      );
    }
  }

  /**
   * 获取批量下载URL
   */
  private async getBatchDownloadUrls(invoiceIds: string[]): Promise<BatchDownloadUrlResponse> {
    try {
      const response = await api.invoices.getBatchDownloadUrls({
        invoice_ids: invoiceIds
      }, this.abortController?.signal);
      return response.data;
    } catch (error: any) {
      throw new ExportError(
        `获取批量下载链接失败: ${error.message || '网络错误'}`,
        'BATCH_URL_FETCH_FAILED',
        error
      );
    }
  }

  /**
   * 下载文件
   */
  private async downloadFile(
    url: string, 
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    try {
      const response = await fetch(url, {
        signal: this.abortController?.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('Content-Length');
      if (!contentLength) {
        // 如果没有Content-Length，直接返回blob
        return await response.blob();
      }

      const total = parseInt(contentLength, 10);
      let loaded = 0;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;
        
        const progress = Math.round((loaded / total) * 100);
        onProgress?.(progress);
      }

      return new Blob(chunks);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error;
      }
      throw new ExportError(
        `文件下载失败: ${error.message || '网络错误'}`,
        'FILE_DOWNLOAD_FAILED',
        error
      );
    }
  }

  /**
   * 创建ZIP文件
   */
  private async createZipFile(
    files: DownloadedFile[], 
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    try {
      const zip = new JSZip();
      
      // 添加所有文件到ZIP
      files.forEach(file => {
        zip.file(file.fileName, file.data);
      });
      
      // 生成ZIP文件
      return await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      }, (metadata) => {
        const progress = Math.round(metadata.percent);
        onProgress?.(progress);
      });
      
    } catch (error: any) {
      throw new ExportError(
        `创建ZIP文件失败: ${error.message || '打包错误'}`,
        'ZIP_CREATION_FAILED',
        error
      );
    }
  }

  /**
   * 更新单个下载进度
   */
  private updateProgress(
    downloads: DownloadProgress[], 
    progress: number, 
    status: DownloadProgress['status']
  ) {
    downloads[0].progress = Math.round(progress);
    downloads[0].status = status;
    this.progressCallback?.(downloads, progress);
  }

  /**
   * 更新批量下载进度
   */
  private updateBatchProgress(downloads: DownloadProgress[]) {
    const totalProgress = downloads.reduce((sum, download) => {
      return sum + (download.status === 'completed' ? 100 : download.progress);
    }, 0) / downloads.length;
    
    // 创建新数组以触发React更新
    const newDownloads = [...downloads];
    this.progressCallback?.(newDownloads, Math.round(totalProgress));
  }

  /**
   * 更新批量下载进度（带阶段信息）
   */
  private updateBatchProgressWithPhase(downloads: DownloadProgress[], phase: string) {
    // 计算每个阶段的加权进度
    let totalProgress = 0;
    
    if (phase === 'downloading') {
      // 下载阶段：基于实际下载进度
      totalProgress = downloads.reduce((sum, download) => {
        return sum + Math.min(download.progress, 90);
      }, 0) / downloads.length;
    } else {
      // 其他阶段：使用标准计算
      totalProgress = downloads.reduce((sum, download) => {
        return sum + download.progress;
      }, 0) / downloads.length;
    }
    
    // 创建新数组以触发React更新
    const newDownloads = [...downloads];
    this.progressCallback?.(newDownloads, Math.round(totalProgress));
  }
}

// 创建全局导出服务实例
export const exportService = new ExportService();