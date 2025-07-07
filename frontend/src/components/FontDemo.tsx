import React from 'react';

const FontDemo: React.FC = () => {
  return (
    <div className="p-8 space-y-8">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-3xl">现代字体系统演示 Modern Typography Demo</h2>
          
          <div className="space-y-8">
            {/* 标题层级演示 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">标题层级系统 (Inter + Noto Sans SC)</h3>
              <div className="space-y-3">
                <h1 className="text-5xl">H1 发票管理系统 Invoice Management</h1>
                <h2 className="text-4xl">H2 智能处理平台 Smart Processing</h2>
                <h3 className="text-3xl">H3 数据分析 Data Analytics</h3>
                <h4 className="text-2xl">H4 功能模块 Feature Modules</h4>
                <h5 className="text-xl">H5 配置选项 Configuration</h5>
                <h6 className="text-lg">H6 详细设置 Detail Settings</h6>
              </div>
            </div>

            {/* 正文演示 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">正文内容展示</h3>
              <div className="space-y-4">
                <p className="text-base leading-normal">
                  <span className="font-medium">Inter + Noto Sans SC</span> 字体组合为发票管理系统提供了优秀的中英文混排体验。
                  这套字体系统专为数据密集型应用设计，确保长时间阅读的舒适性和信息的清晰传达。
                </p>
                <p className="text-sm leading-relaxed text-base-content/80">
                  系统采用现代字体设计原则，包括科学的字号级别、合理的行高配置和优化的字符间距，
                  为用户提供专业且美观的视觉体验。
                </p>
              </div>
            </div>

            {/* 数字和金额演示 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">数字与金额显示 (等宽字体)</h3>
              <div className="bg-base-200 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="label-text">发票金额:</span>
                  <span className="amount text-lg font-medium">¥12,345.67</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="label-text">发票号码:</span>
                  <span className="invoice-number text-sm">25449165860000541164</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="label-text">USD 总计:</span>
                  <span className="currency text-lg font-medium">$1,234.56</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="label-text">处理时间:</span>
                  <span className="numeric">2025-07-07 15:30:45</span>
                </div>
              </div>
            </div>

            {/* UI 元素演示 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">UI 组件样式</h3>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <button className="btn btn-primary btn-text">主要操作</button>
                  <button className="btn btn-secondary btn-text">次要操作</button>
                  <button className="btn btn-accent btn-text">强调操作</button>
                  <button className="btn btn-outline btn-text">边框按钮</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">销售方名称</span>
                    </label>
                    <input type="text" placeholder="请输入销售方名称" className="input input-bordered" />
                    <label className="label">
                      <span className="help-text">支持中英文输入，自动识别</span>
                    </label>
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">发票金额</span>
                    </label>
                    <input type="number" placeholder="0.00" className="input input-bordered font-mono" />
                  </div>
                </div>
              </div>
            </div>

            {/* 表格演示 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">数据表格演示</h3>
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="text-left">发票号码</th>
                      <th className="text-left">销售方</th>
                      <th className="text-right">金额</th>
                      <th className="text-center">状态</th>
                      <th className="text-center">日期</th>
                    </tr>
                  </thead>
                  <tbody className="table-text">
                    <tr>
                      <td className="invoice-number">25449165860000541164</td>
                      <td>中国铁路12306</td>
                      <td className="amount text-right">¥74.50</td>
                      <td className="text-center">
                        <span className="badge badge-success badge-text">已处理</span>
                      </td>
                      <td className="text-center">2025-03-28</td>
                    </tr>
                    <tr>
                      <td className="invoice-number">25429165848000790553</td>
                      <td>上海趣链科技有限公司</td>
                      <td className="amount text-right">¥1,234.56</td>
                      <td className="text-center">
                        <span className="badge badge-warning badge-text">待审核</span>
                      </td>
                      <td className="text-center">2025-03-19</td>
                    </tr>
                    <tr>
                      <td className="invoice-number">25432000000022020617</td>
                      <td>Microsoft Corporation</td>
                      <td className="amount text-right">$299.99</td>
                      <td className="text-center">
                        <span className="badge badge-error badge-text">错误</span>
                      </td>
                      <td className="text-center">2025-03-15</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 代码演示 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">代码字体展示</h3>
              <div className="mockup-code">
                <pre className="text-sm"><code>{`// 现代字体系统配置
:root {
  --font-sans: "Inter", "Noto Sans SC", system-ui, sans-serif;
  --font-mono: "SF Mono", "Monaco", "Consolas", monospace;
  --text-base: clamp(1rem, 0.95rem + 0.25vw, 1.1rem);
}

.amount {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}`}</code></pre>
              </div>
            </div>

            {/* 字体特性演示 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">字体特性对比</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">字重变化 Font Weights</h4>
                  <div className="space-y-2">
                    <p className="font-light">Light 300 - 轻细字重</p>
                    <p className="font-normal">Regular 400 - 常规字重</p>
                    <p className="font-medium">Medium 500 - 中等字重</p>
                    <p className="font-semibold">Semi-bold 600 - 半粗字重</p>
                    <p className="font-bold">Bold 700 - 加粗字重</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">字符间距 Letter Spacing</h4>
                  <div className="space-y-2">
                    <p className="tracking-tighter">Tighter - 更紧密间距</p>
                    <p className="tracking-tight">Tight - 紧密间距</p>
                    <p className="tracking-normal">Normal - 正常间距</p>
                    <p className="tracking-wide">Wide - 宽松间距</p>
                    <p className="tracking-wider">Wider - 更宽松间距</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 响应式演示提示 */}
            <div className="alert alert-info">
              <div className="flex-1">
                <h4 className="font-medium">响应式字体特性</h4>
                <p className="text-sm mt-1">
                  本字体系统采用 clamp() 函数实现流式排版，在不同屏幕尺寸下自动调整字号，
                  确保在移动端和桌面端都有最佳的阅读体验。尝试调整浏览器窗口大小查看效果。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FontDemo;