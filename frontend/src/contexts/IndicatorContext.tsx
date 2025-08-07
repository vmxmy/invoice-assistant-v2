import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useIndicatorStore, IndicatorData } from '../store/indicatorStore';

interface IndicatorContextValue {
  // 从 store 导出的方法
  indicators: Map<string, IndicatorData>;
  selectedIndicators: Set<string>;
  isLoading: boolean;
  error: string | null;
  
  // 操作方法
  addIndicator: (indicator: IndicatorData) => void;
  updateIndicator: (id: string, updates: Partial<IndicatorData>) => void;
  removeIndicator: (id: string) => void;
  selectIndicator: (id: string) => void;
  deselectIndicator: (id: string) => void;
  toggleIndicatorSelection: (id: string) => void;
  refreshIndicator: (id: string) => Promise<void>;
  
  // 批量操作
  batchUpdateIndicators: (updates: Array<{ id: string; data: Partial<IndicatorData> }>) => void;
  setIndicators: (indicators: IndicatorData[]) => void;
  
  // 工具方法
  getIndicatorById: (id: string) => IndicatorData | undefined;
  getFilteredIndicators: () => IndicatorData[];
}

const IndicatorContext = createContext<IndicatorContextValue | null>(null);

interface IndicatorProviderProps {
  children: ReactNode;
  initialIndicators?: IndicatorData[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * 指标状态管理提供者
 */
export function IndicatorProvider({
  children,
  initialIndicators = [],
  autoRefresh = false,
  refreshInterval = 30000 // 30秒
}: IndicatorProviderProps) {
  const {
    indicators,
    selectedIndicators,
    isLoading,
    error,
    addIndicator,
    updateIndicator,
    removeIndicator,
    selectIndicator,
    deselectIndicator,
    toggleIndicatorSelection,
    refreshIndicator,
    batchUpdateIndicators,
    setIndicators,
    getIndicatorById,
    getFilteredIndicators
  } = useIndicatorStore();

  // 初始化指标
  useEffect(() => {
    if (initialIndicators.length > 0) {
      setIndicators(initialIndicators);
    }
  }, []);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // 刷新所有选中的指标
      selectedIndicators.forEach((id) => {
        refreshIndicator(id);
      });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, selectedIndicators, refreshIndicator]);

  const contextValue: IndicatorContextValue = {
    indicators,
    selectedIndicators,
    isLoading,
    error,
    addIndicator,
    updateIndicator,
    removeIndicator,
    selectIndicator,
    deselectIndicator,
    toggleIndicatorSelection,
    refreshIndicator,
    batchUpdateIndicators,
    setIndicators,
    getIndicatorById,
    getFilteredIndicators
  };

  return (
    <IndicatorContext.Provider value={contextValue}>
      {children}
    </IndicatorContext.Provider>
  );
}

/**
 * 使用指标上下文的 Hook
 */
export function useIndicatorContext() {
  const context = useContext(IndicatorContext);
  if (!context) {
    throw new Error('useIndicatorContext must be used within IndicatorProvider');
  }
  return context;
}

// 导出便捷 hooks
export { 
  useIndicator,
  useFilteredIndicators,
  useSelectedIndicators,
  useIndicatorNotifications,
  useUnreadNotificationCount
} from '../store/indicatorStore';