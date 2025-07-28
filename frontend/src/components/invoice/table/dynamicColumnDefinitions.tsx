import React from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { 
  Eye, 
  Edit, 
  Trash2, 
  FileText, 
  Calendar, 
  DollarSign,
  Train,
  Plane,
  Car,
  Receipt,
  Package,
  Hotel,
  Coffee,
  Tag,
  Check,
  X,
  Download
} from 'lucide-react';
import type { Invoice } from '../../../types/table';
import type { FieldMetadata } from '../../../services/fieldMetadata.service';
import { 
  formatCurrency, 
  formatDate, 
  getStatusBadgeClass, 
  getStatusText,
  getInvoiceAmount,
  getInvoiceDisplayDate,
  dateRangeFilter,
  amountRangeFilter,
  multiSelectFilter
} from '../../../utils/tableHelpers';
import { getInvoiceTypeName } from '../../../config/invoiceFieldsConfig';
import { TextFilter, DateRangeFilter, AmountRangeFilter, MultiSelectFilter } from './filters';
import CategoryBadge from '../../CategoryBadge';
import { getCategoryIcon, getCategoryColor } from '../../../utils/categoryUtils';

const columnHelper = createColumnHelper<Invoice>();

// 根据发票类型获取对应的图标组件
const getInvoiceIcon = (type?: string) => {
  if (!type) return FileText;
  
  const typeLower = type.toLowerCase();
  
  if (typeLower.includes('火车') || typeLower.includes('铁路') || typeLower.includes('train')) {
    return Train;
  }
  if (typeLower.includes('机票') || typeLower.includes('航空') || typeLower.includes('flight')) {
    return Plane;
  }
  if (typeLower.includes('出租') || typeLower.includes('taxi') || typeLower.includes('汽车')) {
    return Car;
  }
  if (typeLower.includes('酒店') || typeLower.includes('住宿') || typeLower.includes('hotel')) {
    return Hotel;
  }
  if (typeLower.includes('餐饮') || typeLower.includes('餐') || typeLower.includes('food')) {
    return Coffee;
  }
  if (typeLower.includes('货物') || typeLower.includes('商品')) {
    return Package;
  }
  
  // 默认发票图标
  return Receipt;
};

interface DynamicColumnDefinitionOptions {
  onViewInvoice: (invoiceId: string) => void;
  onDownloadInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  fieldMetadata: FieldMetadata[];
}

