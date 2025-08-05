/**
 * 高级搜索模态框组件
 * 支持多条件筛选发票
 */
import React, { useState, useEffect } from 'react'

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

interface AdvancedSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (filters: SearchFilters) => void
  currentFilters: SearchFilters
}

export function AdvancedSearchModal({
  isOpen,
  onClose,
  onSearch,
  currentFilters
}: AdvancedSearchModalProps) {
  const [filters, setFilters] = useState<SearchFilters>(currentFilters || {})

  // 同步外部筛选条件
  useEffect(() => {
    setFilters(currentFilters || {})
  }, [currentFilters])

  // 状态选项
  const statusOptions = [
    { value: 'unreimbursed', label: '未报销' },
    { value: 'reimbursed', label: '已报销' }
  ]

  // 来源选项
  const sourceOptions = [
    { value: 'email', label: '邮箱导入' },
    { value: 'upload', label: '手动上传' },
    { value: 'api', label: 'API导入' }
  ]

  // 发票类型选项
  const invoiceTypeOptions = [
    { value: 'VAT_SPECIAL', label: '增值税专用发票' },
    { value: 'VAT_ORDINARY', label: '增值税普通发票' },
    { value: 'VAT_ELECTRONIC_SPECIAL', label: '增值税电子专用发票' },
    { value: 'VAT_ELECTRONIC_ORDINARY', label: '增值税电子普通发票' }
  ]

  // 更新筛选条件
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 处理复选框数组
  const handleCheckboxArray = (key: 'status' | 'source', value: string, checked: boolean) => {
    const currentArray = filters[key] || []
    const newArray = checked
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value)
    
    updateFilter(key, newArray.length > 0 ? newArray : undefined)
  }

  // 提交搜索
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(filters)
    onClose()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({})
  }

  // 清空单个筛选
  const clearFilter = (key: keyof SearchFilters) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    setFilters(newFilters)
  }

  return (
    <>
      {/* 遮罩层 - 可点击关闭，几乎透明 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-transparent transition-opacity duration-300 ease-in-out z-30"
          onClick={onClose}
        />
      )}
      
      {/* 右侧抽屉 */}
      <div className={`fixed top-0 right-0 h-full w-96 bg-base-100 shadow-2xl transform transition-transform duration-300 ease-in-out z-40 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* 头部 */}
          <div className="flex justify-between items-center p-6 border-b border-base-300">
            <h3 className="font-bold text-xl">🔍 高级搜索</h3>
            <button
              className="btn btn-sm btn-circle btn-ghost"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {/* 表单内容区域 - 可滚动 */}
          <div className="flex-1 overflow-y-auto p-6">
            <form id="advanced-search-form" onSubmit={handleSubmit} className="space-y-6">
              {/* 基础信息筛选 */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg border-b pb-2">📄 基础信息</h4>
              
              {/* 发票号码 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">发票号码</span>
                  {filters.invoice_number && (
                    <button
                      type="button"
                      className="label-text-alt link"
                      onClick={() => clearFilter('invoice_number')}
                    >
                      清除
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="输入发票号码..."
                  className="input input-bordered"
                  value={filters.invoice_number || ''}
                  onChange={(e) => updateFilter('invoice_number', e.target.value || undefined)}
                />
              </div>

              {/* 销售方 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">销售方</span>
                  {filters.seller_name && (
                    <button
                      type="button"
                      className="label-text-alt link"
                      onClick={() => clearFilter('seller_name')}
                    >
                      清除
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="输入销售方名称..."
                  className="input input-bordered"
                  value={filters.seller_name || ''}
                  onChange={(e) => updateFilter('seller_name', e.target.value || undefined)}
                />
              </div>

              {/* 购买方 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">购买方</span>
                  {filters.buyer_name && (
                    <button
                      type="button"
                      className="label-text-alt link"
                      onClick={() => clearFilter('buyer_name')}
                    >
                      清除
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="输入购买方名称..."
                  className="input input-bordered"
                  value={filters.buyer_name || ''}
                  onChange={(e) => updateFilter('buyer_name', e.target.value || undefined)}
                />
              </div>

              {/* 发票类型 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">发票类型</span>
                  {filters.invoice_type && (
                    <button
                      type="button"
                      className="label-text-alt link"
                      onClick={() => clearFilter('invoice_type')}
                    >
                      清除
                    </button>
                  )}
                </label>
                <select
                  className="select select-bordered"
                  value={filters.invoice_type || ''}
                  onChange={(e) => updateFilter('invoice_type', e.target.value || undefined)}
                >
                  <option value="">全部类型</option>
                  {invoiceTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              </div>

              {/* 范围和状态筛选 */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg border-b pb-2">📊 范围筛选</h4>
              
              {/* 日期范围 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">消费日期</span>
                  {(filters.date_from || filters.date_to) && (
                    <button
                      type="button"
                      className="label-text-alt link"
                      onClick={() => {
                        clearFilter('date_from')
                        clearFilter('date_to')
                      }}
                    >
                      清除
                    </button>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="input input-bordered input-sm"
                    placeholder="开始日期"
                    value={filters.date_from || ''}
                    onChange={(e) => updateFilter('date_from', e.target.value || undefined)}
                  />
                  <input
                    type="date"
                    className="input input-bordered input-sm"
                    placeholder="结束日期"
                    value={filters.date_to || ''}
                    onChange={(e) => updateFilter('date_to', e.target.value || undefined)}
                  />
                </div>
              </div>

              {/* 金额范围 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">金额范围 (¥)</span>
                  {(filters.amount_min !== undefined || filters.amount_max !== undefined) && (
                    <button
                      type="button"
                      className="label-text-alt link"
                      onClick={() => {
                        clearFilter('amount_min')
                        clearFilter('amount_max')
                      }}
                    >
                      清除
                    </button>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    className="input input-bordered input-sm"
                    placeholder="最小金额"
                    value={filters.amount_min || ''}
                    onChange={(e) => updateFilter('amount_min', e.target.value ? Number(e.target.value) : undefined)}
                  />
                  <input
                    type="number"
                    className="input input-bordered input-sm"
                    placeholder="最大金额"
                    value={filters.amount_max || ''}
                    onChange={(e) => updateFilter('amount_max', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>

              {/* 状态筛选 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">状态</span>
                  {filters.status && filters.status.length > 0 && (
                    <button
                      type="button"
                      className="label-text-alt link"
                      onClick={() => clearFilter('status')}
                    >
                      清除
                    </button>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map(option => (
                    <label key={option.value} className="label cursor-pointer justify-start gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={filters.status?.includes(option.value) || false}
                        onChange={(e) => handleCheckboxArray('status', option.value, e.target.checked)}
                      />
                      <span className="label-text text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 来源筛选 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">来源</span>
                  {filters.source && filters.source.length > 0 && (
                    <button
                      type="button"
                      className="label-text-alt link"
                      onClick={() => clearFilter('source')}
                    >
                      清除
                    </button>
                  )}
                </label>
                <div className="space-y-1">
                  {sourceOptions.map(option => (
                    <label key={option.value} className="label cursor-pointer justify-start gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={filters.source?.includes(option.value) || false}
                        onChange={(e) => handleCheckboxArray('source', option.value, e.target.checked)}
                      />
                      <span className="label-text text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              </div>

              {/* 当前筛选条件预览 */}
              {Object.keys(filters).length > 0 && (
                <div className="mt-6 p-4 bg-base-200 rounded-lg">
                  <h5 className="font-medium mb-2">当前筛选条件：</h5>
                  <div className="flex flex-wrap gap-2">
                {Object.entries(filters).map(([key, value]) => {
                  if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
                    return null
                  }
                  
                  let displayValue: string
                  if (Array.isArray(value)) {
                    displayValue = value.join(', ')
                  } else {
                    displayValue = String(value)
                  }
                  
                  const keyLabels: Record<string, string> = {
                    invoice_number: '发票号',
                    seller_name: '销售方',
                    buyer_name: '购买方',
                    date_from: '开始日期',
                    date_to: '结束日期',
                    amount_min: '最小金额',
                    amount_max: '最大金额',
                    status: '状态',
                    source: '来源',
                    invoice_type: '类型'
                  }
                  
                  return (
                    <span key={key} className="badge badge-primary gap-1">
                      {keyLabels[key]}: {displayValue}
                      <button
                        type="button"
                        className="btn btn-xs btn-circle btn-ghost"
                        onClick={() => clearFilter(key as keyof SearchFilters)}
                      >
                        ✕
                      </button>
                    </span>
                  )
                  })}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* 底部操作按钮 */}
          <div className="border-t border-base-300 p-6">
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost flex-1"
                onClick={handleReset}
              >
                🔄 重置
              </button>
              <button
                type="button"
                className="btn btn-outline flex-1"
                onClick={onClose}
              >
                取消
              </button>
              <button
                type="submit"
                form="advanced-search-form"
                className="btn btn-primary flex-1"
              >
                🔍 搜索
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AdvancedSearchModal