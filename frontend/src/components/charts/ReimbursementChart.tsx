/**
 * 报销管理图表组件
 * 展示报销进度、逾期分析等
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

interface ReimbursementData {
  totalCount: number
  reimbursedCount: number
  unreimbursedCount: number
  overdueCount: number
  dueSoonCount: number
  reimbursementRate: number
  avgProcessingDays: number
  monthlyProgress: Array<{
    month: string
    reimbursed: number
    submitted: number
  }>
}

interface ReimbursementChartProps {
  data: ReimbursementData
  loading?: boolean
}

const ReimbursementChart: React.FC<ReimbursementChartProps> = ({
  data,
  loading = false
}) => {
  const colors = getCurrentThemeColors()

  // 报销进度仪表盘配置
  const progressGaugeOption = {
    title: {
      text: '报销完成进度',
      left: 'center',
      textStyle: {
        color: colors.neutral,
        fontSize: 16,
        fontWeight: 600
      }
    },
    series: [{
      type: 'gauge',
      min: 0,
      max: 100,
      splitNumber: 5,
      radius: '80%',
      axisLine: {
        lineStyle: {
          width: 20,
          color: [
            [0.3, colors.error],
            [0.7, colors.warning],
            [1, colors.success]
          ]
        }
      },
      pointer: {
        itemStyle: {
          color: colors.primary,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
          shadowBlur: 5,
          shadowOffsetX: 2,
          shadowOffsetY: 2
        }
      },
      axisTick: {
        distance: -20,
        length: 8,
        lineStyle: {
          color: colors.base,
          width: 2
        }
      },
      splitLine: {
        distance: -20,
        length: 15,
        lineStyle: {
          color: colors.base,
          width: 3
        }
      },
      axisLabel: {
        color: colors.neutral,
        distance: -45,
        fontSize: 12
      },
      detail: {
        valueAnimation: true,
        formatter: '{value}%',
        fontSize: 24,
        color: colors.primary,
        offsetCenter: [0, '60%']
      },
      data: [{
        value: Math.round(data.reimbursementRate * 100),
        name: '完成率'
      }]
    }]
  }

  // 逾期分析漏斗图配置
  const overdueAnalysisOption = {
    title: {
      text: '报销状态分析',
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
    series: [{
      name: '发票状态',
      type: 'funnel',
      left: '10%',
      top: 60,
      width: '80%',
      height: '75%',
      min: 0,
      max: data.totalCount,
      minSize: '0%',
      maxSize: '100%',
      sort: 'descending',
      gap: 2,
      label: {
        show: true,
        position: 'inside',
        formatter: '{b}\n{c}票',
        fontSize: 12,
        color: colors.base
      },
      itemStyle: {
        borderColor: colors.base,
        borderWidth: 1
      },
      emphasis: {
        label: {
          fontSize: 14
        }
      },
      data: [
        {
          value: data.totalCount,
          name: '总发票',
          itemStyle: { color: colors.info }
        },
        {
          value: data.totalCount - data.overdueCount,
          name: '正常范围',
          itemStyle: { color: colors.success }
        },
        {
          value: data.dueSoonCount,
          name: '即将逾期',
          itemStyle: { color: colors.warning }
        },
        {
          value: data.overdueCount,
          name: '已逾期',
          itemStyle: { color: colors.error }
        }
      ]
    }]
  }

  // 月度报销趋势配置
  const monthlyTrendOption = {
    title: {
      text: '月度报销趋势',
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
      data: ['提交数量', '报销数量', '报销率'],
      top: 'top',
      right: 'right',
      textStyle: {
        color: colors.neutral
      }
    },
    xAxis: {
      type: 'category',
      data: (data.monthlyProgress || []).map(d => d.month),
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
        name: '报销率(%)',
        position: 'right',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: '{value}%',
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
        name: '提交数量',
        type: 'bar',
        yAxisIndex: 0,
        data: (data.monthlyProgress || []).map(d => d.submitted),
        itemStyle: {
          color: colors.info,
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '30%'
      },
      {
        name: '报销数量',
        type: 'bar',
        yAxisIndex: 0,
        data: (data.monthlyProgress || []).map(d => d.reimbursed),
        itemStyle: {
          color: colors.success,
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '30%'
      },
      {
        name: '报销率',
        type: 'line',
        yAxisIndex: 1,
        data: (data.monthlyProgress || []).map(d => 
          d.submitted > 0 ? Math.round((d.reimbursed / d.submitted) * 100) : 0
        ),
        smooth: true,
        lineStyle: {
          color: colors.secondary,
          width: 3
        },
        itemStyle: {
          color: colors.secondary,
          borderWidth: 2
        },
        symbol: 'circle',
        symbolSize: 6
      }
    ]
  }

  return (
    <div className="space-y-6">
      {/* 统计指标卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat bg-info/10 rounded-lg">
          <div className="stat-title text-info">总发票</div>
          <div className="stat-value text-info text-2xl">{data.totalCount}</div>
        </div>
        <div className="stat bg-success/10 rounded-lg">
          <div className="stat-title text-success">已报销</div>
          <div className="stat-value text-success text-2xl">{data.reimbursedCount}</div>
        </div>
        <div className="stat bg-warning/10 rounded-lg">
          <div className="stat-title text-warning">未报销</div>
          <div className="stat-value text-warning text-2xl">{data.unreimbursedCount}</div>
        </div>
        <div className="stat bg-error/10 rounded-lg">
          <div className="stat-title text-error">已逾期</div>
          <div className="stat-value text-error text-2xl">{data.overdueCount}</div>
        </div>
        <div className="stat bg-accent/10 rounded-lg">
          <div className="stat-title text-accent">处理天数</div>
          <div className="stat-value text-accent text-2xl">{data.avgProcessingDays.toFixed(0)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 报销完成率仪表盘 */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <BaseChart
              option={progressGaugeOption}
              height={320}
              loading={loading}
            />
          </div>
        </div>

        {/* 逾期分析漏斗图 */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <BaseChart
              option={overdueAnalysisOption}
              height={320}
              loading={loading}
            />
          </div>
        </div>

        {/* 月度趋势图 */}
        <div className="card bg-base-100 shadow-md xl:col-span-1">
          <div className="card-body">
            <BaseChart
              option={monthlyTrendOption}
              height={320}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReimbursementChart