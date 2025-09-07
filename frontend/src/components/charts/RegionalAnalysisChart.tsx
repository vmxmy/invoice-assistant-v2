/**
 * 地区分析图表组件
 * 展示发票的地理分布和地区排行
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

interface RegionalData {
  name: string
  value: number
  count: number
  code?: string
  province?: string
}

interface RegionalAnalysisChartProps {
  data: RegionalData[]
  loading?: boolean
}

const RegionalAnalysisChart: React.FC<RegionalAnalysisChartProps> = ({
  data,
  loading = false
}) => {
  const colors = getCurrentThemeColors()
  
  // 过滤掉数值为0的记录
  const filteredData = data.filter(item => item.count > 0 && item.value > 0)

  // 地区排行榜配置（使用横向柱状图代替地图）
  const rankingOption = {
    title: {
      text: '发票数量地区分布 Top 15',
      left: 'left',
      textStyle: {
        color: colors.neutral,
        fontSize: 16,
        fontWeight: 600
      }
    },
    tooltip: {
      show: true,
      trigger: 'axis',
      formatter: function(params: any) {
        if (Array.isArray(params) && params.length > 0) {
          const param = params[0]
          const amount = param.data.amount || 0
          return `${param.name}<br/>发票数量: ${param.value}票<br/>金额: ¥${amount.toLocaleString()}`
        }
        return ''
      },
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#666',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      padding: [8, 12]
    },
    grid: {
      left: '15%',
      right: '10%',
      top: '15%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
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
      type: 'category',
      data: filteredData.slice(0, 15).map(d => d.name).reverse(),
      axisLine: {
        lineStyle: {
          color: getColorWithOpacity(colors.neutral, 0.3)
        }
      },
      axisLabel: {
        color: getColorWithOpacity(colors.neutral, 0.8),
        fontSize: 11
      }
    },
    series: [{
      name: '发票数量',
      type: 'bar',
      data: filteredData.slice(0, 15).map((d, index) => ({
        value: d.count,
        amount: d.value,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [{
              offset: 0,
              color: index < 3 ? colors.primary : 
                     index < 8 ? colors.secondary : colors.info
            }, {
              offset: 1,
              color: 'transparent'
            }]
          },
          borderRadius: [0, 4, 4, 0]
        }
      })).reverse(),
      label: {
        show: true,
        position: 'right',
        formatter: '{c}票',
        color: colors.neutral,
        fontSize: 10
      },
      barWidth: '70%'
    }]
  }

  // 金额分布环形图配置
  const amountDistributionOption = {
    title: {
      text: '金额分布 Top 10',
      left: 'left',
      textStyle: {
        color: colors.neutral,
        fontSize: 16,
        fontWeight: 600
      }
    },
    tooltip: {
      show: true,
      trigger: 'item',
      formatter: '{a} <br/>{b}: ¥{c} ({d}%)',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#666',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      padding: [8, 12]
    },
    legend: {
      orient: 'vertical',
      right: 20,
      top: 'middle',
      textStyle: {
        color: colors.neutral,
        fontSize: 11
      },
      formatter: function(name: string) {
        const item = filteredData.find(d => d.name === name)
        return item ? `${name} (${item.count}票)` : name
      }
    },
    series: [{
      name: '地区金额',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 6,
        borderColor: colors.base,
        borderWidth: 2
      },
      label: {
        show: false
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 12,
          fontWeight: 'bold',
          formatter: function(params: any) {
            const value = params.value
            const formattedValue = value >= 10000 ? 
              (value / 10000).toFixed(1) + '万' : 
              value.toLocaleString()
            return `${params.name}\n¥${formattedValue}\n${params.percent}%`
          },
          color: colors.neutral
        }
      },
      labelLine: {
        show: false
      },
      data: filteredData.slice(0, 10).map((item, index) => {
        const colorMap = [
          colors.primary, colors.secondary, colors.accent, colors.info,
          colors.success, colors.warning, colors.error,
          getColorWithOpacity(colors.primary, 0.7), getColorWithOpacity(colors.secondary, 0.7), getColorWithOpacity(colors.accent, 0.7)
        ]
        
        return {
          value: item.value,
          name: item.name,
          itemStyle: {
            color: colorMap[index % colorMap.length]
          }
        }
      })
    }]
  }

  // 数量vs金额散点图配置
  const scatterOption = {
    title: {
      text: '地区发票数量 vs 平均金额',
      left: 'left',
      textStyle: {
        color: colors.neutral,
        fontSize: 16,
        fontWeight: 600
      }
    },
    tooltip: {
      show: true,
      trigger: 'item',
      formatter: function(params: any) {
        const data = params.data
        return `${data[2]}<br/>发票数量: ${data[0]}票<br/>平均金额: ¥${data[1].toFixed(0)}`
      },
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#666',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      padding: [8, 12]
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
      name: '地区分布',
      type: 'scatter',
      symbolSize: function(data: any) {
        // 根据总金额调整气泡大小
        return Math.sqrt(data[0] * data[1]) / 50 + 5
      },
      data: filteredData.slice(0, 20).map(d => [
        d.count,
        d.count > 0 ? d.value / d.count : 0,
        d.name
      ]),
      itemStyle: {
        color: colors.primary,
        opacity: 0.7
      },
      emphasis: {
        itemStyle: {
          color: colors.accent,
          opacity: 1,
          shadowBlur: 10,
          shadowColor: colors.accent
        }
      }
    }]
  }

  return (
    <div className="space-y-6">
      {/* 地区排行榜 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <BaseChart
            option={rankingOption}
            height={500}
            loading={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 金额分布饼图 */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <BaseChart
              option={amountDistributionOption}
              height={400}
              loading={loading}
            />
          </div>
        </div>

        {/* 散点图分析 */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <BaseChart
              option={scatterOption}
              height={400}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegionalAnalysisChart