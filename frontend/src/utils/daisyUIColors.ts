/**
 * DaisyUI 5 语义颜色系统配置
 * 直接使用 DaisyUI 的 CSS 变量，与现有主题系统集成
 */

export interface DaisyUIColors {
  primary: string
  secondary: string
  accent: string
  neutral: string
  base: string
  info: string
  success: string
  warning: string
  error: string
}

/**
 * 获取实际的 CSS 变量值并转换为有效颜色
 */
function getComputedCSSColor(cssVar: string): string {
  try {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(cssVar)
      .trim()
    
    if (value) {
      // DaisyUI 5 使用的是 HSL 值格式，如 "220 13% 91%"
      if (value.includes('%') || /^\d+\s+\d+%\s+\d+%$/.test(value)) {
        return `hsl(${value})`
      }
      // 如果已经是完整颜色值（hex, rgb等），直接返回
      if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
        return value
      }
      // 处理可能的其他格式
      return `hsl(${value})`
    }
  } catch (error) {
    console.warn(`Failed to get CSS variable ${cssVar}:`, error)
  }
  
  // 回退到 DaisyUI 默认颜色
  const fallbackMap: Record<string, string> = {
    '--p': '#570df8',    // primary
    '--s': '#f000b8',    // secondary
    '--a': '#37cdbe',    // accent
    '--n': '#3d4451',    // neutral
    '--b1': '#ffffff',   // base-100
    '--in': '#3abff8',   // info
    '--su': '#36d399',   // success
    '--wa': '#fbbd23',   // warning
    '--er': '#f87272'    // error
  }
  
  return fallbackMap[cssVar] || '#6b7280'
}

/**
 * 获取当前主题的 DaisyUI 颜色
 * 将 CSS 变量转换为 ECharts 可用的实际颜色值
 */
export function getCurrentThemeColors(): DaisyUIColors {
  return {
    primary: getComputedCSSColor('--p'),
    secondary: getComputedCSSColor('--s'), 
    accent: getComputedCSSColor('--a'),
    neutral: getComputedCSSColor('--n'),
    base: getComputedCSSColor('--b1'),
    info: getComputedCSSColor('--in'),
    success: getComputedCSSColor('--su'),
    warning: getComputedCSSColor('--wa'),
    error: getComputedCSSColor('--er')
  }
}

/**
 * 生成颜色渐变数组
 * @param baseColor 基础颜色
 * @param count 渐变数量
 */
export function generateColorGradient(baseColor: string, count: number): string[] {
  const colors: string[] = []
  const opacities = [1, 0.8, 0.6, 0.4, 0.2]
  
  for (let i = 0; i < count; i++) {
    const opacity = opacities[i % opacities.length] || 0.5
    
    // 处理 hsl 格式
    if (baseColor.startsWith('hsl(')) {
      colors.push(baseColor.replace('hsl(', 'hsla(').replace(')', `, ${opacity})`))
    }
    // 处理 hex 格式
    else if (baseColor.startsWith('#')) {
      const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0')
      colors.push(baseColor + alpha)
    }
    // 处理 rgb 格式
    else if (baseColor.startsWith('rgb(')) {
      colors.push(baseColor.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`))
    }
    // 默认处理
    else {
      colors.push(`${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`)
    }
  }
  
  return colors
}

/**
 * 生成带透明度的颜色
 */
function getColorWithOpacity(baseColor: string, opacity: number): string {
  if (baseColor.startsWith('hsl(')) {
    return baseColor.replace('hsl(', 'hsla(').replace(')', `, ${opacity})`)
  }
  if (baseColor.startsWith('#')) {
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0')
    return baseColor + alpha
  }
  if (baseColor.startsWith('rgb(')) {
    return baseColor.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`)
  }
  return baseColor
}

/**
 * ECharts 主题配置
 * 使用实际的颜色值，支持主题切换
 */
export function createDaisyUIEChartsTheme() {
  const colors = getCurrentThemeColors()
  
  return {
    color: [
      colors.primary,
      colors.secondary, 
      colors.accent,
      colors.info,
      colors.success,
      colors.warning,
      colors.error,
      colors.neutral
    ],
    backgroundColor: colors.base,
    textStyle: {
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
      fontSize: 12,
      color: colors.neutral
    },
    title: {
      textStyle: {
        color: colors.neutral,
        fontSize: 16,
        fontWeight: 600
      }
    },
    legend: {
      textStyle: {
        color: colors.neutral,
        fontSize: 12
      }
    },
    grid: {
      borderColor: getColorWithOpacity(colors.neutral, 0.2)
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: getColorWithOpacity(colors.neutral, 0.3) } },
      axisTick: { lineStyle: { color: getColorWithOpacity(colors.neutral, 0.3) } },
      axisLabel: { color: getColorWithOpacity(colors.neutral, 0.8) }
    },
    valueAxis: {
      axisLine: { lineStyle: { color: getColorWithOpacity(colors.neutral, 0.3) } },
      axisTick: { lineStyle: { color: getColorWithOpacity(colors.neutral, 0.3) } },
      axisLabel: { color: getColorWithOpacity(colors.neutral, 0.8) },
      splitLine: { lineStyle: { color: getColorWithOpacity(colors.neutral, 0.1) } }
    }
  }
}

/**
 * 根据数据值获取对应的语义颜色
 */
export function getSemanticColor(value: number, type: 'growth' | 'status' | 'progress'): string {
  const colors = getCurrentThemeColors()
  
  switch (type) {
    case 'growth':
      return value >= 0 ? colors.success : colors.error
    case 'status':
      if (value >= 0.8) return colors.success
      if (value >= 0.6) return colors.warning
      return colors.error
    case 'progress':
      if (value >= 0.9) return colors.success
      if (value >= 0.7) return colors.info
      if (value >= 0.3) return colors.warning
      return colors.error
    default:
      return colors.primary
  }
}