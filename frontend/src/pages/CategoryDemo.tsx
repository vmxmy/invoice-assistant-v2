import React, { useState } from 'react'
import { ArrowLeft, Tag, BarChart3, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

import CategorySelector from '../components/CategorySelector'
import CategoryBadge, { CategoryStatsCard } from '../components/CategoryBadge'
import InvoiceListWithCategories from '../components/InvoiceListWithCategories'
import { getAvailableCategories, categoryIcons, categoryColors } from '../utils/categoryUtils'
import type { Invoice } from '../types'

const CategoryDemo: React.FC = () => {
  const [selectedPrimary, setSelectedPrimary] = useState<string>()
  const [selectedSecondary, setSelectedSecondary] = useState<string>()
  const [activeDemo, setActiveDemo] = useState<'selector' | 'badges' | 'list'>('selector')

  const categories = getAvailableCategories()

  // 模拟发票数据
  const mockInvoices: Invoice[] = [
    {
      id: '1',
      invoice_number: '12345678',
      invoice_date: '2025-01-20',
      consumption_date: '2025-01-20',
      seller_name: '中国铁路',
      total_amount: 450,
      expense_category: '高铁',
      primary_category_name: '交通',
      secondary_category_name: '高铁',
      category_full_path: '交通 > 高铁',
      status: 'completed',
      is_verified: true,
      created_at: '2025-01-20',
      updated_at: '2025-01-20'
    },
    {
      id: '2',
      invoice_number: '87654321',
      invoice_date: '2025-01-19',
      consumption_date: '2025-01-19',
      seller_name: '中国南方航空',
      total_amount: 1200,
      expense_category: '飞机',
      primary_category_name: '交通',
      secondary_category_name: '飞机',
      category_full_path: '交通 > 飞机',
      status: 'completed',
      is_verified: true,
      created_at: '2025-01-19',
      updated_at: '2025-01-19'
    },
    {
      id: '3',
      invoice_number: '11223344',
      invoice_date: '2025-01-18',
      consumption_date: '2025-01-18',
      seller_name: '如家酒店',
      total_amount: 300,
      expense_category: '酒店',
      primary_category_name: '住宿',
      secondary_category_name: '酒店',
      category_full_path: '住宿 > 酒店',
      status: 'completed',
      is_verified: false,
      created_at: '2025-01-18',
      updated_at: '2025-01-18'
    }
  ]

  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="btn btn-ghost btn-circle">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">费用分类系统演示</h1>
            <p className="text-base-content/60 mt-1">
              展示新的费用分类功能和组件
            </p>
          </div>
        </div>

        {/* 演示选项卡 */}
        <div className="tabs tabs-boxed bg-base-100 p-1">
          <button
            className={`tab ${activeDemo === 'selector' ? 'tab-active' : ''}`}
            onClick={() => setActiveDemo('selector')}
          >
            <Tag className="w-4 h-4 mr-2" />
            分类选择器
          </button>
          <button
            className={`tab ${activeDemo === 'badges' ? 'tab-active' : ''}`}
            onClick={() => setActiveDemo('badges')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            分类徽章和统计
          </button>
          <button
            className={`tab ${activeDemo === 'list' ? 'tab-active' : ''}`}
            onClick={() => setActiveDemo('list')}
          >
            <FileText className="w-4 h-4 mr-2" />
            发票列表
          </button>
        </div>

        {/* 分类选择器演示 */}
        {activeDemo === 'selector' && (
          <div className="space-y-6">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h2 className="card-title">分类选择器组件</h2>
                <p className="text-base-content/60 mb-4">
                  支持层级分类选择，包含一级分类和二级分类
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">
                      <span className="label-text">选择费用分类：</span>
                    </label>
                    <CategorySelector
                      selectedPrimary={selectedPrimary}
                      selectedSecondary={selectedSecondary}
                      onSelectionChange={(primary, secondary) => {
                        setSelectedPrimary(primary)
                        setSelectedSecondary(secondary)
                      }}
                      placeholder="请选择分类"
                      showAllOption={true}
                    />
                  </div>
                  
                  {(selectedPrimary || selectedSecondary) && (
                    <div className="alert alert-info">
                      <Tag className="w-5 h-5" />
                      <div>
                        <h3 className="font-bold">当前选择：</h3>
                        <div className="text-sm">
                          一级分类：{selectedPrimary || '无'}
                          <br />
                          二级分类：{selectedSecondary || '无'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 分类体系展示 */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h2 className="card-title">分类体系</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.primary.map(primary => (
                    <div key={primary} className="border border-base-300 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{categoryIcons[primary]}</span>
                        <h3 className="font-bold">{primary}</h3>
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: categoryColors[primary] }}
                        ></div>
                      </div>
                      
                      {categories.secondary[primary].length > 0 ? (
                        <div className="space-y-2">
                          {categories.secondary[primary].map(secondary => (
                            <div key={secondary} className="flex items-center gap-2 text-sm">
                              <span>{categoryIcons[secondary]}</span>
                              <span>{secondary}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-base-content/60">暂无子分类</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 分类徽章和统计演示 */}
        {activeDemo === 'badges' && (
          <div className="space-y-6">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h2 className="card-title">分类徽章样式</h2>
                <p className="text-base-content/60 mb-4">
                  不同尺寸和样式的分类徽章
                </p>
                
                <div className="space-y-4">
                  {mockInvoices.map(invoice => (
                    <div key={invoice.id} className="flex items-center gap-4 p-4 border border-base-300 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{invoice.seller_name}</h4>
                        <p className="text-sm text-base-content/60">{invoice.invoice_number}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <CategoryBadge invoice={invoice} size="xs" />
                        <CategoryBadge invoice={invoice} size="sm" />
                        <CategoryBadge invoice={invoice} size="md" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 统计卡片演示 */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h2 className="card-title">分类统计卡片</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <CategoryStatsCard
                    categoryName="交通"
                    count={15}
                    totalAmount={8500}
                    averageAmount={567}
                    icon="🚗"
                    color="#8b5cf6"
                  />
                  <CategoryStatsCard
                    categoryName="住宿"
                    count={8}
                    totalAmount={2400}
                    averageAmount={300}
                    icon="🏨"
                    color="#10b981"
                  />
                  <CategoryStatsCard
                    categoryName="餐饮"
                    count={22}
                    totalAmount={1200}
                    averageAmount={55}
                    icon="🍽️"
                    color="#f59e0b"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 发票列表演示 */}
        {activeDemo === 'list' && (
          <div className="space-y-6">
            <div className="alert alert-info">
              <FileText className="w-5 h-5" />
              <div>
                <h3 className="font-bold">发票列表集成演示</h3>
                <div className="text-sm">
                  展示如何在发票列表中集成分类筛选、搜索和统计功能
                </div>
              </div>
            </div>
            
            <InvoiceListWithCategories />
          </div>
        )}

        {/* 页脚信息 */}
        <div className="mt-8 text-center text-sm text-base-content/50 py-4 border-t border-base-300">
          <p>费用分类系统 · 支持层级分类、智能识别、统计分析</p>
        </div>
      </div>
    </div>
  )
}

export default CategoryDemo