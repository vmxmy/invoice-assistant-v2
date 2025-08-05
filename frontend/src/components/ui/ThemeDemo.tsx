import React from 'react';
import ThemeToggle from './ThemeToggle';
import ThemeSelector from './ThemeSelector';

const ThemeDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 标题区域 */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-base-content">
            主题演示页面
          </h1>
          <p className="text-base-content/70 text-lg">
            测试 Tailwind CSS v4 + DaisyUI 5 暗色主题配置
          </p>
        </div>

        {/* 主题控制器区域 */}
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-base-content">主题控制器</h2>
            <div className="flex flex-wrap gap-6 items-center">
              <div>
                <label className="label">
                  <span className="label-text">简单切换</span>
                </label>
                <ThemeToggle />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">高级选择器</span>
                </label>
                <ThemeSelector />
              </div>
            </div>
          </div>
        </div>

        {/* 颜色展示区域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 基础颜色 */}
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-base-content">基础颜色</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-base-100 border border-base-300 rounded"></div>
                  <span className="text-base-content">base-100</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-base-200 border border-base-300 rounded"></div>
                  <span className="text-base-content">base-200</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-base-300 border border-base-300 rounded"></div>
                  <span className="text-base-content">base-300</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-base-content border border-base-300 rounded"></div>
                  <span className="text-base-content">base-content</span>
                </div>
              </div>
            </div>
          </div>

          {/* 主题颜色 */}
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-base-content">主题颜色</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded"></div>
                  <span className="text-base-content">primary</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-secondary rounded"></div>
                  <span className="text-base-content">secondary</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent rounded"></div>
                  <span className="text-base-content">accent</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-neutral rounded"></div>
                  <span className="text-base-content">neutral</span>
                </div>
              </div>
            </div>
          </div>

          {/* 状态颜色 */}
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-base-content">状态颜色</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-info rounded"></div>
                  <span className="text-base-content">info</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-success rounded"></div>
                  <span className="text-base-content">success</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-warning rounded"></div>
                  <span className="text-base-content">warning</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-error rounded"></div>
                  <span className="text-base-content">error</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 组件展示区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 按钮组件 */}
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-base-content">按钮组件</h3>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary">Primary</button>
                  <button className="btn btn-secondary">Secondary</button>
                  <button className="btn btn-accent">Accent</button>
                  <button className="btn btn-neutral">Neutral</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-info">Info</button>
                  <button className="btn btn-success">Success</button>
                  <button className="btn btn-warning">Warning</button>
                  <button className="btn btn-error">Error</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-outline">Outline</button>
                  <button className="btn btn-ghost">Ghost</button>
                  <button className="btn btn-link">Link</button>
                </div>
              </div>
            </div>
          </div>

          {/* 表单组件 */}
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-base-content">表单组件</h3>
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">输入框</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="请输入内容" 
                    className="input input-bordered" 
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">选择框</span>
                  </label>
                  <select className="select select-bordered">
                    <option>选择一个选项</option>
                    <option>选项 1</option>
                    <option>选项 2</option>
                  </select>
                </div>
                <div className="form-control">
                  <label className="cursor-pointer label">
                    <span className="label-text">复选框</span>
                    <input type="checkbox" className="checkbox checkbox-primary" />
                  </label>
                </div>
                <div className="form-control">
                  <label className="cursor-pointer label">
                    <span className="label-text">切换开关</span>
                    <input type="checkbox" className="toggle toggle-primary" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tailwind 暗色模式测试 */}
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body">
            <h3 className="card-title text-base-content">Tailwind CSS 暗色模式测试</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-base-100 rounded-lg border border-base-300">
                <h4 className="text-base-content font-semibold mb-2">
                  主题感知测试
                </h4>
                <p className="text-base-content/70 mb-4">
                  这个区域使用 DaisyUI 的语义化颜色，会随主题自动适配。
                </p>
                <button className="btn btn-primary">
                  主题按钮
                </button>
              </div>
              
              <div className="p-4 bg-base-100 rounded-lg border border-base-300">
                <h4 className="text-base-content font-semibold mb-2">
                  DaisyUI 语义化颜色测试
                </h4>
                <p className="text-base-content/70 mb-4">
                  这个区域使用 DaisyUI 的语义化颜色类，会随主题自动适配。
                </p>
                <button className="btn btn-primary">
                  DaisyUI 按钮
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h3 className="font-bold">主题配置说明</h3>
            <div className="text-xs">
              • 支持系统偏好设置自动切换<br/>
              • 主题偏好保存在本地存储<br/>
              • 使用 data-theme 属性和 CSS custom variants 实现<br/>
              • 兼容 Tailwind CSS v4 和 DaisyUI 5
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeDemo;