import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Maximize2, Minimize2 } from 'lucide-react';
import { useDeviceDetection } from '../../hooks/useMediaQuery';

interface CompactModeToggleProps {
  className?: string;
  showLabel?: boolean;
}

// 紧凑模式设置类型
export type CompactModeSettings = {
  mode: 'auto' | 'always' | 'never';
  preference: 'default' | 'compact' | 'spacious';
};

// 默认设置
const defaultSettings: CompactModeSettings = {
  mode: 'auto',
  preference: 'default'
};

export const CompactModeToggle: React.FC<CompactModeToggleProps> = ({
  className = '',
  showLabel = true
}) => {
  const device = useDeviceDetection();
  const [settings, setSettings] = useState<CompactModeSettings>(defaultSettings);
  const [isOpen, setIsOpen] = useState(false);

  // 从localStorage加载设置
  useEffect(() => {
    try {
      const saved = localStorage.getItem('compact-mode-settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Failed to load compact mode settings:', error);
    }
  }, []);

  // 保存设置到localStorage
  const saveSettings = (newSettings: CompactModeSettings) => {
    try {
      localStorage.setItem('compact-mode-settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      
      // 触发自定义事件通知其他组件
      window.dispatchEvent(new CustomEvent('compact-mode-changed', {
        detail: newSettings
      }));
    } catch (error) {
      console.warn('Failed to save compact mode settings:', error);
    }
  };

  // 获取当前有效的紧凑模式状态
  const getEffectiveMode = () => {
    switch (settings.mode) {
      case 'always':
        return true;
      case 'never':
        return false;
      case 'auto':
      default:
        // 自动模式：在桌面端且屏幕宽度 >= 1024px 时启用紧凑模式
        return !device.isMobile && window.innerWidth >= 1024;
    }
  };

  const isCompactActive = getEffectiveMode();

  const handleModeChange = (mode: CompactModeSettings['mode']) => {
    saveSettings({ ...settings, mode });
    setIsOpen(false);
  };

  const handlePreferenceChange = (preference: CompactModeSettings['preference']) => {
    saveSettings({ ...settings, preference });
  };

  const getModeIcon = () => {
    if (isCompactActive) {
      return <Minimize2 className="w-4 h-4" />;
    } else {
      return <Maximize2 className="w-4 h-4" />;
    }
  };

  const getModeText = () => {
    if (settings.mode === 'auto') {
      return isCompactActive ? '紧凑 (自动)' : '标准 (自动)';
    }
    return settings.mode === 'always' ? '紧凑模式' : '标准模式';
  };

  return (
    <div className={`relative ${className}`}>
      <div className="dropdown dropdown-end">
        <div
          tabIndex={0}
          role="button"
          className="btn btn-ghost btn-sm flex items-center gap-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          {getModeIcon()}
          {showLabel && (
            <span className="text-sm">{getModeText()}</span>
          )}
        </div>

        {isOpen && (
          <ul
            tabIndex={0}
            className="dropdown-content menu shadow-lg bg-base-100 rounded-box w-64 p-3 border border-base-200 z-50"
          >
            {/* 标题 */}
            <li className="menu-title">
              <span className="text-base-content/70 font-semibold">显示密度</span>
            </li>

            {/* 模式选择 */}
            <li>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="radio"
                    name="compact-mode"
                    className="radio radio-sm radio-primary"
                    checked={settings.mode === 'auto'}
                    onChange={() => handleModeChange('auto')}
                  />
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    <div>
                      <div className="font-medium">自动模式</div>
                      <div className="text-xs text-base-content/60">
                        桌面端紧凑，移动端标准
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </li>

            <li>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="radio"
                    name="compact-mode"
                    className="radio radio-sm radio-primary"
                    checked={settings.mode === 'always'}
                    onChange={() => handleModeChange('always')}
                  />
                  <div className="flex items-center gap-2">
                    <Minimize2 className="w-4 h-4" />
                    <div>
                      <div className="font-medium">始终紧凑</div>
                      <div className="text-xs text-base-content/60">
                        所有设备使用紧凑布局
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </li>

            <li>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="radio"
                    name="compact-mode"
                    className="radio radio-sm radio-primary"
                    checked={settings.mode === 'never'}
                    onChange={() => handleModeChange('never')}
                  />
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-4 h-4" />
                    <div>
                      <div className="font-medium">始终标准</div>
                      <div className="text-xs text-base-content/60">
                        所有设备使用标准布局
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </li>

            <div className="divider my-2"></div>

            {/* 当前状态显示 */}
            <li>
              <div className="alert alert-info alert-sm">
                <div className="flex items-center gap-2">
                  {device.isMobile ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <Monitor className="w-4 h-4" />
                  )}
                  <div>
                    <div className="text-xs font-medium">
                      当前状态: {isCompactActive ? '紧凑模式' : '标准模式'}
                    </div>
                    <div className="text-xs opacity-70">
                      {device.isMobile ? '移动设备' : '桌面设备'} | 屏幕宽度: {window.innerWidth}px
                    </div>
                  </div>
                </div>
              </div>
            </li>

            {/* 说明 */}
            <li>
              <div className="text-xs text-base-content/60 p-2">
                <div className="mb-2 font-medium">紧凑模式特点:</div>
                <ul className="space-y-1 text-xs">
                  <li>• 减少卡片内边距和间距</li>
                  <li>• 更小的按钮和表单元素</li>
                  <li>• 更密集的信息展示</li>
                  <li>• 移动端保持触控友好</li>
                </ul>
              </div>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
};

// Hook for using compact mode settings
export const useCompactMode = () => {
  const device = useDeviceDetection();
  const [settings, setSettings] = useState<CompactModeSettings>(defaultSettings);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('compact-mode-settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Failed to load compact mode settings:', error);
    }

    // 监听设置变化
    const handleSettingsChange = (event: CustomEvent<CompactModeSettings>) => {
      setSettings(event.detail);
    };

    window.addEventListener('compact-mode-changed', handleSettingsChange as EventListener);

    return () => {
      window.removeEventListener('compact-mode-changed', handleSettingsChange as EventListener);
    };
  }, []);

  // 计算当前是否应该使用紧凑模式
  const isCompactMode = () => {
    switch (settings.mode) {
      case 'always':
        return true;
      case 'never':
        return false;
      case 'auto':
      default:
        return !device.isMobile && window.innerWidth >= 1024;
    }
  };

  return {
    settings,
    isCompactMode: isCompactMode(),
    isCompactActive: isCompactMode()
  };
};

export default CompactModeToggle;