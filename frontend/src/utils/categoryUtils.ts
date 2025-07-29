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
 * 获取分类徽章的自定义样式（背景颜色和文字颜色）
 */
export function getCategoryBadgeStyle(invoice: Invoice): { className: string; style?: React.CSSProperties } {
  if (invoice.expense_category || invoice.primary_category_name || invoice.secondary_category_name) {
    const categoryName = invoice.expense_category || invoice.primary_category_name || invoice.secondary_category_name
    
    // 根据分类名称返回对应的自定义颜色
    const categoryStyleMap: Record<string, { backgroundColor: string; color: string }> = {
      // 交通类 - 蓝紫色系
      '交通': { backgroundColor: '#8b5cf6', color: '#ffffff' },
      '高铁': { backgroundColor: '#7c3aed', color: '#ffffff' },
      '飞机': { backgroundColor: '#6366f1', color: '#ffffff' },
      '出租车': { backgroundColor: '#3b82f6', color: '#ffffff' },
      '火车票': { backgroundColor: '#7c3aed', color: '#ffffff' },
      '机票': { backgroundColor: '#6366f1', color: '#ffffff' },
      '客运车票': { backgroundColor: '#5b21b6', color: '#ffffff' },
      '地铁票': { backgroundColor: '#4c1d95', color: '#ffffff' },
      
      // 住宿类 - 绿色系
      '住宿': { backgroundColor: '#10b981', color: '#ffffff' },
      '酒店': { backgroundColor: '#059669', color: '#ffffff' },
      '民宿': { backgroundColor: '#16a34a', color: '#ffffff' },
      '住宿服务': { backgroundColor: '#15803d', color: '#ffffff' },
      '酒店发票': { backgroundColor: '#059669', color: '#ffffff' },
      
      // 餐饮类 - 橙黄色系
      '餐饮': { backgroundColor: '#f59e0b', color: '#ffffff' },
      '餐饮服务': { backgroundColor: '#d97706', color: '#ffffff' },
      '食品': { backgroundColor: '#ea580c', color: '#ffffff' },
      '外卖': { backgroundColor: '#dc2626', color: '#ffffff' },
      
      // 办公类 - 蓝色系
      '办公': { backgroundColor: '#0ea5e9', color: '#ffffff' },
      '咨询': { backgroundColor: '#0284c7', color: '#ffffff' },
      '印章': { backgroundColor: '#0369a1', color: '#ffffff' },
      '办公用品': { backgroundColor: '#0891b2', color: '#ffffff' },
      '服务费': { backgroundColor: '#075985', color: '#ffffff' },
      
      // 医疗健康类 - 红色系
      '医疗': { backgroundColor: '#dc2626', color: '#ffffff' },
      '药品': { backgroundColor: '#b91c1c', color: '#ffffff' },
      '体检': { backgroundColor: '#991b1b', color: '#ffffff' },
      
      // 教育培训类 - 紫色系
      '教育': { backgroundColor: '#9333ea', color: '#ffffff' },
      '培训': { backgroundColor: '#7e22ce', color: '#ffffff' },
      '学费': { backgroundColor: '#6b21a8', color: '#ffffff' },
      
      // 娱乐消费类 - 粉色系
      '娱乐': { backgroundColor: '#ec4899', color: '#ffffff' },
      '购物': { backgroundColor: '#db2777', color: '#ffffff' },
      '电影': { backgroundColor: '#be185d', color: '#ffffff' },
      
      // 通讯网络类 - 青色系
      '通讯': { backgroundColor: '#06b6d4', color: '#ffffff' },
      '网络': { backgroundColor: '#0891b2', color: '#ffffff' },
      '电话费': { backgroundColor: '#0e7490', color: '#ffffff' },
      
      // 其他类 - 灰色系
      '其他': { backgroundColor: '#6b7280', color: '#ffffff' },
      '未知类型': { backgroundColor: '#6b7280', color: '#ffffff' },
      '杂费': { backgroundColor: '#52525b', color: '#ffffff' }
    }
    
    const style = categoryStyleMap[categoryName]
    if (style) {
      return {
        className: 'badge badge-sm font-medium h-5 gap-1',
        style: style
      }
    }
    
    // 默认使用 accent 色
    return { className: 'badge badge-accent badge-sm font-medium h-5 gap-1' }
  }
  
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