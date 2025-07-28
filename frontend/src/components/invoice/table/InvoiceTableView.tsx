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
import { getDynamicColumnDefinitions, getDefaultVisibleColumns, getColumnSizing } from './dynamicColumnDefinitions';
import TablePagination from './TablePagination';
import FieldSelector from './FieldSelector';
import { fieldMetadataService } from '../../../services/fieldMetadata.service';
import type { FieldMetadata } from '../../../services/fieldMetadata.service';

interface InvoiceTableViewProps {
  invoices: Invoice[];
  selectedInvoices: string[];
  onSelectInvoice: (invoiceId: string) => void;
  onSelectAll: (invoiceIds: string[]) => void;
  onViewInvoice: (invoiceId: string) => void;
  onDownloadInvoice: (invoice: Invoice) => void;
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
  onDownloadInvoice,
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
  
  // 动态字段元数据状态
  const [fieldMetadata, setFieldMetadata] = useState<FieldMetadata[]>([]);
  const [isFieldMetadataLoading, setIsFieldMetadataLoading] = useState(true);

  // 加载字段元数据
  useEffect(() => {
    const loadFieldMetadata = async () => {
      setIsFieldMetadataLoading(true);
      try {
        const metadata = await fieldMetadataService.getFieldMetadata();
        setFieldMetadata(metadata);
        
        // 如果没有保存的列可见性设置，使用默认可见列
        const savedVisibility = loadColumnVisibility();
        if (Object.keys(savedVisibility).length === 0) {
          const defaultVisible = getDefaultVisibleColumns(metadata);
          const defaultVisibility: VisibilityState = {};
          
          metadata.forEach(field => {
            defaultVisibility[field.column_name] = defaultVisible.includes(field.column_name);
          });
          
          // 确保操作列始终可见
          defaultVisibility['actions'] = true;
          
          console.log('🔍 [InvoiceTableView] 初始化列可见性:', defaultVisibility);
          
          setColumnVisibility(defaultVisibility);
          saveColumnVisibility(defaultVisibility);
        } else {
          // 如果有保存的设置，确保操作列可见
          const updatedVisibility = { ...savedVisibility };
          if (updatedVisibility['actions'] !== true) {
            updatedVisibility['actions'] = true;
            setColumnVisibility(updatedVisibility);
            saveColumnVisibility(updatedVisibility);
            console.log('🔧 [InvoiceTableView] 修正操作列可见性');
          }
        }
      } catch (error) {
        console.error('Failed to load field metadata:', error);
      } finally {
        setIsFieldMetadataLoading(false);
      }
    };
    
    loadFieldMetadata();
  }, []);
  
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

  // 重置列设置
  const handleResetColumns = () => {
    // 清除本地存储的列设置
    localStorage.removeItem('invoiceTableColumnVisibility');
    localStorage.removeItem('invoiceTableColumnOrder');
    
    // 重新加载默认设置
    const defaultVisible = getDefaultVisibleColumns(fieldMetadata);
    const defaultVisibility: VisibilityState = {};
    
    table.getAllLeafColumns().forEach(column => {
      defaultVisibility[column.id] = defaultVisible.includes(column.id);
    });
    
    setColumnVisibility(defaultVisibility);
    
    // 重置列顺序 - 强制刷新以确保顺序正确
    window.location.reload();
  };

  // 获取动态列定义
  const columns = useMemo<ColumnDef<Invoice>[]>(() => {
    if (fieldMetadata.length === 0) {
      return [];
    }
    
    const cols = getDynamicColumnDefinitions({
      fieldMetadata,
      onViewInvoice,
      onDownloadInvoice,
      onDeleteInvoice,
    });
    
    console.log('🔍 [InvoiceTableView] 生成的列定义:', {
      totalColumns: cols.length,
      columnIds: cols.map(col => 'id' in col ? col.id : 'accessorKey' in col ? col.accessorKey : 'unknown'),
      hasActionsColumn: cols.some(col => 'id' in col && col.id === 'actions')
    });
    
    return cols;
  }, [fieldMetadata, onViewInvoice, onDownloadInvoice, onDeleteInvoice]);
  
  // 获取列宽度映射
  const columnSizing = useMemo(() => {
    if (fieldMetadata.length === 0) {
      return {};
    }
    return getColumnSizing(fieldMetadata);
  }, [fieldMetadata]);

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
      columnSizing,
    },
    initialState: {
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(newSelection);
      
      // 获取所有选中的ID
      const selectedIds = Object.keys(newSelection)
        .filter(key => newSelection[key]);
      
      // 通知父组件
      onSelectAll(selectedIds);
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

  if (isLoading || isFieldMetadataLoading) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="loading loading-spinner loading-sm"></span>
              <span className="text-sm text-base-content/60">
                {isFieldMetadataLoading ? '正在加载字段配置...' : '正在加载数据...'}
              </span>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-base-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // 如果字段元数据为空，显示错误状态
  if (fieldMetadata.length === 0) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body text-center">
          <div className="text-base-content/60">
            <p className="mb-2">无法加载表格配置</p>
            <button 
              className="btn btn-sm btn-outline"
              onClick={() => window.location.reload()}
            >
              重新加载
            </button>
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
              
              <FieldSelector
                table={table}
                fields={fieldMetadata}
                onReset={handleResetColumns}
                className="ml-2"
              />
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
                          onClick={() => onDownloadInvoice(invoice)}
                        >
                          <Download className="w-4 h-4" />
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

      </div>
    </div>
  );
};

export default InvoiceTableView;