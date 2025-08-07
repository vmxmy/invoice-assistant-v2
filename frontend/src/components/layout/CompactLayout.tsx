import React, { useState, useEffect } from 'react';
import AppNavbar from './AppNavbar';
import { useDeviceDetection } from '../../hooks/useMediaQuery';

interface CompactLayoutProps {
  children: React.ReactNode;
  useNewNavbar?: boolean;
  compactMode?: 'auto' | 'always' | 'never';
  className?: string;
}

interface CompactModeSettings {
  mode: 'auto' | 'always' | 'never';
  preference: 'default' | 'compact' | 'spacious';
}

const CompactLayout: React.FC<CompactLayoutProps> = ({ 
  children, 
  useNewNavbar = true,
  compactMode: propCompactMode,
  className = ''
}) => {
  const device = useDeviceDetection();
  const [settings, setSettings] = useState<CompactModeSettings>({
    mode: propCompactMode || 'auto',
    preference: 'default'
  });
  
  // 从 localStorage 加载用户设置
  useEffect(() => {
    try {
      const saved = localStorage.getItem('compact-mode-settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings(parsedSettings);
      } else if (propCompactMode) {
        setSettings(prev => ({ ...prev, mode: propCompactMode }));
      }
    } catch (error) {
      console.warn('Failed to load compact mode settings:', error);
    }

    // 监听设置变化
    const handleSettingsChange = (event: CustomEvent) => {
      setSettings(event.detail);
    };

    window.addEventListener('compact-mode-changed', handleSettingsChange as EventListener);

    return () => {
      window.removeEventListener('compact-mode-changed', handleSettingsChange as EventListener);
    };
  }, [propCompactMode]);
  
  // 决定是否使用紧凑模式
  const shouldUseCompactMode = () => {
    switch (settings.mode) {
      case 'always': 
        return true;
      case 'never': 
        return false;
      case 'auto':
      default:
        // 在桌面端且屏幕宽度 >= 1024px 时启用紧凑模式
        return !device.isMobile && window.innerWidth >= 1024;
    }
  };

  const isCompact = shouldUseCompactMode();
  
  const compactClasses = isCompact 
    ? 'lg-compact mobile-preserve-touch' 
    : '';

  const containerClasses = isCompact
    ? 'xl-ultra-compact' // 超宽屏幕上的极致紧凑
    : '';

  return (
    <div className={`min-h-screen bg-base-200 ${compactClasses} ${className}`}>
      {useNewNavbar && (
        <div className={isCompact ? 'navbar-compact' : ''}>
          <AppNavbar />
        </div>
      )}
      <main className={`${useNewNavbar ? (isCompact ? 'pt-0' : '') : 'pt-0'} ${containerClasses}`}>
        {children}
      </main>
    </div>
  );
};

export default CompactLayout;