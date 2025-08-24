import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { memoryManager } from '../utils/memoryManager';
import MemoryDebugPanel from './debug/MemoryDebugPanel';
import useMobileMemoryAdaptation from '../hooks/useMobileMemoryAdaptation';

/**
 * 内存管理提供者组件
 * 为整个应用提供内存管理功能的上下文
 */

interface MemoryContextType {
  status: any;
  isLowMemoryMode: boolean;
  isCriticalMemoryMode: boolean;
  adaptations: string[];
  cleanup: (mode?: 'conservative' | 'aggressive') => Promise<any>;
  getStats: () => any;
  config: any;
}

const MemoryContext = createContext<MemoryContextType | null>(null);

export const useMemoryContext = (): MemoryContextType => {
  const context = useContext(MemoryContext);
  if (!context) {
    throw new Error('useMemoryContext must be used within MemoryManagerProvider');
  }
  return context;
};

interface MemoryManagerProviderProps {
  children: ReactNode;
  enableDebugPanel?: boolean;
  enableMobileAdaptation?: boolean;
  config?: any;
}

const MemoryManagerProvider: React.FC<MemoryManagerProviderProps> = ({
  children,
  enableDebugPanel = process.env.NODE_ENV === 'development',
  enableMobileAdaptation = true,
  config = {}
}) => {
  const [status, setStatus] = useState(memoryManager.getStatus());
  const [showNotification, setShowNotification] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
  } | null>(null);

  // 移动端内存适配
  const mobileAdaptation = useMobileMemoryAdaptation(
    enableMobileAdaptation ? config.mobileAdaptation : { enableMonitoring: false }
  );

  // 初始化内存管理器配置
  useEffect(() => {
    if (Object.keys(config).length > 0) {
      memoryManager.updateConfig(config);
    }
  }, [config]);

  // 监听内存状态变化
  useEffect(() => {
    const handleStatusUpdate = (newStatus: any) => {
      setStatus(newStatus);
    };

    const handleModeChange = (data: any) => {
      console.log('内存模式变化:', data);
      
      // 应用CSS类
      const root = document.documentElement;
      root.classList.remove('low-memory-mode', 'critical-memory-mode');
      
      if (data.newMode === 'critical' || data.newMode === 'emergency') {
        root.classList.add('critical-memory-mode');
      } else if (data.newMode === 'warning') {
        root.classList.add('low-memory-mode');
      }
    };

    const handleCleanupCompleted = (result: any) => {
      showMemoryNotification(
        `内存清理完成：释放了 ${result.totalFreed.toFixed(2)}MB`,
        'success'
      );
    };

    const handleMemoryLeak = (data: any) => {
      showMemoryNotification('检测到内存泄漏，请检查应用状态', 'error');
    };

    const handleEmergencyCleanup = () => {
      showMemoryNotification('执行紧急内存清理', 'warning');
    };

    // 注册事件监听器
    memoryManager.on('status-update', handleStatusUpdate);
    memoryManager.on('mode-change', handleModeChange);
    memoryManager.on('cleanup-completed', handleCleanupCompleted);
    memoryManager.on('memory-leak', handleMemoryLeak);
    memoryManager.on('emergency-cleanup', handleEmergencyCleanup);

    return () => {
      memoryManager.off('status-update', handleStatusUpdate);
      memoryManager.off('mode-change', handleModeChange);
      memoryManager.off('cleanup-completed', handleCleanupCompleted);
      memoryManager.off('memory-leak', handleMemoryLeak);
      memoryManager.off('emergency-cleanup', handleEmergencyCleanup);
    };
  }, []);

  // 显示内存通知
  const showMemoryNotification = (message: string, type: 'info' | 'warning' | 'error' | 'success') => {
    setNotification({ message, type });
    setShowNotification(true);

    // 自动隐藏通知
    setTimeout(() => {
      setShowNotification(false);
      setTimeout(() => setNotification(null), 300);
    }, 5000);
  };

  // 监听移动端适配变化
  useEffect(() => {
    if (enableMobileAdaptation && mobileAdaptation.currentMode.mode !== 'normal') {
      const root = document.documentElement;
      
      // 应用移动端特定的适配
      if (mobileAdaptation.isCriticalMemoryMode) {
        root.classList.add('critical-memory-mode');
      } else if (mobileAdaptation.isLowMemoryMode) {
        root.classList.add('low-memory-mode');
      }

      // 应用其他适配
      if (mobileAdaptation.shouldReduceAnimations) {
        root.classList.add('reduced-animations');
      }

      if (mobileAdaptation.shouldUseVirtualScrolling) {
        root.classList.add('force-virtual-scrolling');
      }
    }
  }, [enableMobileAdaptation, mobileAdaptation.currentMode, mobileAdaptation.isCriticalMemoryMode, mobileAdaptation.isLowMemoryMode, mobileAdaptation.shouldReduceAnimations, mobileAdaptation.shouldUseVirtualScrolling]);

  // 创建上下文值
  const contextValue: MemoryContextType = {
    status,
    isLowMemoryMode: status.mode === 'warning' || mobileAdaptation.isLowMemoryMode,
    isCriticalMemoryMode: status.mode === 'critical' || status.mode === 'emergency' || mobileAdaptation.isCriticalMemoryMode,
    adaptations: enableMobileAdaptation ? mobileAdaptation.adaptationStats.activatedAdaptations : [],
    cleanup: memoryManager.cleanup.bind(memoryManager),
    getStats: memoryManager.getMonitoringStats.bind(memoryManager),
    config: memoryManager['config'] // 访问私有配置
  };

  return (
    <MemoryContext.Provider value={contextValue}>
      {children}
      
      {/* 内存通知 */}
      {showNotification && notification && (
        <MemoryNotification 
          message={notification.message} 
          type={notification.type}
          onClose={() => setShowNotification(false)}
        />
      )}
      
      {/* 调试面板 */}
      {enableDebugPanel && <MemoryDebugPanel />}
      
      {/* 移动端内存状态指示器 */}
      {enableMobileAdaptation && (status.mode !== 'normal' || mobileAdaptation.currentMode.mode !== 'normal') && (
        <MobileMemoryIndicator 
          mode={status.mode}
          mobileMode={mobileAdaptation.currentMode.mode}
          memoryUsage={status.current}
          adaptations={mobileAdaptation.adaptationStats.activatedAdaptations}
        />
      )}
    </MemoryContext.Provider>
  );
};

