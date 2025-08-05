/**
 * useDynamicTableColumns Hook
 * 根据RPC返回的字段动态生成TanStack Table列定义
 */

import { useMemo } from 'react'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { useTableColumns, type TableColumn } from './useTableColumns'

// 视图数据结构 - 来自 invoice_management_view
interface Invoice {
  // 基础发票信息
  id: string
  user_id: string
  email_task_id?: string
  invoice_number: string
  invoice_code?: string
  invoice_type?: string
  status: string
  processing_status?: string
  amount: number
  tax_amount?: number
  total_amount?: number
  currency: string
  invoice_date: string
  seller_name?: string
  seller_tax_id?: string
  buyer_name?: string
  buyer_tax_id?: string
  
  // 文件信息
  file_path?: string
  file_url?: string
  file_size?: number
  file_hash?: string
  source: string
  source_metadata?: Record<string, any>
  
  // 验证信息
  is_verified: boolean
  verified_at?: string
  verified_by?: string
  verification_notes?: string
  
  // 标签和基础分类
  tags?: string[]
  basic_category?: string // 原来的 category 字段
  
  // 分类信息 - 从关联表获取
  primary_category_id?: string
  primary_category_name?: string
  primary_category_code?: string
  primary_category_color?: string
  primary_category_icon?: string
  secondary_category_id?: string
  secondary_category_name?: string
  secondary_category_code?: string
  
  // 自动分类信息
  auto_classified?: boolean
  classification_confidence?: number
  classification_metadata?: Record<string, any>
  
  // 提取数据
  extracted_data: Record<string, any>
  
  // 计算字段
  remarks: string // 从多个来源提取的备注
  expense_category: string // 综合判断的费用类别
  expense_category_code: string
  category_icon: string
  category_color: string
  display_amount: number // 显示金额
  category_path: string // 分类层级路径
  status_text: string // 状态中文显示
  processing_status_text: string // 处理状态中文显示
  source_text: string // 来源中文显示
  
  // 时间信息
  started_at?: string
  completed_at?: string
  last_activity_at?: string
  created_at: string
  updated_at: string
  deleted_at?: string
  
  // 元数据和版本
  metadata: Record<string, any>
  created_by?: string
  updated_by?: string
  version: number
  
  [key: string]: any // 允许其他动态字段
}

interface UseDynamicTableColumnsOptions {
  tableName: string
  onViewInvoice?: (invoiceId: string) => void
  onEditInvoice?: (invoiceId: string) => void
  onExportInvoice?: (invoice: Invoice) => void
  onDeleteInvoice?: (invoiceId: string) => void
  isExporting?: boolean
}

