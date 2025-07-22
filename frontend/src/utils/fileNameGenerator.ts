import type { Invoice } from '../types/index';

/**
 * 清理文件名中的非法字符
 */
export const sanitizeFileName = (name: string): string => {
  return name
    .replace(/[<>:"/\\|?*]/g, '_') // 替换非法字符
    .replace(/\s+/g, '_') // 空格替换为下划线
    .replace(/_+/g, '_') // 多个下划线合并为一个
    .replace(/^_|_$/g, '') // 移除首尾下划线
    .substring(0, 50); // 限制长度
};

/**
 * 格式化金额为文件名友好格式
 */
export const formatAmountForFileName = (amount: number): string => {
  return amount.toFixed(2).replace(/\./g, '_');
};

/**
 * 生成单个发票文件名
 */
export const generateInvoiceFileName = (invoice: Invoice): string => {
  const date = new Date(invoice.invoice_date).toISOString().split('T')[0];
  const invoiceNumber = sanitizeFileName(invoice.invoice_number);
  const sellerName = sanitizeFileName(invoice.seller_name);
  const amount = formatAmountForFileName(invoice.total_amount);
  
  return `发票_${date}_${invoiceNumber}_${sellerName}_${amount}.pdf`;
};

/**
 * 生成批量导出文件名
 */
export const generateBatchExportFileName = (count: number, date?: Date): string => {
  const exportDate = date ? date : new Date();
  const dateStr = exportDate.toISOString().split('T')[0];
  
  return `发票批量导出_${dateStr}_${count}张.zip`;
};

/**
 * 根据发票类型生成特殊文件名
 */
export const generateTypeSpecificFileName = (invoice: Invoice): string => {
  const baseFileName = generateInvoiceFileName(invoice);
  
  // 根据发票类型添加前缀
  if (invoice.invoice_type) {
    const typeMap: Record<string, string> = {
      'train_ticket': '火车票',
      'flight_ticket': '机票',
      'hotel': '酒店',
      'taxi': '出租车',
      'general': '普通发票',
      'special': '专用发票'
    };
    
    const typePrefix = typeMap[invoice.invoice_type] || invoice.invoice_type;
    return baseFileName.replace('发票_', `${typePrefix}_`);
  }
  
  return baseFileName;
};

/**
 * 生成下载文件的完整信息
 */
export interface DownloadFileInfo {
  fileName: string;
  originalName: string;
  invoice: Invoice;
}

/**
 * 为批量下载准备文件信息
 */
export const prepareBatchDownloadFiles = (invoices: Invoice[]): DownloadFileInfo[] => {
  const fileNames = new Set<string>();
  
  return invoices.map(invoice => {
    let fileName = generateTypeSpecificFileName(invoice);
    
    // 处理重名文件
    let counter = 1;
    let uniqueFileName = fileName;
    while (fileNames.has(uniqueFileName)) {
      const extension = uniqueFileName.split('.').pop();
      const nameWithoutExt = uniqueFileName.replace(`.${extension}`, '');
      uniqueFileName = `${nameWithoutExt}_${counter}.${extension}`;
      counter++;
    }
    
    fileNames.add(uniqueFileName);
    
    return {
      fileName: uniqueFileName,
      originalName: invoice.invoice_number,
      invoice
    };
  });
};

/**
 * 验证文件名是否合法
 */
export const validateFileName = (fileName: string): boolean => {
  // 检查长度
  if (fileName.length === 0 || fileName.length > 255) {
    return false;
  }
  
  // 检查非法字符
  const illegalChars = /[<>:"/\\|?*]/;
  if (illegalChars.test(fileName)) {
    return false;
  }
  
  // 检查保留名称
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const nameWithoutExt = fileName.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    return false;
  }
  
  return true;
};