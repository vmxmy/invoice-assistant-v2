/**
 * 邮件过滤器组件
 * 提供邮件搜索和过滤功能
 */

import React, { useState, useEffect } from 'react'
import type { EmailFilters as EmailFiltersType } from '../../types/inbox.types'

interface EmailFiltersProps {
  filters: EmailFiltersType
  onFiltersChange: (filters: Partial<EmailFiltersType>) => void
  onClearFilters: () => void
}

export function EmailFilters({ filters, onFiltersChange, onClearFilters }: EmailFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search || '')
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // 防抖搜索
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    const timeout = setTimeout(() => {
      onFiltersChange({ search: localSearch || undefined })
    }, 500)

    setSearchTimeout(timeout)

    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [localSearch])

  // 同步外部搜索状态
  useEffect(() => {
    setLocalSearch(filters.search || '')
  }, [filters.search])

  const handleCategoryChange = (category: string) => {
    onFiltersChange({ category: category || undefined })
  }

  const handleStatusChange = (status: string) => {
    onFiltersChange({ status: status || undefined })
  }

  const handleDateFromChange = (dateFrom: string) => {
    onFiltersChange({ dateFrom: dateFrom || undefined })
  }

  const handleDateToChange = (dateTo: string) => {
    onFiltersChange({ dateTo: dateTo || undefined })
  }

  const hasActiveFilters = filters.category || filters.status || filters.search || filters.dateFrom || filters.dateTo

  return (
    <div className="bg-base-100 rounded-lg border border-base-300 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-base-content">筛选条件</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="btn btn-ghost btn-sm text-base-content/70 hover:text-base-content"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            清空筛选
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 搜索框 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-sm font-medium">搜索</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="搜索邮件主题、发件人..."
              className="input input-bordered w-full pr-10"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-4 h-4 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 邮件类别 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-sm font-medium">邮件类别</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={filters.category || ''}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="">全部类别</option>
            <option value="verification">验证邮件</option>
            <option value="invoice">发票邮件</option>
            <option value="other">其他</option>
            <option value="unknown">未知</option>
          </select>
        </div>

        {/* 处理状态 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-sm font-medium">处理状态</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={filters.status || ''}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">全部状态</option>
            <option value="success">成功</option>
            <option value="partial_success">部分成功</option>
            <option value="failed">失败</option>
            <option value="not_processed">未处理</option>
            <option value="classification_only">仅分类</option>
          </select>
        </div>

        {/* 开始日期 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-sm font-medium">开始日期</span>
          </label>
          <input
            type="date"
            className="input input-bordered w-full"
            value={filters.dateFrom || ''}
            onChange={(e) => handleDateFromChange(e.target.value)}
          />
        </div>

        {/* 结束日期 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-sm font-medium">结束日期</span>
          </label>
          <input
            type="date"
            className="input input-bordered w-full"
            value={filters.dateTo || ''}
            onChange={(e) => handleDateToChange(e.target.value)}
          />
        </div>
      </div>

      {/* 快速筛选标签 */}
      <div className="mt-4 pt-4 border-t border-base-300">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-base-content/70">快速筛选:</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* 今日邮件 */}
          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0]
              onFiltersChange({ dateFrom: today, dateTo: today })
            }}
            className="btn btn-outline btn-sm"
          >
            今日邮件
          </button>

          {/* 本周邮件 */}
          <button
            onClick={() => {
              const today = new Date()
              const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
              const weekEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - today.getDay()))
              onFiltersChange({ 
                dateFrom: weekStart.toISOString().split('T')[0],
                dateTo: weekEnd.toISOString().split('T')[0]
              })
            }}
            className="btn btn-outline btn-sm"
          >
            本周邮件
          </button>

          {/* 成功处理 */}
          <button
            onClick={() => onFiltersChange({ status: 'success' })}
            className={`btn btn-sm ${filters.status === 'success' ? 'btn-success' : 'btn-outline'}`}
          >
            成功处理
          </button>

          {/* 处理失败 */}
          <button
            onClick={() => onFiltersChange({ status: 'failed' })}
            className={`btn btn-sm ${filters.status === 'failed' ? 'btn-error' : 'btn-outline'}`}
          >
            处理失败
          </button>

          {/* 验证邮件 */}
          <button
            onClick={() => onFiltersChange({ category: 'verification' })}
            className={`btn btn-sm ${filters.category === 'verification' ? 'btn-info' : 'btn-outline'}`}
          >
            🔐 验证邮件
          </button>

          {/* 发票邮件 */}
          <button
            onClick={() => onFiltersChange({ category: 'invoice' })}
            className={`btn btn-sm ${filters.category === 'invoice' ? 'btn-success' : 'btn-outline'}`}
          >
            📄 发票邮件
          </button>
        </div>
      </div>

      {/* 活跃筛选条件显示 */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-base-300">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-base-content/70">当前筛选条件:</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <div className="badge badge-primary gap-2">
                <span>搜索: {filters.search}</span>
                <button
                  onClick={() => {
                    setLocalSearch('')
                    onFiltersChange({ search: undefined })
                  }}
                  className="text-white/80 hover:text-white"
                >
                  ×
                </button>
              </div>
            )}

            {filters.category && (
              <div className="badge badge-secondary gap-2">
                <span>类别: {
                  filters.category === 'verification' ? '验证邮件' :
                  filters.category === 'invoice' ? '发票邮件' :
                  filters.category === 'other' ? '其他' :
                  filters.category === 'unknown' ? '未知' : filters.category
                }</span>
                <button
                  onClick={() => onFiltersChange({ category: undefined })}
                  className="text-white/80 hover:text-white"
                >
                  ×
                </button>
              </div>
            )}

            {filters.status && (
              <div className="badge badge-accent gap-2">
                <span>状态: {
                  filters.status === 'success' ? '成功' :
                  filters.status === 'partial_success' ? '部分成功' :
                  filters.status === 'failed' ? '失败' :
                  filters.status === 'not_processed' ? '未处理' :
                  filters.status === 'classification_only' ? '仅分类' : filters.status
                }</span>
                <button
                  onClick={() => onFiltersChange({ status: undefined })}
                  className="text-white/80 hover:text-white"
                >
                  ×
                </button>
              </div>
            )}

            {(filters.dateFrom || filters.dateTo) && (
              <div className="badge badge-info gap-2">
                <span>
                  日期: {filters.dateFrom || '开始'} ~ {filters.dateTo || '结束'}
                </span>
                <button
                  onClick={() => onFiltersChange({ dateFrom: undefined, dateTo: undefined })}
                  className="text-white/80 hover:text-white"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}