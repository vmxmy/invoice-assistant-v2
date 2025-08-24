import React, { useState } from 'react';
import { NavigationProvider, ResponsiveNavigationSystem } from './index';
import NavigationSettings from './NavigationSettings';
import { Settings } from 'lucide-react';

/**
 * 导航系统使用示例
 * 
 * 这个组件展示了如何集成和使用响应式导航系统
 */
const NavigationExample: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <NavigationProvider>
      <ResponsiveNavigationSystem
        pageTitle="导航示例"
        showBackButton={true}
        showSearch={true}
        showActions={true}
        customTopNavbar={
          <div className="flex items-center justify-between p-4">
            <h1 className="text-lg font-semibold">自定义标题</h1>
            <button
              onClick={() => setShowSettings(true)}
              className="btn btn-ghost btn-square btn-sm"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        }
      >
        <div className="p-6 space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">响应式导航系统</h2>
              <p>这是一个展示移动端导航系统的示例页面。</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-base-200 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">🏠 底部标签导航</h3>
                  <ul className="text-sm space-y-1">
                    <li>• 移动设备自动启用</li>
                    <li>• 支持3种变体（极简/标准/增强）</li>
                    <li>• 安全区域适配</li>
                    <li>• 触感反馈支持</li>
                  </ul>
                </div>
                
                <div className="bg-base-200 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">📱 抽屉导航</h3>
                  <ul className="text-sm space-y-1">
                    <li>• 适合平板设备</li>
                    <li>• 分组组织导航项</li>
                    <li>• 支持手势滑动</li>
                    <li>• 用户信息集成</li>
                  </ul>
                </div>
                
                <div className="bg-base-200 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">👆 手势支持</h3>
                  <ul className="text-sm space-y-1">
                    <li>• 左边缘右滑返回</li>
                    <li>• 下拉刷新页面</li>
                    <li>• 侧滑打开抽屉</li>
                    <li>• 触觉反馈增强</li>
                  </ul>
                </div>
                
                <div className="bg-base-200 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">⚙️ 智能适配</h3>
                  <ul className="text-sm space-y-1">
                    <li>• 自动检测设备类型</li>
                    <li>• 响应屏幕方向变化</li>
                    <li>• 用户偏好持久化</li>
                    <li>• 性能优化</li>
                  </ul>
                </div>
              </div>

              <div className="card-actions justify-end">
                <button
                  onClick={() => setShowSettings(true)}
                  className="btn btn-primary"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  打开导航设置
                </button>
              </div>
            </div>
          </div>

          {/* 使用指南 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">🚀 快速开始</h2>
              
              <div className="mockup-code">
                <pre><code>{`import { NavigationProvider, ResponsiveNavigationSystem } from './components/navigation';

function App() {
  return (
    <NavigationProvider>
      <ResponsiveNavigationSystem 
        pageTitle="我的页面"
        showBackButton={true}
      >
        {/* 页面内容 */}
        <YourPageContent />
      </ResponsiveNavigationSystem>
    </NavigationProvider>
  );
}`}</code></pre>
              </div>

              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <h3 className="font-bold">提示</h3>
                  <div className="text-xs">
                    导航系统会根据设备类型自动选择最适合的导航模式。
                    你也可以通过设置面板自定义导航偏好。
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 特性列表 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">✨ 核心特性</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">📱</div>
                  <h3 className="font-semibold">移动优先</h3>
                  <p className="text-sm text-base-content/60">
                    专为移动设备优化的导航体验
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-4xl mb-2">🔄</div>
                  <h3 className="font-semibold">响应式</h3>
                  <p className="text-sm text-base-content/60">
                    自动适配不同屏幕尺寸和设备类型
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-4xl mb-2">♿</div>
                  <h3 className="font-semibold">无障碍</h3>
                  <p className="text-sm text-base-content/60">
                    完整的键盘导航和屏幕阅读器支持
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ResponsiveNavigationSystem>

      {/* 导航设置面板 */}
      <NavigationSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </NavigationProvider>
  );
};

export default NavigationExample;