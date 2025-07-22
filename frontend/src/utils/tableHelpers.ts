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
  filterValue: [Date | null, Date | null]
): boolean => {
  const [start, end] = filterValue;
  const dateValue = new Date(row.getValue(columnId));
  
  if (!start && !end) return true;
  if (start && !end) return dateValue >= start;
  if (!start && end) return dateValue <= end;
  return dateValue >= start! && dateValue <= end!;
};

// 金额范围筛选函数
export const amountRangeFilter = (
  row: any,
  columnId: string,
  filterValue: [number | null, number | null]
): boolean => {
  const [min, max] = filterValue;
  const amount = row.getValue(columnId) as number;
  
  if (min === null && max === null) return true;
  if (min !== null && max === null) return amount >= min;
  if (min === null && max !== null) return amount <= max;
  return amount >= min! && amount <= max!;
};

// 多选筛选函数
export const multiSelectFilter = (
  row: any,
  columnId: string,
  filterValue: string[]
): boolean => {
  if (!filterValue || filterValue.length === 0) return true;
  const value = row.getValue(columnId) as string;
  return filterValue.includes(value);
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