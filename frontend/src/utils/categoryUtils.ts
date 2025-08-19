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
  
  // 交通类图标
  '高铁': '🚄',
  '飞机': '✈️',
  '出租车': '🚕',
  '火车票': '🚄',
  '机票': '✈️',
  '客运车票': '🚌',
  '地铁票': '🚇',
  
  // 住宿类图标
  '酒店': '🏨',
  '民宿': '🏠',
  '住宿服务': '🏨',
  '酒店发票': '🏨',
  
  // 餐饮类图标
  '餐饮服务': '🍽️',
  '食品': '🍕',
  '外卖': '🛵',
  
  // 办公类图标
  '咨询': '💭',
  '印章': '🔖',
  '办公用品': '📎',
  '服务费': '💼',
  
  // 医疗健康类图标
  '医疗': '🏥',
  '药品': '💊',
  '体检': '🩺',
  
  // 教育培训类图标
  '教育': '📚',
  '培训': '🎓',
  '学费': '📖',
  
  // 娱乐消费类图标
  '娱乐': '🎮',
  '购物': '🛍️',
  '电影': '🎬',
  
  // 通讯网络类图标
  '通讯': '📱',
  '网络': '🌐',
  '电话费': '☎️',
  
  // 其他类图标
  '未知类型': '❓',
  '杂费': '📋'
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
 * 获取分类徽章的 DaisyUI v5 标准样式
 */
export function getCategoryBadgeStyle(invoice: Invoice): { className: string; style?: React.CSSProperties } {
  if (invoice.expense_category || invoice.primary_category_name || invoice.secondary_category_name) {
    const categoryName = invoice.expense_category || invoice.primary_category_name || invoice.secondary_category_name
    
    // 使用 DaisyUI v5 标准主题样式类映射
    const categoryStyleMap: Record<string, string> = {
      // 交通类 - 使用 primary 和相关变体
      '交通': 'badge-primary',
      '高铁': 'badge-primary',
      '飞机': 'badge-primary',
      '出租车': 'badge-info',
      '火车票': 'badge-primary',
      '机票': 'badge-primary',
      '客运车票': 'badge-primary',
      '地铁票': 'badge-primary',
      
      // 住宿类 - 使用 success 系列
      '住宿': 'badge-success',
      '酒店': 'badge-success',
      '民宿': 'badge-success',
      '住宿服务': 'badge-success',
      '酒店发票': 'badge-success',
      
      // 餐饮类 - 使用 warning 系列
      '餐饮': 'badge-warning',
      '餐饮服务': 'badge-warning',
      '食品': 'badge-warning',
      '外卖': 'badge-error',
      
      // 办公类 - 使用 info 系列
      '办公': 'badge-info',
      '咨询': 'badge-info',
      '印章': 'badge-info',
      '办公用品': 'badge-info',
      '服务费': 'badge-info',
      
      // 医疗健康类 - 使用 error 系列
      '医疗': 'badge-error',
      '药品': 'badge-error',
      '体检': 'badge-error',
      
      // 教育培训类 - 使用 secondary 系列
      '教育': 'badge-secondary',
      '培训': 'badge-secondary',
      '学费': 'badge-secondary',
      
      // 娱乐消费类 - 使用 accent 系列
      '娱乐': 'badge-accent',
      '购物': 'badge-accent',
      '电影': 'badge-accent',
      
      // 通讯网络类 - 使用 info 系列
      '通讯': 'badge-info',
      '网络': 'badge-info',
      '电话费': 'badge-info',
      
      // 其他类 - 使用 neutral 系列
      '其他': 'badge-neutral',
      '未知类型': 'badge-neutral',
      '杂费': 'badge-neutral'
    }
    
    const badgeVariant = categoryStyleMap[categoryName]
    if (badgeVariant) {
      return {
        className: `badge ${badgeVariant} badge-sm font-medium h-5 gap-1`
      }
    }
    
    // 默认使用 accent 主题色
    return { className: 'badge badge-accent badge-sm font-medium h-5 gap-1' }
  }
  
  // 未分类使用 ghost 样式
  return { className: 'badge badge-ghost badge-sm font-medium h-5 gap-1' }
}

/**
 * 获取分类徽章样式（保持向后兼容）
 */
export function getCategoryBadgeClass(invoice: Invoice): string {
  return getCategoryBadgeStyle(invoice).className
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