import React, { useState, useRef, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  X, 
  File, 
  Image, 
  Video, 
  Music,
  FileText,
  AlertCircle,
  CheckCircle,
  Eye,
  Download,
  Trash2,
  Camera,
  RotateCcw,
  Crop,
  Loader,
  AlertTriangle
} from 'lucide-react';
import { useDeviceDetection } from '../../hooks/useMediaQuery';

// 文件类型
interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  url: string; // 预览URL
  status: 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
  thumbnail?: string; // 缩略图URL
}

// 文件类型限制
interface FileTypeRestriction {
  accept: string; // MIME types or extensions
  maxSize: number; // bytes
  description: string;
}

// 上传状态
type UploadState = 'idle' | 'dragover' | 'uploading' | 'complete' | 'error';

interface MobileFileUploadProps {
  // 基础属性
  label?: string;
  placeholder?: string;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  
  // 上传行为
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  
  // 文件限制
  acceptedTypes?: FileTypeRestriction[];
  maxFileSize?: number; // bytes, 默认 10MB
  maxTotalSize?: number; // bytes
  
  // 上传功能
  uploadUrl?: string;
  uploadMethod?: 'POST' | 'PUT';
  uploadHeaders?: Record<string, string>;
  customUpload?: (file: File) => Promise<{ url: string; thumbnail?: string }>;
  
  // 相机功能
  enableCamera?: boolean;
  cameraMode?: 'photo' | 'video' | 'both';
  
  // 图像处理
  enableImageCrop?: boolean;
  enableImageResize?: boolean;
  imageMaxWidth?: number;
  imageMaxHeight?: number;
  imageQuality?: number; // 0-1
  
  // 预览功能
  enablePreview?: boolean;
  enableDownload?: boolean;
  
  // UI 样式
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dropzone' | 'button' | 'list';
  showProgress?: boolean;
  showThumbnails?: boolean;
  
  // 事件回调
  onUploadStart?: (file: File) => void;
  onUploadProgress?: (file: File, progress: number) => void;
  onUploadSuccess?: (file: File, result: any) => void;
  onUploadError?: (file: File, error: string) => void;
  onPreview?: (file: UploadedFile) => void;
  onRemove?: (file: UploadedFile) => void;
  
  // 验证和反馈
  error?: string;
  helperText?: string;
  
  // 无障碍
  ariaLabel?: string;
  ariaDescribedBy?: string;
  
  // 样式类名
  className?: string;
  dropzoneClassName?: string;
  
  // 自定义渲染
  renderFile?: (file: UploadedFile, index: number) => React.ReactNode;
  renderPreview?: (file: UploadedFile) => React.ReactNode;
}

