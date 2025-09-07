/**
 * 概览仪表盘组件
 * 展示关键指标和报销状态分布
 */
import React from 'react'
import BaseChart from './BaseChart'
import { getCurrentThemeColors, getSemanticColor } from '../../utils/daisyUIColors'

interface OverviewData {
  totalInvoices: number
  totalAmount: number
  avgAmount: number
  monthlyInvoices: number
  reimbursedCount: number
  unreimbursedCount: number
  reimbursementRate: number
  monthlyGrowthRate: number
}

interface OverviewDashboardProps {
  data: OverviewData
  loading?: boolean
}

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  data,
  loading = false
}) => {
  const colors = getCurrentThemeColors()

  // 报销完成率仪表盘配置
  const gaugeOption = {
    series: [{
      type: 'gauge',
      min: 0,
      max: 100,
      splitNumber: 4,
      radius: '75%',
      axisLine: {
        lineStyle: {
          width: 15,
          color: [
            [0.3, colors.error],
            [0.7, colors.warning],
            [1, colors.success]
          ]
        }
      },
      pointer: {
        itemStyle: {
          color: colors.primary
        }
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        fontSize: 10,
        color: colors.neutral
      },
      detail: {
        formatter: '{value}%',
        fontSize: 20,
        color: colors.primary,
        offsetCenter: [0, '40%']
      },
      title: {
        offsetCenter: [0, '70%'],
        fontSize: 14,
        color: colors.neutral
      },
      data: [{
        value: Math.round(data.reimbursementRate * 100),
        name: '报销完成率'
      }]
    }]
  }

  // 报销状态环形图配置
  const donutOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 10,
      textStyle: {
        color: colors.neutral,
        fontSize: 12
      }
    },
    series: [{
      name: '报销状态',
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['50%', '45%'],
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
          fontSize: 16,
          fontWeight: 'bold',
          color: colors.neutral
        }
      },
      labelLine: {
        show: false
      },
      data: [
        {
          value: data.reimbursedCount,
          name: '已报销',
          itemStyle: { color: colors.success }
        },
        {
          value: data.unreimbursedCount,
          name: '未报销',
          itemStyle: { color: data.unreimbursedCount > data.reimbursedCount ? colors.warning : colors.info }
        }
      ]
    }]
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* KPI 指标卡片 */}
      <div className="lg:col-span-1">
        <div className="card bg-base-100 shadow-md h-full">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">关键指标</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* 总发票数 */}
              <div className="stat bg-primary/5 rounded-lg p-3">
                <div className="stat-title text-xs">发票总数</div>
                <div className="stat-value text-primary text-lg">
                  {data.totalInvoices.toLocaleString()}
                </div>
              </div>

              {/* 总金额 */}
              <div className="stat bg-secondary/5 rounded-lg p-3">
                <div className="stat-title text-xs">总金额</div>
                <div className="stat-value text-secondary text-lg">
                  ¥{(data.totalAmount / 10000).toFixed(1)}万
                </div>
              </div>

              {/* 平均金额 */}
              <div className="stat bg-accent/5 rounded-lg p-3">
                <div className="stat-title text-xs">平均金额</div>
                <div className="stat-value text-accent text-lg">
                  ¥{data.avgAmount.toFixed(0)}
                </div>
              </div>

              {/* 月度增长率 */}
              <div className="stat bg-info/5 rounded-lg p-3">
                <div className="stat-title text-xs">月度增长</div>
                <div 
                  className={`stat-value text-lg ${
                    data.monthlyGrowthRate >= 0 ? 'text-success' : 'text-error'
                  }`}
                >
                  {data.monthlyGrowthRate > 0 ? '+' : ''}{data.monthlyGrowthRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 报销完成率仪表盘 */}
      <div className="lg:col-span-1">
        <div className="card bg-base-100 shadow-md h-full">
          <div className="card-body">
            <h3 className="card-title text-lg mb-2">报销完成率</h3>
            <BaseChart
              option={gaugeOption}
              height={280}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* 报销状态分布 */}
      <div className="lg:col-span-1">
        <div className="card bg-base-100 shadow-md h-full">
          <div className="card-body">
            <h3 className="card-title text-lg mb-2">报销状态分布</h3>
            <BaseChart
              option={donutOption}
              height={280}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default OverviewDashboard