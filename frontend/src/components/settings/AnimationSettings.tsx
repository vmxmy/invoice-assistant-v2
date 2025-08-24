/**
 * 动画设置组件
 * 允许用户自定义动画偏好和性能设置
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AnimatedButton, 
  AnimatedCard, 
  AnimatedToggle, 
  FeedbackToast,
  LoadingIndicator,
  Skeleton 
} from '../../animations/index';
import { useAnimationContext, useAnimationStatus } from '../../animations/AnimationProvider';

// 设置项组件
interface SettingItemProps {
  title: string;
  description: string;
  children: React.ReactNode;
  badge?: string;
}

const SettingItem: React.FC<SettingItemProps> = ({ 
  title, 
  description, 
  children, 
  badge 
}) => (
  <div className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0">
    <div className="flex-1 mr-4">
      <div className="flex items-center space-x-2">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        {badge && (
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
    <div>{children}</div>
  </div>
);

/**
 * 动画预览组件
 */
const AnimationPreview: React.FC = () => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState<'button' | 'card' | 'loading'>('button');
  
  const previews = {
    button: (
      <div className="space-y-3">
        <AnimatedButton variant="primary" onClick={() => {}}>
          主要按钮
        </AnimatedButton>
        <AnimatedButton variant="secondary" onClick={() => {}}>
          次要按钮
        </AnimatedButton>
      </div>
    ),
    card: (
      <AnimatedCard interactive className="p-4">
        <h4 className="font-medium mb-2">交互卡片示例</h4>
        <p className="text-sm text-gray-600">悬停或点击查看动画效果</p>
      </AnimatedCard>
    ),
    loading: (
      <div className="space-y-4">
        <LoadingIndicator type="spinner" size="medium" />
        <LoadingIndicator type="dots" size="medium" />
        <Skeleton config={{ lines: 3, avatar: true }} />
      </div>
    )
  };
  
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">动画预览</h3>
        <div className="flex space-x-2">
          {(['button', 'card', 'loading'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setPreviewType(type)}
              className={`px-2 py-1 text-xs rounded ${
                previewType === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {type === 'button' ? '按钮' : type === 'card' ? '卡片' : '加载'}
            </button>
          ))}
        </div>
      </div>
      
      <motion.div
        key={previewType}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[120px] flex items-center justify-center"
      >
        {previews[previewType]}
      </motion.div>
    </div>
  );
};

/**
 * 性能状态组件
 */
const PerformanceStatus: React.FC = () => {
  const { performanceData, systemConfig } = useAnimationContext();
  const status = useAnimationStatus();
  
  const statusColors = {
    excellent: 'bg-green-100 text-green-800',
    good: 'bg-blue-100 text-blue-800',
    fair: 'bg-yellow-100 text-yellow-800',
    poor: 'bg-red-100 text-red-800'
  };
  
  const statusIcons = {
    excellent: '🚀',
    good: '✅',
    fair: '⚠️',
    poor: '🐌'
  };
  
  if (!performanceData) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <Skeleton config={{ lines: 2, showShimmer: true }} />
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gray-50 p-4 rounded-lg"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">动画性能</h3>
        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[status.level]}`}>
          {statusIcons[status.level]} {status.level}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">平均帧率</span>
          <div className="font-semibold">{Math.round(status.fps)} FPS</div>
        </div>
        <div>
          <span className="text-gray-500">设备评分</span>
          <div className="font-semibold">{performanceData.deviceScore}/10</div>
        </div>
        <div>
          <span className="text-gray-500">GPU加速</span>
          <div className="font-semibold">
            {systemConfig.enableGPUAcceleration ? '✅ 启用' : '❌ 禁用'}
          </div>
        </div>
        <div>
          <span className="text-gray-500">并发动画</span>
          <div className="font-semibold">最多 {systemConfig.maxConcurrentAnimations}</div>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-gray-600">
        {status.message}
      </div>
    </motion.div>
  );
};

/**
 * 主动画设置组件
 */
