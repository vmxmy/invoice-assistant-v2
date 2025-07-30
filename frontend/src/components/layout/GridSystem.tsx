/**
 * 完整的Grid设计系统
 * 统一导出所有Grid组件和工具
 */

// 基础Grid组件
export {
  AppGrid,
  PageGrid,
  CardGrid,
  FormGrid,
  StatsGrid,
  ContentGrid,
  ListGrid
} from './GridLayout'

// 响应式Grid组件
export {
  ResponsiveContainer,
  AutoGrid,
  MasonryGrid
} from './GridResponsive'

// Grid工具类型
export interface GridBreakpoint {
  sm?: number
  md?: number
  lg?: number
  xl?: number
  '2xl'?: number
}

export interface GridSpacing {
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  px?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  py?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

// 预设Grid配置
export const gridPresets = {
  // 仪表板布局
  dashboard: {
    main: { cols: { sm: 1, md: 2, lg: 3, xl: 4 }, gap: 'lg' },
    stats: { cols: { sm: 1, md: 2, lg: 4 }, gap: 'md' },
    content: { cols: { sm: 1, lg: 2 }, gap: 'xl' }
  },
  
  // 列表页布局
  listing: {
    cards: { cols: { sm: 1, md: 2, lg: 3 }, gap: 'md' },
    table: { cols: { sm: 1 }, gap: 'sm' },
    filters: { cols: { sm: 1, md: 3 }, gap: 'sm' }
  },
  
  // 表单布局
  forms: {
    simple: { cols: { sm: 1, md: 2 }, gap: 'md' },
    complex: { cols: { sm: 1, md: 2, lg: 3 }, gap: 'lg' },
    inline: { cols: { sm: 1, md: 4 }, gap: 'sm' }
  },
  
  // 内容页布局
  content: {
    article: { cols: { sm: 1 }, gap: 'lg' },
    sidebar: { cols: { sm: 1, lg: 3 }, gap: 'xl' },
    grid: { cols: { sm: 1, md: 2 }, gap: 'lg' }
  }
} as const

// Grid工具函数
export const gridUtils = {
  // 生成响应式cols类名
  generateColsClass: (cols: GridBreakpoint) => {
    return [
      cols.sm && `grid-cols-${cols.sm}`,
      cols.md && `md:grid-cols-${cols.md}`,
      cols.lg && `lg:grid-cols-${cols.lg}`,
      cols.xl && `xl:grid-cols-${cols.xl}`,
      cols['2xl'] && `2xl:grid-cols-${cols['2xl']}`
    ].filter(Boolean).join(' ')
  },
  
  // 生成gap类名
  generateGapClass: (gap: GridSpacing['gap']) => {
    const gapMap = {
      xs: 'gap-2',
      sm: 'gap-4',
      md: 'gap-6',
      lg: 'gap-8',
      xl: 'gap-10',
      '2xl': 'gap-12'
    }
    return gap ? gapMap[gap] : 'gap-6'
  },
  
  // 生成padding类名
  generatePaddingClass: (px?: GridSpacing['px'], py?: GridSpacing['py']) => {
    const paddingMap = {
      xs: 2,
      sm: 4,
      md: 6,
      lg: 8,
      xl: 10,
      '2xl': 12
    }
    
    const classes = []
    if (px) classes.push(`px-${paddingMap[px]}`)
    if (py) classes.push(`py-${paddingMap[py]}`)
    
    return classes.join(' ')
  }
}