export const useDynamicTableColumns = ({
  tableName,
  onViewInvoice,
  onEditInvoice,
  onExportInvoice,
  onDeleteInvoice,
  isExporting = false
}: UseDynamicTableColumnsOptions) => {
  const { allColumns, loading, error } = useTableColumns({ tableName })
  const columnHelper = createColumnHelper<Invoice>()

  const columns = useMemo<ColumnDef<Invoice>[]>(() => {
    const dynamicColumns: ColumnDef<Invoice>[] = []

    // 选择列 - 固定
    dynamicColumns.push({
      id: 'select',
      enableHiding: false,
      header: ({ table }) => (
        <input
          type="checkbox"
          className="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox" 
          className="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    })

    // 根据动态字段配置生成列
    allColumns.forEach((field: TableColumn) => {
      // 跳过一些不需要显示的字段
      if (['id', 'user_id', 'deleted_at'].includes(field.field)) {
        return
      }

      const column: ColumnDef<Invoice> = {
        accessorKey: field.field,
        // 恢复列隐藏功能
        enableHiding: true,
        // 恢复过滤函数
        filterFn: field.type === 'date' || field.type === 'datetime' ? 'dateRange' :
                  field.type === 'number' ? 'numberRange' :
                  field.type === 'select' ? 'arrayIncludes' :
                  'includesString',
        header: ({ column }) => (
          <div className="flex items-center gap-2">
            {field.sortable && (
              <button
                className="btn btn-ghost btn-xs flex items-center gap-1"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                {field.label}
                {column.getIsSorted() === 'asc' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : column.getIsSorted() === 'desc' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                )}
              </button>
            )}
            {!field.sortable && (
              <span>{field.label}</span>
            )}
            {/* 恢复筛选UI */}
            {field.filterable && (
              <div className="dropdown dropdown-end">
                <button
                  tabIndex={0}
                  className={`btn btn-ghost btn-xs ${column.getFilterValue() ? 'text-primary' : 'opacity-50'}`}
                  title="筛选"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" />
                  </svg>
                </button>
                <div tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                  {renderFilterInput(field, column)}
                </div>
              </div>
            )}
          </div>
        ),
        cell: ({ getValue, row }) => renderCell(field, getValue, row.original),
      }

      dynamicColumns.push(column)
    })

    // 操作列 - 固定
    dynamicColumns.push({
      id: 'actions',
      header: '操作',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => onViewInvoice?.(row.original.id)}
            title="查看详情"
          >
            👁️
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => onEditInvoice?.(row.original.id)}
            title="编辑发票"
          >
            ✏️
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => onExportInvoice?.(row.original)}
            disabled={isExporting}
            title="导出发票"
          >
            📥
          </button>
          <button
            className="btn btn-ghost btn-xs text-error"
            onClick={() => onDeleteInvoice?.(row.original.id)}
            title="删除发票"
          >
            🗑️
          </button>
        </div>
      ),
    })

    return dynamicColumns
  }, [allColumns, onViewInvoice, onEditInvoice, onExportInvoice, onDeleteInvoice, isExporting])

  return {
    columns,
    loading,
    error,
    fieldsCount: allColumns.length
  }
}

// 辅助函数：渲染筛选输入框
function renderFilterInput(field: TableColumn, column: any) {
  switch (field.type) {
    case 'date':
    case 'datetime':
      return (
        <>
          <input
            type="date"
            className="input input-bordered input-sm w-full mb-2"
            placeholder="起始日期"
            onChange={(e) => {
              const currentFilter = column.getFilterValue() as [string, string] || ['', '']
              column.setFilterValue([e.target.value, currentFilter[1]])
            }}
          />
          <input
            type="date"
            className="input input-bordered input-sm w-full"
            placeholder="结束日期"
            onChange={(e) => {
              const currentFilter = column.getFilterValue() as [string, string] || ['', '']
              column.setFilterValue([currentFilter[0], e.target.value])
            }}
          />
        </>
      )
    case 'number':
      return (
        <>
          <input
            type="number"
            placeholder="最小值"
            className="input input-bordered input-sm w-full mb-2"
            onChange={(e) => {
              const currentFilter = column.getFilterValue() as [number, number] || [0, 0]
              column.setFilterValue([Number(e.target.value), currentFilter[1]])
            }}
          />
          <input
            type="number"
            placeholder="最大值"
            className="input input-bordered input-sm w-full"
            onChange={(e) => {
              const currentFilter = column.getFilterValue() as [number, number] || [0, 0]
              column.setFilterValue([currentFilter[0], Number(e.target.value)])
            }}
          />
        </>
      )
    case 'select':
      if (field.field === 'status') {
        return (
          <div className="space-y-2">
            {['unreimbursed', 'reimbursed'].map(status => (
              <label key={status} className="label cursor-pointer justify-start gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={(column.getFilterValue() as string[] || []).includes(status)}
                  onChange={(e) => {
                    const currentFilter = column.getFilterValue() as string[] || []
                    if (e.target.checked) {
                      column.setFilterValue([...currentFilter, status])
                    } else {
                      column.setFilterValue(currentFilter.filter(s => s !== status))
                    }
                  }}
                />
                <span className="label-text text-sm">
                  {status === 'unreimbursed' ? '未报销' : 
                   status === 'reimbursed' ? '已报销' : status}
                </span>
              </label>
            ))}
          </div>
        )
      } else if (field.field === 'source') {
        return (
          <div className="space-y-2">
            {['upload', 'email', 'api', 'manual'].map(source => (
              <label key={source} className="label cursor-pointer justify-start gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={(column.getFilterValue() as string[] || []).includes(source)}
                  onChange={(e) => {
                    const currentFilter = column.getFilterValue() as string[] || []
                    if (e.target.checked) {
                      column.setFilterValue([...currentFilter, source])
                    } else {
                      column.setFilterValue(currentFilter.filter(s => s !== source))
                    }
                  }}
                />
                <span className="label-text text-sm">{source}</span>
              </label>
            ))}
          </div>
        )
      }
      // 其他select类型使用文本筛选
      return (
        <input
          type="text"
          placeholder={`筛选${field.label}...`}
          className="input input-bordered input-sm w-full"
          value={(column.getFilterValue() ?? '') as string}
          onChange={(e) => column.setFilterValue(e.target.value)}
        />
      )
    default:
      return (
        <input
          type="text"
          placeholder={`筛选${field.label}...`}
          className="input input-bordered input-sm w-full"
          value={(column.getFilterValue() ?? '') as string}
          onChange={(e) => column.setFilterValue(e.target.value)}
        />
      )
  }
}

