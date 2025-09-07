/**
 * 趋势分析图表组件
 * 展示月度趋势和增长率分析
 */
import React from 'react'
import BaseChart from './BaseChart'
import { getCurrentThemeColors, getSemanticColor } from '../../utils/daisyUIColors'

// 生成带透明度的颜色
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

interface MonthlyData {
  month: string
  invoiceCount: number
  totalAmount: number
  countGrowthRate?: number
  amountGrowthRate?: number
}

interface TrendAnalysisChartProps {
  data: MonthlyData[]
  loading?: boolean
}

const TrendAnalysisChart: React.FC<TrendAnalysisChartProps> = ({
  data,
  loading = false
}) => {
  const colors = getCurrentThemeColors()

  // 月度趋势组合图配置
  const trendOption = {
    title: {
      text: '月度趋势分析',
      left: 'left',
      textStyle: {
        color: colors.neutral,
        fontSize: 16,
        fontWeight: 600
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: colors.neutral
        }
      },
      backgroundColor: colors.base,
      borderColor: colors.neutral,
      textStyle: {
        color: colors.neutral
      }
    },
    legend: {
      data: ['发票数量', '总金额(万元)'],
      top: 'top',
      right: 'right',
      textStyle: {
        color: colors.neutral
      }
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.month),
      axisPointer: {
        type: 'shadow'
      },
      axisLine: {
        lineStyle: {
          color: getColorWithOpacity(colors.neutral, 0.3)
        }
      },
      axisLabel: {
        color: getColorWithOpacity(colors.neutral, 0.8)
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '发票数量',
        position: 'left',
        axisLabel: {
          formatter: '{value}',
          color: getColorWithOpacity(colors.neutral, 0.8)
        },
        axisLine: {
          lineStyle: {
            color: colors.primary
          }
        },
        splitLine: {
          lineStyle: {
            color: getColorWithOpacity(colors.neutral, 0.1)
          }
        }
      },
      {
        type: 'value',
        name: '金额(万元)',
        position: 'right',
        axisLabel: {
          formatter: '{value}万',
          color: getColorWithOpacity(colors.neutral, 0.8)
        },
        axisLine: {
          lineStyle: {
            color: colors.secondary
          }
        }
      }
    ],
    series: [
      {
        name: '发票数量',
        type: 'bar',
        yAxisIndex: 0,
        data: data.map(d => d.invoiceCount),
        itemStyle: {
          color: colors.primary,
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: colors.primary
          }
        }
      },
      {
        name: '总金额(万元)',
        type: 'line',
        yAxisIndex: 1,
        data: data.map(d => (d.totalAmount / 10000).toFixed(1)),
        smooth: true,
        lineStyle: {
          color: colors.secondary,
          width: 3
        },
        itemStyle: {
          color: colors.secondary,
          borderWidth: 2
        },
        areaStyle: {
          color: getColorWithOpacity(colors.secondary, 0.1)
        }
      }
    ]
  }

  // 增长率柱状图配置
  const growthOption = {
    title: {
      text: '月度增长率对比',
      left: 'left',
      textStyle: {
        color: colors.neutral,
        fontSize: 16,
        fontWeight: 600
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params: any) {
        let result = params[0].name + '<br/>'
        params.forEach((param: any) => {
          const value = param.value
          const color = value >= 0 ? colors.success : colors.error
          result += `${param.seriesName}: <span style="color: ${color}">${value > 0 ? '+' : ''}${value}%</span><br/>`
        })
        return result
      },
      backgroundColor: colors.base,
      borderColor: colors.neutral,
      textStyle: {
        color: colors.neutral
      }
    },
    legend: {
      data: ['数量增长率', '金额增长率'],
      top: 'top',
      right: 'right',
      textStyle: {
        color: colors.neutral
      }
    },
    xAxis: {
      type: 'category',
      data: data.slice(1).map(d => d.month), // 跳过第一个月（没有增长率数据）
      axisLine: {
        lineStyle: {
          color: getColorWithOpacity(colors.neutral, 0.3)
        }
      },
      axisLabel: {
        color: getColorWithOpacity(colors.neutral, 0.8)
      }
    },
    yAxis: {
      type: 'value',
      name: '增长率(%)',
      axisLabel: {
        formatter: '{value}%',
        color: getColorWithOpacity(colors.neutral, 0.8)
      },
      axisLine: {
        lineStyle: {
          color: getColorWithOpacity(colors.neutral, 0.3)
        }
      },
      splitLine: {
        lineStyle: {
          color: getColorWithOpacity(colors.neutral, 0.1)
        }
      }
    },
    series: [
      {
        name: '数量增长率',
        type: 'bar',
        data: data.slice(1).map(d => d.countGrowthRate || 0),
        itemStyle: {
          color: function(params: any) {
            return getSemanticColor(params.value, 'growth')
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
          color: colors.neutral,
          fontSize: 10
        }
      },
      {
        name: '金额增长率',
        type: 'bar',
        data: data.slice(1).map(d => d.amountGrowthRate || 0),
        itemStyle: {
          color: function(params: any) {
            return getSemanticColor(params.value, 'growth')
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
          color: colors.neutral,
          fontSize: 10
        }
      }
    ]
  }

  return (
    <div className="space-y-6">
      {/* 月度趋势图 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <BaseChart
            option={trendOption}
            height={400}
            loading={loading}
          />
        </div>
      </div>

      {/* 增长率对比图 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <BaseChart
            option={growthOption}
            height={350}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}

export default TrendAnalysisChart