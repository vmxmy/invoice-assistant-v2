// TanStack Table 相关类型定义
import type { ColumnDef, SortingState, ColumnFiltersState, VisibilityState, RowSelectionState, PaginationState } from '@tanstack/react-table';

// 发票数据接口
export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  consumption_date?: string;
  seller_name: string;
  buyer_name: string;
  total_amount: number;
  status: 'draft' | 'pending' | 'completed' | 'failed';
  processing_status: string;
  source: string;
  invoice_type?: string;
  created_at: string;
  tags: string[];
  extracted_data?: {
    structured_data?: {
      total_amount?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

// 表格状态接口
export interface TableState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  globalFilter: string;
  pagination: PaginationState;
  columnVisibility: VisibilityState;
  rowSelection: RowSelectionState;
}

// 筛选配置接口
export interface FilterConfig {
  columnId: string;
  filterType: 'text' | 'date-range' | 'amount-range' | 'multi-select';
  value: any;
}

// 筛选状态接口
export interface FilterState {
  global: string;
  columns: FilterConfig[];
}

// 排序配置接口
export interface SortConfig {
  id: string;
  desc: boolean;
}

// 分页信息接口
export interface PaginationInfo {
  totalRows: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// 发票列表响应接口
export interface InvoiceListResponse {
  items: Invoice[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

// 列筛选类型
export type ColumnFilterType = 'text' | 'date-range' | 'amount-range' | 'multi-select';

// 表格操作接口
export interface TableActions {
  onSelectInvoice: (invoiceId: string) => void;
  onSelectAll: (invoiceIds: string[]) => void;
  onViewInvoice: (invoiceId: string) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  onBulkAction: (action: string, invoiceIds: string[]) => void;
}

// 日期范围类型
export interface DateRange {
  from?: string;
  to?: string;
}

// 金额范围类型
export interface AmountRange {
  min?: number;
  max?: number;
}