// 辅助函数：渲染单元格内容
function renderCell(field: TableColumn, getValue: () => any, invoice: Invoice) {
  const value = getValue()

  switch (field.type) {
    case 'date':
    case 'datetime':
      return value ? new Date(value).toLocaleDateString('zh-CN') : '-'
    
    case 'number':
      if (field.field.includes('amount')) {
        // 对于金额字段，使用 total_amount 优先，否则用 amount
        let displayAmount = value || 0;
        if (field.field === 'total_amount' && !value && invoice.amount) {
          displayAmount = invoice.amount;
        }
        return (
          <div className="font-bold text-primary">
            {new Intl.NumberFormat('zh-CN', {
              style: 'currency',
              currency: 'CNY'
            }).format(displayAmount)}
          </div>
        )
      }
      return value?.toLocaleString('zh-CN') || '-'
    
    case 'boolean':
      return (
        <span className={`badge ${value ? 'badge-success' : 'badge-error'}`}>
          {value ? '是' : '否'}
        </span>
      )
    
    case 'select': {
      if (field.field === 'status') {
        const statusMap: Record<string, string> = {
          'unreimbursed': 'badge-warning',  // 未报销 - 黄色
          'reimbursed': 'badge-success'     // 已报销 - 绿色
        }
        const statusText: Record<string, string> = {
          'unreimbursed': '未报销',
          'reimbursed': '已报销'
        }
        return (
          <span className={`badge ${statusMap[value] || 'badge-neutral'}`}>
            {statusText[value] || value}
          </span>
        )
      } else if (field.field === 'source') {
        return (
          <span className="badge badge-outline">
            {value}
          </span>
        )
      }
      return value || '-'
    }
    
    default: {
      // 特殊处理发票号码，显示类型信息
      if (field.field === 'invoice_number') {
        return (
          <div>
            <div className="font-medium">{value}</div>
            {invoice.invoice_type && (
              <div className="text-xs text-base-content/60">
                {invoice.invoice_type}
              </div>
            )}
          </div>
        )
      }
      // 特殊处理销售方，加粗显示
      else if (field.field === 'seller_name') {
        return <div className="font-medium">{value}</div>
      }
      // 特殊处理费用类别，显示带颜色和图标
      else if (field.field === 'expense_category') {
        return (
          <div className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: invoice.category_color || '#607D8B' }}
            ></span>
            <span className="font-medium">{value || '未分类'}</span>
          </div>
        )
      }
      // 特殊处理分类路径，显示层级关系
      else if (field.field === 'category_path') {
        return (
          <div className="text-sm">
            <span className="badge badge-outline badge-sm">{value || '未分类'}</span>
          </div>
        )
      }
      // 特殊处理备注，显示简短版本
      else if (field.field === 'remarks') {
        if (!value) return '-'
        const truncated = value.length > 30 ? value.substring(0, 30) + '...' : value
        return (
          <div className="text-sm text-base-content/70" title={value}>
            {truncated}
          </div>
        )
      }
      return value || '-'
    }
  }
}