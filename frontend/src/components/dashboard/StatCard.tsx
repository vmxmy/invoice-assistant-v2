/**
 * 统计卡片组件
 * 显示单个统计指标
 */
import React from 'react'
import type { StatCard as StatCardType } from '../../types/dashboard.types'

interface StatCardProps {
  stat: StatCardType
  loading?: boolean
  className?: string
}

export function StatCard({ stat, loading = false, className = '' }: StatCardProps) {
  // 获取趋势图标
  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return '↗️'
      case 'down':
        return '↘️'
      default:
        return '→'
    }
  }

  // 获取趋势颜色
  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-success'
      case 'down':
        return 'text-error'
      default:
        return 'text-base-content/60'
    }
  }

  // 获取卡片颜色样式
  const getCardColorClass = (color?: string) => {
    switch (color) {
      case 'primary':
        return 'bg-primary/10 border-primary/20'
      case 'secondary':
        return 'bg-secondary/10 border-secondary/20'
      case 'accent':
        return 'bg-accent/10 border-accent/20'
      case 'info':
        return 'bg-info/10 border-info/20'
      case 'success':
        return 'bg-success/10 border-success/20'
      case 'warning':
        return 'bg-warning/10 border-warning/20'
      case 'error':
        return 'bg-error/10 border-error/20'
      default:
        return 'bg-base-200 border-base-300'
    }
  }

  // 获取数字颜色
  const getValueColor = (color?: string) => {
    switch (color) {
      case 'primary':
        return 'text-primary'
      case 'secondary':
        return 'text-secondary'
      case 'accent':
        return 'text-accent'
      case 'info':
        return 'text-info'
      case 'success':
        return 'text-success'
      case 'warning':
        return 'text-warning'
      case 'error':
        return 'text-error'
      default:
        return 'text-base-content'
    }
  }

  if (loading) {
    return (
      <div className={`stat bg-base-200 rounded-box shadow-lg border ${className}`}>
        <div className="stat-figure">
          <div className="skeleton w-8 h-8 rounded-full"></div>
        </div>
        <div className="stat-title">
          <div className="skeleton h-4 w-20"></div>
        </div>
        <div className="stat-value">
          <div className="skeleton h-8 w-16"></div>
        </div>
        <div className="stat-desc">
          <div className="skeleton h-3 w-24"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`stat rounded-box shadow-lg border transition-all duration-300 hover:shadow-xl ${getCardColorClass(stat.color)} ${className}`}>
      {/* 图标 */}
      <div className="stat-figure text-3xl opacity-80">
        {stat.icon}
      </div>
      
      {/* 标题 */}
      <div className="stat-title font-medium text-base-content/70">
        {stat.title}
      </div>
      
      {/* 数值 */}
      <div className={`stat-value text-2xl font-bold ${getValueColor(stat.color)}`}>
        {stat.value}
      </div>
      
      {/* 描述和趋势 */}
      <div className="stat-desc">
        {stat.change && (
          <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor(stat.change.trend)}`}>
            <span>{getTrendIcon(stat.change.trend)}</span>
            <span>{stat.change.value}%</span>
            <span className="text-base-content/50">({stat.change.period})</span>
          </div>
        )}
        {stat.description && (
          <div className="text-xs text-base-content/60 mt-1">
            {stat.description}
          </div>
        )}
      </div>
    </div>
  )
}

// 统计卡片网格组件
interface StatCardGridProps {
  stats: StatCardType[]
  loading?: boolean
  className?: string
}

export function StatCardGrid({ stats, loading = false, className = '' }: StatCardGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {stats.map((stat, index) => (
        <StatCard 
          key={stat.title} 
          stat={stat} 
          loading={loading}
        />
      ))}
    </div>
  )
}