import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import DetailedOCRResults from '../components/DetailedOCRResults';
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
  Save,
  Eye,
  Clock
} from 'lucide-react';
import { edgeFunctionOCR } from '../services/edgeFunctionOCR';
import { InvoiceService } from '../services/supabaseDataService';
import { useAuthContext } from '../contexts/AuthContext';
import { notify } from '../utils/notifications';
import Layout from '../components/layout/Layout';
import AdaptiveInvoiceFields from '../components/invoice/fields/AdaptiveInvoiceFields';
import type { Invoice } from '../types/index';

interface UploadFile {
  file: File;
  id: string;
  preview?: string;
  status: 'pending' | 'recognizing' | 'recognized' | 'uploading' | 'success' | 'error' | 'duplicate';
  progress: number;
  error?: string;
  ocrData?: any; // OCR识别的数据
  ocrRawResult?: any; // OCR原始响应数据
  // Edge Function特有字段
  qualityMessage?: string;
  processingTime?: number;
  completenessScore?: number;
  validationErrors?: string[];
  validationWarnings?: string[];
  duplicateInfo?: {
    existingInvoiceId: string;
    existingData: any;
    options: string[];
    note?: string;
  };
}

/**
 * OCR质量评估函数 - 适配Edge Function返回结构
 */
function assessOCRQuality(ocrResponse: any): { status: UploadFile['status']; progress: number; message: string } {
  // 如果没有响应或发生错误
  if (!ocrResponse || ocrResponse.error) {
    return {
      status: 'error',
      progress: 0,
      message: ocrResponse?.error || 'OCR处理失败'
    };
  }

  // 检查基本数据可用性
  const hasFields = ocrResponse.fields && Object.keys(ocrResponse.fields).length > 0;
  const confidence = ocrResponse.confidence?.overall || 0;
  const completenessScore = ocrResponse.validation?.completeness_score || 0;
  
  if (!hasFields || confidence < 0.5) {
    return {
      status: 'error',
      progress: 20,
      message: '数据提取质量过低'
    };
  }

  // 根据完整性评分和置信度评估质量
  if (ocrResponse.success) {
    // 完全成功：所有验证通过
    return {
      status: 'recognized',
      progress: 90,
      message: `识别完成，置信度 ${(confidence * 100).toFixed(1)}%`
    };
  } else if (completenessScore >= 70 && confidence >= 0.9) {
    // 高质量：虽有验证问题但数据质量高
    return {
      status: 'recognized',
      progress: 80,
      message: `识别基本完成，完整性 ${completenessScore}%`
    };
  } else if (completenessScore >= 50 && confidence >= 0.8) {
    // 中等质量：部分数据可用
    return {
      status: 'recognized',
      progress: 70,
      message: `识别部分完成，需手动补充`
    };
  } else if (completenessScore >= 30 && confidence >= 0.6) {
    // 低质量：数据不完整但可用
    return {
      status: 'recognized',
      progress: 60,
      message: `识别质量较低，建议重新处理`
    };
  } else {
    // 质量过低
    return {
      status: 'error',
      progress: 30,
      message: '数据质量过低，无法使用'
    };
  }
}

const InvoiceUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [filesToRecognize, setFilesToRecognize] = useState<UploadFile[]>([]);
  

  // OCR识别变异 - 使用Supabase Edge Function (OCR去重完整流程)
  const ocrMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('🔍 [OCR变异] 开始调用 OCR去重完整流程');
      console.log('📄 [OCR变异] 文件信息:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      });
      
      const startTime = performance.now();
      const response = await edgeFunctionOCR.processOCRComplete(file);
      const endTime = performance.now();
      
      console.log('✅ [OCR变异] OCR去重完整流程调用完成，耗时:', `${(endTime - startTime).toFixed(2)}ms`);
      console.log('📊 [OCR变异] 完整响应:', response);
      
      // 检查是否是重复文件
      if (response.isDuplicate) {
        console.log('🔄 [OCR变异] 检测到重复文件:', response.data);
        // 将重复信息添加到响应中，方便前端处理
        response.duplicateInfo = {
          existingInvoiceId: response.data?.id || '',
          existingData: response.data || {},
          uploadCount: response.data?.upload_count || 1,
          message: response.message || '文件重复，已跳过OCR处理'
        };
      }
      
      return response;
    }
  });

  // 文件上传变异（包含OCR数据）- 使用Supabase服务
  const uploadMutation = useMutation({
    mutationFn: async ({ file, ocrData, ocrRawResult }: { file: File; ocrData: any; ocrRawResult?: any }) => {
      console.log('🚀 [uploadMutation] 开始上传发票到Supabase');
      
      if (!user?.id) {
        throw new Error('用户未登录');
      }
      
      // 从OCR数据中提取字段
      const fields = ocrData.fields || {};
      
      // 根据发票类型构建不同的数据结构
      let invoiceData: any = {
        invoice_type: ocrData.invoice_type || ocrData.invoiceType || 'VAT_INVOICE',
        ocr_confidence: ocrData.confidence?.overall || 0,
        filename: file.name,
        file_size: file.size,
        processing_status: 'completed'
      };
      
      if (ocrData.invoice_type === '火车票' || 
          ocrData.invoice_type?.includes('火车票') || 
          ocrData.invoice_type === 'TrainTicket' ||
          ocrData.title?.includes('电子发票(铁路电子客票)')) {
        // 火车票数据 - 映射到发票字段
        invoiceData = {
          ...invoiceData,
          invoice_number: fields.ticket_number || fields.invoice_number || 'UNKNOWN',
          invoice_code: fields.electronic_ticket_number || '',
          invoice_date: convertChineseDateToISO(fields.invoice_date),
          seller_name: '中国铁路',
          buyer_name: fields.passenger_name || fields.buyer_name || 'UNKNOWN',
          buyer_tax_number: fields.buyer_credit_code || '',
          total_amount: parseFloat(fields.ticket_price || fields.total_amount || fields.fare || '0'),
          tax_amount: 0,
          amount_without_tax: parseFloat(fields.ticket_price || fields.total_amount || fields.fare || '0'),
          remarks: JSON.stringify({
            // 基本信息
            train_number: fields.train_number,
            departure_station: fields.departure_station,
            arrival_station: fields.arrival_station,
            departure_time: fields.departure_time,
            
            // 座位信息
            seat_number: fields.seat_number,
            seat_type: fields.seat_type,
            
            // 乘客信息
            passenger_name: fields.passenger_name,
            id_number: fields.id_number,
            
            // 票务信息
            electronic_ticket_number: fields.electronic_ticket_number
          }),
          // 保存完整的OCR数据到extracted_data字段
          extracted_data: {
            ocr_type: 'train_ticket',
            structured_data: ocrData,
            raw_result: ocrRawResult,
            confidence_scores: ocrData.confidence || { overall: 0 }
          }
        };
      } else {
        // 增值税发票数据
        const tax_amount = parseFloat(fields.tax_amount || '0');
        const amount_without_tax = parseFloat(fields.amount_without_tax || '0');
        const total_amount = parseFloat(fields.total_amount || '0');
        
        invoiceData = {
          ...invoiceData,
          invoice_number: fields.invoice_number || 'UNKNOWN',
          invoice_code: fields.invoice_code || '',
          invoice_date: convertChineseDateToISO(fields.invoice_date),
          seller_name: fields.seller_name || 'UNKNOWN',
          seller_tax_number: fields.seller_tax_number || '',
          buyer_name: fields.buyer_name || 'UNKNOWN',
          buyer_tax_number: fields.buyer_tax_number || '',
          total_amount: total_amount,
          tax_amount: tax_amount,
          amount_without_tax: amount_without_tax,
          remarks: fields.remarks || '',
          // 保存完整的OCR数据到extracted_data字段
          extracted_data: {
            ocr_type: 'vat_invoice',
            structured_data: ocrData,
            raw_result: ocrRawResult,
            confidence_scores: ocrData.confidence || { overall: 0 },
            // 保存发票明细项目
            invoice_details: fields.invoice_details || [],
            // 保存其他重要字段
            metadata: {
              title: ocrData.title,
              invoiceType: ocrData.invoiceType,
              check_code: fields.check_code,
              machine_code: fields.machine_code,
              drawer: fields.drawer,
              reviewer: fields.reviewer,
              recipient: fields.recipient
            }
          }
        };
      }
      
      console.log('📤 [uploadMutation] 构建的发票数据:', invoiceData);
      
      // 使用Supabase创建发票记录
      const response = await InvoiceService.createInvoice(user.id, invoiceData);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      console.log('✅ [uploadMutation] 发票创建成功:', response.data);
      return response.data;
    },
    onSuccess: (response) => {
      console.log('✅ [uploadMutation] 上传成功:', response);
      // 刷新发票列表和仪表板统计
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['supabase-invoices'] });
    },
    onError: (error: any) => {
      console.error('❌ [uploadMutation] 上传失败:', error);
      // Supabase错误处理
      if (error.message?.includes('duplicate_invoice') || error.message?.includes('重复')) {
        console.log('⚠️ [uploadMutation] 检测到重复发票错误');
        // 重复发票错误会在上传函数的catch块中处理
      }
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
      console.log('🚀 [recognizeFile] 开始OCR识别:', currentFile.name);
      const ocrResponse = await ocrMutation.mutateAsync(currentFile);
      console.log('✅ [recognizeFile] OCR API 响应:', ocrResponse);
      
      // 检查响应结构
      if (!ocrResponse) {
        throw new Error('OCR服务无响应');
      }
      
      // 处理重复文件情况
      if (ocrResponse.isDuplicate) {
        console.log('🔄 [recognizeFile] 检测到重复文件');
        setUploadFiles(prev => prev.map(f => 
          f.id === fileId ? { 
            ...f, 
            status: 'duplicate',
            progress: 100,
            duplicateInfo: {
              existingInvoiceId: ocrResponse.data?.id || '',
              existingData: ocrResponse.data || {},
              options: ['view', 'cancel'],
              note: `文件已上传 ${ocrResponse.data?.upload_count || 1} 次`
            },
            processingTime: ocrResponse.processingTime
          } : f
        ));
        return; // 重复文件不需要进一步处理
      }
      
      // 数据完整性检查
      console.log('🔍 [recognizeFile] 数据完整性检查:');
      console.log('  - success:', ocrResponse?.success);
      console.log('  - invoice_type:', ocrResponse?.invoice_type);
      console.log('  - fields 存在:', !!ocrResponse?.fields);
      console.log('  - fields 字段数:', Object.keys(ocrResponse?.fields || {}).length);
      console.log('  - validation 存在:', !!ocrResponse?.validation);
      console.log('  - raw_ocr_data 存在:', !!ocrResponse?.raw_ocr_data);
      
      // Edge Function数据可用性检查
      const hasValidData = ocrResponse.fields && 
                          Object.keys(ocrResponse.fields).length > 0 && 
                          ocrResponse.confidence?.overall > 0.5;
      
      if (!hasValidData) {
        throw new Error(ocrResponse.error || 'OCR数据提取失败');
      }
      
      // 记录验证状态和警告
      if (!ocrResponse.success) {
        console.warn('⚠️ [OCR] 字段验证未完全通过，但数据可用:', {
          completeness_score: ocrResponse.validation?.completeness_score,
          errors: ocrResponse.validation?.overall_errors,
          warnings: ocrResponse.validation?.overall_warnings
        });
      }
      
      // 保持Edge Function的完整响应结构
      const ocrData = {
        // 基础信息
        invoice_type: ocrResponse.invoice_type,
        success: ocrResponse.success,
        
        // 保留完整的字段结构
        fields: ocrResponse.fields || {},
        
        // 置信度信息
        confidence: ocrResponse.confidence || { overall: 0, fields: {} },
        
        // 验证信息
        validation: ocrResponse.validation || {
          is_valid: false,
          field_results: {},
          overall_errors: [],
          overall_warnings: [],
          completeness_score: 0
        },
        
        // 原始OCR数据
        raw_ocr_data: ocrResponse.raw_ocr_data || {},
        
        // 处理步骤
        processing_steps: ocrResponse.processing_steps || [],
        
        // 元数据
        metadata: ocrResponse.metadata || {
          total_processing_time: 0,
          step_timings: {},
          timestamp: new Date().toISOString()
        }
      };
      
      const ocrRawResult = ocrResponse.raw_ocr_data; // 保存原始OCR结果
      
      console.log('📊 [recognizeFile] 解析到的OCR数据:', ocrData);
      console.log('📊 [recognizeFile] OCR原始结果:', ocrRawResult);
      console.log('📊 [recognizeFile] 验证结果:', ocrResponse.validation);
      
      // 详细字段日志
      console.log('📋 [recognizeFile] 字段详情:');
      Object.entries(ocrResponse.fields || {}).forEach(([key, value]) => {
        console.log(`  - ${key}:`, value);
      });
      
      // 特殊字段检查
      console.log('🔍 [recognizeFile] 特殊字段检查:');
      console.log('  - invoice_details:', ocrData.invoice_details);
      console.log('  - invoice_details类型:', typeof ocrData.invoice_details);
      console.log('  - invoice_details是否为数组:', Array.isArray(ocrData.invoice_details));
      console.log('  - consumption_date:', ocrData.consumption_date);
      console.log('  - departure_time:', ocrData.departure_time);
      
      // 智能判断OCR结果质量
      const ocrQuality = assessOCRQuality(ocrResponse);
      console.log('📈 [OCR质量评估]:', ocrQuality);
      
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          status: ocrQuality.status, 
          progress: ocrQuality.progress,
          ocrData: ocrData,
          ocrRawResult: ocrRawResult,
          // Edge Function特有信息
          qualityMessage: ocrQuality.message,
          processingTime: ocrResponse.metadata?.total_processing_time,
          completenessScore: ocrResponse.validation?.completeness_score,
          validationErrors: ocrResponse.validation?.overall_errors || [],
          validationWarnings: ocrResponse.validation?.overall_warnings || []
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

  // 获取消费日期 - 已注释，改由后端触发器自动计算
  // const getConsumptionDate = (ocrData: any): string => {
  //   const invoiceType = ocrData.invoice_type || ocrData.invoiceType || '';
  //   
  //   // 新API格式：字段在fields对象下
  //   const fields = ocrData.fields || ocrData;
  //   const invoiceDate = convertChineseDateToISO(fields.invoice_date || ocrData.invoiceDate || ocrData.invoice_date);
  //   
  //   // 火车票：从 departure_time 中提取日期
  //   if (invoiceType === '火车票' || invoiceType === 'TrainTicket' || invoiceType.includes('铁路') || ocrData.title?.includes('铁路电子客票')) {
  //     // 支持多种数据结构层级
  //     const departureTime = fields.departure_time || 
  //                          ocrData.departureTime || 
  //                          ocrData.departure_time || 
  //                          ocrData.structured_data?.departureTime ||
  //                          ocrData.structured_data?.departure_time || '';
  //     
  //     if (departureTime) {
  //       // 处理格式: "2024年1月15日 14:30" 或 "2025年03月24日08:45开"
  //       const dateMatch = departureTime.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  //       if (dateMatch) {
  //         const [, year, month, day] = dateMatch;
  //         return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  //       }
  //     }
  //   }
  //   
  //   // 其他发票类型：默认使用开票日期
  //   return invoiceDate;
  // };

  // OCR 编辑状态
  const [editingOcrData, setEditingOcrData] = useState<any>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [isOcrEditModalOpen, setIsOcrEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  // 将OCR数据转换为发票对象供AdaptiveInvoiceFields使用
  const createInvoiceFromOcrData = (ocrData: any): Invoice => {
    console.log('🔄 [createInvoiceFromOcrData] 开始转换OCR数据');
    console.log('🔄 [createInvoiceFromOcrData] 输入的ocrData:', ocrData);
    
    // 新API返回的字段都在 fields 对象下，使用下划线命名
    const fields = ocrData.fields || ocrData;
    console.log('🔄 [createInvoiceFromOcrData] fields对象:', fields);
    
    return {
      id: `temp-${editingFileId}`,
      invoice_type: ocrData.invoice_type || '增值税发票',
      invoice_number: fields.invoice_number || fields.ticket_number || '',
      invoice_code: fields.invoice_code || fields.electronic_ticket_number || '',
      invoice_date: convertChineseDateToISO(fields.invoice_date),
      consumption_date: null,  // 消费日期由后端触发器自动计算
      seller_name: fields.seller_name || (ocrData.invoice_type === '火车票' || ocrData.invoice_type === 'TrainTicket' ? '中国铁路' : ''),
      seller_tax_number: fields.seller_tax_number || '',
      buyer_name: fields.buyer_name || fields.passenger_name || '',
      buyer_tax_number: fields.buyer_tax_number || fields.buyer_credit_code || '',
      total_amount: parseFloat(fields.total_amount || fields.fare || fields.ticket_price || '0'),
      tax_amount: parseFloat(fields.tax_amount || '0'),
      amount_without_tax: parseFloat(fields.amount_without_tax || '0'),
      remarks: ocrData.remarks || '',
      status: 'draft',
      processing_status: 'temp_editing',
      source: 'upload_temp',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [],
      ocr_confidence: ocrData.confidence || 0,
      
      // 保存完整的OCR数据供配置系统使用
      extracted_data: {
        title: ocrData.title || ocrData.invoice_type || '',
        structured_data: ocrData,
        raw_text: '',
        confidence: ocrData.confidence || 0,
        // 发票类型识别
        invoiceType: ocrData.invoice_type,
        invoice_type: ocrData.invoice_type,
        
        // 保存验证结果
        validation: ocrData.validation,
        processing_steps: ocrData.processing_steps,
        
        // 所有字段都使用新API返回的下划线格式
        // 火车票特殊字段
        train_number: ocrData.train_number,
        departure_station: ocrData.departure_station,
        arrival_station: ocrData.arrival_station,
        departure_time: ocrData.departure_time,
        seat_type: ocrData.seat_type,
        seat_number: ocrData.seat_number,
        passenger_name: ocrData.passenger_name,
        passenger_info: ocrData.passenger_info,
        ticket_number: ocrData.ticket_number,
        electronic_ticket_number: ocrData.electronic_ticket_number,
        buyer_credit_code: ocrData.buyer_credit_code,
        fare: ocrData.fare,
        ticket_gate: ocrData.ticket_gate,
        ticket_code: ocrData.ticket_code,
        sale_info: ocrData.sale_info,
        
        // 增值税发票字段
        invoice_number: ocrData.invoice_number,
        invoice_code: ocrData.invoice_code,
        invoice_date: ocrData.invoice_date,
        seller_name: ocrData.seller_name,
        seller_tax_number: ocrData.seller_tax_number,
        buyer_name: ocrData.buyer_name,
        buyer_tax_number: ocrData.buyer_tax_number,
        total_amount: ocrData.total_amount,
        tax_amount: ocrData.tax_amount,
        amount_without_tax: ocrData.amount_without_tax,
        remarks: ocrData.remarks,
        
        // 其他增值税发票字段
        check_code: ocrData.check_code,
        machine_code: ocrData.machine_code,
        drawer: ocrData.drawer,
        reviewer: ocrData.reviewer,
        recipient: ocrData.recipient,
        printed_invoice_code: ocrData.printed_invoice_code,
        printed_invoice_number: ocrData.printed_invoice_number,
        form_type: ocrData.form_type,
        special_tag: ocrData.special_tag,
        invoice_details: (() => {
          // 尝试从多个路径获取发票明细
          const detailsData = ocrData.invoice_details || fields.invoice_details;
          
          // 调试信息已移除，数据处理正常
          
          // 如果已经是数组，直接返回
          if (Array.isArray(detailsData)) {
            return detailsData;
          }
          
          // 如果是字符串，尝试解析为JSON
          if (typeof detailsData === 'string') {
            try {
              // 先尝试标准JSON解析
              const parsed = JSON.parse(detailsData);
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              try {
                // 尝试将Python字典格式转换为JSON格式
                const jsonStr = detailsData
                  .replace(/'/g, '"')  // 单引号替换为双引号
                  .replace(/None/g, 'null')  // Python None 替换为 null
                  .replace(/True/g, 'true')  // Python True 替换为 true
                  .replace(/False/g, 'false'); // Python False 替换为 false
                
                const parsed = JSON.parse(jsonStr);
                return Array.isArray(parsed) ? parsed : [];
              } catch (e2) {
                console.warn('Python格式转换也失败:', e2);
                console.warn('原始数据:', detailsData);
                return [];
              }
            }
          }
          
          // 其他情况返回空数组
          return [];
        })()
      }
    };
  };

  // 编辑OCR数据 - 使用自适应字段组件
  const editOcrData = (fileId: string) => {
    const fileItem = uploadFiles.find(f => f.id === fileId);
    if (!fileItem || !fileItem.ocrData) return;
    
    console.log('🔧 [editOcrData] 开始编辑OCR数据:', fileItem.ocrData);
    
    // 设置编辑状态
    setEditingOcrData({ ...fileItem.ocrData });
    setEditingFileId(fileId);
    
    // 预填充表单数据，从 OCR 数据映射到字段键名
    const tempInvoice = createInvoiceFromOcrData(fileItem.ocrData);
    const initialFormData: Record<string, any> = {};
    
    console.log('🔧 [editOcrData] 创建的临时发票对象:', tempInvoice);
    console.log('🔧 [editOcrData] OCR数据的发票类型:', fileItem.ocrData.invoice_type);
    
    // 新API格式：所有字段都在 fields 对象下，使用 snake_case
    const fields = fileItem.ocrData.fields || fileItem.ocrData;
    
    console.log('🔧 [editOcrData] 提取的字段数据:', fields);
    console.log('🔧 [editOcrData] 字段列表:', Object.keys(fields));
    
    // 根据发票类型预填充对应字段
    if (fileItem.ocrData.invoice_type === '火车票' || 
        fileItem.ocrData.invoice_type === 'TrainTicket') {
      // 火车票字段映射
      initialFormData.train_number = fields.train_number || '';
      initialFormData.departure_station = fields.departure_station || '';
      initialFormData.arrival_station = fields.arrival_station || '';
      initialFormData.departure_time = fields.departure_time || '';
      initialFormData.seat_type = fields.seat_type || '';
      initialFormData.seat_number = fields.seat_number || '';
      initialFormData.passenger_name = fields.passenger_name || '';
      initialFormData.passenger_info = fields.passenger_info || fields.id_number || '';
      initialFormData.ticket_number = fields.ticket_number || '';
      initialFormData.electronic_ticket_number = fields.electronic_ticket_number || '';
      initialFormData.invoice_date = convertChineseDateToISO(fields.invoice_date || '');
      // 消费日期由后端触发器自动计算
      // initialFormData.consumption_date = getConsumptionDate(fileItem.ocrData);
      initialFormData.consumption_date = fields.consumption_date || null;
      initialFormData.fare = fields.total_amount || fields.ticket_price || fields.fare || '0';
      initialFormData.buyer_name = fields.buyer_name || fields.passenger_name || '';
      initialFormData.buyer_credit_code = fields.buyer_credit_code || '';
      initialFormData.remarks = fields.remarks || fields.notes || '';
    } else {
      // 增值税发票字段映射
      initialFormData.invoice_type = fileItem.ocrData.invoice_type || '增值税发票';
      initialFormData.invoice_number = fields.invoice_number || '';
      initialFormData.invoice_code = fields.invoice_code || '';
      initialFormData.invoice_date = convertChineseDateToISO(fields.invoice_date || '');
      // 消费日期由后端触发器自动计算
      // initialFormData.consumption_date = getConsumptionDate(fileItem.ocrData);
      initialFormData.consumption_date = fields.consumption_date || null;
      initialFormData.seller_name = fields.seller_name || '';
      initialFormData.seller_tax_number = fields.seller_tax_number || '';
      initialFormData.buyer_name = fields.buyer_name || '';
      initialFormData.buyer_tax_number = fields.buyer_tax_number || '';
      initialFormData.total_amount = fields.total_amount || '0';
      
      // 处理税额和不含税金额的字段映射
      initialFormData.tax_amount = fields.tax_amount || '0';
      initialFormData.amount_without_tax = fields.amount_without_tax || '0';
      
      console.log('🔧 [editOcrData] 金额字段映射调试:');
      console.log('  - total_amount:', initialFormData.total_amount);
      console.log('  - tax_amount:', initialFormData.tax_amount, '(来源: tax_amount=', fields.tax_amount, ')');
      console.log('  - amount_without_tax:', initialFormData.amount_without_tax, '(来源: amount_without_tax=', fields.amount_without_tax, ')');
      
      // 发票明细字段映射
      initialFormData.invoice_details = (() => {
        // 尝试从多个路径获取发票明细
        const detailsData = fields.invoice_details || fileItem.ocrData.invoice_details || fileItem.ocrData.invoiceDetails;
        
        console.log('🔧 [editOcrData] 处理invoice_details:');
        console.log('  - 原始detailsData:', detailsData);
        console.log('  - detailsData类型:', typeof detailsData);
        console.log('  - 是否为数组:', Array.isArray(detailsData));
        
        // 如果是字符串，尝试解析为JSON
        if (typeof detailsData === 'string') {
          try {
            // 先尝试标准JSON解析
            const parsed = JSON.parse(detailsData);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            try {
              // 尝试将Python字典格式转换为JSON格式
              const jsonStr = detailsData
                .replace(/'/g, '"')  // 单引号替换为双引号
                .replace(/None/g, 'null')  // Python None 替换为 null
                .replace(/True/g, 'true')  // Python True 替换为 true
                .replace(/False/g, 'false'); // Python False 替换为 false
              
              const parsed = JSON.parse(jsonStr);
              return Array.isArray(parsed) ? parsed : [];
            } catch (e2) {
              console.warn('解析发票明细失败:', e2);
              return [];
            }
          }
        }
        
        // 如果已经是数组，直接返回
        return Array.isArray(detailsData) ? detailsData : [];
      })();
      
      // 其他增值税发票特定字段
      initialFormData.check_code = fields.check_code || '';
      initialFormData.printed_invoice_code = fields.printed_invoice_code || '';
      initialFormData.printed_invoice_number = fields.printed_invoice_number || '';
      initialFormData.machine_code = fields.machine_code || '';
      initialFormData.form_type = fields.form_type || '';
      initialFormData.drawer = fields.drawer || '';
      initialFormData.reviewer = fields.reviewer || '';
      initialFormData.recipient = fields.recipient || '';
      
      initialFormData.remarks = fields.remarks || fields.notes || '';
    }
    
    console.log('🔧 [editOcrData] 初始表单数据:', initialFormData);
    
    setEditFormData(initialFormData);
    setEditFormErrors({});
    setIsOcrEditModalOpen(true);
  };

  // 处理字段变化
  const handleFieldChange = (key: string, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [key]: value
    }));
    
    // 清除该字段的错误
    if (editFormErrors[key]) {
      setEditFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  // 保存OCR编辑结果
  const saveOcrEdit = () => {
    if (!editingFileId || !editingOcrData) return;
    
    console.log('💾 [saveOcrEdit] 开始保存编辑结果');
    console.log('💾 [saveOcrEdit] 编辑的文件ID:', editingFileId);
    console.log('💾 [saveOcrEdit] 原始OCR数据:', editingOcrData);
    console.log('💾 [saveOcrEdit] 表单数据:', editFormData);
    console.log('💾 [saveOcrEdit] 表单数据键:', Object.keys(editFormData));
    
    // 将表单数据合并回OCR数据
    const updatedOcrData = { ...editingOcrData };
    
    // 确保有 fields 对象（新API格式）
    if (!updatedOcrData.fields) {
      updatedOcrData.fields = {};
    }
    
    // 映射表单字段回OCR数据结构（直接更新 fields 对象）
    Object.keys(editFormData).forEach(key => {
      const value = editFormData[key];
      
      // 新API格式：所有字段都在 fields 对象下
      switch (key) {
        // 基本发票字段
        case 'invoice_number':
          if (updatedOcrData.invoice_type === '火车票' || updatedOcrData.invoice_type === 'TrainTicket') {
            updatedOcrData.fields.ticket_number = value;
          } else {
            updatedOcrData.fields.invoice_number = value;
          }
          break;
        case 'invoice_code':
          updatedOcrData.fields.invoice_code = value;
          if (updatedOcrData.invoice_type === '火车票' || updatedOcrData.invoice_type === 'TrainTicket') {
            updatedOcrData.fields.electronic_ticket_number = value;
          }
          break;
        case 'invoice_date':
          updatedOcrData.fields.invoice_date = value;
          break;
        case 'consumption_date':
          // 对于火车票，更新 departure_time 以便重新计算消费日期
          if (updatedOcrData.invoice_type === '火车票' || updatedOcrData.invoice_type === 'TrainTicket') {
            // 如果用户编辑了发车日期，更新 departure_time
            const existingDepartureTime = updatedOcrData.fields.departure_time || '';
            if (existingDepartureTime && value) {
              // 保留时间部分，只更新日期
              const timeMatch = existingDepartureTime.match(/(\d{1,2}:\d{2})/);
              const timePart = timeMatch ? ` ${timeMatch[1]}` : '';
              
              // 将 ISO 日期转换为中文格式
              const [year, month, day] = value.split('-');
              updatedOcrData.fields.departure_time = `${year}年${parseInt(month)}月${parseInt(day)}日${timePart}`;
            }
          }
          // 直接保存编辑的消费日期值
          updatedOcrData.fields.consumption_date = value;
          break;
        case 'seller_name':
          updatedOcrData.fields.seller_name = value;
          break;
        case 'seller_tax_number':
          updatedOcrData.fields.seller_tax_number = value;
          break;
        case 'buyer_name':
          if (updatedOcrData.invoice_type === '火车票' || updatedOcrData.invoice_type === 'TrainTicket') {
            updatedOcrData.fields.passenger_name = value;
          }
          updatedOcrData.fields.buyer_name = value;
          break;
        case 'buyer_tax_number':
          if (updatedOcrData.invoice_type === '火车票' || updatedOcrData.invoice_type === 'TrainTicket') {
            updatedOcrData.fields.buyer_credit_code = value;
          } else {
            updatedOcrData.fields.buyer_tax_number = value;
          }
          break;
        case 'total_amount':
          if (updatedOcrData.invoice_type === '火车票' || updatedOcrData.invoice_type === 'TrainTicket') {
            updatedOcrData.fields.ticket_price = value;
          } else {
            updatedOcrData.fields.total_amount = value;
          }
          break;
        case 'tax_amount':
          console.log('💾 [saveOcrEdit] 处理tax_amount字段:', { key, value, 原始值: updatedOcrData.fields.tax_amount });
          updatedOcrData.fields.tax_amount = value;
          updatedOcrData.fields.invoice_tax = value;
          console.log('💾 [saveOcrEdit] tax_amount字段处理完成:', { 
            'fields.tax_amount': updatedOcrData.fields.tax_amount,
            'fields.invoice_tax': updatedOcrData.fields.invoice_tax 
          });
          break;
        case 'amount_without_tax':
          console.log('💾 [saveOcrEdit] 处理amount_without_tax字段:', { key, value, 原始值: updatedOcrData.fields.amount_without_tax });
          updatedOcrData.fields.amount_without_tax = value;
          updatedOcrData.fields.invoice_amount_pre_tax = value;
          console.log('💾 [saveOcrEdit] amount_without_tax字段处理完成:', { 
            'fields.amount_without_tax': updatedOcrData.fields.amount_without_tax,
            'fields.invoice_amount_pre_tax': updatedOcrData.fields.invoice_amount_pre_tax 
          });
          break;
        case 'remarks':
          updatedOcrData.fields.remarks = value;
          break;
        
        // 火车票特殊字段
        case 'train_number':
          updatedOcrData.fields.train_number = value;
          break;
        case 'departure_station':
          updatedOcrData.fields.departure_station = value;
          break;
        case 'arrival_station':
          updatedOcrData.fields.arrival_station = value;
          break;
        case 'departure_time':
          updatedOcrData.fields.departure_time = value;
          break;
        case 'seat_type':
          updatedOcrData.fields.seat_type = value;
          break;
        case 'seat_number':
          updatedOcrData.fields.seat_number = value;
          break;
        case 'passenger_name':
          updatedOcrData.fields.passenger_name = value;
          break;
        case 'passenger_info':
          updatedOcrData.fields.id_number = value;
          break;
        case 'ticket_number':
          updatedOcrData.fields.ticket_number = value;
          break;
        case 'electronic_ticket_number':
          updatedOcrData.fields.electronic_ticket_number = value;
          break;
        case 'fare':
          updatedOcrData.fields.ticket_price = value;
          break;
        case 'buyer_credit_code':
          updatedOcrData.fields.buyer_credit_code = value;
          break;
        
        // 增值税发票特殊字段
        case 'invoice_type':
          // invoice_type 保存在顶层，不在 fields 下
          updatedOcrData.invoice_type = value;
          break;
        case 'invoice_details':
          updatedOcrData.fields.invoice_details = value;
          break;
        case 'check_code':
          updatedOcrData.fields.check_code = value;
          break;
        case 'printed_invoice_code':
          updatedOcrData.fields.printed_invoice_code = value;
          break;
        case 'printed_invoice_number':
          updatedOcrData.fields.printed_invoice_number = value;
          break;
        case 'machine_code':
          updatedOcrData.fields.machine_code = value;
          break;
        case 'form_type':
          updatedOcrData.fields.form_type = value;
          break;
        case 'drawer':
          updatedOcrData.fields.drawer = value;
          break;
        case 'reviewer':
          updatedOcrData.fields.reviewer = value;
          break;
        case 'recipient':
          updatedOcrData.fields.recipient = value;
          break;
        
        default:
          // 其他字段直接设置到 fields 下
          updatedOcrData.fields[key] = value;
          break;
      }
    });
    
    console.log('💾 [saveOcrEdit] 更新后的OCR数据:', updatedOcrData);
    console.log('💾 [saveOcrEdit] 更新后的fields对象:', updatedOcrData.fields);
    console.log('💾 [saveOcrEdit] 消费日期处理:', {
      原始消费日期: editFormData.consumption_date,
      更新后消费日期: updatedOcrData.fields?.consumption_date,
      departure_time: updatedOcrData.fields?.departure_time
    });
    
    // 更新文件的OCR数据
    setUploadFiles(prev => {
      const updated = prev.map(f => 
        f.id === editingFileId ? { ...f, ocrData: updatedOcrData } : f
      );
      console.log('💾 [saveOcrEdit] 更新后的文件列表:', updated);
      return updated;
    });
    
    // 关闭编辑模态框
    setIsOcrEditModalOpen(false);
    setEditingOcrData(null);
    setEditingFileId(null);
    setEditFormData({});
    setEditFormErrors({});
    
    // 显示成功提示
    notify.success('OCR数据已更新');
  };

  // 取消OCR编辑
  const cancelOcrEdit = () => {
    setIsOcrEditModalOpen(false);
    setEditingOcrData(null);
    setEditingFileId(null);
    setEditFormData({});
    setEditFormErrors({});
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
      case 'duplicate':
        return <AlertCircle className="w-4 h-4 text-warning" />;
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
      case 'duplicate':
        return '发票重复';
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
                        
                        {/* 重复发票信息 */}
                        {(() => {
                          console.log(`🔍 [UI渲染] 文件 ${fileItem.id} 状态:`, fileItem.status, '是否有duplicateInfo:', !!fileItem.duplicateInfo);
                          return null;
                        })()}
                        {fileItem.status === 'duplicate' && fileItem.duplicateInfo && (
                          <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-warning" />
                              <span className="font-medium text-warning">发票重复</span>
                            </div>
                            <p className="mb-3 text-base-content/80">{fileItem.error}</p>
                            
                            {fileItem.duplicateInfo.existingData && (
                              <div className="mb-3 p-2 bg-base-200 rounded">
                                <p className="font-medium mb-1">已存在的发票信息：</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-base-content/60">发票号：</span>
                                    <span>{fileItem.duplicateInfo.existingData.invoice_number}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">金额：</span>
                                    <span>¥{fileItem.duplicateInfo.existingData.total_amount}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">销售方：</span>
                                    <span>{fileItem.duplicateInfo.existingData.seller_name || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">开票日期：</span>
                                    <span>{fileItem.duplicateInfo.existingData.invoice_date || '-'}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {fileItem.duplicateInfo.note && (
                              <p className="text-xs text-base-content/60 italic">{fileItem.duplicateInfo.note}</p>
                            )}
                          </div>
                        )}

                        {/* OCR识别结果预览 */}
                        {fileItem.status === 'recognized' && fileItem.ocrData && (
                          <div className="mt-3 p-3 bg-base-200 rounded-lg text-sm">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="badge badge-primary">
                                {fileItem.ocrData.invoice_type || fileItem.ocrData.invoiceType || fileItem.ocrData.title || '增值税发票'}
                              </span>
                              {/* Edge Function质量信息 */}
                              <div className="flex items-center gap-2 text-xs">
                                {fileItem.completenessScore && (
                                  <span className={`badge badge-sm ${
                                    fileItem.completenessScore >= 70 ? 'badge-success' : 
                                    fileItem.completenessScore >= 50 ? 'badge-warning' : 'badge-error'
                                  }`}>
                                    完整性 {fileItem.completenessScore}%
                                  </span>
                                )}
                                {fileItem.processingTime && (
                                  <span className="badge badge-sm badge-ghost">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {fileItem.processingTime}ms
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* 质量消息和警告 */}
                            {fileItem.qualityMessage && (
                              <div className="mb-2 text-xs text-base-content/70">
                                📊 {fileItem.qualityMessage}
                              </div>
                            )}
                            {fileItem.validationErrors && fileItem.validationErrors.length > 0 && (
                              <div className="mb-2">
                                {fileItem.validationErrors.map((error, idx) => (
                                  <div key={idx} className="text-xs text-error bg-error/10 px-2 py-1 rounded mb-1">
                                    ❌ {error}
                                  </div>
                                ))}
                              </div>
                            )}
                            {fileItem.validationWarnings && fileItem.validationWarnings.length > 0 && (
                              <div className="mb-2">
                                {fileItem.validationWarnings.map((warning, idx) => (
                                  <div key={idx} className="text-xs text-warning bg-warning/10 px-2 py-1 rounded mb-1">
                                    ⚠️ {warning}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* 详细OCR结果展示 */}
                            <DetailedOCRResults fileItem={fileItem} />
                            <div className="grid grid-cols-2 gap-2">
                              {(fileItem.ocrData.invoice_type === '火车票' || 
                                fileItem.ocrData.invoice_type === 'TrainTicket' ||
                                fileItem.ocrData.title?.includes('电子发票(铁路电子客票)')) ? (
                                <>
                                  <div>
                                    <span className="text-base-content/60">车票号：</span>
                                    <span className="font-medium">{fileItem.ocrData.fields?.ticket_number || fileItem.ocrData.fields?.invoice_number || fileItem.ocrData.ticket_number || fileItem.ocrData.ticketNumber || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">车次：</span>
                                    <span className="font-medium">{fileItem.ocrData.fields?.train_number || fileItem.ocrData.train_number || fileItem.ocrData.trainNumber || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">乘车人：</span>
                                    <span className="font-medium">{fileItem.ocrData.fields?.passenger_name || fileItem.ocrData.fields?.buyer_name || fileItem.ocrData.passenger_name || fileItem.ocrData.passengerName || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">开票日期：</span>
                                    <span className="font-medium">{fileItem.ocrData.fields?.invoice_date || fileItem.ocrData.invoice_date || fileItem.ocrData.invoiceDate || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">出发站：</span>
                                    <span className="font-medium">{fileItem.ocrData.fields?.departure_station || fileItem.ocrData.departure_station || fileItem.ocrData.departureStation || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">到达站：</span>
                                    <span className="font-medium">{fileItem.ocrData.fields?.arrival_station || fileItem.ocrData.arrival_station || fileItem.ocrData.arrivalStation || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">座位：</span>
                                    <span className="font-medium">{fileItem.ocrData.fields?.seat_number || fileItem.ocrData.seat_number || fileItem.ocrData.seatNumber || '-'} {fileItem.ocrData.fields?.seat_type || fileItem.ocrData.seat_type || fileItem.ocrData.seatType || ''}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">票价：</span>
                                    <span className="font-medium">¥{fileItem.ocrData.fields?.total_amount || fileItem.ocrData.fields?.fare || fileItem.ocrData.fields?.ticket_price || fileItem.ocrData.total_amount || fileItem.ocrData.fare || fileItem.ocrData.ticket_price || '0'}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>
                                    <span className="text-base-content/60">发票号码：</span>
                                    <span className="font-medium">{fileItem.ocrData.fields?.invoice_number || fileItem.ocrData.invoiceNumber || fileItem.ocrData.invoice_number || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">开票日期：</span>
                                    <span className="font-medium">{fileItem.ocrData.fields?.invoice_date || fileItem.ocrData.invoiceDate || fileItem.ocrData.invoice_date || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">销售方：</span>
                                    <span className="font-medium">{fileItem.ocrData.fields?.seller_name || fileItem.ocrData.sellerName || fileItem.ocrData.seller_name || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/60">金额：</span>
                                    <span className="font-medium">¥{fileItem.ocrData.fields?.total_amount || fileItem.ocrData.totalAmount || fileItem.ocrData.total_amount || '0'}</span>
                                  </div>
                                  {(fileItem.ocrData.fields?.invoicedetails || fileItem.ocrData.invoiceDetails) && 
                                   (fileItem.ocrData.fields?.invoicedetails || fileItem.ocrData.invoiceDetails).length > 0 && (
                                    <div className="col-span-2">
                                      <span className="text-base-content/60">发票明细：</span>
                                      <span className="font-medium">
                                        {(fileItem.ocrData.fields?.invoicedetails?.[0]?.goods_name || 
                                          fileItem.ocrData.invoiceDetails?.[0]?.itemName || '-')}
                                      </span>
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
                          <button 
                            className="btn btn-sm btn-outline"
                            onClick={() => editOcrData(fileItem.id)}
                          >
                            <Edit2 className="w-4 h-4" />
                            编辑
                          </button>
                        )}
                        
                        {fileItem.status === 'duplicate' && (
                          <>
                            <button 
                              className="btn btn-sm btn-outline"
                              onClick={() => {
                                // 查看已存在的发票
                                if (fileItem.duplicateInfo?.existingInvoiceId) {
                                  navigate(`/invoices/detail/${fileItem.duplicateInfo.existingInvoiceId}`);
                                }
                              }}
                            >
                              <Eye className="w-4 h-4" />
                              查看原发票
                            </button>
                            <button 
                              className="btn btn-sm btn-warning"
                              onClick={() => {
                                // TODO: 实现强制覆盖功能
                                console.log('强制覆盖发票', fileItem.duplicateInfo);
                              }}
                            >
                              强制覆盖
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
                <li>系统会自动使用阿里云OCR识别发票信息并保存到数据库</li>
                <li>识别完成后可以编辑修正信息</li>
                <li>建议上传清晰的扫描件或照片以提高识别准确率</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* OCR 编辑模态框 - 使用自适应字段组件 */}
      {isOcrEditModalOpen && editingOcrData && (
        <dialog className="modal modal-bottom sm:modal-middle modal-open">
          <div className="modal-box w-full max-w-4xl mx-4 sm:mx-auto h-[90vh] sm:h-auto">
            {/* 关闭按钮 */}
            <form method="dialog">
              <button 
                className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                onClick={cancelOcrEdit}
              >
                <X className="w-4 h-4" />
              </button>
            </form>

            {/* 标题 */}
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              编辑发票信息
            </h3>

            {/* 内容区域 */}
            <div className="py-4 overflow-y-auto max-h-[calc(90vh-180px)] sm:max-h-[calc(80vh-180px)]">
              <div className="space-y-4">
                {/* 状态标签 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="badge badge-warning gap-2">
                    <Clock className="w-3 h-3" />
                    OCR识别
                  </div>
                  <div className="badge badge-info gap-2">
                    <FileText className="w-3 h-3" />
                    编辑中
                  </div>
                </div>
                
                {/* 使用自适应字段组件显示发票信息 */}
                <AdaptiveInvoiceFields
                  invoice={createInvoiceFromOcrData(editingOcrData)}
                  mode="edit"
                  editData={editFormData}
                  onFieldChange={handleFieldChange}
                  errors={editFormErrors}
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="modal-action">
              <button
                className="btn"
                onClick={cancelOcrEdit}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={saveOcrEdit}
              >
                <Save className="w-4 h-4" />
                保存修改
              </button>
            </div>
          </div>

          {/* 背景遮罩 */}
          <form method="dialog" className="modal-backdrop">
            <button onClick={cancelOcrEdit}>close</button>
          </form>
        </dialog>
      )}
    </Layout>
  );
};

export default InvoiceUploadPage;