// 创建单个字段的列定义
const createFieldColumn = (
  field: FieldMetadata,
  options: Omit<DynamicColumnDefinitionOptions, 'fieldMetadata'>
): ColumnDef<Invoice> | null => {
  const { onViewInvoice, onDownloadInvoice, onDeleteInvoice } = options;

  // 特殊字段的自定义处理
  switch (field.column_name) {
    case 'select':
      return columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected() ? true : undefined}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        enableSorting: false,
        enableColumnFilter: false,
        size: field.width || 50,
      });

    case 'actions':
      return columnHelper.display({
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          const invoice = row.original;
          
          return (
            <div className="flex items-center gap-1">
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => onViewInvoice(invoice.id)}
                title="查看"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => onDownloadInvoice(invoice)}
                title="下载"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                className="btn btn-ghost btn-xs text-error"
                onClick={() => onDeleteInvoice(invoice)}
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        },
        enableSorting: false,
        enableColumnFilter: false,
        size: field.width || 120,
      });

    case 'invoice_number':
      return columnHelper.accessor('invoice_number', {
        header: ({ column }) => (
          <div className="flex items-center gap-2">
            <span>{field.display_name}</span>
            <TextFilter column={column} placeholder="搜索发票号..." />
          </div>
        ),
        cell: ({ row }) => {
          const invoice = row.original;
          const Icon = getInvoiceIcon(invoice.invoice_type);
          
          return (
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="font-medium truncate">{invoice.invoice_number}</div>
                <div className="text-sm text-base-content/60 truncate">{invoice.buyer_name}</div>
                {invoice.invoice_type && (
                  <div className="text-xs text-primary mt-1">
                    {getInvoiceTypeName(invoice.invoice_type)}
                  </div>
                )}
              </div>
            </div>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'includesString',
        size: field.width || 200,
      });

    case 'expense_category':
    case 'primary_category_name':
    case 'secondary_category_name':
    case 'category_full_path':
      return columnHelper.accessor(field.column_name as any, {
        header: ({ column }) => (
          <div className="flex items-center gap-2">
            <span>{field.display_name}</span>
            <MultiSelectFilter 
              column={column} 
              options={[]} // 这里应该动态获取选项
            />
          </div>
        ),
        cell: ({ row }) => {
          const invoice = row.original;
          
          // 费用分类字段显示完整的分类徽章
          if (field.column_name === 'expense_category') {
            return <CategoryBadge invoice={invoice} size="sm" />;
          }
          
          // 分类路径字段也显示完整的分类徽章
          if (field.column_name === 'category_full_path') {
            return <CategoryBadge invoice={invoice} size="sm" />;
          }
          
          // 一级分类只显示一级分类名称
          if (field.column_name === 'primary_category_name') {
            // 直接从 invoice 对象获取值，而不是从 row
            const primaryCategory = invoice.primary_category_name || '-';
            
            
            // 如果值看起来不对，尝试清理
            let cleanCategory = primaryCategory;
            if (primaryCategory.includes('>')) {
              // 如果包含 > 符号，说明可能是完整路径，提取一级分类
              cleanCategory = primaryCategory.split('>')[0].trim();
            }
            
            // 检查是否包含额外的前缀（如 train、plane 等）
            const knownPrefixes = ['train', 'plane', 'car', 'hotel', 'food', 'office', 'other'];
            for (const prefix of knownPrefixes) {
              if (cleanCategory.toLowerCase().startsWith(prefix + ' ')) {
                cleanCategory = cleanCategory.substring(prefix.length + 1).trim();
                break;
              }
            }
            
            const icon = getCategoryIcon({ primary_category_name: cleanCategory } as any);
            const color = getCategoryColor({ primary_category_name: cleanCategory } as any);
            
            return (
              <div 
                className="badge badge-sm gap-1" 
                style={{ 
                  backgroundColor: color + '20',
                  borderColor: color,
                  color: color
                }}
              >
                <span className="text-sm">{icon}</span>
                <span>{cleanCategory}</span>
              </div>
            );
          }
          
          // 二级分类显示值
          return <span className="text-sm">{row.getValue(field.column_name) || '-'}</span>;
        },
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: multiSelectFilter as any,
        size: field.width || 120,
      });

    default:
      // 根据字段类型创建通用列
      return createGenericColumn(field);
  }
};

// 创建通用列定义
const createGenericColumn = (field: FieldMetadata): ColumnDef<Invoice> => {
  const accessor = field.column_name as keyof Invoice;

  let cellRenderer;
  let headerRenderer;
  let filterFn;

  // 根据格式类型确定渲染方式
  switch (field.format_type) {
    case 'currency':
      cellRenderer = ({ getValue }: { getValue: () => any }) => {
        const value = getValue();
        return (
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-success" />
            <span className="font-semibold text-success">
              {formatCurrency(Number(value) || 0)}
            </span>
          </div>
        );
      };
      headerRenderer = ({ column }: { column: any }) => (
        <div className="flex items-center gap-2">
          <span>{field.display_name}</span>
          <AmountRangeFilter column={column} />
        </div>
      );
      filterFn = amountRangeFilter;
      break;

    case 'date':
      cellRenderer = ({ getValue }: { getValue: () => any }) => {
        const value = getValue();
        return (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-base-content/40" />
            <span className="text-sm">{formatDate(value)}</span>
          </div>
        );
      };
      headerRenderer = ({ column }: { column: any }) => (
        <div className="flex items-center gap-2">
          <span>{field.display_name}</span>
          <DateRangeFilter column={column} />
        </div>
      );
      filterFn = dateRangeFilter;
      break;

    case 'boolean':
      cellRenderer = ({ getValue }: { getValue: () => any }) => {
        const value = getValue();
        return value ? (
          <Check className="w-4 h-4 text-success" />
        ) : (
          <X className="w-4 h-4 text-error" />
        );
      };
      headerRenderer = () => <span>{field.display_name}</span>;
      break;

    case 'array':
      cellRenderer = ({ getValue }: { getValue: () => any }) => {
        const value = getValue();
        if (!Array.isArray(value) || value.length === 0) return <span>-</span>;
        
        return (
          <div className="flex flex-wrap gap-1">
            {value.slice(0, 3).map((item, index) => (
              <span key={index} className="badge badge-sm badge-outline">
                {String(item)}
              </span>
            ))}
            {value.length > 3 && (
              <span className="text-xs text-base-content/60">
                +{value.length - 3}
              </span>
            )}
          </div>
        );
      };
      headerRenderer = () => <span>{field.display_name}</span>;
      break;

    case 'json':
      cellRenderer = ({ getValue }: { getValue: () => any }) => {
        const value = getValue();
        if (!value) return <span>-</span>;
        
        const displayValue = typeof value === 'string' 
          ? value.length > 50 ? value.substring(0, 50) + '...' : value
          : JSON.stringify(value).substring(0, 50) + '...';
        
        return (
          <span 
            className="text-xs font-mono text-base-content/60 cursor-help"
            title={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          >
            {displayValue}
          </span>
        );
      };
      headerRenderer = () => <span>{field.display_name}</span>;
      break;

    default:
      // 文本类型
      cellRenderer = ({ getValue }: { getValue: () => any }) => {
        const value = getValue();
        const displayValue = String(value || '');
        
        return (
          <span 
            className="text-sm truncate"
            title={displayValue.length > 20 ? displayValue : undefined}
          >
            {displayValue.length > 20 ? displayValue.substring(0, 20) + '...' : displayValue}
          </span>
        );
      };
      
      if (field.filter_type === 'select') {
        headerRenderer = ({ column }: { column: any }) => (
          <div className="flex items-center gap-2">
            <span>{field.display_name}</span>
            <MultiSelectFilter column={column} options={[]} />
          </div>
        );
        filterFn = multiSelectFilter;
      } else {
        headerRenderer = ({ column }: { column: any }) => (
          <div className="flex items-center gap-2">
            <span>{field.display_name}</span>
            <TextFilter column={column} placeholder={`搜索${field.display_name}...`} />
          </div>
        );
        filterFn = 'includesString';
      }
      break;
  }

  return columnHelper.accessor(accessor, {
    header: headerRenderer,
    cell: cellRenderer,
    enableSorting: field.is_sortable !== false,
    enableColumnFilter: field.is_searchable !== false,
    filterFn: filterFn as any,
    size: field.width || 120,
  });
};

/**
 * 动态生成列定义
 */
export const getDynamicColumnDefinitions = ({
  fieldMetadata,
  onViewInvoice,
  onDownloadInvoice,
  onDeleteInvoice,
}: DynamicColumnDefinitionOptions): ColumnDef<Invoice>[] => {
  const columns: ColumnDef<Invoice>[] = [];

  // 根据字段元数据生成列
  const visibleFields = fieldMetadata
    .filter(field => field.is_visible !== false)
    .sort((a, b) => (a.display_order || 999) - (b.display_order || 999));

  for (const field of visibleFields) {
    const column = createFieldColumn(field, { onViewInvoice, onDownloadInvoice, onDeleteInvoice });
    if (column) {
      columns.push(column);
    }
  }

  return columns;
};

/**
 * 获取默认可见列
 */
export const getDefaultVisibleColumns = (fieldMetadata: FieldMetadata[]): string[] => {
  const defaultColumns = fieldMetadata
    .filter(field => field.is_visible !== false && (field.display_order || 999) <= 50)
    .map(field => field.column_name);
  
  // 确保 actions 列总是包含在默认可见列中
  if (!defaultColumns.includes('actions')) {
    defaultColumns.push('actions');
  }
  
  console.log('🔍 [getDefaultVisibleColumns] 默认可见列:', defaultColumns);
  
  return defaultColumns;
};

/**
 * 获取列宽度映射
 */
export const getColumnSizing = (fieldMetadata: FieldMetadata[]): Record<string, number> => {
  const sizing: Record<string, number> = {};
  
  fieldMetadata.forEach(field => {
    if (field.width) {
      sizing[field.column_name] = field.width;
    }
  });

  return sizing;
};