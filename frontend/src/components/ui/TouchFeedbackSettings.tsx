/**
 * 触摸反馈设置组件
 * 允许用户自定义触觉反馈和触摸反馈偏好
 */

import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Settings, 
  TestTube,
  Zap,
  Eye,
  Accessibility,
} from 'lucide-react';
import { hapticManager, HapticType } from '../../services/hapticFeedbackManager';

interface TouchFeedbackSettingsProps {
  /** 是否显示为模态框 */
  modal?: boolean;
  /** 模态框标题 */
  title?: string;
  /** 关闭回调 */
  onClose?: () => void;
}

export const TouchFeedbackSettings: React.FC<TouchFeedbackSettingsProps> = ({
  modal = false,
  title = '触摸反馈设置',
  onClose,
}) => {
  const [preferences, setPreferences] = useState(hapticManager.getPreferences());
  const [deviceCapabilities] = useState(hapticManager.getDeviceCapabilities());
  const [isTestingHaptic, setIsTestingHaptic] = useState<HapticType | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  // 同步偏好设置
  useEffect(() => {
    const currentPreferences = hapticManager.getPreferences();
    setPreferences(currentPreferences);
  }, []);

  // 更新偏好设置
  const updatePreference = <K extends keyof typeof preferences>(
    key: K,
    value: typeof preferences[K]
  ) => {
    hapticManager.updatePreference(key, value);
    setPreferences(hapticManager.getPreferences());
  };

  // 测试触觉反馈
  const testHapticType = async (type: HapticType) => {
    setIsTestingHaptic(type);
    
    try {
      const success = await hapticManager.testHaptic(type);
      setTestResults(prev => ({ ...prev, [type]: success }));
    } catch (error) {
      console.error('Haptic test failed:', error);
      setTestResults(prev => ({ ...prev, [type]: false }));
    } finally {
      setTimeout(() => setIsTestingHaptic(null), 500);
    }
  };

  // 测试所有触觉反馈
  const testAllHaptics = async () => {
    setIsTestingHaptic('light'); // 显示正在测试
    
    try {
      const results = await hapticManager.testAllHaptics();
      setTestResults(results);
    } catch (error) {
      console.error('All haptic tests failed:', error);
    } finally {
      setIsTestingHaptic(null);
    }
  };

  // 重置设置
  const resetSettings = () => {
    hapticManager.resetPreferences();
    setPreferences(hapticManager.getPreferences());
    setTestResults({});
  };

  // 触觉反馈类型配置
  const hapticTypes: Array<{ 
    type: HapticType; 
    label: string; 
    description: string;
    icon: React.ReactNode;
  }> = [
    { 
      type: 'light', 
      label: '轻微', 
      description: '按钮点击、轻触反馈',
      icon: <Zap className="w-4 h-4" />,
    },
    { 
      type: 'medium', 
      label: '中等', 
      description: '长按、状态切换',
      icon: <Zap className="w-4 h-4" />,
    },
    { 
      type: 'heavy', 
      label: '强烈', 
      description: '重要操作确认',
      icon: <Zap className="w-4 h-4" />,
    },
    { 
      type: 'success', 
      label: '成功', 
      description: '操作成功反馈',
      icon: <Zap className="w-4 h-4 text-success" />,
    },
    { 
      type: 'warning', 
      label: '警告', 
      description: '注意提示反馈',
      icon: <Zap className="w-4 h-4 text-warning" />,
    },
    { 
      type: 'error', 
      label: '错误', 
      description: '错误提示反馈',
      icon: <Zap className="w-4 h-4 text-error" />,
    },
    { 
      type: 'selection', 
      label: '选择', 
      description: '选项变更反馈',
      icon: <Zap className="w-4 h-4" />,
    },
    { 
      type: 'notification', 
      label: '通知', 
      description: '通知提醒反馈',
      icon: <Zap className="w-4 h-4 text-info" />,
    },
  ];

  const content = (
    <div className="space-y-6">
      {/* 设备能力信息 */}
      <div className="alert alert-info">
        <Smartphone className="w-5 h-5" />
        <div>
          <div className="font-semibold">设备支持</div>
          <div className="text-sm opacity-80">
            震动支持: {deviceCapabilities.supportsVibration ? '✓' : '✗'} | 
            iOS 触觉: {deviceCapabilities.supportsIOSHaptic ? '✓' : '✗'} | 
            设备类型: {deviceCapabilities.deviceType} ({deviceCapabilities.platform})
          </div>
        </div>
      </div>

      {/* 基础设置 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          基础设置
        </h3>

        {/* 启用/禁用触觉反馈 */}
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text flex items-center gap-2">
              {preferences.enabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              启用触觉反馈
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={preferences.enabled}
              onChange={(e) => updatePreference('enabled', e.target.checked)}
            />
          </label>
        </div>

        {/* 强度调节 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">反馈强度</span>
            <span className="label-text-alt">{Math.round(preferences.intensity * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            className="range range-primary"
            value={preferences.intensity}
            onChange={(e) => updatePreference('intensity', parseFloat(e.target.value))}
            disabled={!preferences.enabled}
          />
          <div className="w-full flex justify-between text-xs px-2">
            <span>轻微</span>
            <span>适中</span>
            <span>强烈</span>
          </div>
        </div>

        {/* 静音模式专用 */}
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text flex items-center gap-2">
              <VolumeX className="w-4 h-4" />
              仅在静音模式下启用
            </span>
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              checked={preferences.silentModeOnly}
              onChange={(e) => updatePreference('silentModeOnly', e.target.checked)}
              disabled={!preferences.enabled}
            />
          </label>
          <div className="label">
            <span className="label-text-alt">
              勾选后仅在设备静音时触发触觉反馈
            </span>
          </div>
        </div>
      </div>

      {/* 触觉类型设置 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Eye className="w-5 h-5" />
          反馈类型控制
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hapticTypes.map(({ type, label, description, icon }) => (
            <div key={type} className="card card-compact bg-base-200">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {icon}
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-xs opacity-70">{description}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* 禁用开关 */}
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={!preferences.disabledTypes.includes(type)}
                      onChange={(e) => {
                        const isEnabled = e.target.checked;
                        const disabledTypes = isEnabled
                          ? preferences.disabledTypes.filter(t => t !== type)
                          : [...preferences.disabledTypes, type];
                        updatePreference('disabledTypes', disabledTypes);
                      }}
                      disabled={!preferences.enabled}
                    />
                    
                    {/* 测试按钮 */}
                    <button
                      className={`btn btn-xs ${isTestingHaptic === type ? 'loading' : ''}`}
                      onClick={() => testHapticType(type)}
                      disabled={!preferences.enabled || isTestingHaptic !== null}
                    >
                      {isTestingHaptic === type ? '' : '测试'}
                    </button>
                    
                    {/* 测试结果指示器 */}
                    {testResults[type] !== undefined && (
                      <div 
                        className={`w-2 h-2 rounded-full ${
                          testResults[type] ? 'bg-success' : 'bg-error'
                        }`}
                        title={testResults[type] ? '测试成功' : '测试失败'}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 测试和重置 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          测试与重置
        </h3>

        <div className="flex flex-wrap gap-2">
          <button
            className={`btn btn-outline ${isTestingHaptic ? 'loading' : ''}`}
            onClick={testAllHaptics}
            disabled={!preferences.enabled || isTestingHaptic !== null}
          >
            {isTestingHaptic ? '测试中...' : '测试所有类型'}
          </button>
          
          <button
            className="btn btn-outline btn-warning"
            onClick={resetSettings}
          >
            重置设置
          </button>
        </div>

        {Object.keys(testResults).length > 0 && (
          <div className="alert alert-info">
            <div>
              <div className="font-semibold">测试结果</div>
              <div className="text-sm">
                成功: {Object.values(testResults).filter(Boolean).length} / {Object.keys(testResults).length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 无障碍说明 */}
      <div className="alert alert-warning">
        <Accessibility className="w-5 h-5" />
        <div>
          <div className="font-semibold">无障碍支持</div>
          <div className="text-sm">
            触觉反馈会根据系统的"减少动画"设置自动调整。
            如果启用了屏幕阅读器，部分触觉反馈会转换为语音提示。
          </div>
        </div>
      </div>
    </div>
  );

  // 如果是模态框模式
  if (modal) {
    return (
      <div className="modal modal-open">
        <div className="modal-box w-11/12 max-w-4xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{title}</h2>
            {onClose && (
              <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
                ✕
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {content}
          </div>
          
          <div className="modal-action">
            {onClose && (
              <button className="btn" onClick={onClose}>
                关闭
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 普通组件模式
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {content}
    </div>
  );
};

export default TouchFeedbackSettings;