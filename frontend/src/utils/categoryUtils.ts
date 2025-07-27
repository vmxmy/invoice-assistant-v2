/**
 * 分类工具函数
 * 用于处理发票分类相关的操作和显示
 */

import type { Invoice, CategoryInfo } from '../types'

// 分类图标映射
export const categoryIcons: Record<string, string> = {
  // 一级分类图标
  '交通': '🚗',
  '住宿': '🏨',
  '餐饮': '🍽️',
  '办公': '💼',
  '其他': '📁',
  
  // 二级分类图标
  '高铁': '🚄',
  '飞机': '✈️',
  '出租车': '🚕',
  '酒店': '🏨',
  '民宿': '🏠',
  '咨询': '💭',
  '印章': '🔖',
  
  // 特殊分类（数据库中的分类值）
  '餐饮服务': '🍽️',
  '住宿服务': '🏨'
}

// 分类颜色映射
export const categoryColors: Record<string, string> = {
  // 一级分类颜色
  '交通': '#8b5cf6',
  '住宿': '#10b981',
  '餐饮': '#f59e0b',
  '办公': '#3b82f6',
  '其他': '#6b7280',
  
  // 二级分类颜色（继承一级分类）
  '高铁': '#8b5cf6',
  '飞机': '#8b5cf6',
  '出租车': '#8b5cf6',
  '酒店': '#10b981',
  '民宿': '#10b981',
  '咨询': '#3b82f6',
  '印章': '#3b82f6'
}

/**
 * 获取分类显示名称
 */
export function getCategoryDisplayName(invoice: Invoice): string {
  if (invoice.category_full_path) {
    return invoice.category_full_path
  }
  
  if (invoice.secondary_category_name && invoice.primary_category_name) {
    return `${invoice.primary_category_name} > ${invoice.secondary_category_name}`
  }
  
  if (invoice.primary_category_name) {
    return invoice.primary_category_name
  }
  
  if (invoice.expense_category) {
    return invoice.expense_category
  }
  
  return '未分类'
}

/**
 * 获取分类图标
 */
export function getCategoryIcon(invoice: Invoice): string {
  // 首先尝试从 category_info 获取
  if (invoice.category_info?.current?.icon) {
    return invoice.category_info.current.icon
  }
  
  // 尝试从 expense_category 获取
  if (invoice.expense_category) {
    return categoryIcons[invoice.expense_category] || '📄'
  }
  
  // 然后尝试二级分类
  if (invoice.secondary_category_name) {
    return categoryIcons[invoice.secondary_category_name] || '📄'
  }
  
  // 最后尝试一级分类
  if (invoice.primary_category_name) {
    return categoryIcons[invoice.primary_category_name] || '📄'
  }
  
  // 默认图标
  return '📄'
}

/**
 * 获取分类颜色
 */
export function getCategoryColor(invoice: Invoice): string {
  // 首先尝试从 category_info 获取
  if (invoice.category_info?.current?.color) {
    return invoice.category_info.current.color
  }
  
  // 然后尝试二级分类
  if (invoice.secondary_category_name) {
    return categoryColors[invoice.secondary_category_name] || '#6b7280'
  }
  
  // 最后尝试一级分类
  if (invoice.primary_category_name) {
    return categoryColors[invoice.primary_category_name] || '#6b7280'
  }
  
  // 默认颜色
  return '#6b7280'
}

/**
 * 获取分类徽章样式
 */
export function getCategoryBadgeClass(invoice: Invoice): string {
  const color = getCategoryColor(invoice)
  
  // 根据颜色返回对应的CSS类
  const colorMap: Record<string, string> = {
    '#8b5cf6': 'badge-primary',
    '#10b981': 'badge-success', 
    '#f59e0b': 'badge-warning',
    '#3b82f6': 'badge-info',
    '#6b7280': 'badge-ghost'
  }
  
  return colorMap[color] || 'badge-ghost'
}

/**
 * 检查发票是否属于某个一级分类
 */
export function isInPrimaryCategory(invoice: Invoice, primaryCategory: string): boolean {
  return invoice.primary_category_name === primaryCategory
}

/**
 * 检查发票是否属于某个二级分类
 */
export function isInSecondaryCategory(invoice: Invoice, secondaryCategory: string): boolean {
  return invoice.secondary_category_name === secondaryCategory ||
         invoice.expense_category === secondaryCategory
}

/**
 * 获取所有可用的分类选项
 */
export function getAvailableCategories() {
  return {
    primary: ['交通', '住宿', '餐饮', '办公', '其他'],
    secondary: {
      '交通': ['高铁', '飞机', '出租车'],
      '住宿': ['酒店', '民宿'],
      '餐饮': [],
      '办公': ['咨询', '印章'],
      '其他': []
    }
  }
}

/**
 * 格式化分类信息用于显示
 */
export function formatCategoryInfo(invoice: Invoice): CategoryInfo {
  return {
    primary_category_name: invoice.primary_category_name,
    secondary_category_name: invoice.secondary_category_name,
    category_full_path: invoice.category_full_path,
    category_level: invoice.category_level,
    category_icon: getCategoryIcon(invoice),
    category_color: getCategoryColor(invoice),
    parent_category_name: invoice.parent_category_name
  }
}

/**
 * 生成分类统计数据
 */
export function generateCategoryStats(invoices: Invoice[]) {
  const stats: Record<string, {
    count: number
    totalAmount: number
    primaryCategory: string
    secondaryCategory?: string
  }> = {}
  
  invoices.forEach(invoice => {
    const categoryKey = invoice.expense_category || invoice.primary_category_name || '未分类'
    
    if (!stats[categoryKey]) {
      stats[categoryKey] = {
        count: 0,
        totalAmount: 0,
        primaryCategory: invoice.primary_category_name || '未分类',
        secondaryCategory: invoice.secondary_category_name
      }
    }
    
    stats[categoryKey].count++
    stats[categoryKey].totalAmount += invoice.total_amount || 0
  })
  
  return Object.entries(stats).map(([category, data]) => ({
    category,
    ...data,
    averageAmount: data.totalAmount / data.count
  }))
}