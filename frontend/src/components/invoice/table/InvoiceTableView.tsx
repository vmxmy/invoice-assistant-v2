import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type PaginationState,
} from '@tanstack/react-table';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown,
  Settings,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Filter,
  X,
  Edit
} from 'lucide-react';
import type { Invoice, TableActions } from '../../../types/table';
import { 
  loadColumnVisibility, 
  saveColumnVisibility,
  formatCurrency,
  formatDate,
  getStatusBadgeClass,
  getStatusText,
  getInvoiceAmount,
  getInvoiceDisplayDate
} from '../../../utils/tableHelpers';
import { getColumnDefinitions } from './columnDefinitions';
import TablePagination from './TablePagination';
import ColumnVisibilityManager from './ColumnVisibilityManager';

interface InvoiceTableViewProps {
  invoices: Invoice[];
  selectedInvoices: string[];
  onSelectInvoice: (invoiceId: string) => void;
  onSelectAll: (invoiceIds: string[]) => void;
  onViewInvoice: (invoiceId: string) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  onBulkAction: (action: string, invoiceIds: string[]) => void;
  isLoading?: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const InvoiceTableView: React.FC<InvoiceTableViewProps> = ({
  invoices,
  selectedInvoices = [],
  onSelectInvoice,
  onSelectAll,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onBulkAction,
  isLoading = false,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  // 添加调试日志
  console.log('[InvoiceTableView] Props:', { 
    selectedInvoices, 
    isArray: Array.isArray(selectedInvoices),
    type: typeof selectedInvoices 
  });
  // 表格状态
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => loadColumnVisibility());
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);

  // 同步外部选中状态到内部行选择状态
  useEffect(() => {
    const newRowSelection: RowSelectionState = {};
    // 确保 selectedInvoices 是数组
    if (Array.isArray(selectedInvoices)) {
      invoices.forEach((invoice) => {
        if (selectedInvoices.includes(invoice.id)) {
          newRowSelection[invoice.id] = true;
        }
      });
    } else {
      console.error('[InvoiceTableView] selectedInvoices is not an array:', selectedInvoices);
    }
    setRowSelection(newRowSelection);
  }, [selectedInvoices, invoices]);

  // 保存列可见性设置
  useEffect(() => {
    saveColumnVisibility(columnVisibility);
  }, [columnVisibility]);

  // 获取列定义
  const columns = useMemo<ColumnDef<Invoice>[]>(() => 
    getColumnDefinitions({
      onViewInvoice,
      onEditInvoice,
      onDeleteInvoice,
    }), 
    [onViewInvoice, onEditInvoice, onDeleteInvoice]
  );

  // 创建表格实例
  const table = useReactTable({
    data: invoices,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(newSelection);
      
      // 通知父组件选中变化
      const selectedIds = Object.keys(newSelection)
        .filter(key => newSelection[key]);
      
      if (selectedIds.length === invoices.length && invoices.length > 0) {
        onSelectAll(selectedIds);
      } else {
        // 处理单个选择的情况
        const prevSelectedIds = Object.keys(rowSelection)
          .filter(key => rowSelection[key]);
        
        const added = selectedIds.filter(id => !prevSelectedIds.includes(id));
        const removed = prevSelectedIds.filter(id => !selectedIds.includes(id));
        
        added.forEach(id => onSelectInvoice(id));
        removed.forEach(id => onSelectInvoice(id));
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

  // 获取排序图标
  const getSortIcon = (isSorted: false | 'asc' | 'desc', canSort: boolean) => {
    if (!canSort) return null;
    
    if (isSorted === 'asc') {
      return <ChevronUp className="w-4 h-4" />;
    } else if (isSorted === 'desc') {
      return <ChevronDown className="w-4 h-4" />;
    }
    return <ChevronsUpDown className="w-4 h-4 opacity-50" />;
  };

  // 获取活跃筛选数量
  const activeFilterCount = columnFilters.length;

  // 批量操作
  const handleBulkExport = () => {
    const selectedIds = Object.keys(rowSelection)
      .filter(key => rowSelection[key]);
    onBulkAction('export', selectedIds);
  };

  const handleBulkDelete = () => {
    const selectedIds = Object.keys(rowSelection)
      .filter(key => rowSelection[key]);
    onBulkAction('delete', selectedIds);
  };

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-base-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-0">
        {/* 工具栏 */}
        <div className="p-4 border-b border-base-300">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* 左侧：列筛选信息 */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
              {columnFilters.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-base-content/60">
                    {columnFilters.length} 个列筛选条件
                  </span>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      setColumnFilters([]);
                    }}
                  >
                    <X className="w-3 h-3" />
                    清除
                  </button>
                </div>
              )}
            </div>

            {/* 右侧：批量操作和设置 */}
            <div className="flex items-center gap-2">
              {Object.keys(rowSelection).some(key => rowSelection[key]) && (
                <>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={handleBulkExport}
                  >
                    <Download className="w-4 h-4" />
                    导出 ({Object.keys(rowSelection).filter(key => rowSelection[key]).length})
                  </button>
                  <button
                    className="btn btn-sm btn-error btn-outline"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="w-4 h-4" />
                    删除 ({Object.keys(rowSelection).filter(key => rowSelection[key]).length})
                  </button>
                </>
              )}
              
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setIsColumnManagerOpen(!isColumnManagerOpen)}
              >
                <Settings className="w-4 h-4" />
                列设置
              </button>
            </div>
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          {/* 桌面端表格视图 */}
          <table className="table table-zebra hidden lg:table">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className={`
                        ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                        ${header.column.getIsSorted() ? 'text-primary' : ''}
                      `}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {getSortIcon(header.column.getIsSorted(), header.column.getCanSort())}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* 移动端卡片视图 */}
          <div className="lg:hidden space-y-4 p-4">
            {table.getRowModel().rows.map(row => {
              const invoice = row.original;
              return (
                <div key={row.id} className="card bg-base-100 shadow-sm border border-base-300">
                  <div className="card-body p-4">
                    {/* 选择和操作 */}
                    <div className="flex items-start justify-between mb-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                      />
                      <div className="flex gap-1">
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => onViewInvoice(invoice.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => onEditInvoice(invoice)}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => onDeleteInvoice(invoice)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* 发票信息 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{invoice.invoice_number}</span>
                        <div className={`badge ${getStatusBadgeClass(invoice.status)} badge-sm`}>
                          {getStatusText(invoice.status)}
                        </div>
                      </div>
                      
                      <div className="text-sm text-base-content/60">
                        <div>{invoice.seller_name}</div>
                        <div>{invoice.buyer_name}</div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-base-content/60">
                          {formatDate(getInvoiceDisplayDate(invoice))}
                        </span>
                        <span className="font-semibold text-success">
                          {formatCurrency(getInvoiceAmount(invoice))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 空状态 */}
          {table.getRowModel().rows.length === 0 && (
            <div className="p-8 text-center text-base-content/60">
              {columnFilters.length > 0
                ? '没有找到匹配的发票'
                : '暂无发票数据'}
            </div>
          )}
        </div>

        {/* 分页 */}
        <TablePagination
          table={table}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />

        {/* 列可见性管理器 */}
        <ColumnVisibilityManager
          table={table}
          isOpen={isColumnManagerOpen}
          onClose={() => setIsColumnManagerOpen(false)}
        />
      </div>
    </div>
  );
};

export default InvoiceTableView;