export const MobileFileUpload = forwardRef<HTMLDivElement, MobileFileUploadProps>(({
  label,
  placeholder,
  value = [],
  onChange,
  multiple = true,
  maxFiles = 10,
  disabled = false,
  readOnly = false,
  required = false,
  acceptedTypes = [
    { accept: 'image/*', maxSize: 10 * 1024 * 1024, description: '图片文件' },
    { accept: '.pdf,.doc,.docx', maxSize: 50 * 1024 * 1024, description: '文档文件' }
  ],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  maxTotalSize = 100 * 1024 * 1024, // 100MB
  uploadUrl,
  uploadMethod = 'POST',
  uploadHeaders = {},
  customUpload,
  enableCamera = true,
  cameraMode = 'photo',
  enableImageCrop = false,
  enableImageResize = true,
  imageMaxWidth = 1920,
  imageMaxHeight = 1080,
  imageQuality = 0.8,
  enablePreview = true,
  enableDownload = true,
  size = 'md',
  variant = 'dropzone',
  showProgress = true,
  showThumbnails = true,
  onUploadStart,
  onUploadProgress,
  onUploadSuccess,
  onUploadError,
  onPreview,
  onRemove,
  error,
  helperText,
  ariaLabel,
  ariaDescribedBy,
  className = '',
  dropzoneClassName = '',
  renderFile,
  renderPreview
}, ref) => {
  const device = useDeviceDetection();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [dragCounter, setDragCounter] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 将 ref 转发
  React.useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(containerRef.current);
      } else {
        ref.current = containerRef.current;
      }
    }
  }, [ref]);

  // 获取文件图标
  const getFileIcon = (file: UploadedFile) => {
    const type = file.type.toLowerCase();
    
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (type.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (type.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="w-5 h-5" />;
    
    return <File className="w-5 h-5" />;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 验证文件
  const validateFile = (file: File): string | null => {
    // 检查文件大小
    if (file.size > maxFileSize) {
      return `文件大小不能超过 ${formatFileSize(maxFileSize)}`;
    }

    // 检查文件类型
    const matchedType = acceptedTypes.find(type => {
      if (type.accept.includes('*')) {
        const mimeType = type.accept.split('/')[0];
        return file.type.startsWith(mimeType);
      }
      return type.accept.split(',').some(accept => {
        const trimmed = accept.trim();
        if (trimmed.startsWith('.')) {
          return file.name.toLowerCase().endsWith(trimmed.toLowerCase());
        }
        return file.type === trimmed;
      });
    });

    if (!matchedType) {
      return `不支持的文件类型，支持: ${acceptedTypes.map(t => t.description).join(', ')}`;
    }

    if (file.size > matchedType.maxSize) {
      return `${matchedType.description} 大小不能超过 ${formatFileSize(matchedType.maxSize)}`;
    }

    return null;
  };

  // 压缩图片
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/') || !enableImageResize) {
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // 计算新尺寸
        if (width > imageMaxWidth || height > imageMaxHeight) {
          const ratio = Math.min(imageMaxWidth / width, imageMaxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: file.lastModified
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          imageQuality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // 生成缩略图
  const generateThumbnail = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(undefined);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const size = 150;
        canvas.width = size;
        canvas.height = size;

        const aspectRatio = img.width / img.height;
        let drawWidth = size;
        let drawHeight = size;
        let drawX = 0;
        let drawY = 0;

        if (aspectRatio > 1) {
          drawHeight = size / aspectRatio;
          drawY = (size - drawHeight) / 2;
        } else {
          drawWidth = size * aspectRatio;
          drawX = (size - drawWidth) / 2;
        }

        ctx?.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };

      img.onerror = () => resolve(undefined);
      img.src = URL.createObjectURL(file);
    });
  };

  // 上传文件
  const uploadFile = async (file: File): Promise<{ url: string; thumbnail?: string }> => {
    if (customUpload) {
      return customUpload(file);
    }

    if (!uploadUrl) {
      // 如果没有上传URL，只返回本地URL
      const url = URL.createObjectURL(file);
      const thumbnail = await generateThumbnail(file);
      return { url, thumbnail };
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(uploadUrl, {
      method: uploadMethod,
      headers: uploadHeaders,
      body: formData
    });

    if (!response.ok) {
      throw new Error(`上传失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  };

  // 处理文件选择
  const handleFileSelect = async (files: FileList) => {
    if (disabled || readOnly) return;

    const fileArray = Array.from(files);
    const newFiles: UploadedFile[] = [];

    for (const file of fileArray) {
      if (value.length + newFiles.length >= maxFiles) {
        console.warn(`最多只能上传 ${maxFiles} 个文件`);
        break;
      }

      // 验证文件
      const validationError = validateFile(file);
      if (validationError) {
        const uploadedFile: UploadedFile = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          status: 'error',
          error: validationError
        };
        newFiles.push(uploadedFile);
        continue;
      }

      // 压缩图片
      try {
        const compressedFile = await compressImage(file);
        const uploadedFile: UploadedFile = {
          id: `${Date.now()}-${Math.random()}`,
          file: compressedFile,
          name: compressedFile.name,
          size: compressedFile.size,
          type: compressedFile.type,
          url: URL.createObjectURL(compressedFile),
          status: 'uploading',
          progress: 0
        };

        newFiles.push(uploadedFile);
      } catch (err) {
        const uploadedFile: UploadedFile = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          status: 'error',
          error: '文件处理失败'
        };
        newFiles.push(uploadedFile);
      }
    }

    // 添加到列表
    const updatedFiles = [...value, ...newFiles];
    onChange(updatedFiles);

    // 开始上传
    for (const uploadedFile of newFiles) {
      if (uploadedFile.status === 'uploading') {
        try {
          onUploadStart?.(uploadedFile.file);
          
          const result = await uploadFile(uploadedFile.file);
          
          // 更新文件状态
          const fileIndex = updatedFiles.findIndex(f => f.id === uploadedFile.id);
          if (fileIndex !== -1) {
            updatedFiles[fileIndex] = {
              ...updatedFiles[fileIndex],
              status: 'success',
              url: result.url,
              thumbnail: result.thumbnail,
              progress: 100
            };
            onChange([...updatedFiles]);
          }
          
          onUploadSuccess?.(uploadedFile.file, result);
        } catch (err) {
          const error = err instanceof Error ? err.message : '上传失败';
          
          // 更新文件状态
          const fileIndex = updatedFiles.findIndex(f => f.id === uploadedFile.id);
          if (fileIndex !== -1) {
            updatedFiles[fileIndex] = {
              ...updatedFiles[fileIndex],
              status: 'error',
              error
            };
            onChange([...updatedFiles]);
          }
          
          onUploadError?.(uploadedFile.file, error);
        }
      }
    }
  };

  // 拖拽处理
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter(prev => prev + 1);
    if (dragCounter === 0) {
      setUploadState('dragover');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter(prev => prev - 1);
    if (dragCounter === 1) {
      setUploadState('idle');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter(0);
    setUploadState('idle');
    
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // 删除文件
  const handleRemove = (file: UploadedFile) => {
    onChange(value.filter(f => f.id !== file.id));
    onRemove?.(file);
    
    // 清理 URL
    if (file.url.startsWith('blob:')) {
      URL.revokeObjectURL(file.url);
    }
    if (file.thumbnail?.startsWith('blob:')) {
      URL.revokeObjectURL(file.thumbnail);
    }
  };

  // 预览文件
  const handlePreview = (file: UploadedFile) => {
    onPreview?.(file);
  };

  // 获取尺寸类名
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          dropzone: 'min-h-[120px] p-4',
          file: 'p-2',
          thumbnail: 'w-12 h-12'
        };
      case 'lg':
        return {
          dropzone: 'min-h-[200px] p-8',
          file: 'p-4',
          thumbnail: 'w-20 h-20'
        };
      default:
        return {
          dropzone: 'min-h-[160px] p-6',
          file: 'p-3',
          thumbnail: 'w-16 h-16'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  // 获取接受的文件类型字符串
  const getAcceptString = () => {
    return acceptedTypes.map(type => type.accept).join(',');
  };

  const totalSize = value.reduce((sum, file) => sum + file.size, 0);
  const hasFiles = value.length > 0;
  const isOverLimit = value.length >= maxFiles;

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {/* 标签 */}
      {label && (
        <label className="label">
          <span className="label-text flex items-center gap-1">
            {label}
            {required && <span className="text-error">*</span>}
          </span>
          <span className="label-text-alt">
            {value.length} / {maxFiles} 文件 ({formatFileSize(totalSize)})
          </span>
        </label>
      )}

      {/* 文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptString()}
        multiple={multiple}
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
      />

      {/* 相机输入 */}
      {enableCamera && device.isMobile && (
        <input
          ref={cameraInputRef}
          type="file"
          accept={cameraMode === 'photo' ? 'image/*' : cameraMode === 'video' ? 'video/*' : 'image/*,video/*'}
          capture={cameraMode === 'photo' ? 'environment' : 'camcorder'}
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
      )}

      {/* 拖拽区域或按钮 */}
      {variant === 'dropzone' && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg text-center cursor-pointer
            transition-all duration-200
            ${sizeClasses.dropzone}
            ${uploadState === 'dragover' ? 'border-primary bg-primary/5' : 'border-base-300'}
            ${disabled || readOnly || isOverLimit ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-base-200/50'}
            ${dropzoneClassName}
          `}
          onClick={() => !disabled && !readOnly && !isOverLimit && fileInputRef.current?.click()}
        >
          <motion.div
            animate={{
              scale: uploadState === 'dragover' ? 1.05 : 1,
            }}
            className="flex flex-col items-center gap-3"
          >
            <div className="p-3 rounded-full bg-primary/10">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-medium text-base-content">
                {uploadState === 'dragover' ? '释放文件上传' : 
                 isOverLimit ? `最多支持 ${maxFiles} 个文件` :
                 placeholder || '点击或拖拽文件到此处'}
              </p>
              <p className="text-sm text-base-content/60 mt-1">
                支持: {acceptedTypes.map(t => t.description).join(', ')}
              </p>
              {maxFileSize && (
                <p className="text-xs text-base-content/60 mt-1">
                  单个文件最大 {formatFileSize(maxFileSize)}
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {variant === 'button' && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || readOnly || isOverLimit}
            className="btn btn-outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            选择文件
          </button>
          
          {enableCamera && device.isMobile && (
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled || readOnly || isOverLimit}
              className="btn btn-outline"
            >
              <Camera className="w-4 h-4 mr-2" />
              拍照
            </button>
          )}
        </div>
      )}

      {/* 文件列表 */}
      {hasFiles && (
        <div className="mt-4 space-y-2">
          <AnimatePresence>
            {value.map((file, index) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`
                  flex items-center gap-3 bg-base-100 border border-base-300 rounded-lg
                  ${sizeClasses.file}
                  ${file.status === 'error' ? 'border-error/30 bg-error/5' : ''}
                  ${file.status === 'success' ? 'border-success/30 bg-success/5' : ''}
                `}
              >
                {/* 缩略图或图标 */}
                <div className={`flex-shrink-0 ${sizeClasses.thumbnail} rounded-lg overflow-hidden bg-base-200 flex items-center justify-center`}>
                  {showThumbnails && file.thumbnail ? (
                    <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover" />
                  ) : file.type.startsWith('image/') && file.url ? (
                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-base-content/60">
                      {getFileIcon(file)}
                    </div>
                  )}
                </div>

                {/* 文件信息 */}
                <div className="flex-1 min-w-0">
                  {renderFile ? renderFile(file, index) : (
                    <>
                      <div className="font-medium text-sm truncate">
                        {file.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-base-content/60">
                        <span>{formatFileSize(file.size)}</span>
                        {file.status === 'uploading' && (
                          <>
                            <span>•</span>
                            <span>{file.progress || 0}%</span>
                          </>
                        )}
                        {file.status === 'error' && file.error && (
                          <>
                            <span>•</span>
                            <span className="text-error">{file.error}</span>
                          </>
                        )}
                      </div>
                      
                      {/* 进度条 */}
                      {showProgress && file.status === 'uploading' && (
                        <div className="w-full bg-base-300 rounded-full h-1 mt-2">
                          <div
                            className="bg-primary h-1 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress || 0}%` }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 状态图标 */}
                <div className="flex-shrink-0">
                  {file.status === 'uploading' && (
                    <Loader className="w-4 h-4 animate-spin text-primary" />
                  )}
                  {file.status === 'success' && (
                    <CheckCircle className="w-4 h-4 text-success" />
                  )}
                  {file.status === 'error' && (
                    <AlertTriangle className="w-4 h-4 text-error" />
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  {enablePreview && file.status === 'success' && (
                    <button
                      type="button"
                      onClick={() => handlePreview(file)}
                      className="btn btn-ghost btn-circle btn-xs"
                      aria-label="预览"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  
                  {enableDownload && file.status === 'success' && (
                    <a
                      href={file.url}
                      download={file.name}
                      className="btn btn-ghost btn-circle btn-xs"
                      aria-label="下载"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemove(file)}
                      className="btn btn-ghost btn-circle btn-xs text-error hover:bg-error/10"
                      aria-label="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 帮助文本或错误信息 */}
      {(error || helperText) && (
        <label className="label">
          <span className={`label-text-alt flex items-center gap-1 ${error ? 'text-error' : 'text-base-content/60'}`}>
            {error ? (
              <>
                <AlertCircle className="w-3 h-3" />
                {error}
              </>
            ) : helperText ? (
              <>
                <Info className="w-3 h-3" />
                {helperText}
              </>
            ) : null}
          </span>
        </label>
      )}
    </div>
  );
});

MobileFileUpload.displayName = 'MobileFileUpload';

export default MobileFileUpload;