import React, { useState, useCallback, useEffect } from 'react';
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
  FolderOpen,
  Edit2,
  Save
} from 'lucide-react';
import { api } from '../services/apiClient';
import Layout from '../components/layout/Layout';

interface UploadFile {
  file: File;
  id: string;
  preview?: string;
  status: 'pending' | 'recognizing' | 'recognized' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  ocrData?: any; // OCR识别的数据
  ocrRawResult?: any; // OCR原始响应数据
}

const InvoiceUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [editingData, setEditingData] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [filesToRecognize, setFilesToRecognize] = useState<UploadFile[]>([]);

  // OCR识别变异
  const ocrMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.ocr.recognize(formData);
      return response.data; // axios response.data
    }
  });

  // 文件上传变异（包含OCR数据）
  const uploadMutation = useMutation({
    mutationFn: async ({ file, ocrData, ocrRawResult }: { file: File; ocrData: any; ocrRawResult?: any }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // 根据发票类型构建不同的数据结构
      let invoiceData: any = {
        invoice_type: ocrData.invoice_type || ocrData.invoiceType || 'VAT_INVOICE',
        ocr_confidence: ocrData.confidence || 0,
      };
      
      if (ocrData.invoice_type === '火车票' || ocrData.title?.includes('电子发票(铁路电子客票)')) {
        // 火车票数据 - 映射到发票字段
        invoiceData = {
          ...invoiceData,
          invoice_number: ocrData.ticketNumber || ocrData.ticket_number || 'UNKNOWN',
          invoice_code: ocrData.electronicTicketNumber || '',
          invoice_date: convertChineseDateToISO(ocrData.invoiceDate || ocrData.invoice_date),
          seller_name: '中国铁路',
          buyer_name: ocrData.buyerName || ocrData.buyer_name || ocrData.passengerName || ocrData.passenger_name || 'UNKNOWN',
          buyer_tax_number: ocrData.buyerCreditCode || '',
          total_amount: ocrData.fare || ocrData.ticket_price || '0',
          tax_amount: '0',
          remarks: JSON.stringify({
            // 基本信息
            trainNumber: ocrData.trainNumber || ocrData.train_number,
            departureStation: ocrData.departureStation || ocrData.departure_station,
            arrivalStation: ocrData.arrivalStation || ocrData.arrival_station,
            departureTime: ocrData.departureTime || ocrData.departure_time,
            
            // 座位信息
            seatNumber: ocrData.seatNumber || ocrData.seat_number,
            seatType: ocrData.seatType || ocrData.seat_type,
            ticketGate: ocrData.ticketGate,
            
            // 乘客信息
            passengerName: ocrData.passengerName || ocrData.passenger_name,
            passengerInfo: ocrData.passengerInfo || ocrData.id_number,
            
            // 票务信息
            ticketCode: ocrData.ticketCode,
            electronicTicketNumber: ocrData.electronicTicketNumber,
            saleInfo: ocrData.saleInfo,
            remarks: ocrData.remarks,
            isCopy: ocrData.isCopy
          }),
          // 保存完整的OCR数据到extracted_data字段
          extracted_data: {
            ocr_type: 'train_ticket',
            structured_data: ocrData,
            raw_result: ocrRawResult,
            confidence_scores: {
              overall: ocrData.confidence || 0
            }
          }
        };
      } else {
        // 增值税发票数据 - 支持新旧字段名
        invoiceData = {
          ...invoiceData,
          invoice_number: ocrData.invoiceNumber || ocrData.invoice_number || 'UNKNOWN',
          invoice_code: ocrData.invoiceCode || ocrData.invoice_code || '',
          invoice_date: convertChineseDateToISO(ocrData.invoiceDate || ocrData.invoice_date),
          seller_name: ocrData.sellerName || ocrData.seller_name || 'UNKNOWN',
          seller_tax_number: ocrData.sellerTaxNumber || ocrData.seller_tax_number || '',
          buyer_name: ocrData.purchaserName || ocrData.buyer_name || 'UNKNOWN',
          buyer_tax_number: ocrData.purchaserTaxNumber || ocrData.buyer_tax_number || '',
          total_amount: ocrData.totalAmount || ocrData.total_amount || '0',
          tax_amount: ocrData.invoiceTax || ocrData.tax_amount || '0',
          amount_without_tax: ocrData.invoiceAmountPreTax || ocrData.amount_without_tax || '0',
          remarks: ocrData.remarks || '',
          // 保存完整的OCR数据到extracted_data字段
          extracted_data: {
            ocr_type: 'vat_invoice',
            structured_data: ocrData,
            raw_result: ocrRawResult,
            confidence_scores: {
              overall: ocrData.confidence || 0
            },
            // 保存发票明细项目
            invoice_details: ocrData.invoiceDetails || [],
            // 保存其他重要字段
            metadata: {
              title: ocrData.title,
              invoiceType: ocrData.invoiceType,
              totalAmountInWords: ocrData.totalAmountInWords,
              drawer: ocrData.drawer,
              recipient: ocrData.recipient,
              reviewer: ocrData.reviewer,
              checkCode: ocrData.checkCode,
              machineCode: ocrData.machineCode,
              printedInvoiceCode: ocrData.printedInvoiceCode,
              printedInvoiceNumber: ocrData.printedInvoiceNumber,
              specialTag: ocrData.specialTag,
              formType: ocrData.formType,
              sellerContactInfo: ocrData.sellerContactInfo,
              sellerBankAccountInfo: ocrData.sellerBankAccountInfo,
              purchaserContactInfo: ocrData.purchaserContactInfo,
              purchaserBankAccountInfo: ocrData.purchaserBankAccountInfo
            }
          }
        };
      }
      
      console.log('📤 [uploadMutation] 构建的发票数据:', invoiceData);
      formData.append('invoice_data', JSON.stringify(invoiceData));
      
      console.log('📤 [uploadMutation] FormData内容:');
      for (let [key, value] of formData.entries()) {
        if (key === 'file') {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`  ${key}:`, value);
        }
      }
      
      return api.invoices.createWithFile(formData);
    },
    onSuccess: (response) => {
      console.log('✅ [uploadMutation] 上传成功:', response);
      // 刷新发票列表
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: any) => {
      console.error('❌ [uploadMutation] 上传失败:', error);
      console.error('❌ [uploadMutation] 错误详情:', error.response?.data || error.data || error);
    }
  });

  // OCR识别 - 修复版本
  const recognizeFile = useCallback(async (uploadFile: UploadFile) => {
    console.log('🔍 [recognizeFile] 开始处理文件:', uploadFile);
    
    const fileId = uploadFile.id;
    const currentFile = uploadFile.file;
    
    if (!currentFile) {
      console.error('❌ [recognizeFile] 文件对象不存在');
      return;
    }
    
    // 更新状态为识别中
    setUploadFiles(prev => {
      console.log('🔍 [setUploadFiles] 更新文件状态为识别中:', fileId);
      return prev.map(f => 
        f.id === fileId ? { ...f, status: 'recognizing', progress: 30 } : f
      );
    });

    try {
      console.log('🚀 开始OCR识别:', currentFile.name);
      const ocrResponse = await ocrMutation.mutateAsync(currentFile);
      console.log('✅ OCR API 响应:', ocrResponse);
      
      // 检查响应结构
      if (!ocrResponse || !ocrResponse.success) {
        throw new Error(ocrResponse?.message || 'OCR识别失败');
      }
      
      const ocrData = ocrResponse.data; // 解析正确的数据结构
      const ocrRawResult = ocrResponse.raw_result; // 保存原始结果
      console.log('📊 解析到的OCR数据:', ocrData);
      console.log('📊 OCR原始结果:', ocrRawResult);
      
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          status: 'recognized', 
          progress: 60,
          ocrData: ocrData,
          ocrRawResult: ocrRawResult // 保存原始结果
        } : f
      ));

    } catch (error: any) {
      console.error('❌ OCR识别失败:', error);
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          status: 'error', 
          error: error.message || 'OCR识别失败',
          progress: 0 
        } : f
      ));
    }
  }, [ocrMutation]);

  // 使用 useEffect 监听需要识别的文件
  useEffect(() => {
    console.log('🔄 [useEffect] filesToRecognize 变化:', filesToRecognize);
    
    if (filesToRecognize.length > 0) {
      console.log('🔄 [useEffect] 开始处理文件识别队列');
      
      // 延迟执行，确保状态更新完成
      const timer = setTimeout(() => {
        console.log('🔄 [setTimeout] 开始执行延迟任务');
        filesToRecognize.forEach(uploadFile => {
          console.log('🔄 [setTimeout] 调用recognizeFile处理:', uploadFile);
          recognizeFile(uploadFile);
        });
        // 在执行完成后清空已处理的文件ID
        setFilesToRecognize([]);
      }, 100); // 给状态更新一些时间
      
      return () => clearTimeout(timer);
    }
  }, [filesToRecognize, recognizeFile]);

  // 监听 uploadFiles 变化
  useEffect(() => {
    console.log('📊 [uploadFiles变化] 当前文件数:', uploadFiles.length);
    console.log('📊 [uploadFiles变化] 文件ID列表:', uploadFiles.map(f => f.id));
  }, [uploadFiles]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log('📥 [onDrop] 接收到文件:', acceptedFiles);
    
    const timestamp = Date.now();
    const newFiles: UploadFile[] = acceptedFiles.map((file, index) => {
      const fileId = `${file.name}-${timestamp}-${index}`;
      console.log('📥 [onDrop] 创建文件对象:', { 
        fileId, 
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        timestamp,
        index
      });
      
      return {
        file,
        id: fileId,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        status: 'pending' as const,
        progress: 0
      };
    });

    console.log('📥 [onDrop] 新文件列表:', newFiles);
    
    setUploadFiles(prev => {
      console.log('📥 [setUploadFiles] 当前状态:', prev);
      const updated = [...prev, ...newFiles];
      console.log('📥 [setUploadFiles] 更新后状态:', updated);
      return updated;
    });
    
    // 设置需要识别的文件
    console.log('📥 [onDrop] 设置识别队列:', newFiles);
    setFilesToRecognize(newFiles);
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

  // 将中文日期格式转换为 YYYY-MM-DD
  const convertChineseDateToISO = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0]; // 默认今天日期
    
    // 尝试匹配中文日期格式：YYYY年MM月DD日
    const chineseMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (chineseMatch) {
      const [, year, month, day] = chineseMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // 如果已经是 YYYY-MM-DD 格式，直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // 尝试解析其他日期格式
    try {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn('无法解析日期格式:', dateStr);
    }
    
    // 默认返回今天日期
    return new Date().toISOString().split('T')[0];
  };

  // 编辑OCR数据
  const editOcrData = (fileId: string) => {
    const fileItem = uploadFiles.find(f => f.id === fileId);
    if (!fileItem || !fileItem.ocrData) return;
    
    // 根据类型转换日期格式
    let ocrDataWithFormattedDate = { ...fileItem.ocrData };
    
    if (fileItem.ocrData.invoice_type === '火车票' || fileItem.ocrData.title?.includes('电子发票(铁路电子客票)')) {
      // 火车票：转换日期格式
      ocrDataWithFormattedDate.invoiceDate = convertChineseDateToISO(fileItem.ocrData.invoiceDate || fileItem.ocrData.invoice_date);
      
      // 解析出发时间中的日期部分
      if (fileItem.ocrData.departureTime) {
        const match = fileItem.ocrData.departureTime.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (match) {
          ocrDataWithFormattedDate.departureDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        }
      }
    } else {
      // 增值税发票：转换开票日期 - 支持新旧字段名
      const invoiceDate = fileItem.ocrData.invoiceDate || fileItem.ocrData.invoice_date;
      ocrDataWithFormattedDate.invoice_date = convertChineseDateToISO(invoiceDate);
      ocrDataWithFormattedDate.invoiceDate = ocrDataWithFormattedDate.invoice_date; // 兼容新字段名
    }
    
    setEditingData({ fileId, ...ocrDataWithFormattedDate });
    setShowEditModal(true);
  };

  // 保存编辑的数据
  const saveEditedData = () => {
    if (!editingData) return;
    
    const { fileId, ...ocrData } = editingData;
    setUploadFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, ocrData } : f
    ));
    
    setShowEditModal(false);
    setEditingData(null);
  };

  // 上传文件（包含OCR数据）
  const uploadFile = async (fileId: string) => {
    const fileItem = uploadFiles.find(f => f.id === fileId);
    if (!fileItem || !fileItem.ocrData) return;

    setUploadFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'uploading', progress: 80 } : f
    ));

    try {
      // 确保日期格式正确转换
      let processedOcrData = { ...fileItem.ocrData };
      
      if (fileItem.ocrData.invoice_type === '火车票' || fileItem.ocrData.title?.includes('电子发票(铁路电子客票)')) {
        // 火车票：转换日期格式
        const invoiceDate = fileItem.ocrData.invoiceDate || fileItem.ocrData.invoice_date;
        processedOcrData.invoiceDate = convertChineseDateToISO(invoiceDate);
        processedOcrData.invoice_date = processedOcrData.invoiceDate;
      } else {
        // 增值税发票：转换开票日期
        const invoiceDate = fileItem.ocrData.invoiceDate || fileItem.ocrData.invoice_date;
        processedOcrData.invoice_date = convertChineseDateToISO(invoiceDate);
        processedOcrData.invoiceDate = processedOcrData.invoice_date;
      }
      
      console.log('📤 [uploadFile] 处理后的OCR数据:', processedOcrData);
      
      await uploadMutation.mutateAsync({ 
        file: fileItem.file, 
        ocrData: processedOcrData,
        ocrRawResult: fileItem.ocrRawResult // 传递原始OCR结果
      });
      
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'success', progress: 100 } : f
      ));

    } catch (error: any) {
      console.error('❌ [uploadFile] 上传失败:', error);
      console.error('❌ [uploadFile] 错误详情:', error.response?.data || error.data || error);
      
      const errorMessage = error.response?.data?.detail || 
                          error.data?.detail || 
                          error.message || 
                          '上传失败';
      
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          status: 'error', 
          error: errorMessage,
          progress: 0 
        } : f
      ));
    }
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
      case 'recognizing':
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'recognized':
        return <CheckCircle className="w-4 h-4 text-info" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-error" />;
      default:
        return null;
    }
  };

  const getStatusText = (fileItem: UploadFile) => {
    switch (fileItem.status) {
      case 'pending':
        return '等待处理';
      case 'recognizing':
        return 'OCR识别中...';
      case 'recognized':
        return '识别完成';
      case 'uploading':
        return '上传中...';
      case 'success':
        return '上传成功';
      case 'error':
        return fileItem.error || '处理失败';
      default:
        return '';
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
              支持 PDF、JPG、PNG 格式，自动识别发票信息
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
                    支持 PDF、JPG、PNG 格式，自动OCR识别
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
              <h3 className="text-lg font-semibold mb-4">
                文件列表 ({uploadFiles.length})
              </h3>

              <div className="space-y-3">
                {uploadFiles.map((fileItem) => (
                  <div key={fileItem.id} className="border border-base-300 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      {/* 文件图标/预览 */}
                      <div className="flex-shrink-0">
                        {fileItem.preview ? (
                          <img 
                            src={fileItem.preview} 
                            alt="预览" 
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          getFileIcon(fileItem.file)
                        )}
                      </div>

                      {/* 文件信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{fileItem.file.name}</p>
                          {getStatusIcon(fileItem.status)}
                        </div>
                        <p className="text-sm text-base-content/60">
                          {formatFileSize(fileItem.file.size)} · {getStatusText(fileItem)}
                        </p>
                        
                        {/* 进度条 */}
                        {(fileItem.status === 'recognizing' || fileItem.status === 'uploading') && (
                          <div className="mt-2">
                            <progress 
                              className="progress progress-primary w-full" 
                              value={fileItem.progress} 
                              max="100"
                            ></progress>
                          </div>
                        )}
                        
                        {/* OCR识别结果预览 */}
                        {fileItem.status === 'recognized' && fileItem.ocrData && (
                          <div className="mt-3 p-3 bg-base-200 rounded-lg text-sm">
                            <div className="mb-2">
                              <span className="badge badge-primary">
                                {fileItem.ocrData.invoice_type || fileItem.ocrData.invoiceType || fileItem.ocrData.title || '增值税发票'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {(fileItem.ocrData.invoice_type === '火车票' || fileItem.ocrData.title?.includes('电子发票(铁路电子客票)')) ? (
                                <>
                                  <div>
                                    <span className="text-base-content/60">车票号：</span>
                                    <span className="font-medium">{fileItem.ocrData.ticketNumber || fileItem.ocrData.ticket_number || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">车次：</span>
                                    <span className="font-medium">{fileItem.ocrData.trainNumber || fileItem.ocrData.train_number || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">乘车人：</span>
                                    <span className="font-medium">{fileItem.ocrData.passengerName || fileItem.ocrData.passenger_name || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">开票日期：</span>
                                    <span className="font-medium">{fileItem.ocrData.invoiceDate || fileItem.ocrData.invoice_date || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">出发站：</span>
                                    <span className="font-medium">{fileItem.ocrData.departureStation || fileItem.ocrData.departure_station || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">到达站：</span>
                                    <span className="font-medium">{fileItem.ocrData.arrivalStation || fileItem.ocrData.arrival_station || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">座位：</span>
                                    <span className="font-medium">{fileItem.ocrData.seatNumber || fileItem.ocrData.seat_number || '-'} {fileItem.ocrData.seatType || ''}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">票价：</span>
                                    <span className="font-medium">¥{fileItem.ocrData.fare || fileItem.ocrData.ticket_price || '0'}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>
                                    <span className="text-base-content/60">发票号码：</span>
                                    <span className="font-medium">{fileItem.ocrData.invoiceNumber || fileItem.ocrData.invoice_number || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">开票日期：</span>
                                    <span className="font-medium">{fileItem.ocrData.invoiceDate || fileItem.ocrData.invoice_date || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">销售方：</span>
                                    <span className="font-medium">{fileItem.ocrData.sellerName || fileItem.ocrData.seller_name || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">金额：</span>
                                    <span className="font-medium">¥{fileItem.ocrData.totalAmount || fileItem.ocrData.total_amount || '0'}</span>
                                  </div>
                                  {fileItem.ocrData.invoiceDetails && fileItem.ocrData.invoiceDetails.length > 0 && (
                                    <div className="col-span-2">
                                      <span className="text-base-content/60">发票明细：</span>
                                      <span className="font-medium">{fileItem.ocrData.invoiceDetails[0].itemName || '-'}</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2">
                        {fileItem.status === 'recognized' && (
                          <>
                            <button 
                              className="btn btn-sm btn-outline"
                              onClick={() => editOcrData(fileItem.id)}
                            >
                              <Edit2 className="w-4 h-4" />
                              编辑
                            </button>
                            <button 
                              className="btn btn-sm btn-primary"
                              onClick={() => uploadFile(fileItem.id)}
                            >
                              <Save className="w-4 h-4" />
                              保存
                            </button>
                          </>
                        )}
                        
                        {fileItem.status === 'error' && (
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => recognizeFile(fileItem)}
                          >
                            重试
                          </button>
                        )}
                        
                        <button 
                          className="btn btn-sm btn-ghost text-error"
                          onClick={() => removeFile(fileItem.id)}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
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
            <h3 className="text-lg font-semibold mb-3">使用说明</h3>
            <div className="prose prose-sm max-w-none">
              <ul>
                <li>支持的文件格式：PDF、JPG、PNG、JPEG、WEBP</li>
                <li>单个文件大小限制：10MB</li>
                <li>系统会自动使用阿里云OCR识别发票信息</li>
                <li>识别完成后可以编辑修正信息再保存</li>
                <li>建议上传清晰的扫描件或照片以提高识别准确率</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* 编辑模态框 */}
      {showEditModal && editingData && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              编辑{editingData.invoice_type === '火车票' ? '火车票' : '发票'}信息
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* 发票类型 */}
              <div className="form-control col-span-2">
                <label className="label">
                  <span className="label-text">类型</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered bg-base-200"
                  value={editingData.invoice_type || ''}
                  readOnly
                />
              </div>

              {/* 增值税发票字段 */}
              {editingData.invoice_type !== '火车票' && (
                <>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">发票号码</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.invoiceNumber || editingData.invoice_number || ''}
                      onChange={(e) => setEditingData({...editingData, invoiceNumber: e.target.value, invoice_number: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">发票代码</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.invoiceCode || editingData.invoice_code || ''}
                      onChange={(e) => setEditingData({...editingData, invoiceCode: e.target.value, invoice_code: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">开票日期</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered"
                      value={editingData.invoiceDate || editingData.invoice_date || ''}
                      onChange={(e) => setEditingData({...editingData, invoiceDate: e.target.value, invoice_date: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">金额</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input input-bordered"
                      value={editingData.totalAmount || editingData.total_amount || ''}
                      onChange={(e) => setEditingData({...editingData, totalAmount: e.target.value, total_amount: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control col-span-2">
                    <label className="label">
                      <span className="label-text">销售方名称</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.sellerName || editingData.seller_name || ''}
                      onChange={(e) => setEditingData({...editingData, sellerName: e.target.value, seller_name: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control col-span-2">
                    <label className="label">
                      <span className="label-text">购买方名称</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.purchaserName || editingData.buyer_name || ''}
                      onChange={(e) => setEditingData({...editingData, purchaserName: e.target.value, buyer_name: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">税额</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input input-bordered"
                      value={editingData.invoiceTax || editingData.tax_amount || ''}
                      onChange={(e) => setEditingData({...editingData, invoiceTax: e.target.value, tax_amount: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">不含税金额</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input input-bordered"
                      value={editingData.invoiceAmountPreTax || editingData.amount_without_tax || ''}
                      onChange={(e) => setEditingData({...editingData, invoiceAmountPreTax: e.target.value, amount_without_tax: e.target.value})}
                    />
                  </div>
                  
                  {editingData.invoiceDetails && editingData.invoiceDetails.length > 0 && (
                    <div className="form-control col-span-2">
                      <label className="label">
                        <span className="label-text">发票明细项目</span>
                      </label>
                      <div className="bg-base-200 p-3 rounded-lg">
                        {editingData.invoiceDetails.map((detail: any, index: number) => (
                          <div key={index} className="mb-2 last:mb-0">
                            <div className="text-sm font-medium">{detail.itemName}</div>
                            <div className="text-xs text-base-content/60">
                              数量: {detail.quantity} {detail.unit} | 
                              单价: ¥{detail.unitPrice} | 
                              金额: ¥{detail.amount} | 
                              税率: {detail.taxRate}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="form-control col-span-2">
                    <label className="label">
                      <span className="label-text">备注</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered"
                      rows={3}
                      value={editingData.remarks || ''}
                      onChange={(e) => setEditingData({...editingData, remarks: e.target.value})}
                      placeholder="备注内容"
                    />
                  </div>
                </>
              )}

              {/* 火车票字段 */}
              {(editingData.invoice_type === '火车票' || editingData.title?.includes('电子发票(铁路电子客票)')) && (
                <>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">车票号</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.ticketNumber || editingData.ticket_number || ''}
                      onChange={(e) => setEditingData({...editingData, ticketNumber: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">电子客票号</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.electronicTicketNumber || ''}
                      onChange={(e) => setEditingData({...editingData, electronicTicketNumber: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">开票日期</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered"
                      value={editingData.invoiceDate || ''}
                      onChange={(e) => setEditingData({...editingData, invoiceDate: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">车次</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.trainNumber || editingData.train_number || ''}
                      onChange={(e) => setEditingData({...editingData, trainNumber: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">乘车人</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.passengerName || editingData.passenger_name || ''}
                      onChange={(e) => setEditingData({...editingData, passengerName: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">乘客信息</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.passengerInfo || editingData.id_number || ''}
                      onChange={(e) => setEditingData({...editingData, passengerInfo: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">购买方名称</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.buyerName || ''}
                      onChange={(e) => setEditingData({...editingData, buyerName: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">购买方税号</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.buyerCreditCode || ''}
                      onChange={(e) => setEditingData({...editingData, buyerCreditCode: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">出发时间</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.departureTime || editingData.departure_time || ''}
                      onChange={(e) => setEditingData({...editingData, departureTime: e.target.value})}
                      placeholder="例：2025年03月24日08:45开"
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">出发站</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.departureStation || editingData.departure_station || ''}
                      onChange={(e) => setEditingData({...editingData, departureStation: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">到达站</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.arrivalStation || editingData.arrival_station || ''}
                      onChange={(e) => setEditingData({...editingData, arrivalStation: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">座位号</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.seatNumber || editingData.seat_number || ''}
                      onChange={(e) => setEditingData({...editingData, seatNumber: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">座位类型</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.seatType || editingData.seat_type || ''}
                      onChange={(e) => setEditingData({...editingData, seatType: e.target.value})}
                      placeholder="商务座/一等座/二等座等"
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">票价</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input input-bordered"
                      value={editingData.fare || editingData.ticket_price || ''}
                      onChange={(e) => setEditingData({...editingData, fare: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-control col-span-2">
                    <label className="label">
                      <span className="label-text">备注</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={editingData.remarks || ''}
                      onChange={(e) => setEditingData({...editingData, remarks: e.target.value})}
                      placeholder="如：始发改签"
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="modal-action">
              <button className="btn" onClick={() => setShowEditModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={saveEditedData}>
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default InvoiceUploadPage;