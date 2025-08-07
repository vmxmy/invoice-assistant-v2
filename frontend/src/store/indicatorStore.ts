import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// 指标数据类型
export interface IndicatorData {
  id: string;
  icon: string | React.ReactNode;
  title: string;
  subtitle?: string;
  value: string | number;
  valuePrefix?: string;
  valueSuffix?: string;
  secondaryValue?: string | number;
  secondaryLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendLabel?: string;
  variant?: 'default' | 'warning' | 'error' | 'success' | 'info' | 'primary';
  priority?: number;
  category?: string;
  metadata?: Record<string, any>;
  lastUpdated?: Date;
}

// 指标过滤器
export interface IndicatorFilter {
  categories?: string[];
  variants?: string[];
  searchTerm?: string;
  sortBy?: 'priority' | 'value' | 'title' | 'lastUpdated';
  sortOrder?: 'asc' | 'desc';
}

// 指标通知
export interface IndicatorNotification {
  id: string;
  indicatorId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  read: boolean;
}

// Store 状态接口
interface IndicatorState {
  // 数据
  indicators: Map<string, IndicatorData>;
  selectedIndicators: Set<string>;
  notifications: IndicatorNotification[];
  filter: IndicatorFilter;
  isLoading: boolean;
  error: string | null;

  // 基础操作
  setIndicators: (indicators: IndicatorData[]) => void;
  addIndicator: (indicator: IndicatorData) => void;
  updateIndicator: (id: string, updates: Partial<IndicatorData>) => void;
  removeIndicator: (id: string) => void;
  clearIndicators: () => void;

  // 批量操作
  batchUpdateIndicators: (updates: Array<{ id: string; data: Partial<IndicatorData> }>) => void;
  batchRemoveIndicators: (ids: string[]) => void;

  // 选择操作
  selectIndicator: (id: string) => void;
  deselectIndicator: (id: string) => void;
  toggleIndicatorSelection: (id: string) => void;
  selectAllIndicators: () => void;
  clearSelection: () => void;

  // 过滤和排序
  setFilter: (filter: Partial<IndicatorFilter>) => void;
  clearFilter: () => void;
  getFilteredIndicators: () => IndicatorData[];
  getSortedIndicators: (indicators: IndicatorData[]) => IndicatorData[];

  // 通知管理
  addNotification: (notification: Omit<IndicatorNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  getUnreadNotificationCount: () => number;

  // 状态管理
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // 实用方法
  getIndicatorById: (id: string) => IndicatorData | undefined;
  getIndicatorsByCategory: (category: string) => IndicatorData[];
  getIndicatorsByVariant: (variant: string) => IndicatorData[];
  refreshIndicator: (id: string) => Promise<void>;
  exportIndicators: () => string;
  importIndicators: (data: string) => void;
}

// 创建 Store
export const useIndicatorStore = create<IndicatorState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // 初始状态
          indicators: new Map(),
          selectedIndicators: new Set(),
          notifications: [],
          filter: {},
          isLoading: false,
          error: null,

          // 基础操作
          setIndicators: (indicators) =>
            set((state) => {
              state.indicators.clear();
              indicators.forEach((indicator) => {
                state.indicators.set(indicator.id, {
                  ...indicator,
                  lastUpdated: new Date()
                });
              });
            }),

          addIndicator: (indicator) =>
            set((state) => {
              state.indicators.set(indicator.id, {
                ...indicator,
                lastUpdated: new Date()
              });
            }),

          updateIndicator: (id, updates) =>
            set((state) => {
              const indicator = state.indicators.get(id);
              if (indicator) {
                state.indicators.set(id, {
                  ...indicator,
                  ...updates,
                  lastUpdated: new Date()
                });
              }
            }),

          removeIndicator: (id) =>
            set((state) => {
              state.indicators.delete(id);
              state.selectedIndicators.delete(id);
            }),

          clearIndicators: () =>
            set((state) => {
              state.indicators.clear();
              state.selectedIndicators.clear();
            }),

          // 批量操作
          batchUpdateIndicators: (updates) =>
            set((state) => {
              updates.forEach(({ id, data }) => {
                const indicator = state.indicators.get(id);
                if (indicator) {
                  state.indicators.set(id, {
                    ...indicator,
                    ...data,
                    lastUpdated: new Date()
                  });
                }
              });
            }),

          batchRemoveIndicators: (ids) =>
            set((state) => {
              ids.forEach((id) => {
                state.indicators.delete(id);
                state.selectedIndicators.delete(id);
              });
            }),

          // 选择操作
          selectIndicator: (id) =>
            set((state) => {
              state.selectedIndicators.add(id);
            }),

          deselectIndicator: (id) =>
            set((state) => {
              state.selectedIndicators.delete(id);
            }),

          toggleIndicatorSelection: (id) =>
            set((state) => {
              if (state.selectedIndicators.has(id)) {
                state.selectedIndicators.delete(id);
              } else {
                state.selectedIndicators.add(id);
              }
            }),

          selectAllIndicators: () =>
            set((state) => {
              state.indicators.forEach((_, id) => {
                state.selectedIndicators.add(id);
              });
            }),

          clearSelection: () =>
            set((state) => {
              state.selectedIndicators.clear();
            }),

          // 过滤和排序
          setFilter: (filter) =>
            set((state) => {
              state.filter = { ...state.filter, ...filter };
            }),

          clearFilter: () =>
            set((state) => {
              state.filter = {};
            }),

