/**
 * Supabase架构的发票管理页面
 * 集成TanStack Table、Grid系统、实时数据和完整的发票管理功能
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { useDeviceDetection } from '../hooks/useMediaQuery'
import { useAuthContext } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useInvoices } from '../hooks/useSupabaseData'
import { AdvancedSearchModal } from '../components/invoice/AdvancedSearchModal'
import { InvoiceModal } from '../components/invoice/InvoiceModal'
import { DeleteConfirmModal } from '../components/invoice/DeleteConfirmModal'
import { ExportProgressModal } from '../components/invoice/ExportProgressModal'
import { BulkActionBar } from '../components/invoice/BulkActionBar'
import { useInvoiceExport } from '../hooks/useInvoiceExport'
import { useTableColumns } from '../hooks/useTableColumns'
import { useDynamicTableColumns } from '../hooks/useDynamicTableColumns'
// import { useTableState } from '../hooks/useTableState' // 不使用localStorage持久化
import { FieldSelector } from '../components/invoice/table/FieldSelector'
import { InvoiceListView } from '../components/invoice/cards/InvoiceListView'
import { MobileBatchActions } from '../components/mobile/MobileBatchActions'
import { MobileSearchModal } from '../components/mobile/MobileSearchModal'
import { DashboardStatsSection, useStatsConfig } from '../components/dashboard/DashboardStatsSection'
import CompactLayout from '../components/layout/CompactLayout'
import '../styles/mobile-enhancements.css'
import { mobilePerformanceMonitor } from '../utils/mobilePerformanceMonitor'

// 发票数据类型 - 基于invoice_management_view视图
interface Invoice {
  // 基础发票信息
  id: string
  user_id: string
  email_task_id?: string
  invoice_number: string
  invoice_code?: string
  invoice_type?: string
  status: string  // 报销状态: unreimbursed, reimbursed, voided
  processing_status?: string
  amount: number  // 发票金额
  tax_amount?: number
  total_amount?: number  // 价税合计 
  currency: string
  invoice_date: string
  consumption_date?: string  // 消费日期（实际消费/服务发生的日期）
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
  basic_category?: string
  
  // 分类信息（从视图获取）
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
  
  // 计算字段（来自视图）
  remarks: string  // 备注信息
  expense_category: string  // 费用类别
  expense_category_code: string  // 费用类别代码
  category_icon: string  // 分类图标
  category_color: string  // 分类颜色
  display_amount: number  // 显示金额
  category_path: string  // 分类路径
  status_text: string  // 状态中文文本
  processing_status_text: string  // 处理状态中文文本
  source_text: string  // 来源中文文本
  
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
  overdue?: boolean
  urgent?: boolean  // 紧急（>60天，包括临期和逾期）
}

export function InvoiceManagePage() {
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: stats, loading: statsLoading, error: statsError, refresh: refreshStats } = useDashboardStats()
  
  // 设备检测 - 用于响应式适配
  const device = useDeviceDetection()
  
  // 智能视图切换 - 基于 preferCardView 属性
  const shouldForceCardView = device.preferCardView
  const canSwitchToTableView = device.preferTableView
  
  // 视图切换动画状态
  const [isViewTransitioning, setIsViewTransitioning] = useState(false)
  
  // 移除 calculateStats 函数，现在使用 useDashboardStats 的全部数据统计
  
  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({})
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)

  // 处理URL参数初始化筛选条件
  useEffect(() => {
    const status = searchParams.get('status')
    const overdue = searchParams.get('overdue')
    const urgent = searchParams.get('urgent')
    
    if (status || overdue || urgent) {
      const initialFilters: SearchFilters = {}
      
      if (status === 'unreimbursed') {
        initialFilters.status = ['unreimbursed']
      } else if (status === 'reimbursed') {
        initialFilters.status = ['reimbursed']
      }
      
      if (overdue === 'true') {
        initialFilters.overdue = true
      }
      
      if (urgent === 'true') {
        initialFilters.urgent = true
      }
      
      setSearchFilters(initialFilters)
    }
  }, [searchParams])
  
  // 简化状态管理 - 不使用localStorage持久化分页状态
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'consumption_date', desc: true } // 默认以消费日期降序排序
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState<string>('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  
  // 当排序或筛选器改变时，重置到第一页
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [sorting, columnFilters, globalFilter, searchFilters])
  // 默认显示字段配置
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    // 默认显示的字段
    'select': true,
    'invoice_number': true,        // 发票号码
    'created_at': true,           // 消费日期  
    'seller_name': true,          // 销售方
    'buyer_name': true,           // 购买方
    'total_amount': true,         // 含税金额
    'status': true,               // 状态
    'invoice_type': true,         // 发票类型
    'expense_category': true,     // 费用类别
    'actions': true,              // 操作
    
    // 默认隐藏的字段（设置为false或不设置）
    'invoice_code': false,
    'processing_status': false,
    'amount': false,
    'tax_amount': false,
    'currency': false,
    'invoice_date': false,
    'seller_tax_id': false,
    'buyer_tax_id': false,
    'file_path': false,
    'file_url': false,
    'file_size': false,
    'file_hash': false,
    'source': false,
    'source_metadata': false,
    'is_verified': false,
    'verified_at': false,
    'verified_by': false,
    'verification_notes': false,
    'tags': false,
    'basic_category': false,
    'primary_category_id': false,
    'primary_category_name': false,
    'primary_category_code': false,
    'primary_category_color': false,
    'primary_category_icon': false,
    'secondary_category_id': false,
    'secondary_category_name': false,
    'secondary_category_code': false,
    'auto_classified': false,
    'classification_confidence': false,
    'classification_metadata': false,
    'extracted_data': false,
    'remarks': false,
    'expense_category_code': false,
    'category_icon': false,
    'category_color': false,
    'display_amount': false,
    'category_path': false,
    'status_text': false,
    'processing_status_text': false,
    'source_text': false,
    'started_at': false,
    'completed_at': false,
    'last_activity_at': false,
    'updated_at': false,
    'metadata': false,
    'created_by': false,
    'updated_by': false,
    'version': false
  })

  // 合并搜索筛选器、排序和列筛选器
  const serverFilters = useMemo(() => {
    const filters = { ...searchFilters }
    
    // 添加全局搜索到服务端筛选（支持在发票号、销售方、购买方、含税金额中搜索）
    if (globalFilter) {
      // 使用模糊搜索，服务端会在多个字段中搜索
      // 对于数字搜索，支持精确匹配和范围匹配
      filters.global_search = globalFilter
    }
    
    // 添加列筛选器到服务端筛选
    columnFilters.forEach(filter => {
      if (filter.id === 'seller_name' && filter.value) {
        filters.seller_name = filter.value as string
      } else if (filter.id === 'buyer_name' && filter.value) {
        filters.buyer_name = filter.value as string
      } else if (filter.id === 'invoice_number' && filter.value) {
        filters.invoice_number = filter.value as string
      } else if (filter.id === 'invoice_type' && filter.value) {
        filters.invoice_type = filter.value as string
      } else if (filter.id === 'status' && filter.value) {
        filters.status = filter.value as string[]
      } else if (filter.id === 'source' && filter.value) {
        filters.source = filter.value as string[]
      }
    })
    
    return filters
  }, [searchFilters, columnFilters, globalFilter])
  
  // 提取排序信息
  const sortField = sorting.length > 0 ? sorting[0].id : 'consumption_date'
  const sortOrder = sorting.length > 0 ? (sorting[0].desc ? 'desc' : 'asc') : 'desc'
  
  // 使用 TanStack Query 获取发票数据，启用轮询
  const { 
    data: invoicesResponse, 
    isLoading: loading, 
    error: queryError, 
    refetch: refreshInvoices 
  } = useInvoices(
    serverFilters, 
    pagination.pageIndex + 1, 
    pagination.pageSize,
    sortField,
    sortOrder
  )
  
  // 从响应中提取数据
  const invoices = invoicesResponse?.data || []
  const totalCount = invoicesResponse?.total || 0
  const error = queryError?.message || invoicesResponse?.error

  // 添加轮询机制 - 每30秒自动刷新一次
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !error) {
        refreshInvoices()
      }
    }, 30000) // 30秒

    return () => clearInterval(interval)
  }, [loading, error, refreshInvoices])
  
  // 所有筛选都已在服务端处理，直接使用服务端返回的数据
  const filteredInvoices = invoices
  
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
  
  // 智能视图模式管理 - 基于设备特征智能选择
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // 基于设备偏好智能选择初始视图
    return shouldForceCardView ? ViewMode.GRID : ViewMode.TABLE
  })
  
  // 监听设备变化，智能调整视图模式
  useEffect(() => {
    if (shouldForceCardView && viewMode === ViewMode.TABLE) {
      // 智能切换到卡片视图（带动画过渡）
      setViewMode(ViewMode.GRID)
    }
  }, [shouldForceCardView, viewMode])

  // 视图切换处理函数 - 智能适配设备能力
  const handleViewModeChange = useCallback(async (mode: ViewMode) => {
    // 检查设备是否支持目标视图模式
    if (mode === ViewMode.TABLE && !canSwitchToTableView) {
      // 设备不适合表格视图，保持卡片视图
      return
    }
    
    if (mode === viewMode) return
    
    // 执行视图切换，支持平滑过渡动画
    setIsViewTransitioning(true)
    
    // 短暂延迟以显示过渡动画
    await new Promise(resolve => setTimeout(resolve, 150))
    
    setViewMode(mode)
    
    // 动画完成后重置状态
    setTimeout(() => {
      setIsViewTransitioning(false)
    }, 300)
  }, [canSwitchToTableView, viewMode])

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

  // 移动端列优先级配置
  const getMobileColumnConfig = useCallback(() => {
    return {
      // Essential columns - 移动端必须显示的列
      essential: ['select', 'invoice_number', 'amount_display', 'status', 'actions'],
      // Important columns - 中等屏幕显示的列
      important: ['seller_name', 'consumption_date'],
      // Optional columns - 大屏幕才显示的列
      optional: ['buyer_name', 'invoice_type', 'source', 'expense_category']
    }
  }, [])
  
  // 临时使用简化的硬编码列定义进行调试
  const columnHelper = createColumnHelper<Invoice>()
  
  const simpleColumns = useMemo<ColumnDef<Invoice>[]>(() => {
    const mobileConfig = getMobileColumnConfig()
    
    const allColumns = [
      // 选择列
      {
        id: 'select',
        enableHiding: false,
        meta: { priority: 'essential', mobileWidth: '40px' },
        header: ({ table }) => (
          <input
            type="checkbox"
            className={`checkbox ${device.isMobile ? 'checkbox-sm' : ''}`}
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="全选发票"
          />
        ),
        cell: ({ row }) => (
          <div className={`${device.needsLargeTouchTargets ? 'p-2' : ''}`}>
            <input
              type="checkbox" 
              className={`checkbox ${device.isMobile ? 'checkbox-sm' : ''}`}
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              aria-label={`选择发票 ${row.original.invoice_number}`}
            />
          </div>
        ),
      },
      // 发票号码
      {
        ...columnHelper.accessor('invoice_number', {
          header: device.isMobile ? '发票号' : '发票号码',
          cell: ({ getValue, row }) => (
            <div className={`font-medium ${
              device.isMobile 
                ? 'text-sm truncate max-w-[120px]' 
                : ''
            }`}
              title={getValue()}
              onClick={device.needsLargeTouchTargets ? () => handleViewInvoice(row.original.id) : undefined}
            >
              {getValue()}
            </div>
          ),
        }),
        meta: { priority: 'essential', mobileWidth: '120px' }
      },
      // 消费日期
      {
        ...columnHelper.accessor('consumption_date', {
          header: device.isMobile ? '日期' : '消费日期',
          cell: ({ getValue }) => (
            <div className={device.isMobile ? 'text-sm' : ''}>
              {formatDate(getValue())}
            </div>
          ),
        }),
        meta: { priority: 'important', mobileWidth: '80px' }
      },
      // 销售方
      {
        ...columnHelper.accessor('seller_name', {
          header: '销售方',
          cell: ({ getValue }) => (
            <div className={`font-medium ${
              device.isMobile 
                ? 'text-sm truncate max-w-[100px]' 
                : ''
            }`}
              title={getValue()}
            >
              {getValue()}
            </div>
          ),
        }),
        meta: { priority: 'important', mobileWidth: '100px' }
      },
      // 金额 - 使用 total_amount 优先，否则用 amount
      {
        id: 'amount_display',
        header: '金额',
        accessorFn: (row) => row.total_amount || row.amount || 0,
        meta: { priority: 'essential', mobileWidth: '90px' },
        cell: ({ getValue }) => (
          <div className={`font-bold text-primary ${
            device.isMobile ? 'text-sm' : ''
          }`}>
            {formatCurrency(getValue() as number)}
          </div>
        ),
      },
      // 状态
      {
        ...columnHelper.accessor('status', {
          header: '状态',
          cell: ({ getValue }) => (
            <span className={`badge ${getStatusBadge(getValue())} ${
              device.isMobile ? 'badge-sm' : ''
            }`}>
              {device.isMobile ? getValue().slice(0, 2) : getValue()}
            </span>
          ),
        }),
        meta: { priority: 'essential', mobileWidth: '60px' }
      },
      // 操作
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        meta: { priority: 'essential', mobileWidth: '80px' },
        cell: ({ row }) => (
          <div className={`flex gap-1 ${
            device.isMobile ? 'justify-center' : ''
          }`}>
            {device.isMobile ? (
              // 移动端简化操作 - 只显示查看按钮，其他操作通过卡片菜单
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => handleViewInvoice(row.original.id)}
                title="查看详情"
                aria-label={`查看发票 ${row.original.invoice_number} 详情`}
              >
                👁️
              </button>
            ) : (
              // 桌面端完整操作
              <>
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
              </>
            )}
          </div>
        ),
      },
    ]
    
    // 根据设备类型动态筛选列
    if (device.isMobile) {
      // 移动端只显示essential列
      return allColumns.filter(col => 
        mobileConfig.essential.includes(col.id as string)
      )
    } else if (device.isTablet) {
      // 平板显示essential + important列
      return allColumns.filter(col => 
        mobileConfig.essential.includes(col.id as string) ||
        mobileConfig.important.includes(col.id as string)
      )
    }
    
    // 桌面端显示所有列
    return allColumns
  }, [isExporting, device, getMobileColumnConfig])

  // 动态列和简化列的选择
  const useDynamicColumns = true // 恢复动态列配置
  
  // 动态列生成Hook
  const { 
    columns: dynamicColumns,
    loading: dynamicColumnsLoading,
    error: dynamicColumnsError,
    fieldsCount: dynamicFieldsCount
  } = useDynamicTableColumns({
    tableName: 'v_invoice_detail',
    onViewInvoice: handleViewInvoice,
    onEditInvoice: handleEditInvoice,
    onExportInvoice: handleExportInvoice,
    onDeleteInvoice: handleDeleteInvoice,
    isExporting
  })

  // 选择使用哪种列定义
  const columns = useDynamicColumns ? dynamicColumns : simpleColumns
  const fieldsCount = useDynamicColumns ? dynamicFieldsCount : simpleColumns?.length || 0
  
  console.log('📋 列定义选择:', {
    useDynamicColumns,
    dynamicColumnsCount: dynamicColumns?.length || 0,
    simpleColumnsCount: simpleColumns?.length || 0,
    selectedColumnsCount: columns?.length || 0,
    dynamicColumnsLoading,
    dynamicColumnsError
  })
  
  // 添加用户和数据调试
  console.log('👤 用户和数据调试:', {
    userId: user?.id,
    userEmail: user?.email,
    invoicesResponseRaw: invoicesResponse,
    serverFilters,
    pagination
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
                {['unreimbursed', 'reimbursed', 'voided'].map(status => (
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
                       status === 'reimbursed' ? '已报销' : 
                       status === 'voided' ? '作废' : status}
                    </span>
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
    invoiceCount: invoices?.length || 0,
    columnsCount: columns?.length || 0,
    firstInvoice: invoices[0] ? {
      id: invoices[0].id,
      invoice_number: invoices[0].invoice_number,
      seller_name: invoices[0].seller_name
    } : null
  })

  // 完整TanStack Table配置 - 启用服务端分页、排序和筛选
  const table = useReactTable({
    data: invoices,
    columns,
    // 显式指定getRowId函数
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    // 服务端处理，不使用客户端模型
    // getSortedRowModel: getSortedRowModel(), // 移除客户端排序
    // getFilteredRowModel: getFilteredRowModel(), // 移除客户端筛选
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    // 服务端分页、排序和筛选配置
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    state: {
      sorting,
      rowSelection,
      pagination,
      columnVisibility,
      columnFilters,
      globalFilter,
    },
    // 设置初始分页状态、默认排序和列可见性作为备份
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 20
      },
      sorting: [
        { id: 'consumption_date', desc: true } // 默认以消费日期降序排序
      ],
      columnVisibility: {
        // 默认显示的字段
        'select': true,
        'invoice_number': true,        // 发票号码
        'consumption_date': true,     // 消费日期  
        'seller_name': true,          // 销售方
        'buyer_name': true,           // 购买方
        'total_amount': true,         // 含税金额
        'status': true,               // 状态
        'invoice_type': true,         // 发票类型
        'expense_category': true,     // 费用类别
        'actions': true,              // 操作
        
        // 其他字段默认隐藏
        'invoice_code': false,
        'processing_status': false,
        'amount': false,
        'tax_amount': false,
        'currency': false,
        'invoice_date': false,
        'seller_tax_id': false,
        'buyer_tax_id': false,
        'source': false,
        'is_verified': false,
        'verified_at': false,
        'verified_by': false,
        'verification_notes': false,
        'tags': false,
        'basic_category': false,
        'remarks': false,
        'expense_category_code': false,
        'category_path': false,
        'status_text': false,
        'processing_status_text': false,
        'source_text': false,
        'started_at': false,
        'completed_at': false,
        'last_activity_at': false,
        'updated_at': false,
        'metadata': false,
        'created_by': false,
        'updated_by': false,
        'version': false
      }
    }
  })

  // 详细调试表格数据问题
  console.log('🔍 表格调试信息:', {
    invoiceCount: invoices?.length || 0,
    columnsCount: columns?.length || 0,
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

  // 模态框成功回调 - 使用 TanStack Query 刷新数据
  const handleModalSuccess = () => {
    refreshInvoices() // 刷新发票数据
    stableRefreshStats() // 刷新统计数据
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

  // 删除成功回调 - 使用 TanStack Query 刷新数据
  const handleDeleteSuccess = () => {
    setSelectedInvoices([])
    refreshInvoices() // 刷新发票数据
    stableRefreshStats() // 刷新统计数据
  }

  // 状态切换处理函数
  const handleStatusChange = async (invoiceId: string, newStatus: string): Promise<boolean> => {
    try {
      console.log('🔄 更新发票状态:', { invoiceId, newStatus })
      
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: newStatus,
          status_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .eq('user_id', user?.id)

      if (error) {
        console.error('❌ 状态更新失败:', error)
        return false
      }

      console.log('✅ 状态更新成功')
      // 使用 TanStack Query 刷新数据
      refreshInvoices()
      return true
    } catch (error) {
      console.error('❌ 状态更新异常:', error)
      return false
    }
  }

  // 消费日期变更处理函数
  const handleConsumptionDateChange = async (invoiceId: string, newDate: string): Promise<boolean> => {
    try {
      console.log('🔄 更新消费日期:', { invoiceId, newDate })
      
      const { error } = await supabase
        .from('invoices')
        .update({ 
          consumption_date: newDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .eq('user_id', user?.id)

      if (error) {
        console.error('❌ 消费日期更新失败:', error)
        return false
      }

      console.log('✅ 消费日期更新成功')
      // 使用 TanStack Query 刷新数据
      refreshInvoices()
      return true
    } catch (error) {
      console.error('❌ 消费日期更新异常:', error)
      return false
    }
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

  // 获取指标卡配置 - 使用管理页模式
  const { createManagementConfig } = useStatsConfig()
  const statsConfig = createManagementConfig(setSearchFilters)
  
  // 性能监控集成
  useEffect(() => {
    if (device.isMobile) {
      // 设置性能监控指标
      mobilePerformanceMonitor.setMetric('listItemCount', invoices?.length || 0)
      mobilePerformanceMonitor.setMetric('viewMode', viewMode)
      mobilePerformanceMonitor.setMetric('deviceType', device.deviceType)
    }
  }, [device.isMobile, invoices?.length, viewMode, device.deviceType])

  // 移除活跃筛选数量计算
  // const activeFilterCount = Object.values(searchFilters).filter(value =>
  //   value !== undefined && value !== '' &&
  //   !(Array.isArray(value) && value.length === 0)
  // ).length

  return (
    <CompactLayout compactMode="auto">
      <div className="page-container min-h-screen">
        {/* 页面状态指示器 */}
        <div className="container mx-auto p-6 max-w-7xl">

        {/* 主内容区 - 使用原生Tailwind Grid */}
        
        {/* 页面标题和统计 */}
        <section className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">发票管理</h1>
              <p className="text-base-content/60 mt-2">
                共 {totalCount} 张发票，当前页显示 {invoices?.length || 0} 条记录
                {(globalFilter || Object.keys(searchFilters).length > 0) && (
                  <span>
                    (已应用筛选条件)
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

        {/* 数据概览指标卡片 - 使用通用组件 */}
        <DashboardStatsSection
          stats={stats}
          loading={statsLoading}
          error={statsError}
          config={statsConfig}
          title="数据概览"
        />

        {/* 控制区域 - 响应式优化布局 */}
        <section className="mb-8">
          <div className="card bg-base-100 shadow-lg">
            <div className={`card-body ${device.isMobile ? 'p-3' : 'p-4'}`}>
              <div className={`${device.isMobile ? 'space-y-3' : 'flex flex-wrap items-center gap-2'}`}>
                {/* 搜索框 - 移动端防缩放优化 */}
                <div className={`form-control ${device.isMobile ? 'w-full' : ''}`}>
                  <input
                    type="text"
                    placeholder="搜索发票号、销售方、购买方或金额..."
                    className={`mobile-input input input-bordered ${
                      device.isMobile 
                        ? 'input-md w-full text-base' // 16px防iOS缩放
                        : 'input-sm w-64 text-sm'
                    }`}
                    style={device.isMobile ? { fontSize: '16px' } : {}} // 防iOS缩放
                    value={globalFilter || ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    autoComplete="off"
                    inputMode="search"
                  />
                </div>

                {/* 操作按钮组 - 移动端触控优化 */}
                <div className={`${device.isMobile ? 'flex flex-wrap gap-2 w-full' : 'flex gap-2'}`}>
                  {/* 高级搜索按钮 - 移动端全屏显示优化 */}
                  <button
                    className={`btn btn-outline no-zoom ${
                      device.isMobile 
                        ? 'btn-md flex-1 min-h-[44px] touch-manipulation' 
                        : 'btn-sm'
                    }`}
                    onClick={() => {
                      if (device.isMobile) {
                        setIsMobileSearchOpen(true)
                      } else {
                        setIsAdvancedSearchOpen(true)
                      }
                    }}
                  >
                    🔍 <span className={device.isMobile ? '' : 'ml-1'}>高级搜索</span>
                  </button>

                  {/* 手动刷新按钮 - 触控优化 */}
                  <button
                    className={`btn btn-outline no-zoom ${
                      device.isMobile 
                        ? 'btn-md min-h-[44px] min-w-[44px] touch-manipulation' 
                        : 'btn-sm'
                    }`}
                    onClick={() => refreshInvoices()}
                    disabled={loading}
                    aria-label="刷新数据"
                  >
                    {loading ? (
                      <span className={`loading loading-spinner ${device.isMobile ? 'loading-sm' : 'loading-xs'}`}></span>
                    ) : (
                      '🔄'
                    )}
                    {!device.isMobile && <span className="ml-1">刷新</span>}
                  </button>
                </div>

                {/* 批量操作按钮 - 桌面端显示，移动端使用底部面板 */}
                {selectedInvoiceIds.length > 0 && !device.isMobile && (
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

                {/* 右侧组件区域 - 智能响应式布局 */}
                <div className={`${device.isMobile ? 'flex justify-center w-full' : 'ml-auto flex items-center gap-2'}`}>
                  {/* 智能视图切换控件 - 优化动画和交互 */}
                  {canSwitchToTableView ? (
                    // 设备支持表格视图时显示完整切换控件
                    <div className="join view-mode-switcher">
                      <button
                        className={`join-item btn ${device.isMobile ? 'btn-md min-h-[44px]' : 'btn-sm'} ${
                          viewMode === ViewMode.TABLE 
                            ? 'btn-primary' 
                            : 'btn-ghost'
                        } ${
                          isViewTransitioning ? 'loading' : ''
                        }`}
                        onClick={() => handleViewModeChange(ViewMode.TABLE)}
                        disabled={isViewTransitioning}
                        aria-label="切换到表格视图"
                        title="表格视图 - 适合大量数据浏览"
                      >
                        {!isViewTransitioning && (
                          <svg xmlns="http://www.w3.org/2000/svg" className={`${device.isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18m-9 8h9m-9 4h9m-9-8H3m0 4h6" />
                          </svg>
                        )}
                        <span className={`${device.isMobile ? 'ml-2' : 'hidden sm:inline ml-1'}`}>表格</span>
                      </button>
                      
                      <button
                        className={`join-item btn ${device.isMobile ? 'btn-md min-h-[44px]' : 'btn-sm'} ${
                          viewMode === ViewMode.GRID 
                            ? 'btn-primary' 
                            : 'btn-ghost'
                        } ${
                          isViewTransitioning ? 'loading' : ''
                        }`}
                        onClick={() => handleViewModeChange(ViewMode.GRID)}
                        disabled={isViewTransitioning}
                        aria-label="切换到卡片视图"
                        title="卡片视图 - 适合详细信息展示"
                      >
                        {!isViewTransitioning && (
                          <svg xmlns="http://www.w3.org/2000/svg" className={`${device.isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                        )}
                        <span className={`${device.isMobile ? 'ml-2' : 'hidden sm:inline ml-1'}`}>卡片</span>
                      </button>
                    </div>
                  ) : (
                    // 设备只适合卡片视图时显示智能指示器
                    <div className="flex items-center gap-2">
                      <div className="badge badge-primary badge-sm animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        智能视图
                      </div>
                      {device.isMobile && (
                        <div className="text-xs text-base-content/60 flex items-center gap-1">
                          <span className="w-1 h-1 bg-success rounded-full"></span>
                          触控优化
                        </div>
                      )}
                    </div>
                  )}

                  {/* 字段配置器 - 已隐藏 */}
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
                      显示 {invoices?.length || 0} / {totalCount} 条记录 (第 {pagination.pageIndex + 1} 页)
                    </span>
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
                      <div className="text-xs mt-1 opacity-70">
                        <button 
                          onClick={() => refreshInvoices()} 
                          className="btn btn-xs btn-outline"
                        >
                          重新加载
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 发票列表 - TanStack Table 视图（移动端优化） */}
              {!loading && !dynamicColumnsLoading && !error && !dynamicColumnsError && stateLoaded && viewMode === ViewMode.TABLE && (
                <div className={`
                  transition-all duration-300 ease-in-out
                  ${isViewTransitioning ? 'opacity-50 scale-98' : 'opacity-100 scale-100'}
                  overflow-x-auto virtual-scroll-container
                  ${device.isMobile ? 'mobile-table-container' : ''}
                `}
                  style={{
                    // 移动端优化的滚动性能
                    WebkitOverflowScrolling: 'touch',
                    scrollBehavior: 'smooth'
                  }}
                >
                  <table className={`
                    table table-zebra
                    ${device.isMobile ? 'table-compact w-max min-w-full' : ''}
                  `}>
                    <thead className={device.isMobile ? 'sticky top-0 bg-base-200 z-10 shadow-sm' : ''}>
                      {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map(header => {
                            const columnMeta = header.column.columnDef.meta as any
                            const mobileWidth = columnMeta?.mobileWidth || 'auto'
                            
                            return (
                              <th 
                                key={header.id}
                                className={`
                                  ${device.isMobile ? 'text-xs px-1 py-2 min-w-fit bg-base-200/95 backdrop-blur-sm' : ''}
                                  ${device.isMobile && header.column.getCanHide() ? 'hidden sm:table-cell' : ''}
                                  transition-all duration-200 hover:bg-base-300/30
                                `}
                                style={device.isMobile ? { 
                                  position: 'sticky', 
                                  top: 0,
                                  minWidth: mobileWidth,
                                  maxWidth: mobileWidth,
                                  width: mobileWidth,
                                  zIndex: 20
                                } : {}}
                              >
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                              </th>
                            )
                          })}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map((row, index) => (
                        <tr 
                          key={row.id}
                          className={`
                            ${device.isMobile ? 'hover:bg-base-200/50 active:bg-base-300/30' : ''}
                            ${device.needsLargeTouchTargets ? 'cursor-pointer' : ''}
                            ${index % 2 === 0 ? 'bg-base-100' : 'bg-base-50'}
                            transition-colors duration-150 ease-in-out
                          `}
                          onClick={device.needsLargeTouchTargets ? () => handleViewInvoice(row.original.id) : undefined}
                          style={{
                            // 移动端优化触摸响应
                            touchAction: device.isMobile ? 'manipulation' : 'auto'
                          }}
                        >
                          {row.getVisibleCells().map(cell => {
                            const columnMeta = cell.column.columnDef.meta as any
                            const mobileWidth = columnMeta?.mobileWidth || 'auto'
                            
                            return (
                              <td 
                                key={cell.id}
                                className={`
                                  ${device.isMobile ? 'text-xs px-1 py-3' : 'px-3 py-2'}
                                  ${device.isMobile && cell.column.getCanHide() ? 'hidden sm:table-cell' : ''}
                                  transition-all duration-150
                                `}
                                style={device.isMobile ? {
                                  minWidth: mobileWidth,
                                  maxWidth: mobileWidth,
                                  width: mobileWidth,
                                  verticalAlign: 'middle'
                                } : {}}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* 移动端表格提示和性能指示器 */}
                  {device.isMobile && (
                    <div className="mt-4 space-y-2">
                      <div className="alert alert-info alert-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span className="text-xs">左右滑动查看更多信息，点击行查看详情</span>
                      </div>
                      
                      {/* 性能提示 */}
                      {invoices?.length || 0 > 50 && (
                        <div className="text-center text-xs text-base-content/60">
                          已优化 {invoices?.length || 0} 行数据的滚动性能
                        </div>
                      )}
                      
                      {/* 切换提示 */}
                      <div className="text-center">
                        <button
                          className="btn btn-outline btn-xs gap-2"
                          onClick={() => handleViewModeChange(ViewMode.GRID)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                          切换到卡片视图
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 发票列表 - 智能网格视图（移动端触控优化） */}
              {!loading && !dynamicColumnsLoading && !error && !dynamicColumnsError && stateLoaded && viewMode === ViewMode.GRID && (
                <div className={`
                  ${device.isMobile ? 'p-3' : 'p-6'}
                  transition-all duration-300 ease-in-out
                  ${isViewTransitioning ? 'opacity-50 scale-98' : 'opacity-100 scale-100'}
                `}>
                  {/* 移动端手势操作提示 */}
                  {device.isMobile && selectedInvoiceIds.length === 0 && (
                    <div className="mb-4 text-center">
                      <div className="alert alert-info alert-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span className="text-xs">
                          💡 长按多选 • 右滑快速操作 • 左滑菜单
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* 移动端批量操作提示 */}
                  {device.isMobile && selectedInvoiceIds.length > 0 && (
                    <div className="mb-4 text-center">
                      <div className="alert alert-success alert-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span className="text-xs">
                          ✅ 已选择 {selectedInvoiceIds.length} 张发票，查看底部操作栏
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* 发票列表容器 - 让InvoiceListView自己管理布局 */}
                  <div 
                    style={{
                      // 移动端优化的性能
                      willChange: device.isMobile ? 'transform' : 'auto',
                      contain: 'layout style paint',
                    }}
                  >
                    <InvoiceListView
                      invoices={table.getRowModel().rows.map(row => row.original)}
                      selectedInvoices={selectedInvoices}
                      onSelectInvoice={handleSelectInvoice}
                      onViewInvoice={handleViewInvoice}
                      onDownloadInvoice={handleExportInvoice}
                      onDeleteInvoice={(invoice) => handleDeleteInvoice(invoice.id)}
                      onStatusChange={handleStatusChange}
                      onConsumptionDateChange={handleConsumptionDateChange}
                      isLoading={false}
                    />
                  </div>
                  
                  {/* 移动端性能和切换提示 */}
                  {device.isMobile && (
                    <div className="mt-6 space-y-3">
                      {/* 性能指示器 */}
                      {invoices?.length || 0 > 20 && (
                        <div className="text-center">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-base-200/50 rounded-full">
                            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                            <span className="text-xs text-base-content/60">
                              已优化加载 {invoices?.length || 0} / {totalCount} 张发票
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* 视图切换提示 */}
                      {canSwitchToTableView && (
                        <div className="text-center">
                          <button
                            className="btn btn-outline btn-xs gap-2"
                            onClick={() => handleViewModeChange(ViewMode.TABLE)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18m-9 8h9m-9 4h9m-9-8H3m0 4h6" />
                            </svg>
                            切换到表格视图
                          </button>
                        </div>
                      )}
                      
                      {/* 无限滚动提示 */}
                      {invoices?.length || 0 < totalCount && (
                        <div className="text-center py-4">
                          <div className="text-xs text-base-content/50">
                            下拉或翻页加载更多发票
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 空状态 */}
              {!loading && !dynamicColumnsLoading && !error && !dynamicColumnsError && stateLoaded && invoices?.length || 0 === 0 && (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <h3 className="text-xl font-bold mb-2">暂无发票数据</h3>
                  <p className="text-base-content/60">
                    暂无发票数据，等待实时数据更新...
                  </p>
                </div>
              )}

              {/* TanStack Table 分页 */}
              {!loading && !dynamicColumnsLoading && !error && !dynamicColumnsError && stateLoaded && totalCount > 0 && (
                <div className="p-4 border-t border-base-300">
                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-base-content/60">
                        显示第 {pagination.pageIndex * pagination.pageSize + 1} - {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)} 条，共 {totalCount} 条
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

      {/* 批量操作栏 - 移动端固定底部，桌面端浮动 */}
      <BulkActionBar
        selectedCount={selectedInvoiceIds.length}
        totalCount={invoices?.length || 0}
        onClearSelection={() => setRowSelection({})}
        onDelete={handleBatchDelete}
        onExport={handleBatchExport}
        onMarkStatus={async (status) => {
          // 批量更新状态
          for (const id of selectedInvoiceIds) {
            await handleStatusChange(id, status);
          }
          setRowSelection({});
        }}
        isVisible={selectedInvoiceIds.length > 0}
      />

      {/* 移除高级搜索模态框 */}
      {/* <AdvancedSearchModal ... /> */}

      {/* 发票详情/编辑模态框 */}
      <InvoiceModal
        invoiceId={selectedInvoiceId}
        isOpen={isViewModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        mode={modalMode}
        onModeChange={setModalMode}
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

      {/* 高级搜索模态框 - 桌面端 */}
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
      
      {/* 移动端搜索模态框 */}
      <MobileSearchModal
        isOpen={isMobileSearchOpen}
        onClose={() => setIsMobileSearchOpen(false)}
        onSearch={(filters) => {
          setSearchFilters(filters)
          setIsMobileSearchOpen(false)
        }}
        initialFilters={searchFilters}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />

      {/* 移动端批量操作面板 - 增强版 */}
      <div className={`mobile-batch-panel ${
        device.isMobile && selectedInvoiceIds.length > 0 ? 'visible' : 'hidden'
      }`}>
        <MobileBatchActions
          selectedCount={selectedInvoiceIds.length}
          onBatchExport={handleBatchExport}
          onBatchDelete={handleBatchDelete}
          onClearSelection={() => {
            setRowSelection({})
            setSelectedInvoices([])
          }}
          isExporting={isExporting}
          isVisible={device.isMobile && selectedInvoiceIds.length > 0}
        />
      </div>
        </div>
        
        {/* 性能监控指示器 (仅开发环境) */}
        {process.env.NODE_ENV === 'development' && device.isMobile && (
          <div className="performance-indicator">
            {invoices?.length || 0}项 | {viewMode} | {device.deviceType}
          </div>
        )}
      </div>
    </CompactLayout>
  )
}

// 使用具名导出以保持一致性
export { InvoiceManagePage as default }