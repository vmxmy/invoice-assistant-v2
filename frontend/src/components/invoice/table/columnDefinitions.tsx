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
  Coffee
} from 'lucide-react';
import type { Invoice } from '../../../types/table';
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

interface ColumnDefinitionOptions {
  onViewInvoice: (invoiceId: string) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
}

export const getColumnDefinitions = ({
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
}: ColumnDefinitionOptions): ColumnDef<Invoice>[] => [
  // 选择列
  columnHelper.display({
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
  }),

  // 发票信息列
  columnHelper.accessor('invoice_number', {
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <span>发票信息</span>
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
  }),

  // 销售方列
  columnHelper.accessor('seller_name', {
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <span>销售方</span>
        <TextFilter column={column} placeholder="搜索销售方..." />
      </div>
    ),
    cell: ({ getValue }) => (
      <div className="max-w-xs truncate" title={getValue()}>
        {getValue()}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: true,
    filterFn: 'includesString',
  }),

  // 消费日期列
  columnHelper.accessor((row) => getInvoiceDisplayDate(row), {
    id: 'consumption_date',
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <span>消费日期</span>
        <DateRangeFilter column={column} />
      </div>
    ),
    cell: ({ row }) => {
      const invoice = row.original;
      const displayDate = getInvoiceDisplayDate(invoice);
      const hasConsumptionDate = invoice.consumption_date && invoice.consumption_date !== invoice.invoice_date;
      
      return (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-base-content/40" />
          <div>
            <div>{formatDate(displayDate)}</div>
            {hasConsumptionDate && (
              <div className="text-xs text-base-content/60">
                开票: {formatDate(invoice.invoice_date)}
              </div>
            )}
          </div>
        </div>
      );
    },
    enableSorting: true,
    enableColumnFilter: true,
    filterFn: dateRangeFilter as any,
  }),

  // 金额列
  columnHelper.accessor((row) => getInvoiceAmount(row), {
    id: 'total_amount',
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <span>金额</span>
        <AmountRangeFilter column={column} />
      </div>
    ),
    cell: ({ row }) => {
      const amount = getInvoiceAmount(row.original);
      return (
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-success" />
          <span className="font-semibold text-success">
            {formatCurrency(amount)}
          </span>
        </div>
      );
    },
    enableSorting: true,
    enableColumnFilter: true,
    filterFn: amountRangeFilter as any,
  }),

  // 状态列
  columnHelper.accessor('status', {
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <span>状态</span>
        <MultiSelectFilter 
          column={column} 
          options={[
            { value: 'draft', label: '草稿', className: 'text-warning' },
            { value: 'pending', label: '待处理', className: 'text-info' },
            { value: 'completed', label: '已完成', className: 'text-success' },
            { value: 'failed', label: '失败', className: 'text-error' }
          ]}
        />
      </div>
    ),
    cell: ({ getValue }) => {
      const status = getValue();
      return (
        <div className={`badge ${getStatusBadgeClass(status)} badge-sm`}>
          {getStatusText(status)}
        </div>
      );
    },
    enableSorting: true,
    enableColumnFilter: true,
    filterFn: multiSelectFilter as any,
  }),

  // 来源列
  columnHelper.accessor('source', {
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <span>来源</span>
        <MultiSelectFilter 
          column={column} 
          options={[
            { value: 'email', label: '邮件' },
            { value: 'upload', label: '上传' },
            { value: 'api', label: 'API' }
          ]}
        />
      </div>
    ),
    cell: ({ getValue }) => {
      const source = getValue();
      const sourceMap: Record<string, string> = {
        'email': '邮件',
        'upload': '上传',
        'api': 'API',
      };
      return (
        <span className="text-sm">
          {sourceMap[source] || source}
        </span>
      );
    },
    enableSorting: true,
    enableColumnFilter: true,
    filterFn: multiSelectFilter as any,
  }),

  // 创建时间列
  columnHelper.accessor('created_at', {
    header: '创建时间',
    cell: ({ getValue }) => (
      <span className="text-sm text-base-content/60">
        {formatDate(getValue())}
      </span>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  }),

  // 操作列
  columnHelper.display({
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
            onClick={() => onEditInvoice(invoice)}
            title="编辑"
          >
            <Edit className="w-4 h-4" />
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
  }),
];