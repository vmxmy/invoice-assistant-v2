/**
 * 基于 Tailwind CSS 4 原生Grid的布局组件
 * 遵循最佳实践：Tailwind负责布局，DaisyUI负责组件
 */
import React from 'react'

// 响应式Grid容器 - 移动优先
export interface ResponsiveGridProps {
  children: React.ReactNode
  /** 移动端列数，默认1 */
  cols?: number
  /** 中等屏幕列数 */
  mdCols?: number  
  /** 大屏幕列数 */
  lgCols?: number
  /** 超大屏幕列数 */
  xlCols?: number
  /** 间距大小：xs=2, sm=4, md=6, lg=8, xl=10 */
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** 额外的CSS类名 */
  className?: string
}

export function ResponsiveGrid({ 
  children, 
  cols = 1,
  mdCols,
  lgCols, 
  xlCols,
  gap = 'md',
  className = '' 
}: ResponsiveGridProps) {
  // 构建响应式grid-cols类名
  const gridCols = [
    `grid-cols-${cols}`,
    mdCols && `md:grid-cols-${mdCols}`,
    lgCols && `lg:grid-cols-${lgCols}`,
    xlCols && `xl:grid-cols-${xlCols}`
  ].filter(Boolean).join(' ')

  // 间距映射
  const gapClass = `gap-${gap === 'xs' ? '2' : gap === 'sm' ? '4' : gap === 'md' ? '6' : gap === 'lg' ? '8' : '10'}`

  return (
    <div className={`grid ${gridCols} ${gapClass} ${className}`}>
      {children}
    </div>
  )
}

// 卡片网格 - 专门用于展示DaisyUI卡片
export interface CardGridProps {
  children: React.ReactNode
  /** 移动端列数，默认1 */
  cols?: number
  /** 中等屏幕列数，默认2 */
  mdCols?: number
  /** 大屏幕列数，默认3 */
  lgCols?: number
  /** 超大屏幕列数 */
  xlCols?: number
  /** 间距，默认md */
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** 容器内边距 */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function CardGrid({ 
  children,
  cols = 1,
  mdCols = 2, 
  lgCols = 3,
  xlCols,
  gap = 'md',
  padding = 'md',
  className = ''
}: CardGridProps) {
  const paddingClass = padding === 'none' ? '' : 
    padding === 'sm' ? 'p-4' :
    padding === 'md' ? 'p-6' :
    padding === 'lg' ? 'p-8' : 'p-10'

  return (
    <div className={paddingClass}>
      <ResponsiveGrid 
        cols={cols}
        mdCols={mdCols}
        lgCols={lgCols}
        xlCols={xlCols}
        gap={gap}
        className={className}
      >
        {children}
      </ResponsiveGrid>
    </div>
  )
}

// 统计数据网格 - 专门用于展示统计卡片
export interface StatsGridProps {
  children: React.ReactNode
  /** 移动端列数，默认1 */
  cols?: number
  /** 中等屏幕列数，默认2 */
  mdCols?: number
  /** 大屏幕列数，默认4 */
  lgCols?: number
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function StatsGrid({ 
  children,
  cols = 1,
  mdCols = 2,
  lgCols = 4,
  gap = 'md',
  className = ''
}: StatsGridProps) {
  return (
    <ResponsiveGrid 
      cols={cols}
      mdCols={mdCols}
      lgCols={lgCols}
      gap={gap}
      className={className}
    >
      {children}
    </ResponsiveGrid>
  )
}

// 表单网格 - 专门用于表单布局
export interface FormGridProps {
  children: React.ReactNode
  /** 表单类型：single为单列，double为双列 */
  layout?: 'single' | 'double' | 'triple'
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export function FormGrid({ 
  children,
  layout = 'single',
  gap = 'md',
  className = ''
}: FormGridProps) {
  const layoutConfig = {
    single: { cols: 1 },
    double: { cols: 1, mdCols: 2 },
    triple: { cols: 1, mdCols: 2, lgCols: 3 }
  }[layout]

  return (
    <ResponsiveGrid 
      {...layoutConfig}
      gap={gap}
      className={className}
    >
      {children}
    </ResponsiveGrid>
  )
}

// 不规则网格项 - 用于跨列/跨行
export interface GridItemProps {
  children: React.ReactNode
  /** 跨列数 */
  colSpan?: number
  /** 中等屏幕跨列数 */
  mdColSpan?: number
  /** 大屏幕跨列数 */
  lgColSpan?: number
  /** 跨行数 */
  rowSpan?: number
  className?: string
}

export function GridItem({ 
  children,
  colSpan,
  mdColSpan,
  lgColSpan,
  rowSpan,
  className = ''
}: GridItemProps) {
  const spanClasses = [
    colSpan && `col-span-${colSpan}`,
    mdColSpan && `md:col-span-${mdColSpan}`,
    lgColSpan && `lg:col-span-${lgColSpan}`,
    rowSpan && `row-span-${rowSpan}`
  ].filter(Boolean).join(' ')

  return (
    <div className={`${spanClasses} ${className}`}>
      {children}
    </div>
  )
}

// 主布局网格 - 用于页面级布局
export interface MainLayoutProps {
  children: React.ReactNode
  /** 是否有侧边栏 */
  hasSidebar?: boolean
  /** 侧边栏内容 */
  sidebar?: React.ReactNode
  /** 侧边栏宽度（栅格数） */
  sidebarCols?: number
  className?: string
}

export function MainLayout({ 
  children,
  hasSidebar = false,
  sidebar,
  sidebarCols = 3,
  className = ''
}: MainLayoutProps) {
  if (!hasSidebar) {
    return (
      <main className={`container mx-auto px-4 py-6 ${className}`}>
        {children}
      </main>
    )
  }

  const mainCols = 12 - sidebarCols

  return (
    <div className={`container mx-auto px-4 py-6 ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className={`lg:col-span-${sidebarCols}`}>
          {sidebar}
        </aside>
        <main className={`lg:col-span-${mainCols}`}>
          {children}
        </main>
      </div>
    </div>
  )
}