// 内存通知组件
interface MemoryNotificationProps {
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  onClose: () => void;
}

const MemoryNotification: React.FC<MemoryNotificationProps> = ({ message, type, onClose }) => {
  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`memory-notification memory-notification-${type}`}>
      <div className="flex items-start">
        <span className="mr-3 text-lg">{getIcon()}</span>
        <div className="flex-1">
          <p className="font-medium text-sm">{message}</p>
        </div>
        <button 
          onClick={onClose}
          className="ml-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// 移动端内存指示器组件
interface MobileMemoryIndicatorProps {
  mode: string;
  mobileMode: string;
  memoryUsage: number;
  adaptations: string[];
}

const MobileMemoryIndicator: React.FC<MobileMemoryIndicatorProps> = ({
  mode,
  mobileMode,
  memoryUsage,
  adaptations
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getIndicatorColor = () => {
    if (mode === 'emergency' || mobileMode === 'critical-memory') return 'memory-pressure-critical';
    if (mode === 'critical' || mobileMode === 'low-memory') return 'memory-pressure-high';
    if (mode === 'warning') return 'memory-pressure-medium';
    return 'memory-pressure-low';
  };

  const getStatusText = () => {
    if (mode === 'emergency') return '紧急';
    if (mode === 'critical' || mobileMode === 'critical-memory') return '严重';
    if (mode === 'warning' || mobileMode === 'low-memory') return '警告';
    return '正常';
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div 
        className="flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`memory-pressure-indicator ${getIndicatorColor()}`}></div>
        <div className="text-sm">
          <div className="font-medium">内存: {getStatusText()}</div>
          <div className="text-gray-500 text-xs">{memoryUsage.toFixed(1)}MB</div>
        </div>
        <div className="ml-2 text-gray-400">
          {isExpanded ? '▼' : '▶'}
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-gray-200 p-3 text-xs text-gray-600">
          <div className="mb-2">
            <strong>当前模式:</strong> {mode} / {mobileMode}
          </div>
          
          {adaptations.length > 0 && (
            <div>
              <strong>已激活适配:</strong>
              <div className="mt-1 space-y-1">
                {adaptations.slice(0, 3).map((adaptation, index) => (
                  <div key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    {adaptation}
                  </div>
                ))}
                {adaptations.length > 3 && (
                  <div className="text-gray-500">+{adaptations.length - 3} 更多...</div>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-2 pt-2 border-t border-gray-100">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                memoryManager.cleanup('conservative');
              }}
              className="text-blue-600 hover:text-blue-800 underline text-xs"
            >
              手动清理
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryManagerProvider;