import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, FileText, Download, Eye } from 'lucide-react'

import { InvoiceSupabaseService } from '../services/supabase/invoice.service'
import CategorySelector from './CategorySelector'
import CategoryBadge, { CategoryStatsCard } from './CategoryBadge'
import { getCategoryDisplayName, generateCategoryStats } from '../utils/categoryUtils'
import type { Invoice } from '../types'

interface InvoiceListWithCategoriesProps {
  className?: string
}

export const InvoiceListWithCategories: React.FC<InvoiceListWithCategoriesProps> = ({
  className = ''
}) => {
  const [selectedPrimary, setSelectedPrimary] = useState<string>()
  const [selectedSecondary, setSelectedSecondary] = useState<string>()
  const [searchQuery, setSearchQuery] = useState('')
  const [showStats, setShowStats] = useState(true)

  const invoiceService = useMemo(() => new InvoiceSupabaseService(), [])

  // 获取发票列表
  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ['invoices-with-categories', selectedPrimary, selectedSecondary, searchQuery],
    queryFn: async () => {
      if (selectedPrimary || selectedSecondary) {
        return await invoiceService.getInvoicesByCategory(
          selectedPrimary,
          selectedSecondary,
          100,
          0
        )
      } else {
        const result = await invoiceService.findAll({
          query: searchQuery || undefined
        }, { limit: 100 })
        return result.data
      }
    },
    refetchInterval: 30000
  })

  // 获取分类统计
  const categoryStats = useMemo(() => {
    if (!invoices.length) return []
    return generateCategoryStats(invoices)
  }, [invoices])

  // 筛选发票
  const filteredInvoices = useMemo(() => {
    if (!searchQuery) return invoices
    
    return invoices.filter(invoice => 
      invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.seller_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCategoryDisplayName(invoice).toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [invoices, searchQuery])

  const handleCategoryChange = (primary?: string, secondary?: string) => {
    setSelectedPrimary(primary)
    setSelectedSecondary(secondary)
  }

  const handleViewInvoice = (invoice: Invoice) => {
    console.log('查看发票:', invoice.id)
    // 这里可以导航到发票详情页面
  }

  const handleDownloadInvoice = (invoice: Invoice) => {
    console.log('下载发票:', invoice.id)
    // 这里可以触发发票下载
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 页面标题和操作栏 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">发票管理</h1>
          <p className="text-base-content/60">
            共 {filteredInvoices.length} 张发票
            {(selectedPrimary || selectedSecondary) && (
              <span className="ml-2">
                · 筛选：{selectedSecondary || selectedPrimary}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className={`btn btn-outline btn-sm ${showStats ? 'btn-active' : ''}`}
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? '隐藏' : '显示'}统计
          </button>
          <button className="btn btn-primary btn-sm">
            <FileText className="w-4 h-4" />
            上传发票
          </button>
        </div>
      </div>

      {/* 筛选器和搜索 */}
      <div className="flex flex-col lg:flex-row gap-4">
        <CategorySelector
          selectedPrimary={selectedPrimary}
          selectedSecondary={selectedSecondary}
          onSelectionChange={handleCategoryChange}
          className="lg:flex-shrink-0"
        />
        
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
          <input
            type="text"
            placeholder="搜索发票号、销售方名称..."
            className="input input-bordered w-full pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 分类统计卡片 */}
      {showStats && categoryStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categoryStats.slice(0, 8).map((stat, index) => (
            <CategoryStatsCard
              key={stat.category}
              categoryName={stat.category}
              count={stat.count}
              totalAmount={stat.totalAmount}
              averageAmount={stat.averageAmount}
              icon="📊"
              color={`hsl(${(index * 60) % 360}, 70%, 50%)`}
              onClick={() => {
                // 点击统计卡片时筛选该分类
                const categories = invoiceService.getAvailableCategories()
                if (categories.primary.includes(stat.category)) {
                  handleCategoryChange(stat.category, undefined)
                } else {
                  // 如果是子分类，找到对应的父分类
                  for (const [primary, secondaries] of Object.entries(categories.secondary)) {
                    if (secondaries.includes(stat.category)) {
                      handleCategoryChange(primary, stat.category)
                      break
                    }
                  }
                }
              }}
              className="hover:shadow-md transition-shadow"
            />
          ))}
        </div>
      )}

      {/* 发票列表 */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无发票</h3>
              <p className="text-base-content/60">
                {searchQuery || selectedPrimary || selectedSecondary 
                  ? '没有找到符合条件的发票' 
                  : '还没有上传任何发票'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>发票信息</th>
                    <th>分类</th>
                    <th>金额</th>
                    <th>日期</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover">
                      <td>
                        <div>
                          <div className="font-medium">{invoice.invoice_number}</div>
                          <div className="text-sm text-base-content/60">
                            {invoice.seller_name || '未知销售方'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <CategoryBadge 
                          invoice={invoice} 
                          size="sm" 
                          showIcon={true}
                          showTooltip={true}
                        />
                      </td>
                      <td>
                        <div className="font-medium">
                          ¥{(invoice.total_amount || 0).toLocaleString()}
                        </div>
                        {invoice.consumption_date && (
                          <div className="text-xs text-base-content/60">
                            消费：{invoice.consumption_date}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="text-sm">
                          {invoice.invoice_date}
                        </div>
                      </td>
                      <td>
                        <div className={`badge badge-sm ${
                          invoice.is_verified ? 'badge-success' : 'badge-warning'
                        }`}>
                          {invoice.is_verified ? '已验证' : '待验证'}
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => handleDownloadInvoice(invoice)}
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InvoiceListWithCategories