import React from 'react'
import type { Invoice } from '../types'
import { 
  getCategoryDisplayName, 
  getCategoryIcon, 
  getCategoryColor, 
  getCategoryBadgeClass 
} from '../utils/categoryUtils'

interface CategoryBadgeProps {
  invoice: Invoice
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  showIcon?: boolean
  showTooltip?: boolean
  className?: string
  onClick?: () => void
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  invoice,
  size = 'sm',
  variant = 'default',
  showIcon = true,
  showTooltip = true,
  className = '',
  onClick
}) => {
  const displayName = getCategoryDisplayName(invoice)
  const icon = getCategoryIcon(invoice)
  const color = getCategoryColor(invoice)
  const badgeClass = getCategoryBadgeClass(invoice)

  const getSizeClass = () => {
    switch (size) {
      case 'xs': return 'badge-xs text-xs'
      case 'sm': return 'badge-sm text-xs'
      case 'lg': return 'badge-lg text-sm'
      default: return 'text-xs'
    }
  }

  const getVariantClass = () => {
    switch (variant) {
      case 'outline': return 'badge-outline'
      case 'ghost': return 'badge-ghost'
      default: return badgeClass
    }
  }

  const badge = (
    <div
      className={`badge ${getSizeClass()} ${getVariantClass()} gap-1 ${
        onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''
      } ${className}`}
      onClick={onClick}
      style={variant === 'default' ? { 
        backgroundColor: color + '20',
        borderColor: color,
        color: color
      } : undefined}
    >
      {showIcon && <span className="text-sm">{icon}</span>}
      <span className="truncate max-w-24">{displayName}</span>
    </div>
  )

  if (showTooltip && displayName.length > 12) {
    return (
      <div className="tooltip tooltip-top" data-tip={displayName}>
        {badge}
      </div>
    )
  }

  return badge
}

// 分类统计卡片组件
interface CategoryStatsCardProps {
  categoryName: string
  count: number
  totalAmount: number
  averageAmount?: number
  icon?: string
  color?: string
  onClick?: () => void
  className?: string
}

export const CategoryStatsCard: React.FC<CategoryStatsCardProps> = ({
  categoryName,
  count,
  totalAmount,
  averageAmount,
  icon,
  color = '#6b7280',
  onClick,
  className = ''
}) => {
  return (
    <div
      className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow ${
        onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''
      } ${className}`}
      onClick={onClick}
    >
      <div className="card-body p-4">
        <div className="flex items-center gap-3 mb-3">
          {icon && (
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
              style={{ backgroundColor: color }}
            >
              {icon}
            </div>
          )}
          <div>
            <h3 className="card-title text-base">{categoryName}</h3>
            <p className="text-sm text-base-content/60">{count} 张发票</p>
          </div>
        </div>
        
        <div className="stats stats-vertical lg:stats-horizontal shadow-none bg-transparent">
          <div className="stat p-2">
            <div className="stat-title text-xs">总金额</div>
            <div className="stat-value text-lg">¥{totalAmount.toLocaleString()}</div>
          </div>
          
          {averageAmount !== undefined && (
            <div className="stat p-2">
              <div className="stat-title text-xs">平均金额</div>
              <div className="stat-value text-lg">¥{averageAmount.toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CategoryBadge