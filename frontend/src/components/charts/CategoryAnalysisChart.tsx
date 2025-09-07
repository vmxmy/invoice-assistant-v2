/**
 * 分类分析图表组件
 * 展示费用分类的饼图、树状图和排行榜
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

interface CategoryData {
  name: string
  value: number
  count: number
  percentage: number
  children?: CategoryData[]
}

interface CategoryAnalysisChartProps {
  data: CategoryData[]
  loading?: boolean
}

const CategoryAnalysisChart: React.FC<CategoryAnalysisChartProps> = ({
  data,
  loading = false
}) => {
  const colors = getCurrentThemeColors()

  // 动态生成颜色数组
  const colorArray = [
    colors.primary,
    colors.secondary,
    colors.accent,
    colors.info,
    colors.success,
    colors.warning,
    colors.error,
    getColorWithOpacity(colors.primary, 0.7),
    getColorWithOpacity(colors.secondary, 0.7),
    getColorWithOpacity(colors.accent, 0.7)
  ]

  // 主分类饼图配置
  const pieOption = {
    title: {
      text: '费用分类分布',
      left: 'left',
      textStyle: {
        color: colors.neutral,
        fontSize: 16,
        fontWeight: 600
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: ¥{c} ({d}%)',
      backgroundColor: colors.base,
      borderColor: colors.neutral,
      textStyle: {
        color: colors.neutral
      }
    },
    legend: {
      orient: 'vertical',
      right: 20,
      top: 'middle',
      textStyle: {
        color: colors.neutral,
        fontSize: 12
      },
      formatter: function(name: string) {
        const item = data.find(d => d.name === name)
        return item ? `${name} (${item.count}票)` : name
      }
    },
    series: [{
      name: '费用分类',
      type: 'pie',
      radius: ['30%', '60%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: colors.base,
        borderWidth: 2
      },
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold',
          formatter: '{b}\n{d}%',
          color: colors.neutral
        },
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        }
      },
      labelLine: {
        show: false
      },
      data: data.map((item, index) => ({
        value: item.value,
        name: item.name,
        itemStyle: {
          color: colorArray[index % colorArray.length]
        }
      }))
    }]
  }

  // 分类树状图配置
  const treemapOption = {
    title: {
      text: '分类层级结构',
      left: 'left',
      textStyle: {
        color: colors.neutral,
        fontSize: 16,
        fontWeight: 600
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: function(info: any) {
        const value = info.value
        const name = info.name
        return `${name}<br/>金额: ¥${value.toLocaleString()}`
      },
      backgroundColor: colors.base,
      borderColor: colors.neutral,
      textStyle: {
        color: colors.neutral
      }
    },
    series: [{
      name: '分类结构',
      type: 'treemap',
      width: '100%',
      height: '80%',
      top: '15%',
      roam: false,
      nodeClick: false,
      data: data.map((item, index) => ({
        name: item.name,
        value: item.value,
        itemStyle: {
          color: colorArray[index % colorArray.length],
          borderColor: colors.base,
          borderWidth: 2,
          gapWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n¥{c}',
          color: colors.base,
          fontSize: 12,
          fontWeight: 'bold'
        },
        children: item.children?.map((child, childIndex) => ({
          name: child.name,
          value: child.value,
          itemStyle: {
            color: getColorWithOpacity(
              [colors.primary, colors.secondary, colors.accent, colors.info][index % 4], 
              0.8 - childIndex * 0.1
            ),
            borderColor: colors.base,
            borderWidth: 1
          },
          label: {
            show: child.value > item.value * 0.1, // 只显示占比超过10%的子分类
            color: colors.base,
            fontSize: 10
          }
        }))
      })),
      breadcrumb: {
        show: false
      }
    }]
  }

  // 分类排行榜配置
  const barOption = {
    title: {
      text: 'Top 10 费用分类',
      left: 'left',
      textStyle: {
        color: colors.neutral,
        fontSize: 16,
        fontWeight: 600
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>{a}: ¥{c} ({d}票)',
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
        color: getColorWithOpacity(colors.neutral, 0.8),
        formatter: function(value: number) {
          return value >= 10000 ? (value / 10000).toFixed(1) + '万' : value.toString()
        }
      },
      splitLine: {
        lineStyle: {
          color: getColorWithOpacity(colors.neutral, 0.1)
        }
      }
    },
    yAxis: {
      type: 'category',
      data: data.slice(0, 10).map(d => d.name).reverse(),
      axisLine: {
        lineStyle: {
          color: getColorWithOpacity(colors.neutral, 0.3)
        }
      },
      axisLabel: {
        color: getColorWithOpacity(colors.neutral, 0.8)
      }
    },
    series: [{
      name: '金额',
      type: 'bar',
      data: data.slice(0, 10).map((d, index) => ({
        value: d.value,
        count: d.count,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [{
              offset: 0, color: 'transparent'
            }, {
              offset: 1, color: colorArray[index % colorArray.length]
            }]
          },
          borderRadius: [0, 4, 4, 0]
        }
      })).reverse(),
      label: {
        show: true,
        position: 'right',
        formatter: function(params: any) {
          const value = params.value
          return value >= 10000 ? (value / 10000).toFixed(1) + '万' : value.toString()
        },
        color: colors.neutral,
        fontSize: 10
      },
      barWidth: '60%'
    }]
  }

  return (
    <div className="space-y-6">
      {/* 分类饼图 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <BaseChart
            option={pieOption}
            height={400}
            loading={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 分类树状图 */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <BaseChart
              option={treemapOption}
              height={350}
              loading={loading}
            />
          </div>
        </div>

        {/* 分类排行榜 */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <BaseChart
              option={barOption}
              height={350}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CategoryAnalysisChart