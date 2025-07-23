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
    filterFn: dateRangeFilter,
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

  // 发票明细列
  columnHelper.accessor((row) => {
    // 从 extracted_data 中获取 invoice_details
    const extractedData = row.extracted_data;
    
    // 调试日志 - 打印完整的数据结构
    console.log('🔍 [Invoice Details Debug] Row data:', {
      invoiceNumber: row.invoice_number,
      invoiceType: row.invoice_type,
      hasExtractedData: !!extractedData,
      extractedDataKeys: extractedData ? Object.keys(extractedData) : [],
      extractedDataType: extractedData ? typeof extractedData : 'undefined'
    });
    
    if (!extractedData) {
      console.log('❌ No extracted_data found');
      return '-';
    }
    
    // 打印 extracted_data 的详细结构
    console.log('📋 [Invoice Details Debug] extracted_data structure:', {
      topLevelKeys: Object.keys(extractedData),
      hasRawOcrData: !!extractedData.raw_ocr_data,
      rawOcrDataKeys: extractedData.raw_ocr_data ? Object.keys(extractedData.raw_ocr_data) : [],
      hasOcrResult: !!extractedData.ocr_result,
      ocrResultKeys: extractedData.ocr_result ? Object.keys(extractedData.ocr_result) : [],
      hasFields: !!extractedData.fields,
      fieldsKeys: extractedData.fields ? Object.keys(extractedData.fields) : []
    });
    
    // 尝试从不同的位置获取发票明细
    let invoiceDetails = null;
    
    // 1. 尝试从 raw_ocr_data 中获取（基于实际数据结构）
    if (extractedData.raw_ocr_data) {
      console.log('🔍 Checking raw_ocr_data...');
      // 检查中文字段名
      invoiceDetails = extractedData.raw_ocr_data['发票明细'] || 
                       extractedData.raw_ocr_data.invoice_details ||
                       extractedData.raw_ocr_data.invoiceDetails;
      
      if (invoiceDetails) {
        console.log('✅ Found in raw_ocr_data:', typeof invoiceDetails);
      } else {
        console.log('❌ Not found in raw_ocr_data, available keys:', Object.keys(extractedData.raw_ocr_data));
      }
    }
    
    // 2. 尝试从 ocr_result 中获取
    if (!invoiceDetails && extractedData.ocr_result?.Data) {
      console.log('🔍 Checking ocr_result.Data...');
      try {
        const ocrData = typeof extractedData.ocr_result.Data === 'string' 
          ? JSON.parse(extractedData.ocr_result.Data) 
          : extractedData.ocr_result.Data;
        
        console.log('📋 OCR Data structure:', {
          hasSubMsgs: !!ocrData.subMsgs,
          hasElements: !!ocrData.elements,
          ocrDataKeys: Object.keys(ocrData || {})
        });
        
        // 从阿里云 OCR 结果中获取
        if (ocrData.subMsgs?.[0]?.result?.data?.invoiceDetails) {
          invoiceDetails = ocrData.subMsgs[0].result.data.invoiceDetails;
          console.log('✅ Found in subMsgs.result.data.invoiceDetails');
        } else if (ocrData.elements?.[0]?.fields?.invoiceDetails) {
          invoiceDetails = ocrData.elements[0].fields.invoiceDetails;
          console.log('✅ Found in elements.fields.invoiceDetails');
        }
      } catch (e) {
        console.warn('Failed to parse ocr_result.Data:', e);
      }
    }
    
    // 3. 尝试从 structured_data 中获取
    if (!invoiceDetails) {
      console.log('🔍 Checking structured_data...');
      const structuredData = extractedData.structured_data || extractedData;
      invoiceDetails = structuredData.invoice_details || structuredData.items;
      
      if (invoiceDetails) {
        console.log('✅ Found in structured_data');
      }
    }
    
    // 4. 如果是字符串，尝试解析
    if (typeof invoiceDetails === 'string') {
      console.log('🔍 Invoice details is string, attempting to parse...');
      try {
        // 替换单引号为双引号以符合 JSON 格式
        const jsonString = invoiceDetails.replace(/'/g, '"');
        invoiceDetails = JSON.parse(jsonString);
        console.log('✅ Successfully parsed string to JSON');
      } catch (e) {
        console.log('⚠️ Failed to parse, returning as string');
        // 如果解析失败，直接返回原始字符串
        return invoiceDetails;
      }
    }
    
    // 5. 尝试从 fields 中获取
    if (!invoiceDetails && extractedData.fields) {
      console.log('🔍 Checking fields...');
      const fieldsDetails = extractedData.fields.invoice_details || extractedData.fields['发票明细'];
      if (fieldsDetails) {
        console.log('✅ Found in fields');
        if (typeof fieldsDetails === 'string') {
          try {
            const jsonString = fieldsDetails.replace(/'/g, '"');
            invoiceDetails = JSON.parse(jsonString);
          } catch (e) {
            invoiceDetails = fieldsDetails;
          }
        } else {
          invoiceDetails = fieldsDetails;
        }
      }
    }
    
    // 最终结果
    console.log('📊 Final result:', {
      found: invoiceDetails !== null && invoiceDetails !== undefined,
      type: typeof invoiceDetails,
      isArray: Array.isArray(invoiceDetails),
      length: Array.isArray(invoiceDetails) ? invoiceDetails.length : 'N/A'
    });
    
    // 返回 JSON 字符串或对象的字符串表示
    if (invoiceDetails === null || invoiceDetails === undefined) {
      console.log('❌ No invoice details found, returning "-"');
      return '-';
    }
    
    if (typeof invoiceDetails === 'string') {
      return invoiceDetails;
    }
    
    // 如果是数组或对象，转换为 JSON 字符串
    try {
      return JSON.stringify(invoiceDetails, null, 2);
    } catch (e) {
      return String(invoiceDetails);
    }
  }, {
    id: 'invoice_details',
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <span>发票明细</span>
        <TextFilter column={column} placeholder="搜索明细..." />
      </div>
    ),
    cell: ({ getValue }) => {
      const value = getValue();
      const displayValue = typeof value === 'string' && value.length > 100 
        ? value.substring(0, 100) + '...' 
        : value;
      
      return (
        <div className="max-w-md">
          <pre className="text-xs whitespace-pre-wrap break-words" title={value}>
            {displayValue}
          </pre>
        </div>
      );
    },
    enableSorting: false,
    enableColumnFilter: true,
    filterFn: 'includesString',
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