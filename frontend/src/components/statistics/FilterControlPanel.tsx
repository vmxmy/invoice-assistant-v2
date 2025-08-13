/**
 * 筛选器控制面板
 * 提供时间范围、分类、状态等筛选选项
 */
import React, { useState } from 'react'
import type { StatisticsFilters } from '../../pages/StatisticsPage'

interface FilterControlPanelProps {
  filters: StatisticsFilters
  onFiltersChange: (filters: StatisticsFilters) => void
  onReset: () => void
  loading?: boolean
}

/**
 * 筛选器控制面板组件
 */
export const FilterControlPanel: React.FC<FilterControlPanelProps> = ({
  filters,
  onFiltersChange,
  onReset,
  loading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // 处理时间范围预设选择
  const handleDatePresetChange = (preset: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        preset: preset as any,
        startDate: undefined,
        endDate: undefined
      }
    })
  }

  // 处理自定义日期范围
  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        preset: undefined,
        [field]: value
      }
    })
  }

  // 处理状态筛选
  const handleStatusChange = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status]
    
    onFiltersChange({
      ...filters,
      status: newStatus
    })
  }

  // 处理金额范围
  const handleAmountRangeChange = (field: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value)
    onFiltersChange({
      ...filters,
      amountRange: {
        ...filters.amountRange,
        [field]: numValue
      }
    })
  }

  // 获取当前筛选器应用数量
  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.categories.length > 0) count++
    if (filters.status.length > 0) count++
    if (filters.amountRange.min !== undefined || filters.amountRange.max !== undefined) count++
    if (filters.dateRange.startDate || filters.dateRange.endDate) count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-4">
        {/* 顶部控制栏 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">筛选条件</h3>
            {activeFiltersCount > 0 && (
              <div className="badge badge-primary badge-sm">
                {activeFiltersCount} 个条件
              </div>
            )}
            {loading && (
              <div className="loading loading-spinner loading-sm"></div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '收起' : '展开'}筛选
              <svg 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {activeFiltersCount > 0 && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onReset}
                disabled={loading}
              >
                重置
              </button>
            )}
          </div>
        </div>

        {/* 主要筛选器 - 始终显示 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* 时间范围预设 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">时间范围</span>
            </label>
            <select 
              className="select select-bordered w-full"
              value={filters.dateRange.preset || 'custom'}
              onChange={(e) => handleDatePresetChange(e.target.value)}
              disabled={loading}
            >
              <option value="last3months">最近3个月</option>
              <option value="last6months">最近6个月</option>
              <option value="lastyear">最近1年</option>
              <option value="all">全部时间</option>
              <option value="custom">自定义</option>
            </select>
          </div>

          {/* 快速状态筛选 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">报销状态</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <label className="label cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={filters.status.includes('unreimbursed')}
                  onChange={() => handleStatusChange('unreimbursed')}
                  disabled={loading}
                />
                <span className="label-text ml-2">待报销</span>
              </label>
              <label className="label cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={filters.status.includes('reimbursed')}
                  onChange={() => handleStatusChange('reimbursed')}
                  disabled={loading}
                />
                <span className="label-text ml-2">已报销</span>
              </label>
            </div>
          </div>

          {/* 数据刷新状态 */}
          <div className="form-control justify-end">
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <div className={`w-2 h-2 rounded-full ${loading ? 'bg-warning animate-pulse' : 'bg-success'}`}></div>
              <span>{loading ? '更新中...' : '数据已同步'}</span>
            </div>
          </div>
        </div>

        {/* 高级筛选器 - 可展开 */}
        {isExpanded && (
          <div className="border-t border-base-300 pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 自定义日期范围 */}
              {(!filters.dateRange.preset || filters.dateRange.preset === 'custom') && (
                <>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">开始日期</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered"
                      value={filters.dateRange.startDate || ''}
                      onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">结束日期</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered"
                      value={filters.dateRange.endDate || ''}
                      onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              {/* 金额范围 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">最小金额</span>
                </label>
                <input
                  type="number"
                  placeholder="0"
                  className="input input-bordered"
                  value={filters.amountRange.min || ''}
                  onChange={(e) => handleAmountRangeChange('min', e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">最大金额</span>
                </label>
                <input
                  type="number"
                  placeholder="不限"
                  className="input input-bordered"
                  value={filters.amountRange.max || ''}
                  onChange={(e) => handleAmountRangeChange('max', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* 筛选说明 */}
            <div className="mt-4 p-3 bg-base-200 rounded-lg">
              <p className="text-sm text-base-content/70">
                <strong>提示:</strong> 筛选条件会影响所有图表和统计数据的显示。
                数据会自动更新，无需手动刷新。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FilterControlPanel