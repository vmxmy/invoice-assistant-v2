/**
 * 详细数据表格
 * 展示统计数据的详细信息，支持排序和筛选
 */
import React, { useState, useMemo } from 'react'
import type { DetailedDataItem } from '../../hooks/useStatisticsData'
import type { StatisticsFilters } from '../../pages/StatisticsPage'

interface DetailedDataTableProps {
  data?: DetailedDataItem[]
  loading?: boolean
  filters: StatisticsFilters
}

type SortField = keyof DetailedDataItem
type SortDirection = 'asc' | 'desc'

/**
 * 详细数据表格组件
 */
export const DetailedDataTable: React.FC<DetailedDataTableProps> = ({
  data = [],
  loading = false,
  filters
}) => {
  const [sortField, setSortField] = useState<SortField>('month_str')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // 排序数据
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return []

    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' 
          ? aValue - bValue
          : bValue - aValue
      }

      return 0
    })

    return sorted
  }, [data, sortField, sortDirection])

  // 分页数据
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, currentPage, itemsPerPage])

  // 总页数
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)

  // 处理排序
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setCurrentPage(1) // 重置到第一页
  }

  // 排序图标
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    )
  }

  // 格式化数值
  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString()}`
  }

  const formatMonth = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-')
      return `${year}年${parseInt(month)}月`
    } catch {
      return monthStr
    }
  }

  const formatGrowthRate = (rate: number) => {
    if (rate === 0) return '0.0%'
    const prefix = rate > 0 ? '+' : ''
    return `${prefix}${rate.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-3">
              <div className="loading loading-spinner loading-sm"></div>
              <span className="text-base-content/60">加载详细数据...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        {/* 表格标题和控制 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold">详细数据明细</h3>
            <p className="text-sm text-base-content/60 mt-1">
              共 {sortedData.length} 条记录
            </p>
          </div>

          {/* 分页大小选择 */}
          <div className="flex items-center gap-2">
            <span className="text-sm">每页:</span>
            <select
              className="select select-bordered select-sm"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value))
                setCurrentPage(1)
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {paginatedData.length > 0 ? (
          <>
            {/* 响应式表格 */}
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>
                      <button
                        className="flex items-center gap-2 font-medium hover:text-primary"
                        onClick={() => handleSort('month_str')}
                      >
                        月份
                        {getSortIcon('month_str')}
                      </button>
                    </th>
                    <th>
                      <button
                        className="flex items-center gap-2 font-medium hover:text-primary"
                        onClick={() => handleSort('category_name')}
                      >
                        分类
                        {getSortIcon('category_name')}
                      </button>
                    </th>
                    <th>
                      <button
                        className="flex items-center gap-2 font-medium hover:text-primary"
                        onClick={() => handleSort('invoice_count')}
                      >
                        数量
                        {getSortIcon('invoice_count')}
                      </button>
                    </th>
                    <th>
                      <button
                        className="flex items-center gap-2 font-medium hover:text-primary"
                        onClick={() => handleSort('total_amount')}
                      >
                        总金额
                        {getSortIcon('total_amount')}
                      </button>
                    </th>
                    <th>
                      <button
                        className="flex items-center gap-2 font-medium hover:text-primary"
                        onClick={() => handleSort('avg_amount')}
                      >
                        平均金额
                        {getSortIcon('avg_amount')}
                      </button>
                    </th>
                    <th>
                      <button
                        className="flex items-center gap-2 font-medium hover:text-primary"
                        onClick={() => handleSort('growth_rate')}
                      >
                        增长率
                        {getSortIcon('growth_rate')}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, index) => (
                    <tr key={`${item.month_str}-${item.category_name}-${index}`}>
                      <td className="font-medium">
                        {formatMonth(item.month_str)}
                      </td>
                      <td>
                        <span className="badge badge-outline">
                          {item.category_name}
                        </span>
                      </td>
                      <td className="text-right">
                        {item.invoice_count} 张
                      </td>
                      <td className="text-right font-medium">
                        {formatCurrency(item.total_amount)}
                      </td>
                      <td className="text-right">
                        {formatCurrency(item.avg_amount)}
                      </td>
                      <td className="text-right">
                        <span className={`${
                          item.growth_rate >= 0 ? 'text-success' : 'text-error'
                        }`}>
                          {formatGrowthRate(item.growth_rate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页控件 */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                <div className="text-sm text-base-content/60">
                  显示 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedData.length)} 条，
                  共 {sortedData.length} 条记录
                </div>
                
                <div className="join">
                  <button
                    className="join-item btn btn-sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    «
                  </button>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        className={`join-item btn btn-sm ${
                          currentPage === pageNum ? 'btn-active' : ''
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  
                  <button
                    className="join-item btn btn-sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-base-content/40 text-4xl mb-4">📋</div>
            <p className="text-base-content/60">暂无详细数据</p>
            <p className="text-sm text-base-content/40 mt-1">
              请调整筛选条件或添加更多发票数据
            </p>
          </div>
        )}

        {/* 数据导出提示 */}
        {sortedData.length > 0 && (
          <div className="mt-4 p-3 bg-base-200 rounded-lg">
            <p className="text-sm text-base-content/70">
              <strong>提示:</strong> 可以点击表头进行排序，调整每页显示数量。
              如需导出完整数据，请前往发票管理页面使用导出功能。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DetailedDataTable