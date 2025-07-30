/**
 * 统一的Grid布局组件体系
 * 基于 DaisyUI 5 + Tailwind CSS 4 最佳实践
 */
import React from 'react'

// 应用级主网格布局
export interface AppGridProps {
  children: React.ReactNode
  className?: string
}

export function AppGrid({ children, className = '' }: AppGridProps) {
  return (
    <div className={`grid min-h-screen grid-rows-[auto_1fr] ${className}`}>
      {children}
    </div>
  )
}

// 页面级容器网格
export interface PageGridProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

export function PageGrid({ 
  children, 
  sidebar, 
  className = '', 
  maxWidth = '2xl' 
}: PageGridProps) {
  const containerClass = maxWidth === 'full' ? 'w-full' : `container max-w-${maxWidth} mx-auto`
  
  if (sidebar) {
    return (
      <div className={`${containerClass} px-4 py-6 ${className}`}>
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 lg:col-span-3">
            {sidebar}
          </aside>
          <main className="col-span-12 lg:col-span-9">
            {children}
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className={`${containerClass} px-4 py-6 ${className}`}>
      {children}
    </div>
  )
}

// 响应式卡片网格
export interface CardGridProps {
  children: React.ReactNode
  cols?: {
    sm?: number
    md?: number  
    lg?: number
    xl?: number
  }
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function CardGrid({ 
  children, 
  cols = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 'md',
  className = '' 
}: CardGridProps) {
  const gapClass = {
    sm: 'gap-4',
    md: 'gap-6', 
    lg: 'gap-8',
    xl: 'gap-10'
  }[gap]

  const colsClass = [
    `grid-cols-${cols.sm || 1}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`
  ].filter(Boolean).join(' ')

  return (
    <div className={`grid ${colsClass} ${gapClass} ${className}`}>
      {children}
    </div>
  )
}

// 表单网格布局
export interface FormGridProps {
  children: React.ReactNode
  cols?: number
  className?: string
}

export function FormGrid({ children, cols = 2, className = '' }: FormGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-4 ${className}`}>
      {children}
    </div>
  )
}

// 统计数据网格
export interface StatsGridProps {
  children: React.ReactNode
  className?: string
}

export function StatsGrid({ children, className = '' }: StatsGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {children}
    </div>
  )
}

// 内容区域网格 - 用于复杂布局
export interface ContentGridProps {
  children: React.ReactNode
  areas: string[]
  className?: string
}

export function ContentGrid({ children, areas, className = '' }: ContentGridProps) {
  const gridAreas = areas.map(area => `"${area}"`).join(' ')
  
  return (
    <div 
      className={`grid ${className}`}
      style={{ gridTemplateAreas: gridAreas }}
    >
      {children}
    </div>
  )
}

// 列表项网格
export interface ListGridProps {
  children: React.ReactNode
  density?: 'compact' | 'comfortable' | 'spacious'
  className?: string
}

export function ListGrid({ 
  children, 
  density = 'comfortable',
  className = '' 
}: ListGridProps) {
  const densityClass = {
    compact: 'gap-2',
    comfortable: 'gap-4', 
    spacious: 'gap-6'
  }[density]

  return (
    <div className={`grid grid-cols-1 ${densityClass} ${className}`}>
      {children}
    </div>
  )
}