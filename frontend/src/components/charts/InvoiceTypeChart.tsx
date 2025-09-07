/**
 * 发票类型分析图表组件
 * 展示发票类型分布和对比分析
 */
import React from 'react'
import BaseChart from './BaseChart'
import { getCurrentThemeColors } from '../../utils/daisyUIColors'

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

interface InvoiceTypeData {
  type: string
  count: number
  amount: number
  avgAmount: number
  percentage: number
}

interface InvoiceTypeChartProps {
  data: InvoiceTypeData[]
  loading?: boolean
}

const InvoiceTypeChart: React.FC<InvoiceTypeChartProps> = ({
  data,
  loading = false
}) => {
  const colors = getCurrentThemeColors()

  // 类型分布玫瑰图配置
  const roseOption = {
    title: {
      text: '发票类型分布',
      left: 'left',
      textStyle: {
        color: colors.neutral,
        fontSize: 16,
        fontWeight: 600
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c}票 ({d}%)',
      backgroundColor: colors.base,
      borderColor: colors.neutral,
      textStyle: {
        color: colors.neutral
      }
    },
    legend: {
      top: '10%',
      left: 'center',
      orient: 'horizontal',
      textStyle: {
        color: colors.neutral,
        fontSize: 11
      }
    },
    series: [{
      name: '发票类型',
      type: 'pie',
      radius: ['20%', '70%'],
      center: ['50%', '60%'],
      roseType: 'radius',
      itemStyle: {
        borderRadius: 8,
        borderColor: colors.base,
        borderWidth: 2
      },
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}\n{c}票',
        fontSize: 10,
        color: colors.neutral
      },
      labelLine: {
        length: 15,
        length2: 10,
        lineStyle: {
          color: colors.neutral
        }
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        }
      },
      data: data.map((item, index) => {
        const colorMap = [
          colors.primary, colors.secondary, colors.accent, colors.info,
          colors.success, colors.warning, colors.error,
          getColorWithOpacity(colors.primary, 0.8), getColorWithOpacity(colors.secondary, 0.8), getColorWithOpacity(colors.accent, 0.8)
        ]
        
        return {
          value: item.count,
          name: item.type,
          itemStyle: {
            color: colorMap[index % colorMap.length]
          }
        }
      })
    }]
  }

  // 平均金额对比柱状图配置
  const avgAmountOption = {
    title: {
      text: '各类型平均金额对比',
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
        const data = params[0]
        return `${data.name}<br/>平均金额: ¥${data.value.toFixed(0)}<br/>发票数量: ${data.data.count}票`
      },
      backgroundColor: colors.base,
      borderColor: colors.neutral,
      textStyle: {
        color: colors.neutral
      }
    },
    grid: {
      left: '10%',
      right: '10%',
      top: '15%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.type),
      axisLine: {
        lineStyle: {
          color: getColorWithOpacity(colors.neutral, 0.3)
        }
      },
      axisLabel: {
        color: getColorWithOpacity(colors.neutral, 0.8),
        rotate: 45,
        fontSize: 10
      }
    },
    yAxis: {
      type: 'value',
      name: '平均金额(元)',
      nameTextStyle: {
        color: colors.neutral
      },
      axisLine: {
        lineStyle: {
          color: getColorWithOpacity(colors.neutral, 0.3)
        }
      },
      axisLabel: {
        color: getColorWithOpacity(colors.neutral, 0.8),
        formatter: function(value: number) {
          return value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toString()
        }
      },
      splitLine: {
        lineStyle: {
          color: getColorWithOpacity(colors.neutral, 0.1)
        }
      }
    },
    series: [{
      name: '平均金额',
      type: 'bar',
      data: data.map((d, index) => ({
        value: d.avgAmount,
        count: d.count,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0,
              color: [colors.primary, colors.secondary, colors.accent, colors.info, colors.success][index % 5]
            }, {
              offset: 1,
              color: 'transparent'
            }]
          },
          borderRadius: [4, 4, 0, 0]
        }
      })),
      label: {
        show: true,
        position: 'top',
        formatter: function(params: any) {
          const value = params.value
          return value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toString()
        },
        color: colors.neutral,
        fontSize: 10
      },
      barWidth: '60%'
    }]
  }

  // 数量vs金额气泡图配置
  const bubbleOption = {
    title: {
      text: '类型数量 vs 总金额分析',
      left: 'left',
      textStyle: {
        color: colors.neutral,
        fontSize: 16,
        fontWeight: 600
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: function(params: any) {
        const data = params.data
        return `${data[3]}<br/>数量: ${data[0]}票<br/>总金额: ¥${data[1].toLocaleString()}<br/>平均金额: ¥${data[2].toFixed(0)}`
      },
      backgroundColor: colors.base,
      borderColor: colors.neutral,
      textStyle: {
        color: colors.neutral
      }
    },
    grid: {
      left: '10%',
      right: '10%',
      top: '15%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '发票数量',
      nameTextStyle: {
        color: colors.neutral
      },
      axisLine: {
        lineStyle: {
          color: getColorWithOpacity(colors.neutral, 0.3)
        }
      },
      axisLabel: {
        color: getColorWithOpacity(colors.neutral, 0.8)
      },
      splitLine: {
        lineStyle: {
          color: getColorWithOpacity(colors.neutral, 0.1)
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '总金额(万元)',
      nameTextStyle: {
        color: colors.neutral
      },
      axisLine: {
        lineStyle: {
          color: getColorWithOpacity(colors.neutral, 0.3)
        }
      },
      axisLabel: {
        color: getColorWithOpacity(colors.neutral, 0.8),
        formatter: function(value: number) {
          return (value / 10000).toFixed(1)
        }
      },
      splitLine: {
        lineStyle: {
          color: getColorWithOpacity(colors.neutral, 0.1)
        }
      }
    },
    series: [{
      name: '发票类型',
      type: 'scatter',
      symbolSize: function(data: any) {
        // 根据平均金额调整气泡大小
        return Math.max(5, Math.min(30, data[2] / 100))
      },
      data: data.map((d, index) => [
        d.count,
        d.amount,
        d.avgAmount,
        d.type
      ]),
      itemStyle: {
        color: function(params: any) {
          const colorMap = [colors.primary, colors.secondary, colors.accent, colors.info, colors.success]
          return colorMap[params.dataIndex % colorMap.length]
        },
        opacity: 0.8
      },
      emphasis: {
        itemStyle: {
          opacity: 1,
          shadowBlur: 10,
          shadowColor: colors.primary
        }
      },
      label: {
        show: true,
        position: 'top',
        formatter: '{@[3]}',
        fontSize: 9,
        color: colors.neutral
      }
    }]
  }

  return (
    <div className="space-y-6">
      {/* 类型分布玫瑰图 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <BaseChart
            option={roseOption}
            height={450}
            loading={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 平均金额对比 */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <BaseChart
              option={avgAmountOption}
              height={350}
              loading={loading}
            />
          </div>
        </div>

        {/* 气泡图分析 */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <BaseChart
              option={bubbleOption}
              height={350}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvoiceTypeChart