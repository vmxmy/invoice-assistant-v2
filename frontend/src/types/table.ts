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
  // 费用分类相关字段
  expense_category?: string;
  primary_category_name?: string;
  secondary_category_name?: string;
  category_full_path?: string;
  category_level?: number;
  parent_category_name?: string;
  category_info?: {
    current?: {
      icon?: string;
      color?: string;
    };
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

/**
 * TanStack Table 移动端优化类型定义
 */

export interface MobileColumnMeta {
  /** 移动端列优先级 */
  priority: 'essential' | 'important' | 'optional';
  /** 移动端最小列宽 */
  minWidth: number;
  /** 移动端最大列宽 */
  maxWidth: number;
  /** 移动端推荐列宽 */
  width: number;
  /** 是否在移动端截断内容 */
  truncate: boolean;
  /** 移动端截断长度 */
  truncateLength: number;
  /** 移动端是否显示完整内容的提示 */
  showTooltip: boolean;
  /** 移动端对齐方式 */
  align: 'left' | 'center' | 'right';
  /** 移动端是否固定列 */
  sticky: 'left' | 'right' | false;
  /** 移动端列权重（用于自动宽度分配） */
  weight: number;
  /** 移动端是否可以隐藏 */
  hideable: boolean;
}

export interface ExtendedColumnMeta extends MobileColumnMeta {
  /** 桌面端配置 */
  desktop?: {
    width?: number;
    minWidth?: number;
    maxWidth?: number;
  };
  /** 平板端配置 */
  tablet?: {
    width?: number;
    minWidth?: number;
    maxWidth?: number;
  };
}

/** 列优先级配置 */
export const COLUMN_PRIORITIES = {
  essential: {
    description: '核心列 - 必须显示',
    mobileVisible: true,
    tabletVisible: true,
    desktopVisible: true,
    defaultWeight: 3
  },
  important: {
    description: '重要列 - 平板及以上显示',
    mobileVisible: false,
    tabletVisible: true,
    desktopVisible: true,
    defaultWeight: 2
  },
  optional: {
    description: '可选列 - 桌面端显示',
    mobileVisible: false,
    tabletVisible: false,
    desktopVisible: true,
    defaultWeight: 1
  }
} as const;

/** 移动端表格配置 */
export interface MobileTableConfig {
  /** 最小表格宽度 */
  minTableWidth: number;
  /** 最大表格宽度 */
  maxTableWidth: number;
  /** 默认行高 */
  rowHeight: number;
  /** 紧凑行高 */
  compactRowHeight: number;
  /** 表头高度 */
  headerHeight: number;
  /** 是否启用虚拟滚动 */
  enableVirtualScrolling: boolean;
  /** 虚拟滚动阈值 */
  virtualScrollingThreshold: number;
  /** 是否启用水平滚动指示器 */
  showScrollIndicator: boolean;
  /** 是否启用触摸选择 */
  enableTouchSelection: boolean;
  /** 长按延迟（毫秒） */
  longPressDelay: number;
  /** 是否启用滑动选择 */
  enableSwipeSelection: boolean;
}

/** 默认移动端表格配置 */
export const DEFAULT_MOBILE_TABLE_CONFIG: MobileTableConfig = {
  minTableWidth: 320,
  maxTableWidth: 768,
  rowHeight: 52,
  compactRowHeight: 44,
  headerHeight: 48,
  enableVirtualScrolling: true,
  virtualScrollingThreshold: 100,
  showScrollIndicator: true,
  enableTouchSelection: true,
  longPressDelay: 500,
  enableSwipeSelection: true
};

/** 触摸手势类型 */
export type TouchGestureType = 
  | 'tap' 
  | 'long-press' 
  | 'swipe-left' 
  | 'swipe-right' 
  | 'pan' 
  | 'pinch';

/** 触摸手势事件 */
export interface TouchGestureEvent {
  type: TouchGestureType;
  target: HTMLElement;
  rowId?: string;
  columnId?: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  duration: number;
  velocity?: number;
}

/** 选择状态 */
export interface SelectionState {
  /** 选中的行ID */
  selectedRows: Set<string>;
  /** 是否在选择模式 */
  isSelectionMode: boolean;
  /** 最后选择的行ID */
  lastSelectedRow?: string;
  /** 选择开始位置 */
  selectionStartIndex?: number;
  /** 选择结束位置 */
  selectionEndIndex?: number;
}

/** 滚动状态 */
export interface ScrollState {
  /** 水平滚动位置 */
  scrollLeft: number;
  /** 垂直滚动位置 */
  scrollTop: number;
  /** 滚动容器宽度 */
  containerWidth: number;
  /** 内容宽度 */
  contentWidth: number;
  /** 是否可以向左滚动 */
  canScrollLeft: boolean;
  /** 是否可以向右滚动 */
  canScrollRight: boolean;
  /** 是否正在滚动 */
  isScrolling: boolean;
}

/** 性能指标 */
export interface PerformanceMetrics {
  /** 渲染时间（毫秒） */
  renderTime: number;
  /** 滚动FPS */
  scrollFPS: number;
  /** 内存使用量 */
  memoryUsage: number;
  /** 可见行数 */
  visibleRows: number;
  /** 总行数 */
  totalRows: number;
  /** 是否启用了虚拟滚动 */
  isVirtualScrolling: boolean;
}

/** 表格操作类型 */
export type TableAction = 
  | 'view'
  | 'edit'
  | 'delete'
  | 'export'
  | 'duplicate'
  | 'archive'
  | 'share';

/** 批量操作 */
export interface BulkAction {
  id: string;
  label: string;
  icon: string;
  type: TableAction;
  confirmRequired: boolean;
  destructive: boolean;
  disabled?: boolean;
}

/** 移动端表格主题 */
export interface MobileTableTheme {
  /** 行间距 */
  rowPadding: string;
  /** 单元格间距 */
  cellPadding: string;
  /** 边框颜色 */
  borderColor: string;
  /** 选中行背景 */
  selectedRowBg: string;
  /** 悬停行背景 */
  hoverRowBg: string;
  /** 表头背景 */
  headerBg: string;
  /** 表头文字颜色 */
  headerColor: string;
  /** 奇偶行背景 */
  zebra: boolean;
  /** 圆角大小 */
  borderRadius: string;
  /** 阴影 */
  shadow: string;
}

/** 默认移动端主题 */
export const DEFAULT_MOBILE_THEME: MobileTableTheme = {
  rowPadding: '0.75rem',
  cellPadding: '0.5rem',
  borderColor: 'rgb(var(--fallback-bc) / 0.1)',
  selectedRowBg: 'rgb(var(--fallback-p) / 0.1)',
  hoverRowBg: 'rgb(var(--fallback-bc) / 0.05)',
  headerBg: 'rgb(var(--fallback-b2))',
  headerColor: 'rgb(var(--fallback-bc))',
  zebra: true,
  borderRadius: '0.5rem',
  shadow: '0 1px 3px rgb(var(--fallback-bc) / 0.1)'
};

/** 无障碍配置 */
export interface AccessibilityConfig {
  /** 是否启用键盘导航 */
  enableKeyboardNavigation: boolean;
  /** 是否启用屏幕阅读器支持 */
  enableScreenReader: boolean;
  /** 表格描述 */
  tableDescription?: string;
  /** 是否启用焦点指示器 */
  showFocusIndicator: boolean;
  /** 是否启用语音提示 */
  enableVoiceAnnouncements: boolean;
  /** 是否启用高对比度模式 */
  enableHighContrast: boolean;
}

/** 默认无障碍配置 */
export const DEFAULT_ACCESSIBILITY_CONFIG: AccessibilityConfig = {
  enableKeyboardNavigation: true,
  enableScreenReader: true,
  showFocusIndicator: true,
  enableVoiceAnnouncements: false,
  enableHighContrast: false
};