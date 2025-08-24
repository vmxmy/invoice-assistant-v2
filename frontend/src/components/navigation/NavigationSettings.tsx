import React, { useState } from 'react';
import { 
  Settings, 
  Smartphone, 
  TabletSmartphone, 
  Monitor,
  Eye,
  EyeOff,
  Minimize2,
  Maximize2,
  Navigation,
  Layers,
  Hand
} from 'lucide-react';
import { useNavigationPreferences } from './NavigationProvider';
import { useDeviceDetection } from '../../hooks/useMediaQuery';

interface NavigationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const NavigationSettings: React.FC<NavigationSettingsProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const { preferences, updatePreferences } = useNavigationPreferences();
  const device = useDeviceDetection();
  const [previewMode, setPreviewMode] = useState<string | null>(null);

  // 导航模式选项
  const navigationModes = [
    {
      id: 'tabs' as const,
      name: '标签导航',
      description: '底部标签栏，适合快速切换',
      icon: TabletSmartphone,
      recommended: device.isMobile && !device.isTablet
    },
    {
      id: 'drawer' as const,
      name: '抽屉导航',
      description: '侧滑菜单，容纳更多选项',
      icon: Layers,
      recommended: device.isTablet
    },
    {
      id: 'hybrid' as const,
      name: '智能适配',
      description: '根据设备自动选择最佳模式',
      icon: Smartphone,
      recommended: true
    }
  ];

  // 标签变体选项
  const tabVariants = [
    {
      id: 'minimal' as const,
      name: '极简',
      description: '最小高度，节省屏幕空间',
      icon: Minimize2
    },
    {
      id: 'standard' as const,
      name: '标准',
      description: '平衡的高度和可用性',
      icon: Navigation
    },
    {
      id: 'enhanced' as const,
      name: '增强',
      description: '更大触摸区域，包含浮动按钮',
      icon: Maximize2
    }
  ];

  const handleModeChange = (mode: typeof preferences.mobileNavType) => {
    updatePreferences({ mobileNavType: mode });
    
    // 触觉反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
  };

  const handleVariantChange = (variant: typeof preferences.tabsVariant) => {
    updatePreferences({ tabsVariant: variant });
  };

  const handleToggleLabels = () => {
    updatePreferences({ showLabels: !preferences.showLabels });
  };

  const handleToggleCompact = () => {
    updatePreferences({ compactMode: !preferences.compactMode });
  };

  const handleToggleAutoHide = () => {
    updatePreferences({ autoHideNav: !preferences.autoHideNav });
  };

  const handlePreviewMode = (mode: string) => {
    setPreviewMode(previewMode === mode ? null : mode);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 设置面板 */}
      <div className={`
        fixed inset-x-4 top-20 bottom-20 z-50 max-w-lg mx-auto
        bg-base-100 rounded-2xl shadow-2xl
        flex flex-col overflow-hidden
        ${className}
      `}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-base-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">导航设置</h2>
              <p className="text-sm text-base-content/60">自定义导航体验</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="btn btn-ghost btn-square btn-sm"
          >
            ✕
          </button>
        </div>

        {/* 设置内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 设备信息 */}
          <div className="bg-base-200/50 rounded-xl p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              当前设备
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-base-content/60">类型:</span>
                <span className="capitalize">{device.deviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">方向:</span>
                <span>{device.isPortrait ? '竖屏' : '横屏'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">触控:</span>
                <span>{device.isTouchDevice ? '是' : '否'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">屏幕:</span>
                <span>{device.isShortScreen ? '短屏' : '标准'}</span>
              </div>
            </div>
          </div>

          {/* 导航模式选择 */}
          <div>
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              导航模式
            </h3>
            <div className="space-y-3">
              {navigationModes.map((mode) => {
                const Icon = mode.icon;
                const isActive = preferences.mobileNavType === mode.id;
                
                return (
                  <label
                    key={mode.id}
                    className={`
                      block p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${isActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-base-300 hover:border-primary/50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="navMode"
                      value={mode.id}
                      checked={isActive}
                      onChange={() => handleModeChange(mode.id)}
                      className="sr-only"
                    />
                    
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 ${isActive ? 'text-primary' : 'text-base-content/60'}`} />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isActive ? 'text-primary' : ''}`}>
                            {mode.name}
                          </span>
                          {mode.recommended && (
                            <span className="px-2 py-0.5 text-xs bg-success/20 text-success rounded-full">
                              推荐
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-base-content/60 mt-1">
                          {mode.description}
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 标签变体设置 */}
          {preferences.mobileNavType !== 'drawer' && (
            <div>
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <TabletSmartphone className="w-4 h-4" />
                标签样式
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {tabVariants.map((variant) => {
                  const Icon = variant.icon;
                  const isActive = preferences.tabsVariant === variant.id;
                  
                  return (
                    <button
                      key={variant.id}
                      onClick={() => handleVariantChange(variant.id)}
                      className={`
                        p-3 rounded-lg border text-center transition-all
                        ${isActive 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-base-300 hover:border-primary/50'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 mx-auto mb-1" />
                      <div className="text-xs font-medium">{variant.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 开关设置 */}
          <div>
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Hand className="w-4 h-4" />
              显示选项
            </h3>
            <div className="space-y-4">
              {/* 显示标签 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">显示标签文字</div>
                  <div className="text-sm text-base-content/60">在图标下方显示文字</div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={preferences.showLabels}
                  onChange={handleToggleLabels}
                />
              </div>

              {/* 紧凑模式 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">紧凑模式</div>
                  <div className="text-sm text-base-content/60">减小导航栏高度</div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={preferences.compactMode}
                  onChange={handleToggleCompact}
                />
              </div>

              {/* 自动隐藏 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">滚动时隐藏</div>
                  <div className="text-sm text-base-content/60">向下滚动时自动隐藏导航栏</div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={preferences.autoHideNav}
                  onChange={handleToggleAutoHide}
                />
              </div>
            </div>
          </div>

          {/* 使用提示 */}
          <div className="bg-info/10 border border-info/20 rounded-xl p-4">
            <h4 className="font-medium text-info mb-2">💡 使用提示</h4>
            <ul className="text-sm text-base-content/70 space-y-1">
              <li>• 从屏幕左边缘右滑可以返回上一页</li>
              <li>• 在标签导航中左右滑动可以快速切换</li>
              <li>• 长按标签可以查看更多操作</li>
              <li>• 设置会自动保存到本地存储</li>
            </ul>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="p-6 border-t border-base-200">
          <div className="flex gap-3">
            <button
              onClick={() => {
                updatePreferences(defaultPreferences);
                if ('vibrate' in navigator) {
                  navigator.vibrate(50);
                }
              }}
              className="btn btn-outline flex-1"
            >
              重置默认
            </button>
            <button
              onClick={onClose}
              className="btn btn-primary flex-1"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// 默认偏好设置（重复定义，确保一致性）
const defaultPreferences = {
  mobileNavType: 'hybrid' as const,
  showLabels: true,
  compactMode: false,
  autoHideNav: false,
  tabsVariant: 'standard' as const
};

export default NavigationSettings;