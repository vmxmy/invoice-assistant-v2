/**
 * 触摸反馈系统使用示例
 * 展示各种触摸反馈功能的用法
 */

import React, { useState } from 'react';
import {
  Heart,
  Star,
  Settings,
  Download,
  Share,
  Trash2,
  Plus,
  Menu,
  ShoppingCart,
  Bell,
} from 'lucide-react';

// 导入触摸反馈组件
import {
  RippleEffect,
  RippleButton,
  LongPressHandler,
  LongPressButton,
  TouchFeedbackWrapper,
  TouchButton,
  TouchCard,
  TouchListItem,
  TouchNavItem,
  TouchFeedbackSettings,
  useTouchFeedback,
  touchFeedbackPresets,
  hapticPresets,
  touchFeedbackOptimizer,
  usePerformanceMonitoring,
} from './index';

export const TouchFeedbackExamples: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [likes, setLikes] = useState(0);
  const [cartItems, setCartItems] = useState(3);
  
  const { getMetrics, getDevicePerformance } = usePerformanceMonitoring();

  // 切换选择状态
  const toggleSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">触摸反馈系统示例</h1>
        <p className="text-base-content/70">
          演示各种触摸反馈功能，包括涟漪效果、长按检测和触觉反馈
        </p>
      </div>

      {/* 基础涟漪效果示例 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1. 涟漪效果 (Ripple Effect)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RippleEffect
            className="card card-compact bg-primary text-primary-content p-6 cursor-pointer"
            onClick={() => console.log('默认涟漪点击')}
          >
            <div className="text-center">
              <Heart className="w-8 h-8 mx-auto mb-2" />
              <p>默认涟漪</p>
            </div>
          </RippleEffect>

          <RippleEffect
            className="card card-compact bg-secondary text-secondary-content p-6 cursor-pointer"
            color="rgba(255,255,255,0.5)"
            scale={3}
            duration={800}
            onClick={() => console.log('自定义涟漪点击')}
          >
            <div className="text-center">
              <Star className="w-8 h-8 mx-auto mb-2" />
              <p>自定义涟漪</p>
            </div>
          </RippleEffect>

          <RippleEffect
            className="card card-compact bg-accent text-accent-content p-6 cursor-pointer"
            centered
            color="rgb(var(--fallback-wa))"
            onClick={() => console.log('居中涟漪点击')}
          >
            <div className="text-center">
              <Settings className="w-8 h-8 mx-auto mb-2" />
              <p>居中涟漪</p>
            </div>
          </RippleEffect>
        </div>
      </section>

      {/* 涟漪按钮示例 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">2. 涟漪按钮 (Ripple Button)</h2>
        <div className="flex flex-wrap gap-4">
          <RippleButton variant="primary" size="sm">
            小按钮
          </RippleButton>
          <RippleButton variant="secondary" size="md">
            中按钮
          </RippleButton>
          <RippleButton variant="accent" size="lg">
            大按钮
          </RippleButton>
          <RippleButton variant="ghost">
            幽灵按钮
          </RippleButton>
          <RippleButton variant="outline">
            轮廓按钮
          </RippleButton>
        </div>
      </section>

      {/* 长按处理示例 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. 长按检测 (Long Press)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LongPressHandler
            className="card card-compact bg-info text-info-content p-6 cursor-pointer"
            threshold={800}
            onTap={() => {
              setLikes(prev => prev + 1);
              hapticPresets.buttonTap();
            }}
            onLongPress={() => {
              setLikes(prev => prev + 5);
              hapticPresets.actionSuccess();
            }}
            onLongPressStart={() => console.log('开始长按点赞')}
          >
            <div className="text-center">
              <Heart className="w-8 h-8 mx-auto mb-2" />
              <p>点击 +1, 长按 +5</p>
              <p className="text-lg font-bold">{likes} 赞</p>
            </div>
          </LongPressHandler>

          <LongPressButton
            variant="warning"
            threshold={1000}
            longPressHint="长按删除"
            onTap={() => console.log('普通点击')}
            onLongPress={() => {
              console.log('执行删除操作');
              hapticPresets.actionWarning();
            }}
          >
            <Trash2 className="w-5 h-5 mr-2" />
            危险操作
          </LongPressButton>
        </div>
      </section>

      {/* 触摸反馈包装器示例 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4. 触摸反馈包装器</h2>
        
        {/* 卡片示例 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(id => (
            <TouchCard
              key={id}
              preset="card"
              onTap={() => console.log(`查看卡片 ${id}`)}
              onLongPress={() => toggleSelection(`card-${id}`)}
              className={`card-body ${
                selectedItems.includes(`card-${id}`) ? 'bg-primary/10 border-primary' : ''
              }`}
            >
              <h3 className="card-title">产品卡片 {id}</h3>
              <p>这是一个支持触摸反馈的卡片组件。点击查看，长按选择。</p>
              <div className="card-actions justify-end">
                <TouchButton
                  preset="button"
                  size="sm"
                  onTap={() => {
                    setCartItems(prev => prev + 1);
                    hapticPresets.actionSuccess();
                  }}
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  加入购物车
                </TouchButton>
              </div>
            </TouchCard>
          ))}
        </div>

        {/* 列表项示例 */}
        <div className="card bg-base-100 border">
          <div className="card-header p-4 border-b">
            <h3 className="text-lg font-semibold">触摸反馈列表</h3>
          </div>
          <div className="card-body p-0">
            {['消息 1', '消息 2', '消息 3', '重要消息'].map((item, index) => (
              <TouchListItem
                key={item}
                preset="listItem"
                className={`p-4 border-b last:border-b-0 ${
                  selectedItems.includes(item) ? 'bg-primary/10' : ''
                }`}
                onTap={() => console.log(`点击: ${item}`)}
                onLongPress={() => toggleSelection(item)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 3 ? 'bg-error' : 'bg-success'
                    }`} />
                    <span className={index === 3 ? 'font-semibold' : ''}>
                      {item}
                    </span>
                  </div>
                  {index === 3 && (
                    <Bell className="w-4 h-4 text-error" />
                  )}
                </div>
              </TouchListItem>
            ))}
          </div>
        </div>
      </section>

      {/* 导航项示例 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">5. 导航触摸反馈</h2>
        <div className="navbar bg-base-200 rounded-box">
          <div className="navbar-start">
            <TouchNavItem
              preset="navigation"
              className="btn btn-ghost"
              onTap={() => console.log('菜单点击')}
            >
              <Menu className="w-5 h-5" />
            </TouchNavItem>
          </div>
          
          <div className="navbar-center">
            <TouchNavItem
              preset="navigation"
              className="btn btn-ghost text-xl"
              onTap={() => console.log('首页点击')}
            >
              应用标题
            </TouchNavItem>
          </div>
          
          <div className="navbar-end gap-2">
            <TouchNavItem
              preset="navigation"
              className="btn btn-ghost btn-circle relative"
              onTap={() => console.log('购物车点击')}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItems > 0 && (
                <span className="badge badge-error badge-xs absolute -top-1 -right-1">
                  {cartItems}
                </span>
              )}
            </TouchNavItem>
            
            <TouchNavItem
              preset="navigation"
              className="btn btn-ghost btn-circle"
              onTap={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-5 h-5" />
            </TouchNavItem>
          </div>
        </div>
      </section>

      {/* 自定义触摸反馈示例 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">6. 自定义触摸反馈</h2>
        <CustomTouchFeedbackExample />
      </section>

      {/* 性能监控示例 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">7. 性能监控</h2>
        <PerformanceMonitorExample />
      </section>

      {/* 操作按钮 */}
      <section className="flex justify-center gap-4">
        <TouchButton
          preset="button"
          variant="primary"
          onTap={() => setIsSettingsOpen(true)}
        >
          <Settings className="w-5 h-5 mr-2" />
          打开设置
        </TouchButton>
        
        <TouchButton
          preset="button"
          variant="outline"
          onTap={() => {
            const report = touchFeedbackOptimizer.generatePerformanceReport();
            console.log('性能报告:', report);
            alert('性能报告已输出到控制台');
          }}
        >
          生成性能报告
        </TouchButton>
      </section>

      {/* 设置模态框 */}
      {isSettingsOpen && (
        <TouchFeedbackSettings
          modal
          title="触摸反馈设置"
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};

// 自定义触摸反馈示例组件
const CustomTouchFeedbackExample: React.FC = () => {
  const touchFeedback = useTouchFeedback(
    {
      ripple: true,
      rippleColor: 'rgb(var(--fallback-su))',
      rippleOpacity: 0.4,
      longPress: true,
      longPressThreshold: 700,
      haptic: true,
      hapticTap: 'selection',
      hapticLongPress: 'success',
    },
    {
      onTap: () => console.log('自定义点击'),
      onLongPress: () => console.log('自定义长按'),
      onLongPressStart: () => console.log('开始自定义长按'),
    }
  );

  return (
    <div
      className={`
        card card-compact bg-success text-success-content p-6 cursor-pointer relative
        ${touchFeedback.isPressed ? 'scale-95' : ''}
        ${touchFeedback.isLongPressing ? 'ring-2 ring-success/50' : ''}
        transition-all duration-200
      `}
      {...touchFeedback}
    >
      <div className="text-center">
        <Plus className="w-8 h-8 mx-auto mb-2" />
        <p>自定义触摸反馈</p>
        <p className="text-sm opacity-80">
          状态: {touchFeedback.isPressed ? '按下' : touchFeedback.isLongPressing ? '长按中' : '空闲'}
        </p>
        {touchFeedback.isLongPressing && (
          <div className="text-xs mt-1">
            进度: {Math.round(touchFeedback.longPressProgress * 100)}%
          </div>
        )}
      </div>

      {/* 涟漪效果 */}
      {touchFeedback.rippleElements?.map((ripple) => (
        <span
          key={ripple.key}
          style={ripple.style}
        />
      ))}

      {/* 长按进度环 */}
      {touchFeedback.isLongPressing && (
        <div 
          className="absolute inset-[-2px] pointer-events-none rounded-lg border-2 border-transparent"
          style={touchFeedback.longPressProgressStyle}
        />
      )}
    </div>
  );
};

// 性能监控示例组件
const PerformanceMonitorExample: React.FC = () => {
  const { getMetrics, getDevicePerformance } = usePerformanceMonitoring();
  const [metrics, setMetrics] = useState(getMetrics());
  const [device] = useState(getDevicePerformance());

  // 定期更新指标
  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(getMetrics());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [getMetrics]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card bg-base-100 border">
        <div className="card-body">
          <h3 className="card-title">设备性能</h3>
          <div className="stats stats-vertical">
            <div className="stat">
              <div className="stat-title">性能等级</div>
              <div className="stat-value text-sm">{device.level}</div>
            </div>
            <div className="stat">
              <div className="stat-title">CPU核心</div>
              <div className="stat-value text-sm">{device.cpuCores}</div>
            </div>
            <div className="stat">
              <div className="stat-title">预估内存</div>
              <div className="stat-value text-sm">{device.estimatedRAM}MB</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 border">
        <div className="card-body">
          <h3 className="card-title">实时指标</h3>
          <div className="stats stats-vertical">
            <div className="stat">
              <div className="stat-title">帧率</div>
              <div className="stat-value text-sm">{metrics.averageFPS} FPS</div>
            </div>
            <div className="stat">
              <div className="stat-title">活跃涟漪</div>
              <div className="stat-value text-sm">{metrics.activeRipples}</div>
            </div>
            <div className="stat">
              <div className="stat-title">触觉频率</div>
              <div className="stat-value text-sm">{metrics.hapticTriggerRate.toFixed(1)}/s</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TouchFeedbackExamples;