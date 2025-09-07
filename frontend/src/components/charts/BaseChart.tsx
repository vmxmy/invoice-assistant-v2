/**
 * 基础图表组件
 * 统一管理 ECharts 的主题和配置
 */
import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { createDaisyUIEChartsTheme, getCurrentThemeColors } from '../../utils/daisyUIColors'

export interface BaseChartProps {
  option: any
  height?: string | number
  className?: string
  loading?: boolean
  onChartReady?: (chart: echarts.ECharts) => void
}

const BaseChart: React.FC<BaseChartProps> = ({
  option,
  height = 400,
  className = '',
  loading = false,
  onChartReady
}) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts>()

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return

    // 注册DaisyUI主题
    const daisyTheme = createDaisyUIEChartsTheme()
    echarts.registerTheme('daisyui', daisyTheme)

    // 创建图表实例
    chartInstance.current = echarts.init(chartRef.current, 'daisyui')
    
    if (onChartReady && chartInstance.current) {
      onChartReady(chartInstance.current)
    }

    return () => {
      chartInstance.current?.dispose()
    }
  }, [onChartReady])

  // 监听主题变化
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (chartInstance.current) {
        // 重新注册主题
        const daisyTheme = createDaisyUIEChartsTheme()
        echarts.registerTheme('daisyui', daisyTheme)
        
        // 重新应用主题
        chartInstance.current.dispose()
        chartInstance.current = echarts.init(chartRef.current!, 'daisyui')
        chartInstance.current.setOption(option)
      }
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })

    return () => observer.disconnect()
  }, [option])

  // 更新图表配置
  useEffect(() => {
    if (chartInstance.current && option) {
      chartInstance.current.setOption(option, true)
    }
  }, [option])

  // 处理 loading 状态
  useEffect(() => {
    if (chartInstance.current) {
      if (loading) {
        chartInstance.current.showLoading('default', {
          text: '加载中...',
          color: getCurrentThemeColors().primary,
          textColor: getCurrentThemeColors().neutral,
          maskColor: getCurrentThemeColors().base + '80'
        })
      } else {
        chartInstance.current.hideLoading()
      }
    }
  }, [loading])

  // 响应式处理
  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div 
      ref={chartRef}
      className={`w-full ${className}`}
      style={{ height }}
    />
  )
}

export default BaseChart