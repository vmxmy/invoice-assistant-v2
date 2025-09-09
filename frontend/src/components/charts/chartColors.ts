/**
 * DaisyUI 5 语义颜色配置
 * 统一管理所有 Recharts 图表的颜色
 */

// ✅ DaisyUI 5 标准颜色配置
export const CHART_COLORS = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  accent: 'var(--color-accent)',
  warning: 'var(--color-warning)',
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  neutral: 'var(--color-neutral)',
  neutralContent: 'var(--color-neutral-content)',
  info: 'var(--color-info)',
  base100: 'var(--color-base-100)',
  base200: 'var(--color-base-200)',
  base300: 'var(--color-base-300)',
} as const

// 预定义的调色板（用于多色图表）
export const CHART_COLOR_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.accent,
  CHART_COLORS.info,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.error
] as const

// 带透明度的颜色变体
export const CHART_COLOR_VARIANTS = {
  primary: {
    solid: CHART_COLORS.primary,
    light: `color-mix(in srgb, ${CHART_COLORS.primary} 70%, transparent)`,
    lighter: `color-mix(in srgb, ${CHART_COLORS.primary} 50%, transparent)`
  },
  secondary: {
    solid: CHART_COLORS.secondary,
    light: `color-mix(in srgb, ${CHART_COLORS.secondary} 70%, transparent)`,
    lighter: `color-mix(in srgb, ${CHART_COLORS.secondary} 50%, transparent)`
  },
  success: {
    solid: CHART_COLORS.success,
    light: `color-mix(in srgb, ${CHART_COLORS.success} 70%, transparent)`,
    lighter: `color-mix(in srgb, ${CHART_COLORS.success} 50%, transparent)`
  },
  warning: {
    solid: CHART_COLORS.warning,
    light: `color-mix(in srgb, ${CHART_COLORS.warning} 70%, transparent)`,
    lighter: `color-mix(in srgb, ${CHART_COLORS.warning} 50%, transparent)`
  },
  error: {
    solid: CHART_COLORS.error,
    light: `color-mix(in srgb, ${CHART_COLORS.error} 70%, transparent)`,
    lighter: `color-mix(in srgb, ${CHART_COLORS.error} 50%, transparent)`
  }
} as const

// 状态相关的颜色映射
export const STATUS_COLORS = {
  completed: CHART_COLORS.success,
  pending: CHART_COLORS.warning,
  failed: CHART_COLORS.error,
  draft: CHART_COLORS.neutral,
  active: CHART_COLORS.primary,
  inactive: CHART_COLORS.base300
} as const

// 数据类型相关的颜色映射
export const DATA_TYPE_COLORS = {
  revenue: CHART_COLORS.success,
  expense: CHART_COLORS.error,
  profit: CHART_COLORS.primary,
  target: CHART_COLORS.warning,
  actual: CHART_COLORS.info
} as const

// 获取循环颜色（用于动态数据）
export const getChartColor = (index: number): string => {
  return CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length]
}

// 根据数值获取状态颜色
export const getStatusColor = (percentage: number): string => {
  if (percentage >= 80) return CHART_COLORS.success
  if (percentage >= 60) return CHART_COLORS.warning
  return CHART_COLORS.error
}

// DaisyUI 5 主题验证函数
export const verifyDaisyUIv5Theme = (themeName: string = 'default'): boolean => {
  if (typeof document === 'undefined') return true // SSR 环境跳过
  
  const style = getComputedStyle(document.documentElement)
  const requiredVars = [
    '--color-primary',
    '--color-warning',
    '--color-success',
    '--color-base-100'
  ]

  const missing = requiredVars.filter(varName =>
    !style.getPropertyValue(varName).trim()
  )

  if (missing.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ DaisyUI v5 theme "${themeName}" loaded successfully`)
    }
    return true
  } else {
    console.warn(`⚠️ DaisyUI v5 missing variables in theme "${themeName}":`, missing)
    return false
  }
}

// 获取实际计算的颜色值（用于调试）
export const getComputedChartColor = (colorVar: string): string => {
  if (typeof document === 'undefined') return colorVar
  return getComputedStyle(document.documentElement).getPropertyValue(colorVar.replace('var(', '').replace(')', '')) || colorVar
}

export type ChartColorKey = keyof typeof CHART_COLORS
export type ChartColorPalette = typeof CHART_COLOR_PALETTE[number]