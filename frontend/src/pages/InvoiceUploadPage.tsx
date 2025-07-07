import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Camera,
  FolderOpen
} from 'lucide-react';
import { api } from '../services/apiClient';
import Layout from '../components/layout/Layout';

interface UploadFile {
  file: File;
  id: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

const InvoiceUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

  // 文件上传变异
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.invoices.create(formData);
    },
    onSuccess: () => {
      // 刷新发票列表
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}`,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'pending',
      progress: 0
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const uploadFile = async (fileId: string) => {
    const fileItem = uploadFiles.find(f => f.id === fileId);
    if (!fileItem) return;

    setUploadFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'uploading', progress: 0 } : f
    ));

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadFiles(prev => prev.map(f => 
          f.id === fileId && f.progress < 90 
            ? { ...f, progress: f.progress + 10 } 
            : f
        ));
      }, 200);

      const response = await uploadMutation.mutateAsync(fileItem.file);
      
      clearInterval(progressInterval);
      
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'success', progress: 100 } : f
      ));

    } catch (error: any) {
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          status: 'error', 
          error: error.message || '上传失败',
          progress: 0 
        } : f
      ));
    }
  };

  const uploadAllFiles = () => {
    uploadFiles
      .filter(f => f.status === 'pending')
      .forEach(f => uploadFile(f.id));
  };

  const clearAllFiles = () => {
    uploadFiles.forEach(f => {
      if (f.preview) {
        URL.revokeObjectURL(f.preview);
      }
    });
    setUploadFiles([]);
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    if (file.type.startsWith('image/')) {
      return <Camera className="w-8 h-8 text-blue-500" />;
    }
    return <FolderOpen className="w-8 h-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-error" />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-base-content">上传发票</h1>
            <p className="text-base-content/60 mt-1">
              支持 PDF、JPG、PNG 格式，单个文件最大 10MB
            </p>
          </div>
          <button 
            className="btn btn-outline"
            onClick={() => navigate('/invoices')}
          >
            返回列表
          </button>
        </div>

        {/* 拖拽上传区域 */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-base-content/40 mx-auto mb-4" />
              
              {isDragActive ? (
                <p className="text-lg text-primary">松开鼠标上传文件</p>
              ) : (
                <div>
                  <p className="text-lg text-base-content mb-2">
                    拖拽文件到此处，或点击选择文件
                  </p>
                  <p className="text-sm text-base-content/60">
                    支持 PDF、JPG、PNG 格式
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 文件列表 */}
        {uploadFiles.length > 0 && (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  文件列表 ({uploadFiles.length})
                </h3>
                <div className="flex gap-2">
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={uploadAllFiles}
                    disabled={uploadFiles.every(f => f.status !== 'pending')}
                  >
                    <Upload className="w-4 h-4" />
                    全部上传
                  </button>
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={clearAllFiles}
                  >
                    清空列表
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {uploadFiles.map((fileItem) => (
                  <div key={fileItem.id} className="flex items-center gap-4 p-3 border border-base-300 rounded-lg">
                    {/* 文件图标/预览 */}
                    <div className="flex-shrink-0">
                      {fileItem.preview ? (
                        <img 
                          src={fileItem.preview} 
                          alt="预览" 
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        getFileIcon(fileItem.file)
                      )}
                    </div>

                    {/* 文件信息 */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{fileItem.file.name}</p>
                      <p className="text-sm text-base-content/60">
                        {formatFileSize(fileItem.file.size)}
                      </p>
                      
                      {/* 进度条 */}
                      {fileItem.status === 'uploading' && (
                        <div className="mt-2">
                          <progress 
                            className="progress progress-primary w-full" 
                            value={fileItem.progress} 
                            max="100"
                          ></progress>
                          <p className="text-xs text-base-content/60 mt-1">
                            {fileItem.progress}%
                          </p>
                        </div>
                      )}
                      
                      {/* 错误信息 */}
                      {fileItem.status === 'error' && fileItem.error && (
                        <p className="text-sm text-error mt-1">{fileItem.error}</p>
                      )}
                    </div>

                    {/* 状态和操作 */}
                    <div className="flex items-center gap-2">
                      {getStatusIcon(fileItem.status)}
                      
                      {fileItem.status === 'pending' && (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => uploadFile(fileItem.id)}
                        >
                          上传
                        </button>
                      )}
                      
                      {fileItem.status === 'error' && (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => uploadFile(fileItem.id)}
                        >
                          重试
                        </button>
                      )}
                      
                      <button 
                        className="btn btn-ghost btn-sm text-error"
                        onClick={() => removeFile(fileItem.id)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 上传说明 */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h3 className="text-lg font-semibold mb-3">上传说明</h3>
            <div className="prose prose-sm max-w-none">
              <ul>
                <li>支持的文件格式：PDF、JPG、PNG、JPEG、WEBP</li>
                <li>单个文件大小限制：10MB</li>
                <li>系统会自动提取发票信息，包括发票号、金额、开票方等</li>
                <li>上传后可在发票列表中查看和编辑</li>
                <li>建议上传清晰的扫描件或照片以提高识别准确率</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      </div>
    </Layout>
  );
};

export default InvoiceUploadPage;