/**
 * 响应式Grid工具组件
 * 提供断点感知的布局控制
 */
import React from 'react'

// 响应式断点配置
export const breakpoints = {
  sm: '640px',
  md: '768px', 
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const

// 响应式容器
export interface ResponsiveContainerProps {
  children: React.ReactNode
  breakpoint?: keyof typeof breakpoints
  className?: string
}

export function ResponsiveContainer({ 
  children, 
  breakpoint = 'lg',
  className = '' 
}: ResponsiveContainerProps) {
  const breakpointClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-4xl', 
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl'
  }[breakpoint]

  return (
    <div className={`container mx-auto px-4 ${breakpointClass} ${className}`}>
      {children}
    </div>
  )
}

// 自适应网格
export interface AutoGridProps {
  children: React.ReactNode
  minItemWidth?: string
  gap?: string
  className?: string
}

export function AutoGrid({ 
  children, 
  minItemWidth = '300px',
  gap = '1.5rem',
  className = '' 
}: AutoGridProps) {
  return (
    <div 
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`,
        gap
      }}
    >
      {children}
    </div>
  )
}

// 砌体布局（类似Pinterest）
export interface MasonryGridProps {
  children: React.ReactNode
  columns?: {
    sm?: number
    md?: number
    lg?: number
  }
  gap?: string
  className?: string
}

export function MasonryGrid({ 
  children, 
  columns = { sm: 1, md: 2, lg: 3 },
  gap = '1rem',
  className = '' 
}: MasonryGridProps) {
  return (
    <div 
      className={`columns-${columns.sm} md:columns-${columns.md} lg:columns-${columns.lg} ${className}`}
      style={{ columnGap: gap }}
    >
      {React.Children.map(children, (child, index) => (
        <div key={index} className="break-inside-avoid mb-4">
          {child}
        </div>
      ))}
    </div>
  )
}