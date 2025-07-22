// 表格工具函数
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Invoice } from '../types/table';

// 格式化货币
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount);
};

// 格式化日期
export const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'yyyy-MM-dd', { locale: zhCN });
  } catch {
    return dateString;
  }
};

// 格式化日期时间
export const formatDateTime = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: zhCN });
  } catch {
    return dateString;
  }
};

// 获取状态样式
export const getStatusBadgeClass = (status: string): string => {
  const statusMap: Record<string, string> = {
    'draft': 'badge-warning',
    'pending': 'badge-info', 
    'completed': 'badge-success',
    'failed': 'badge-error'
  };
  return statusMap[status] || 'badge-neutral';
};

// 获取状态文本
export const getStatusText = (status: string): string => {
  const statusTextMap: Record<string, string> = {
    'draft': '草稿',
    'pending': '处理中',
    'completed': '已完成',
    'failed': '失败'
  };
  return statusTextMap[status] || status;
};

// 获取发票金额（处理火车票等特殊情况）
export const getInvoiceAmount = (invoice: Invoice): number => {
  if (invoice.invoice_type === '火车票' && invoice.extracted_data?.structured_data?.total_amount) {
    const amount = parseFloat(invoice.extracted_data.structured_data.total_amount);
    return isNaN(amount) ? invoice.total_amount : amount;
  }
  return invoice.total_amount;
};

// 获取发票显示日期（优先使用消费日期）
export const getInvoiceDisplayDate = (invoice: Invoice): string => {
  return invoice.consumption_date || invoice.invoice_date;
};

// 日期范围筛选函数
export const dateRangeFilter = (
  row: any,
  columnId: string,
  filterValue: { from?: string; to?: string } | undefined
): boolean => {
  // 调试日志
  console.log('[dateRangeFilter]', { columnId, filterValue, rowValue: row.getValue(columnId) });
  
  // 如果没有筛选值，返回所有行
  if (!filterValue) return true;
  
  const { from, to } = filterValue;
  const rawValue = row.getValue(columnId);
  
  // 确保日期值有效
  if (!rawValue) return true;
  
  const dateValue = new Date(rawValue);
  
  // 检查日期是否有效
  if (isNaN(dateValue.getTime())) {
    console.warn('[dateRangeFilter] Invalid date value:', rawValue);
    return true;
  }
  
  // 如果没有开始和结束日期，返回所有行
  if (!from && !to) return true;
  
  // 只有开始日期
  if (from && !to) {
    const startDate = new Date(from);
    return dateValue >= startDate;
  }
  
  // 只有结束日期
  if (!from && to) {
    const endDate = new Date(to);
    // 设置结束日期为当天的最后一刻，以包含整个结束日期
    endDate.setHours(23, 59, 59, 999);
    return dateValue <= endDate;
  }
  
  // 有开始和结束日期
  const startDate = new Date(from!);
  const endDate = new Date(to!);
  // 设置结束日期为当天的最后一刻，以包含整个结束日期
  endDate.setHours(23, 59, 59, 999);
  
  const result = dateValue >= startDate && dateValue <= endDate;
  console.log('[dateRangeFilter] Result:', { 
    dateValue: dateValue.toISOString(), 
    startDate: startDate.toISOString(), 
    endDate: endDate.toISOString(), 
    result 
  });
  
  return result;
};

// 金额范围筛选函数
export const amountRangeFilter = (
  row: any,
  columnId: string,
  filterValue: { min?: number; max?: number } | undefined
): boolean => {
  // 调试日志
  console.log('[amountRangeFilter]', { columnId, filterValue, rowValue: row.getValue(columnId) });
  
  // 如果没有筛选值，返回所有行
  if (!filterValue) return true;
  
  const { min, max } = filterValue;
  const amount = row.getValue(columnId) as number;
  
  // 确保金额值有效
  if (amount === undefined || amount === null || isNaN(amount)) {
    console.warn('[amountRangeFilter] Invalid amount value:', amount);
    return true;
  }
  
  // 如果没有最小和最大金额，返回所有行
  if (min === undefined && max === undefined) return true;
  
  // 只有最小金额
  if (min !== undefined && max === undefined) {
    const result = amount >= min;
    console.log('[amountRangeFilter] Min only result:', { amount, min, result });
    return result;
  }
  
  // 只有最大金额
  if (min === undefined && max !== undefined) {
    const result = amount <= max;
    console.log('[amountRangeFilter] Max only result:', { amount, max, result });
    return result;
  }
  
  // 有最小和最大金额
  const result = amount >= min! && amount <= max!;
  console.log('[amountRangeFilter] Range result:', { amount, min, max, result });
  return result;
};

// 多选筛选函数
export const multiSelectFilter = (
  row: any,
  columnId: string,
  filterValue: string[] | undefined
): boolean => {
  // 调试日志
  console.log('[multiSelectFilter]', { columnId, filterValue, rowValue: row.getValue(columnId) });
  
  // 如果没有筛选值或筛选值为空数组，返回所有行
  if (!filterValue || filterValue.length === 0) return true;
  
  const value = row.getValue(columnId) as string;
  
  // 确保值有效
  if (value === undefined || value === null) {
    console.warn('[multiSelectFilter] Invalid value:', value);
    return false; // 如果值无效，不显示该行
  }
  
  // 检查行的值是否在选中的值列表中
  const result = filterValue.includes(value);
  console.log('[multiSelectFilter] Result:', { value, filterValue, result });
  return result;
};

// 全局搜索函数
export const globalFilterFn = (
  row: any,
  columnId: string,
  filterValue: string
): boolean => {
  if (!filterValue) return true;
  
  const searchValue = filterValue.toLowerCase();
  const searchableColumns = ['invoice_number', 'seller_name', 'buyer_name'];
  
  return searchableColumns.some(col => {
    const value = row.getValue(col);
    if (value === null || value === undefined) return false;
    
    return String(value).toLowerCase().includes(searchValue);
  });
};

// 保存列可见性到本地存储
export const saveColumnVisibility = (visibility: Record<string, boolean>): void => {
  localStorage.setItem('invoiceTableColumnVisibility', JSON.stringify(visibility));
};

// 从本地存储加载列可见性
export const loadColumnVisibility = (): Record<string, boolean> => {
  const saved = localStorage.getItem('invoiceTableColumnVisibility');
  return saved ? JSON.parse(saved) : {};
};

// 保存表格状态到本地存储
export const saveTableState = (state: any): void => {
  localStorage.setItem('invoiceTableState', JSON.stringify(state));
};

// 从本地存储加载表格状态
export const loadTableState = (): any => {
  const saved = localStorage.getItem('invoiceTableState');
  return saved ? JSON.parse(saved) : null;
};