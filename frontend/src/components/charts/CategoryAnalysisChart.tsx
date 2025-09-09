/**
 * 分类分析图表组件
 * 展示费用分类的饼图 - 使用 Recharts
 */
import React from 'react'
import BaseChart from './BaseChart'
import { CHART_COLOR_PALETTE, getChartColor } from './chartColors'
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

interface CategoryData {
  name: string
  value: number
  count: number
  percentage: number
}

interface CategoryAnalysisChartProps {
  data: CategoryData[]
  loading?: boolean
}

const CategoryAnalysisChart: React.FC<CategoryAnalysisChartProps> = ({ 
  data = [], 
  loading = false 
}) => {
  // 使用标准化的调色板
  const colorPalette = CHART_COLOR_PALETTE

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-base-100 border border-base-300 rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">金额: ¥{data.value?.toLocaleString() || '0'}</p>
          <p className="text-sm">数量: {data.count}票</p>
          <p className="text-sm">占比: {data.percentage?.toFixed(1) || '0'}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* 分类饼图 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4">费用分类分布</h3>
          <BaseChart height={400} loading={loading}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={160}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getChartColor(index)} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value, entry: any) => {
                  const item = data.find(d => d.name === value)
                  return item ? `${value} (${item.count}票)` : value
                }}
              />
            </PieChart>
          </BaseChart>
        </div>
      </div>

      {/* 简化版本：只显示饼图，其他图表可以后续添加 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4">分类统计</h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>分类</th>
                  <th>金额</th>
                  <th>数量</th>
                  <th>占比</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={item.name}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getChartColor(index) }}
                        ></div>
                        {item.name}
                      </div>
                    </td>
                    <td>¥{item.value?.toLocaleString() || '0'}</td>
                    <td>{item.count}票</td>
                    <td>{item.percentage?.toFixed(1) || '0'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CategoryAnalysisChart