          getFilteredIndicators: () => {
            const { indicators, filter } = get();
            let filtered = Array.from(indicators.values());

            // 按类别过滤
            if (filter.categories && filter.categories.length > 0) {
              filtered = filtered.filter((ind) =>
                filter.categories!.includes(ind.category || '')
              );
            }

            // 按变体过滤
            if (filter.variants && filter.variants.length > 0) {
              filtered = filtered.filter((ind) =>
                filter.variants!.includes(ind.variant || 'default')
              );
            }

            // 搜索过滤
            if (filter.searchTerm) {
              const term = filter.searchTerm.toLowerCase();
              filtered = filtered.filter(
                (ind) =>
                  ind.title.toLowerCase().includes(term) ||
                  ind.subtitle?.toLowerCase().includes(term) ||
                  String(ind.value).toLowerCase().includes(term)
              );
            }

            return get().getSortedIndicators(filtered);
          },

          getSortedIndicators: (indicators) => {
            const { filter } = get();
            if (!filter.sortBy) return indicators;

            const sorted = [...indicators].sort((a, b) => {
              let comparison = 0;

              switch (filter.sortBy) {
                case 'priority':
                  comparison = (b.priority || 0) - (a.priority || 0);
                  break;
                case 'value':
                  comparison = Number(b.value) - Number(a.value);
                  break;
                case 'title':
                  comparison = a.title.localeCompare(b.title);
                  break;
                case 'lastUpdated':
                  comparison =
                    (b.lastUpdated?.getTime() || 0) -
                    (a.lastUpdated?.getTime() || 0);
                  break;
              }

              return filter.sortOrder === 'asc' ? -comparison : comparison;
            });

            return sorted;
          },

          // 通知管理
          addNotification: (notification) =>
            set((state) => {
              state.notifications.push({
                ...notification,
                id: `notif-${Date.now()}-${Math.random()}`,
                timestamp: new Date(),
                read: false
              });
            }),

          markNotificationAsRead: (id) =>
            set((state) => {
              const notif = state.notifications.find((n) => n.id === id);
              if (notif) {
                notif.read = true;
              }
            }),

          clearNotifications: () =>
            set((state) => {
              state.notifications = [];
            }),

          getUnreadNotificationCount: () => {
            return get().notifications.filter((n) => !n.read).length;
          },

          // 状态管理
          setLoading: (loading) =>
            set((state) => {
              state.isLoading = loading;
            }),

          setError: (error) =>
            set((state) => {
              state.error = error;
            }),

          // 实用方法
          getIndicatorById: (id) => {
            return get().indicators.get(id);
          },

          getIndicatorsByCategory: (category) => {
            const indicators = Array.from(get().indicators.values());
            return indicators.filter((ind) => ind.category === category);
          },

          getIndicatorsByVariant: (variant) => {
            const indicators = Array.from(get().indicators.values());
            return indicators.filter((ind) => ind.variant === variant);
          },

          refreshIndicator: async (id) => {
            const { setLoading, setError, updateIndicator } = get();
            
            try {
              setLoading(true);
              setError(null);
              
              // 模拟API调用获取最新数据
              await new Promise((resolve) => setTimeout(resolve, 500));
              
              // 更新指标数据（这里应该是从API获取的实际数据）
              updateIndicator(id, {
                value: Math.floor(Math.random() * 1000),
                trend: ['up', 'down', 'neutral'][Math.floor(Math.random() * 3)] as any,
                trendValue: `${Math.floor(Math.random() * 20)}%`
              });
              
              // 添加刷新通知
              get().addNotification({
                indicatorId: id,
                type: 'success',
                message: '指标已刷新'
              });
            } catch (error) {
              setError(error instanceof Error ? error.message : '刷新失败');
              get().addNotification({
                indicatorId: id,
                type: 'error',
                message: '指标刷新失败'
              });
            } finally {
              setLoading(false);
            }
          },

          exportIndicators: () => {
            const indicators = Array.from(get().indicators.values());
            return JSON.stringify(indicators, null, 2);
          },

          importIndicators: (data) => {
            try {
              const indicators = JSON.parse(data) as IndicatorData[];
              get().setIndicators(indicators);
              get().addNotification({
                indicatorId: '',
                type: 'success',
                message: `成功导入 ${indicators.length} 个指标`
              });
            } catch (error) {
              get().setError('导入失败：无效的数据格式');
              get().addNotification({
                indicatorId: '',
                type: 'error',
                message: '导入失败：无效的数据格式'
              });
            }
          }
        }))
      ),
      {
        name: 'indicator-store',
        partialize: (state) => ({
          filter: state.filter,
          selectedIndicators: Array.from(state.selectedIndicators)
        })
      }
    )
  )
);

// Selector hooks
export const useIndicator = (id: string) => {
  return useIndicatorStore((state) => state.getIndicatorById(id));
};

export const useFilteredIndicators = () => {
  return useIndicatorStore((state) => state.getFilteredIndicators());
};

export const useSelectedIndicators = () => {
  const selectedIds = useIndicatorStore((state) => state.selectedIndicators);
  const indicators = useIndicatorStore((state) => state.indicators);
  
  return Array.from(selectedIds)
    .map((id) => indicators.get(id))
    .filter(Boolean) as IndicatorData[];
};

export const useIndicatorNotifications = () => {
  return useIndicatorStore((state) => state.notifications);
};

export const useUnreadNotificationCount = () => {
  return useIndicatorStore((state) => state.getUnreadNotificationCount());
};