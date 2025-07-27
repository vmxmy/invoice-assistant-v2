import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ThemePreview: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* 返回按钮 */}
        <Link to="/dashboard" className="btn btn-ghost mb-6">
          <ArrowLeft className="w-4 h-4" />
          返回仪表盘
        </Link>

        <h1 className="text-3xl font-bold mb-8">DaisyUI 主题预览</h1>

        {/* 颜色展示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">主要颜色</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="bg-primary w-full h-20 rounded-lg mb-2"></div>
                  <p className="text-sm text-center">Primary</p>
                </div>
                <div>
                  <div className="bg-secondary w-full h-20 rounded-lg mb-2"></div>
                  <p className="text-sm text-center">Secondary</p>
                </div>
                <div>
                  <div className="bg-accent w-full h-20 rounded-lg mb-2"></div>
                  <p className="text-sm text-center">Accent</p>
                </div>
                <div>
                  <div className="bg-neutral w-full h-20 rounded-lg mb-2"></div>
                  <p className="text-sm text-center">Neutral</p>
                </div>
                <div>
                  <div className="bg-base-100 border-2 border-base-300 w-full h-20 rounded-lg mb-2"></div>
                  <p className="text-sm text-center">Base-100</p>
                </div>
                <div>
                  <div className="bg-base-200 w-full h-20 rounded-lg mb-2"></div>
                  <p className="text-sm text-center">Base-200</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">状态颜色</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="bg-info w-full h-20 rounded-lg mb-2"></div>
                  <p className="text-sm text-center">Info</p>
                </div>
                <div>
                  <div className="bg-success w-full h-20 rounded-lg mb-2"></div>
                  <p className="text-sm text-center">Success</p>
                </div>
                <div>
                  <div className="bg-warning w-full h-20 rounded-lg mb-2"></div>
                  <p className="text-sm text-center">Warning</p>
                </div>
                <div>
                  <div className="bg-error w-full h-20 rounded-lg mb-2"></div>
                  <p className="text-sm text-center">Error</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 按钮展示 */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title mb-4">按钮样式</h2>
            <div className="flex flex-wrap gap-2">
              <button className="btn">默认</button>
              <button className="btn btn-primary">主要</button>
              <button className="btn btn-secondary">次要</button>
              <button className="btn btn-accent">强调</button>
              <button className="btn btn-ghost">幽灵</button>
              <button className="btn btn-link">链接</button>
              <button className="btn btn-info">信息</button>
              <button className="btn btn-success">成功</button>
              <button className="btn btn-warning">警告</button>
              <button className="btn btn-error">错误</button>
            </div>
            <div className="divider">尺寸变体</div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-xs">极小</button>
              <button className="btn btn-sm">小</button>
              <button className="btn btn-md">中</button>
              <button className="btn btn-lg">大</button>
            </div>
          </div>
        </div>

        {/* 表单元素 */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title mb-4">表单元素</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">输入框</span>
                </label>
                <input type="text" placeholder="请输入文字" className="input input-bordered" />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">选择框</span>
                </label>
                <select className="select select-bordered">
                  <option disabled selected>选择一个选项</option>
                  <option>选项 1</option>
                  <option>选项 2</option>
                  <option>选项 3</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">复选框</span> 
                  <input type="checkbox" className="checkbox" />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">开关</span> 
                  <input type="checkbox" className="toggle" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 卡片样式 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card bg-primary text-primary-content">
            <div className="card-body">
              <h2 className="card-title">主要卡片</h2>
              <p>这是一个使用主要颜色的卡片示例。</p>
            </div>
          </div>
          <div className="card bg-secondary text-secondary-content">
            <div className="card-body">
              <h2 className="card-title">次要卡片</h2>
              <p>这是一个使用次要颜色的卡片示例。</p>
            </div>
          </div>
          <div className="card bg-accent text-accent-content">
            <div className="card-body">
              <h2 className="card-title">强调卡片</h2>
              <p>这是一个使用强调颜色的卡片示例。</p>
            </div>
          </div>
        </div>

        {/* 警告提示 */}
        <div className="space-y-4">
          <div className="alert">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>默认提示信息</span>
          </div>
          
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>信息提示</span>
          </div>
          
          <div className="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>成功提示！</span>
          </div>
          
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>警告：请注意！</span>
          </div>
          
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>错误：出现问题了。</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemePreview;