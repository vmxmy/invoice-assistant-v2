/**
 * Supabase架构的发票管理页面
 * 集成TanStack Table、Grid系统、实时数据和完整的发票管理功能
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type PaginationState
} from '@tanstack/react-table'
import { useAuthContext } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { AdvancedSearchModal } from '../components/invoice/AdvancedSearchModal'
import { InvoiceModal } from '../components/invoice/InvoiceModal'
import { DeleteConfirmModal } from '../components/invoice/DeleteConfirmModal'
import { ExportProgressModal } from '../components/invoice/ExportProgressModal'
import { useInvoiceExport } from '../hooks/useInvoiceExport'
import { useTableColumns } from '../hooks/useTableColumns'
import { useDynamicTableColumns } from '../hooks/useDynamicTableColumns'
// import { useTableState } from '../hooks/useTableState' // 不使用localStorage持久化
import { FieldSelector } from '../components/invoice/table/FieldSelector'
import { InvoiceListView } from '../components/invoice/cards/InvoiceListView'
import Layout from '../components/layout/Layout'

// 发票数据类型
interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  seller_name: string
  buyer_name?: string
  total_amount: number
  status: string
  source: string
  invoice_type?: string
  created_at: string
  updated_at: string
  user_id: string
  deleted_at?: string
  file_path?: string
}

// 搜索筛选类型
interface SearchFilters {
  invoice_number?: string
  seller_name?: string
  buyer_name?: string
  date_from?: string
  date_to?: string
  amount_min?: number
  amount_max?: number
  status?: string[]
  source?: string[]
  invoice_type?: string
}

// 视图模式
enum ViewMode {
  TABLE = 'table',
  GRID = 'grid'
}

// 搜索筛选接口
interface SearchFilters {
  seller_name?: string
  invoice_number?: string
  date_from?: string
  date_to?: string
  amount_min?: number
  amount_max?: number
  status?: string[]
  source?: string[]
}

export function InvoiceManagePage() {
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const { refresh: refreshStats } = useDashboardStats()
  
  // 基础状态
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  
  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({})
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false)
  
  // 简化状态管理 - 不使用localStorage持久化分页状态
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState<string>('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  
  // 筛选后的发票数据
  const filteredInvoices = useMemo(() => {
    let filtered = invoices

    // 应用全局搜索
    if (globalFilter) {
      filtered = filtered.filter(invoice => 
        invoice.invoice_number?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        invoice.seller_name?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        invoice.buyer_name?.toLowerCase().includes(globalFilter.toLowerCase())
      )
    }

    // 应用高级搜索筛选
    if (Object.keys(searchFilters).length > 0) {
      filtered = filtered.filter(invoice => {
        // 发票号码筛选
        if (searchFilters.invoice_number && 
            !invoice.invoice_number?.toLowerCase().includes(searchFilters.invoice_number.toLowerCase())) {
          return false
        }
        
        // 销售方筛选
        if (searchFilters.seller_name && 
            !invoice.seller_name?.toLowerCase().includes(searchFilters.seller_name.toLowerCase())) {
          return false
        }
        
        // 购买方筛选
        if (searchFilters.buyer_name && 
            !invoice.buyer_name?.toLowerCase().includes(searchFilters.buyer_name.toLowerCase())) {
          return false
        }
        
        // 发票类型筛选
        if (searchFilters.invoice_type && 
            invoice.invoice_type !== searchFilters.invoice_type) {
          return false
        }
        
        // 日期范围筛选
        if (searchFilters.date_from || searchFilters.date_to) {
          const invoiceDate = new Date(invoice.invoice_date)
          if (searchFilters.date_from && invoiceDate < new Date(searchFilters.date_from)) {
            return false
          }
          if (searchFilters.date_to && invoiceDate > new Date(searchFilters.date_to)) {
            return false
          }
        }
        
        // 金额范围筛选
        if (searchFilters.amount_min !== undefined && invoice.total_amount < searchFilters.amount_min) {
          return false
        }
        if (searchFilters.amount_max !== undefined && invoice.total_amount > searchFilters.amount_max) {
          return false
        }
        
        // 状态筛选
        if (searchFilters.status && searchFilters.status.length > 0 && 
            !searchFilters.status.includes(invoice.status)) {
          return false
        }
        
        // 来源筛选
        if (searchFilters.source && searchFilters.source.length > 0 && 
            !searchFilters.source.includes(invoice.source)) {
          return false
        }
        
        return true
      })
    }

    return filtered
  }, [invoices, globalFilter, searchFilters])
  
  // 分页状态 - 现在由TanStack Table管理，这些状态可能不再需要
  // const [currentPage, setCurrentPage] = useState(1)
  // const [pageSize, setPageSize] = useState(20)
  
  // 标记状态已加载
  const stateLoaded = true
  
  // 重置状态函数
  const resetState = useCallback(() => {
    setSorting([])
    setColumnFilters([])
    setColumnVisibility({})
    setGlobalFilter('')
    setPagination({ pageIndex: 0, pageSize: 20 })
  }, [])

  // TanStack Table 状态
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  
  // 选择和视图状态
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.TABLE)
  
  // 实时订阅状态
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  
  
  // 模态框状态
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view')
  const [deleteInvoiceIds, setDeleteInvoiceIds] = useState<string[]>([])
  const [deleteInvoiceNumbers, setDeleteInvoiceNumbers] = useState<string[]>([])

  // 导出功能
  const {
    isExporting,
    exportProgress,
    isProgressModalOpen,
    totalProgress,
    exportSingle,
    exportBatch,
    cancelExport,
    closeProgressModal
  } = useInvoiceExport()

  // 移除动态获取表格列配置（FieldSelector已移除）
  // const { 
  //   allColumns: availableColumns, 
  //   loading: columnsLoading,
  //   error: columnsError,
  //   totalFields,
  //   categories
  // } = useTableColumns({ tableName: 'invoices' })

  // 事件处理函数 - 必须在Hook调用之前定义
  
  // 查看发票详情
  const handleViewInvoice = useCallback((invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
    setModalMode('view')
    setIsViewModalOpen(true)
  }, [])

  // 编辑发票
  const handleEditInvoice = useCallback((invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
    setModalMode('edit')
    setIsViewModalOpen(true)
  }, [])

  // 导出单个发票
  const handleExportInvoice = useCallback((invoice: Invoice) => {
    exportSingle(invoice)
  }, [exportSingle])

  // 删除单个发票
  const handleDeleteInvoice = useCallback((invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (!invoice) return

    setDeleteInvoiceIds([invoiceId])
    setDeleteInvoiceNumbers([invoice.invoice_number])
    setIsDeleteModalOpen(true)
  }, [invoices])

  // 临时使用简化的硬编码列定义进行调试
  const columnHelper = createColumnHelper<Invoice>()
  
  const simpleColumns = useMemo<ColumnDef<Invoice>[]>(() => [
    // 选择列
    {
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
    },
    // 发票号码
    columnHelper.accessor('invoice_number', {
      header: '发票号码',
      cell: ({ getValue }) => <div className="font-medium">{getValue()}</div>,
    }),
    // 开票日期
    columnHelper.accessor('invoice_date', {
      header: '开票日期',
      cell: ({ getValue }) => formatDate(getValue()),
    }),
    // 销售方
    columnHelper.accessor('seller_name', {
      header: '销售方',
      cell: ({ getValue }) => <div className="font-medium">{getValue()}</div>,
    }),
    // 金额
    columnHelper.accessor('total_amount', {
      header: '金额',
      cell: ({ getValue }) => (
        <div className="font-bold text-primary">
          {formatCurrency(getValue())}
        </div>
      ),
    }),
    // 状态
    columnHelper.accessor('status', {
      header: '状态',
      cell: ({ getValue }) => (
        <span className={`badge ${getStatusBadge(getValue())}`}>
          {getValue()}
        </span>
      ),
    }),
    // 操作
    {
      id: 'actions',
      header: '操作',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => handleViewInvoice(row.original.id)}
            title="查看详情"
          >
            👁️
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => handleEditInvoice(row.original.id)}
            title="编辑发票"
          >
            ✏️
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => handleExportInvoice(row.original)}
            disabled={isExporting}
            title="导出发票"
          >
            📥
          </button>
          <button
            className="btn btn-ghost btn-xs text-error"
            onClick={() => handleDeleteInvoice(row.original.id)}
            title="删除发票"
          >
            🗑️
          </button>
        </div>
      ),
    },
  ], [isExporting])

  // 动态列和简化列的选择
  const useDynamicColumns = true // 恢复动态列配置
  
  // 动态列生成Hook
  const { 
    columns: dynamicColumns,
    loading: dynamicColumnsLoading,
    error: dynamicColumnsError,
    fieldsCount: dynamicFieldsCount
  } = useDynamicTableColumns({
    tableName: 'invoices',
    onViewInvoice: handleViewInvoice,
    onEditInvoice: handleEditInvoice,
    onExportInvoice: handleExportInvoice,
    onDeleteInvoice: handleDeleteInvoice,
    isExporting
  })

  // 选择使用哪种列定义
  const columns = useDynamicColumns ? dynamicColumns : simpleColumns
  const fieldsCount = useDynamicColumns ? dynamicFieldsCount : simpleColumns.length
  
  console.log('📋 列定义选择:', {
    useDynamicColumns,
    dynamicColumnsCount: dynamicColumns.length,
    simpleColumnsCount: simpleColumns.length,
    selectedColumnsCount: columns.length,
    dynamicColumnsLoading,
    dynamicColumnsError
  })

  // 旧的硬编码列定义 - 现在被动态生成的列替代
  /*
  const columnHelper = createColumnHelper<Invoice>()
  
  const oldColumns = useMemo<ColumnDef<Invoice>[]>(() => [
    // 选择列 - 不可隐藏
    {
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
    },
    // 发票号码列
    {
      accessorKey: 'invoice_number',
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-xs flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            发票号码
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
              <input
                type="text"
                placeholder="筛选发票号..."
                className="input input-bordered input-sm w-full"
                value={(column.getFilterValue() ?? '') as string}
                onChange={(e) => column.setFilterValue(e.target.value)}
              />
            </div>
          </div>
        </div>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue('invoice_number')}</div>
          {row.original.invoice_type && (
            <div className="text-xs text-base-content/60">
              {row.original.invoice_type}
            </div>
          )}
        </div>
      ),
    },
    // 开票日期列
    {
      accessorKey: 'invoice_date',
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-xs flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            开票日期
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
            </div>
          </div>
        </div>
      ),
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    // 销售方列
    {
      accessorKey: 'seller_name',
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-xs flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            销售方
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
              <input
                type="text"
                placeholder="筛选销售方..."
                className="input input-bordered input-sm w-full"
                value={(column.getFilterValue() ?? '') as string}
                onChange={(e) => column.setFilterValue(e.target.value)}
              />
            </div>
          </div>
        </div>
      ),
      cell: ({ getValue }) => (
        <div className="font-medium">{getValue() as string}</div>
      ),
    },
    // 购买方列 - 可隐藏
    {
      accessorKey: 'buyer_name',
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-xs flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            购买方
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
              <input
                type="text"
                placeholder="筛选购买方..."
                className="input input-bordered input-sm w-full"
                value={(column.getFilterValue() ?? '') as string}
                onChange={(e) => column.setFilterValue(e.target.value)}
              />
            </div>
          </div>
        </div>
      ),
      enableHiding: true,
      cell: ({ getValue }) => (getValue() as string) || '-',
    },
    // 金额列
    {
      accessorKey: 'total_amount',
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-xs flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            金额
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
              <input
                type="number"
                placeholder="最小金额"
                className="input input-bordered input-sm w-full mb-2"
                onChange={(e) => {
                  const currentFilter = column.getFilterValue() as [number, number] || [0, 0]
                  column.setFilterValue([Number(e.target.value), currentFilter[1]])
                }}
              />
              <input
                type="number"
                placeholder="最大金额"
                className="input input-bordered input-sm w-full"
                onChange={(e) => {
                  const currentFilter = column.getFilterValue() as [number, number] || [0, 0]
                  column.setFilterValue([currentFilter[0], Number(e.target.value)])
                }}
              />
            </div>
          </div>
        </div>
      ),
      cell: ({ getValue }) => (
        <div className="font-bold text-primary">
          {formatCurrency(getValue() as number)}
        </div>
      ),
    },
    // 状态列 - 可隐藏
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-xs flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            状态
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
              <div className="space-y-2">
                {['pending', 'completed', 'failed', 'draft'].map(status => (
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
                    <span className="label-text text-sm">{status}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
      enableHiding: true,
      cell: ({ getValue }) => (
        <span className={`badge ${getStatusBadge(getValue() as string)}`}>
          {getValue() as string}
        </span>
      ),
    },
    // 来源列 - 可隐藏
    {
      accessorKey: 'source',
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-xs flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            来源
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
            </div>
          </div>
        </div>
      ),
      enableHiding: true,
      cell: ({ getValue }) => (
        <span className="badge badge-outline">
          {getValue() as string}
        </span>
      ),
    },
    // 操作列 - 不可隐藏
    {
      id: 'actions',
      header: '操作',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => handleViewInvoice(row.original.id)}
            title="查看详情"
          >
            👁️
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => handleEditInvoice(row.original.id)}
            title="编辑发票"
          >
            ✏️
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => handleExportInvoice(row.original)}
            disabled={isExporting}
            title="导出发票"
          >
            📥
          </button>
          <button
            className="btn btn-ghost btn-xs text-error"
            onClick={() => handleDeleteInvoice(row.original.id)}
            title="删除发票"
          >
            🗑️
          </button>
        </div>
      ),
    },
  ], [isExporting])
  */

  // 直接使用真实数据，移除循环依赖
  console.log('📊 使用发票数据:', {
    invoiceCount: invoices.length,
    columnsCount: columns.length,
    firstInvoice: invoices[0] ? {
      id: invoices[0].id,
      invoice_number: invoices[0].invoice_number,
      seller_name: invoices[0].seller_name
    } : null
  })

  // 完整TanStack Table配置 - 启用分页器
  const table = useReactTable({
    data: invoices,
    columns,
    // 显式指定getRowId函数
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      rowSelection,
      pagination,
      columnVisibility,
      columnFilters,
      globalFilter,
    },
    // 设置初始分页状态作为备份
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 20
      }
    }
  })

  // 详细调试表格数据问题
  console.log('🔍 表格调试信息:', {
    invoiceCount: invoices.length,
    columnsCount: columns.length,
    stateLoaded,
    tableExists: !!table,
    dynamicColumnsLoading,
    useDynamicColumns,
    firstInvoice: invoices[0] ? {
      id: invoices[0].id,
      invoice_number: invoices[0].invoice_number
    } : null
  })
  
  // 如果表格存在，检查行数据
  if (table) {
    const coreRowModel = table.getCoreRowModel()
    const paginationRowModel = table.getPaginationRowModel()
    const firstRow = coreRowModel.rows[0]
    
    console.log('📊 TanStack表格状态:', {
      totalRows: coreRowModel.rows.length,
      filteredRows: table.getFilteredRowModel ? table.getFilteredRowModel().rows.length : 'N/A',
      paginatedRows: paginationRowModel.rows.length,
      columns: table.getAllColumns().length,
      data: table.options.data.length,
      firstRowId: firstRow?.id,
      firstRowOriginal: firstRow?.original ? {
        id: firstRow.original.id,
        invoice_number: firstRow.original.invoice_number
      } : null,
      paginationState: table.getState().pagination,
      paginationInfo: {
        pageIndex: table.getState().pagination.pageIndex,
        pageSize: table.getState().pagination.pageSize,
        pageCount: table.getPageCount(),
        canPreviousPage: table.getCanPreviousPage(),
        canNextPage: table.getCanNextPage()
      },
      currentTableState: {
        sorting: table.getState().sorting,
        // columnFilters: table.getState().columnFilters,
        // globalFilter: table.getState().globalFilter
      },
      // 检查前几个列的accessorKey
      columnAccessors: table.getAllColumns().slice(0, 5).map(col => ({
        id: col.id,
        accessorKey: col.columnDef.accessorKey
      }))
    })
  }

  // 纯实时订阅模式 - 无需手动刷新功能

  // 暂时禁用高级筛选的自动重新获取，避免无限循环
  // useEffect(() => {
  //   if (user?.id) {
  //     fetchInvoices()
  //   }
  // }, [
  //   searchFilters.date_from,
  //   searchFilters.date_to,
  //   searchFilters.amount_min,
  //   searchFilters.amount_max,
  //   searchFilters.status,
  //   searchFilters.source,
  //   searchFilters.invoice_type
  // ])

  // 使用ref保存最新的refreshStats引用，避免循环依赖
  const refreshStatsRef = useRef(refreshStats)
  useEffect(() => {
    refreshStatsRef.current = refreshStats
  }, [refreshStats])

  // 稳定的refreshStats引用，避免循环依赖
  const stableRefreshStats = useCallback(() => {
    if (refreshStatsRef.current) {
      refreshStatsRef.current()
    }
  }, [])

  // 实时订阅模式：初始获取 + 实时更新
  useEffect(() => {
    if (!user?.id) return

    console.log('🔄 初始化实时订阅模式，用户ID:', user.id)
    setLoading(true)
    
    // 获取初始数据
    const fetchInitialData = async () => {
      try {
        console.log('📡 获取初始发票数据...')
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(200)

        if (error) {
          console.error('❌ 初始数据获取失败:', error)
          setError(error.message)
          return
        }

        console.log('✅ 初始发票数据获取成功:', { count: data?.length })
        setInvoices(data || [])
        setTotalCount(data?.length || 0)
        setError(null)
      } catch (err) {
        console.error('❌ 获取初始数据异常:', err)
        setError(err instanceof Error ? err.message : '获取发票列表失败')
      } finally {
        setLoading(false)
      }
    }

    // 获取初始数据
    fetchInitialData()

    // 设置实时订阅 - 监听后续数据变化
    const channel = supabase.channel(`invoice-realtime-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'invoices',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('🔥 发票数据实时变化:', payload.eventType, payload.new?.invoice_number || payload.old?.invoice_number)
        
        // 根据事件类型更新本地状态
        if (payload.eventType === 'INSERT' && payload.new) {
          setInvoices(prev => {
            // 避免重复添加
            const exists = prev.some(inv => inv.id === payload.new!.id)
            if (exists) return prev
            return [payload.new as Invoice, ...prev].sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
          })
          setTotalCount(prev => prev + 1)
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setInvoices(prev => prev.map(inv => 
            inv.id === payload.new!.id ? payload.new as Invoice : inv
          ))
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setInvoices(prev => prev.filter(inv => inv.id !== payload.old!.id))
          setTotalCount(prev => Math.max(0, prev - 1))
        }
        
        // 同时更新统计数据 - 使用稳定的引用
        stableRefreshStats()
      })
      .subscribe((status) => {
        console.log('📡 发票订阅状态:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ 实时订阅已建立，监听数据变化...')
          setRealtimeStatus('connected')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ 实时订阅失败')
          setRealtimeStatus('error')
          setError('实时订阅连接失败')
        } else if (status === 'CONNECTING') {
          setRealtimeStatus('connecting')
        }
      })

    return () => {
      console.log('🧹 清理实时订阅')
      supabase.removeChannel(channel)
    }
  }, [user?.id]) // 移除refreshStats依赖，使用内部的stableRefreshStats

  // 格式化货币
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount)
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  // 获取状态徽章样式
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'badge-warning',
      'completed': 'badge-success',
      'failed': 'badge-error',
      'draft': 'badge-info'
    }
    return statusMap[status] || 'badge-neutral'
  }

  // 同步TanStack Table选择状态到旧的状态管理
  const selectedInvoiceIds = useMemo(() => {
    return Object.keys(rowSelection).filter(id => rowSelection[id])
  }, [rowSelection])

  // 更新旧的selectedInvoices状态以保持兼容性
  useEffect(() => {
    setSelectedInvoices(selectedInvoiceIds)
  }, [selectedInvoiceIds])

  // 选择发票 - 现在通过TanStack Table处理
  const handleSelectInvoice = (invoiceId: string) => {
    const currentSelection = { ...rowSelection }
    if (currentSelection[invoiceId]) {
      delete currentSelection[invoiceId]
    } else {
      currentSelection[invoiceId] = true
    }
    setRowSelection(currentSelection)
  }

  // 全选/取消全选 - 现在通过TanStack Table处理
  const handleSelectAll = () => {
    if (table.getIsAllPageRowsSelected()) {
      table.toggleAllPageRowsSelected(false)
    } else {
      table.toggleAllPageRowsSelected(true)
    }
  }

  // 关闭模态框
  const handleCloseModal = () => {
    setIsViewModalOpen(false)
    setSelectedInvoiceId(null)
  }

  // 模态框成功回调 - 纯实时订阅模式下不需要手动刷新
  const handleModalSuccess = () => {
    // fetchInvoices() // 移除主动查询
    stableRefreshStats()
  }

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedInvoices.length === 0) return

    const selectedInvoiceData = invoices.filter(inv => 
      selectedInvoices.includes(inv.id)
    )
    
    setDeleteInvoiceIds(selectedInvoices)
    setDeleteInvoiceNumbers(selectedInvoiceData.map(inv => inv.invoice_number))
    setIsDeleteModalOpen(true)
  }

  // 关闭删除模态框
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setDeleteInvoiceIds([])
    setDeleteInvoiceNumbers([])
  }

  // 删除成功回调 - 纯实时订阅模式下不需要手动刷新
  const handleDeleteSuccess = () => {
    setSelectedInvoices([])
    // fetchInvoices() // 移除主动查询
    stableRefreshStats()
  }

  // 批量导出发票
  const handleBatchExport = () => {
    if (selectedInvoices.length === 0) return

    const selectedInvoiceData = invoices.filter(inv => 
      selectedInvoices.includes(inv.id)
    )
    
    exportBatch(selectedInvoiceData)
    // 导出成功后清空选中项
    setSelectedInvoices([])
  }

  // 移除活跃筛选数量计算
  // const activeFilterCount = Object.values(searchFilters).filter(value =>
  //   value !== undefined && value !== '' &&
  //   !(Array.isArray(value) && value.length === 0)
  // ).length

  return (
    <Layout>
      <div className="page-container min-h-screen">
        {/* 页面状态指示器 */}
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-base-content/70">
                {useDynamicColumns ? '动态' : '简化'}列定义: {fieldsCount} 列
              </span>
              {dynamicColumnsLoading && <span className="loading loading-spinner loading-xs ml-2"></span>}
            </div>
          </div>

        {/* 主内容区 - 使用原生Tailwind Grid */}
        
        {/* 页面标题和统计 */}
        <section className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">发票管理 ({useDynamicColumns ? '动态列测试' : '简化调试'}模式)</h1>
              <p className="text-base-content/60 mt-2">
                共 {invoices.length} 张发票
                {(globalFilter || Object.keys(searchFilters).length > 0) && (
                  <span>
                    {viewMode === ViewMode.TABLE && table 
                      ? ` (显示 ${table.getFilteredRowModel().rows.length} 条匹配结果)`
                      : ` (显示 ${filteredInvoices.length} 条匹配结果)`
                    }
                  </span>
                )}
                {selectedInvoiceIds.length > 0 && (
                  <span className="ml-2 text-primary">
                    (已选择 {selectedInvoiceIds.length} 张)
                  </span>
                )}
              </p>
              {dynamicColumnsError && (
                <p className="text-error text-sm mt-1">
                  动态列加载失败: {dynamicColumnsError}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {/* 移除上传发票按钮 */}
            </div>
          </div>
        </section>

        {/* 控制区域 - 所有工具组件在一行 */}
        <section className="mb-8">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body p-4">
              <div className="flex flex-wrap items-center gap-2">
                {/* 搜索框 */}
                <div className="form-control">
                  <input
                    type="text"
                    placeholder="搜索发票..."
                    className="input input-bordered input-sm w-64"
                    value={globalFilter || ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                </div>

                {/* 高级搜索按钮 */}
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setIsAdvancedSearchOpen(true)}
                >
                  🔍 高级搜索
                </button>

                {/* 批量操作按钮 */}
                {selectedInvoiceIds.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleBatchExport(selectedInvoiceIds)}
                      disabled={isExporting}
                    >
                      📥 批量导出 ({selectedInvoiceIds.length})
                    </button>
                    <button
                      className="btn btn-error btn-sm"
                      onClick={() => handleBatchDelete(selectedInvoiceIds)}
                    >
                      🗑️ 批量删除 ({selectedInvoiceIds.length})
                    </button>
                  </div>
                )}

                {/* 右侧组件区域 */}
                <div className="ml-auto flex items-center gap-2">
                  {/* 视图切换按钮 */}
                  <div className="join">
                    <button
                      className={`btn join-item ${viewMode === ViewMode.TABLE ? 'btn-active' : ''}`}
                      onClick={() => setViewMode(ViewMode.TABLE)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18m-9 8h9m-9 4h9m-9-8H3m0 4h6" />
                      </svg>
                      表格
                    </button>
                    <button
                      className={`btn join-item ${viewMode === ViewMode.GRID ? 'btn-active' : ''}`}
                      onClick={() => setViewMode(ViewMode.GRID)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      卡片
                    </button>
                  </div>

                  {/* 字段配置器 - 最右边 */}
                  <FieldSelector
                    table={table}
                    columns={table?.getAllColumns()}
                    onVisibilityChange={setColumnVisibility}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* 发票列表区域 */}
        <section>
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body p-0">
              
              {/* 列表头部 */}
              <div className="p-4 border-b border-base-300">
                <div className="flex items-center justify-between">
                  <label className="label cursor-pointer gap-2">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={table.getIsAllPageRowsSelected()}
                      onChange={table.getToggleAllPageRowsSelectedHandler()}
                    />
                    <span className="label-text">
                      {selectedInvoiceIds.length > 0 ? `已选择 ${selectedInvoiceIds.length} 项` : '全选'}
                    </span>
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-base-content/60">
                      显示 {table.getPaginationRowModel().rows.length} / {table.getCoreRowModel().rows.length} 条记录
                    </span>
                    <div className={`badge badge-sm ${
                      realtimeStatus === 'connected' ? 'badge-success' :
                      realtimeStatus === 'connecting' ? 'badge-warning' :
                      'badge-error'
                    }`}>
                      {realtimeStatus === 'connected' ? '🟢 实时同步' :
                       realtimeStatus === 'connecting' ? '🟡 连接中...' :
                       '🔴 连接异常'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 加载状态 */}
              {(loading || dynamicColumnsLoading || !stateLoaded) && (
                <div className="p-12 text-center">
                  <div className="loading loading-spinner loading-lg"></div>
                  <p className="mt-4">
                    {loading && '正在加载发票数据...'}
                    {dynamicColumnsLoading && '正在加载动态列配置...'}
                    {!stateLoaded && '正在加载表格状态...'}
                  </p>
                </div>
              )}

              {/* 错误状态 */}
              {(error || dynamicColumnsError) && (
                <div className="p-6">
                  <div className="alert alert-error">
                    <div>
                      <h3 className="font-bold">连接异常</h3>
                      <div className="text-sm">{error || dynamicColumnsError}</div>
                      <div className="text-xs mt-1 opacity-70">实时订阅将自动重新连接</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 发票列表 - TanStack Table 视图 */}
              {!loading && !dynamicColumnsLoading && !error && !dynamicColumnsError && stateLoaded && viewMode === ViewMode.TABLE && (
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <th key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getPaginationRowModel().rows.map(row => (
                        <tr key={row.id}>
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 发票列表 - 网格视图 */}
              {!loading && !dynamicColumnsLoading && !error && !dynamicColumnsError && stateLoaded && viewMode === ViewMode.GRID && (
                <div className="p-6">
                  <InvoiceListView
                    invoices={filteredInvoices}
                    selectedInvoices={selectedInvoices}
                    onSelectInvoice={handleSelectInvoice}
                    onViewInvoice={handleViewInvoice}
                    onDownloadInvoice={handleExportInvoice}
                    onDeleteInvoice={(invoice) => handleDeleteInvoice(invoice.id)}
                    isLoading={false}
                  />
                </div>
              )}

              {/* 空状态 */}
              {!loading && !dynamicColumnsLoading && !error && !dynamicColumnsError && stateLoaded && table.getCoreRowModel().rows.length === 0 && (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <h3 className="text-xl font-bold mb-2">暂无发票数据</h3>
                  <p className="text-base-content/60">
                    暂无发票数据，等待实时数据更新...
                  </p>
                </div>
              )}

              {/* TanStack Table 分页 */}
              {!loading && !dynamicColumnsLoading && !error && !dynamicColumnsError && stateLoaded && table.getCoreRowModel().rows.length > 0 && (
                <div className="p-4 border-t border-base-300">
                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-base-content/60">
                        显示第 {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} - {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getCoreRowModel().rows.length)} 条，共 {table.getCoreRowModel().rows.length} 条
                      </span>
                      <select 
                        className="select select-bordered select-xs"
                        value={table.getState().pagination.pageSize}
                        onChange={e => {
                          table.setPageSize(Number(e.target.value))
                        }}
                      >
                        {[10, 20, 30, 40, 50].map(pageSize => (
                          <option key={pageSize} value={pageSize}>
                            {pageSize}条/页
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="join">
                      <button
                        className="join-item btn btn-sm"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                      >
                        {'<<'}
                      </button>
                      <button
                        className="join-item btn btn-sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                      >
                        上一页
                      </button>
                      <span className="join-item btn btn-sm btn-disabled">
                        {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                      </span>
                      <button
                        className="join-item btn btn-sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                      >
                        下一页
                      </button>
                      <button
                        className="join-item btn btn-sm"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                      >
                        {'>>'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

      {/* 移除高级搜索模态框 */}
      {/* <AdvancedSearchModal ... /> */}

      {/* 发票详情/编辑模态框 */}
      <InvoiceModal
        invoiceId={selectedInvoiceId}
        isOpen={isViewModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        mode={modalMode}
      />

      {/* 删除确认模态框 */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onSuccess={handleDeleteSuccess}
        invoiceIds={deleteInvoiceIds}
        invoiceNumbers={deleteInvoiceNumbers}
      />

      {/* 导出进度模态框 */}
      <ExportProgressModal
        isOpen={isProgressModalOpen}
        onClose={closeProgressModal}
        onCancel={cancelExport}
        exportProgress={exportProgress}
        totalProgress={totalProgress}
        canCancel={isExporting}
        title="导出发票"
      />

      {/* 高级搜索模态框 */}
      <AdvancedSearchModal
        isOpen={isAdvancedSearchOpen}
        onClose={() => setIsAdvancedSearchOpen(false)}
        onSearch={(filters) => {
          setSearchFilters(filters)
          setIsAdvancedSearchOpen(false)
          // 将搜索条件转换为表格筛选
          // 这里可以根据需要实现具体的筛选逻辑
        }}
        initialFilters={searchFilters}
      />
        </div>
      </div>
    </Layout>
  )
}

// 使用具名导出以保持一致性
export { InvoiceManagePage as default }