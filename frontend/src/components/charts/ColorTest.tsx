/**
 * 颜色系统测试组件
 * 用于验证 DaisyUI 颜色是否正确获取
 */
import React from 'react'
import { getCurrentThemeColors } from '../../utils/daisyUIColors'

const ColorTest: React.FC = () => {
  const colors = getCurrentThemeColors()

  return (
    <div className="card bg-base-100 shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">DaisyUI 颜色系统测试</h3>
      
      <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
        {Object.entries(colors).map(([name, color]) => (
          <div key={name} className="text-center">
            <div 
              className="w-16 h-16 rounded-lg border border-base-300 mx-auto mb-2"
              style={{ backgroundColor: color }}
            />
            <div className="text-xs font-mono">
              <div className="font-semibold">{name}</div>
              <div className="text-base-content/60 break-all">{color}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-base-200 rounded-lg">
        <h4 className="font-semibold mb-2">调试信息</h4>
        <pre className="text-xs overflow-x-auto">
          {JSON.stringify(colors, null, 2)}
        </pre>
      </div>
    </div>
  )
}

export default ColorTest