export const AnimationSettings: React.FC = () => {
  const {
    preferences,
    updatePreferences,
    resetToDefaults,
    isReducedMotion,
    shouldUseSimpleAnimations,
    enabledFeatures
  } = useAnimationContext();
  
  const [showResetToast, setShowResetToast] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  
  const handleReset = () => {
    resetToDefaults();
    setShowResetToast(true);
  };
  
  const handleSave = () => {
    setShowSaveToast(true);
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-2">动画设置</h1>
        <p className="text-gray-600">自定义动画偏好以获得最佳体验</p>
      </motion.div>
      
      {/* 系统状态提醒 */}
      {isReducedMotion && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⚠️</span>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                检测到系统减少动画设置
              </h3>
              <p className="text-xs text-yellow-700 mt-1">
                您的系统偏好设置为减少动画，某些动画效果可能被简化或禁用。
              </p>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* 性能状态 */}
      <PerformanceStatus />
      
      {/* 基本动画设置 */}
      <AnimatedCard className="overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">基本设置</h2>
        </div>
        
        <SettingItem
          title="性能等级"
          description="根据设备性能自动调整动画复杂度"
        >
          <select
            value={preferences.performanceLevel}
            onChange={(e) => updatePreferences({ 
              performanceLevel: e.target.value as any 
            })}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="high">高性能</option>
            <option value="medium">中等</option>
            <option value="low">低性能</option>
            <option value="disabled">禁用动画</option>
          </select>
        </SettingItem>
        
        <SettingItem
          title="动画速度"
          description={`当前速度：${Math.round(preferences.animationScale * 100)}%`}
        >
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={preferences.animationScale}
              onChange={(e) => updatePreferences({ 
                animationScale: parseFloat(e.target.value) 
              })}
              className="w-20"
            />
            <span className="text-sm font-mono w-8">
              {preferences.animationScale.toFixed(1)}x
            </span>
          </div>
        </SettingItem>
        
        <SettingItem
          title="减少动画"
          description="简化或禁用装饰性动画效果"
        >
          <AnimatedToggle
            checked={preferences.reduceMotion}
            onChange={(checked) => updatePreferences({ reduceMotion: checked })}
          />
        </SettingItem>
        
        <SettingItem
          title="触觉反馈"
          description="在支持的设备上提供触觉反馈"
          badge={navigator.vibrate ? '支持' : '不支持'}
        >
          <AnimatedToggle
            checked={preferences.enableHapticFeedback}
            onChange={(checked) => updatePreferences({ enableHapticFeedback: checked })}
            disabled={!navigator.vibrate}
          />
        </SettingItem>
      </AnimatedCard>
      
      {/* 高级动画设置 */}
      <AnimatedCard className="overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">高级设置</h2>
        </div>
        
        <SettingItem
          title="视差效果"
          description="启用深度和立体感的视差滚动效果"
        >
          <AnimatedToggle
            checked={preferences.enableParallax && enabledFeatures.parallaxEffects}
            onChange={(checked) => updatePreferences({ enableParallax: checked })}
            disabled={shouldUseSimpleAnimations}
          />
        </SettingItem>
      </AnimatedCard>
      
      {/* 功能状态概览 */}
      <AnimatedCard className="overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">功能状态</h2>
        </div>
        
        <div className="p-4 grid grid-cols-2 gap-4 text-sm">
          {Object.entries(enabledFeatures).map(([feature, enabled]) => (
            <div key={feature} className="flex items-center justify-between">
              <span className="text-gray-600">
                {feature === 'pageTransitions' ? '页面切换' :
                 feature === 'listAnimations' ? '列表动画' :
                 feature === 'microInteractions' ? '微交互' :
                 feature === 'loadingAnimations' ? '加载动画' :
                 feature === 'parallaxEffects' ? '视差效果' : feature}
              </span>
              <span className={enabled ? 'text-green-600' : 'text-red-600'}>
                {enabled ? '✅' : '❌'}
              </span>
            </div>
          ))}
        </div>
      </AnimatedCard>
      
      {/* 动画预览 */}
      <AnimationPreview />
      
      {/* 操作按钮 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center space-x-4"
      >
        <AnimatedButton
          variant="secondary"
          onClick={handleReset}
          className="px-6"
        >
          重置默认
        </AnimatedButton>
        <AnimatedButton
          variant="primary"
          onClick={handleSave}
          className="px-6"
        >
          保存设置
        </AnimatedButton>
      </motion.div>
      
      {/* 反馈提示 */}
      <FeedbackToast
        type="success"
        message="设置已重置为默认值"
        visible={showResetToast}
        onClose={() => setShowResetToast(false)}
      />
      
      <FeedbackToast
        type="success"
        message="动画设置已保存"
        visible={showSaveToast}
        onClose={() => setShowSaveToast(false)}
      />
    </div>
  );
};