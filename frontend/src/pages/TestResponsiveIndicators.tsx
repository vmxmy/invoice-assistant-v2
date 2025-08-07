import React, { useState } from 'react';
import { ResponsiveIndicatorSection, createCashFlowIndicator, createUrgentTodoIndicator, createOverdueIndicator, createGrowthIndicator } from '../components/invoice/indicators/ResponsiveIndicatorSection';
import { MobileOptimizedIndicator, MiniIndicator } from '../components/invoice/indicators/MobileOptimizedIndicator';
import { DollarSign, FileText, Clock, TrendingUp, AlertCircle, Package } from 'lucide-react';

const TestResponsiveIndicators: React.FC = () => {
  const [viewportSize, setViewportSize] = useState('auto');
  const [layout, setLayout] = useState<'auto' | 'grid' | 'carousel' | 'list'>('auto');

  // 示例数据
  const indicators = [
    createCashFlowIndicator(128500, 45200, () => console.log('Cash flow clicked')),
    createUrgentTodoIndicator(12, 8750.50, () => console.log('Urgent todo clicked')),
    createOverdueIndicator(3, 5, () => console.log('Overdue clicked')),
    createGrowthIndicator(185600, 156800, () => console.log('Growth clicked'))
  ];

  // 额外的测试指标
  const additionalIndicators = [
    {
      id: 'inventory',
      icon: <Package className="w-5 h-5 text-info" />,
      title: '库存状态',
      subtitle: '当前库存',
      value: 1234,
      valueSuffix: '件',
      secondaryValue: 89,
      secondaryLabel: '低库存',
      variant: 'info' as const,
      priority: 6
    },
    {
      id: 'orders',
      icon: <FileText className="w-5 h-5 text-primary" />,
      title: '订单统计',
      value: 567,
      valueSuffix: '单',
      trend: 'up' as const,
      trendValue: '+12%',
      variant: 'primary' as const,
      priority: 5
    }
  ];

  // 模拟不同视口大小
  const simulateViewport = (size: string) => {
    const viewport = document.getElementById('test-viewport');
    if (!viewport) return;

    switch (size) {
      case 'mobile':
        viewport.style.maxWidth = '375px';
        break;
      case 'tablet':
        viewport.style.maxWidth = '768px';
        break;
      case 'desktop':
        viewport.style.maxWidth = '1280px';
        break;
      default:
        viewport.style.maxWidth = '100%';
    }
    setViewportSize(size);
  };

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 控制面板 */}
        <div className="bg-base-100 rounded-xl p-4 shadow-sm">
          <h1 className="text-xl font-bold mb-4">响应式指标卡测试页</h1>
          
          <div className="flex flex-wrap gap-4">
            {/* 视口大小选择 */}
            <div>
              <label className="text-sm font-medium mb-2 block">视口大小</label>
              <div className="btn-group">
                <button 
                  className={`btn btn-sm ${viewportSize === 'auto' ? 'btn-primary' : ''}`}
                  onClick={() => simulateViewport('auto')}
                >
                  自动
                </button>
                <button 
                  className={`btn btn-sm ${viewportSize === 'mobile' ? 'btn-primary' : ''}`}
                  onClick={() => simulateViewport('mobile')}
                >
                  手机 (375px)
                </button>
                <button 
                  className={`btn btn-sm ${viewportSize === 'tablet' ? 'btn-primary' : ''}`}
                  onClick={() => simulateViewport('tablet')}
                >
                  平板 (768px)
                </button>
                <button 
                  className={`btn btn-sm ${viewportSize === 'desktop' ? 'btn-primary' : ''}`}
                  onClick={() => simulateViewport('desktop')}
                >
                  桌面 (1280px)
                </button>
              </div>
            </div>

            {/* 布局模式选择 */}
            <div>
              <label className="text-sm font-medium mb-2 block">布局模式</label>
              <div className="btn-group">
                <button 
                  className={`btn btn-sm ${layout === 'auto' ? 'btn-primary' : ''}`}
                  onClick={() => setLayout('auto')}
                >
                  自动
                </button>
                <button 
                  className={`btn btn-sm ${layout === 'grid' ? 'btn-primary' : ''}`}
                  onClick={() => setLayout('grid')}
                >
                  网格
                </button>
                <button 
                  className={`btn btn-sm ${layout === 'carousel' ? 'btn-primary' : ''}`}
                  onClick={() => setLayout('carousel')}
                >
                  轮播
                </button>
                <button 
                  className={`btn btn-sm ${layout === 'list' ? 'btn-primary' : ''}`}
                  onClick={() => setLayout('list')}
                >
                  列表
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-base-content/70">
            <p>当前窗口宽度: {window.innerWidth}px</p>
            <p>设备类型: {window.innerWidth < 640 ? '移动端' : window.innerWidth < 1024 ? '平板' : '桌面'}</p>
          </div>
        </div>

        {/* 测试视口 */}
        <div 
          id="test-viewport" 
          className="bg-base-100 rounded-xl p-4 sm:p-6 shadow-sm mx-auto transition-all duration-300"
        >
          <h2 className="text-lg font-semibold mb-4">标准指标组 (4个)</h2>
          <ResponsiveIndicatorSection
            indicators={indicators}
            layout={layout}
            className="mb-8"
          />

          <h2 className="text-lg font-semibold mb-4">扩展指标组 (6个)</h2>
          <ResponsiveIndicatorSection
            indicators={[...indicators, ...additionalIndicators]}
            layout={layout}
            className="mb-8"
          />

          <h2 className="text-lg font-semibold mb-4">单个指标</h2>
          <ResponsiveIndicatorSection
            indicators={[indicators[0]]}
            layout={layout}
            className="mb-8"
          />

          <h2 className="text-lg font-semibold mb-4">移动优化指标卡（独立组件）</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MobileOptimizedIndicator
              icon={<DollarSign className="w-5 h-5 text-success" />}
              title="今日收入"
              subtitle="实时统计"
              value="12,580"
              valuePrefix="¥"
              trend="up"
              trendValue="+23%"
              trendLabel="较昨日"
              variant="success"
              onClick={() => console.log('Mobile optimized clicked')}
              actionLabel="详情"
            />
            
            <MobileOptimizedIndicator
              icon={<AlertCircle className="w-5 h-5 text-warning" />}
              title="待处理订单"
              value={45}
              valueSuffix="个"
              variant="warning"
              onClick={() => console.log('Orders clicked')}
              onSwipeLeft={() => console.log('Swiped left')}
              onSwipeRight={() => console.log('Swiped right')}
            />

            <MobileOptimizedIndicator
              icon={<Clock className="w-5 h-5 text-error" />}
              title="超时提醒"
              value={3}
              variant="error"
              compact
              onClick={() => console.log('Timeout clicked')}
            />
          </div>

          <h2 className="text-lg font-semibold mb-4 mt-8">迷你指标列表</h2>
          <div className="space-y-2 max-w-md">
            <MiniIndicator
              icon={<DollarSign className="w-4 h-4 text-success" />}
              label="今日收入"
              value="¥12,580"
              trend="up"
              onClick={() => console.log('Mini 1 clicked')}
            />
            <MiniIndicator
              icon={<FileText className="w-4 h-4 text-info" />}
              label="处理中"
              value="23"
              trend="neutral"
              onClick={() => console.log('Mini 2 clicked')}
            />
            <MiniIndicator
              icon={<Clock className="w-4 h-4 text-warning" />}
              label="待审核"
              value="8"
              trend="down"
              onClick={() => console.log('Mini 3 clicked')}
            />
          </div>
        </div>

        {/* 响应式断点参考 */}
        <div className="bg-base-100 rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold mb-3">响应式断点参考</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="p-3 bg-base-200 rounded-lg">
              <div className="font-medium">移动端</div>
              <div className="text-base-content/70">&lt; 640px</div>
              <div className="text-xs text-base-content/50 mt-1">单列布局，轮播模式</div>
            </div>
            <div className="p-3 bg-base-200 rounded-lg">
              <div className="font-medium">小平板</div>
              <div className="text-base-content/70">640px - 768px</div>
              <div className="text-xs text-base-content/50 mt-1">2列网格</div>
            </div>
            <div className="p-3 bg-base-200 rounded-lg">
              <div className="font-medium">大平板</div>
              <div className="text-base-content/70">768px - 1024px</div>
              <div className="text-xs text-base-content/50 mt-1">3列网格</div>
            </div>
            <div className="p-3 bg-base-200 rounded-lg">
              <div className="font-medium">桌面</div>
              <div className="text-base-content/70">&gt; 1024px</div>
              <div className="text-xs text-base-content/50 mt-1">4列网格</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResponsiveIndicators;