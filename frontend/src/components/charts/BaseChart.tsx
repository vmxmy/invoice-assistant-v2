/**
 * 基础图表组件
 * 统一管理 Recharts 的主题和配置
 */
import React from 'react'
import { ResponsiveContainer } from 'recharts'

export interface BaseChartProps {
  children: React.ReactNode
  height?: string | number
  className?: string
  loading?: boolean
}

const BaseChart: React.FC<BaseChartProps> = ({
  children,
  height = 400,
  className = '',
  loading = false
}) => {
  if (loading) {
    return (
      <div 
        className={`w-full flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <span className="ml-2 text-base-content/70">加载中...</span>
      </div>
    )
  }

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

export default BaseChart