# React Context 架构设计文档

> 本文档详细说明发票管理系统的 Context 架构设计，包括状态管理模式、Hook 使用规范和性能优化策略。

## 目录

1. [架构概述](#架构概述)
2. [Context 设计原则](#context-设计原则)
3. [核心 Context 实现](#核心-context-实现)
4. [自定义 Hooks](#自定义-hooks)
5. [状态管理模式](#状态管理模式)
6. [性能优化策略](#性能优化策略)
7. [测试策略](#测试策略)
8. [最佳实践](#最佳实践)

## 架构概述

### Context 架构图
```
┌─────────────────────────────────────────────────┐
│                   App.tsx                       │
│  ┌───────────────────────────────────────────┐  │
│  │            QueryClientProvider             │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │          AuthProvider               │  │  │
│  │  │  ┌───────────────────────────────┐  │  │  │
│  │  │  │       ThemeProvider          │  │  │  │
│  │  │  │  ┌─────────────────────┐    │  │  │  │
│  │  │  │  │    UIProvider       │    │  │  │  │
│  │  │  │  │  ┌───────────────┐  │    │  │  │  │
│  │  │  │  │  │InvoiceProvider│  │    │  │  │  │
│  │  │  │  │  │               │  │    │  │  │  │
│  │  │  │  │  │   <Routes>    │  │    │  │  │  │
│  │  │  │  │  └───────────────┘  │    │  │  │  │
│  │  │  │  └─────────────────────┘    │  │  │  │
│  │  │  └───────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Context 职责划分

| Context | 职责 | 依赖关系 |
|---------|------|----------|
| AuthContext | 用户认证状态管理 | 无依赖 |
| ThemeContext | 主题切换和管理 | 无依赖 |
| UIContext | UI 状态（模态框、抽屉、通知） | 无依赖 |
| InvoiceContext | 发票业务状态管理 | 依赖 AuthContext |

## Context 设计原则

### 1. 单一职责原则
每个 Context 只负责一个领域的状态管理：
- **认证**：用户登录状态、权限
- **UI**：界面交互状态
- **业务**：发票数据和操作
- **主题**：视觉样式管理

### 2. 最小化原则
- 只在 Context 中存储真正需要全局共享的状态
- 组件内部状态优先使用 useState
- 服务端状态使用 React Query

### 3. 性能优先原则
- 使用 useMemo 缓存计算值
- 使用 useCallback 缓存函数
- 合理拆分 Context 避免不必要的重渲染

## 核心 Context 实现

### AuthContext (认证上下文)

```tsx
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { Profile } from '../types';

interface AuthContextType {
  // 状态
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  
  // 方法
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // 监听认证状态变化
  useEffect(() => {
    // 获取初始会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // 监听认证变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 获取用户资料
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // 登录
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
  };

  // 注册
  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
  };

  // 登出
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // 更新资料
  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id);

    if (error) throw error;

    // 更新本地状态
    setProfile(prev => prev ? { ...prev, ...data } : null);
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 自定义 Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### UIContext (UI 状态上下文)

```tsx
// contexts/UIContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { notify } from '../utils/notifications';

interface ModalState {
  invoiceDetail: boolean;
  invoiceEdit: boolean;
  deleteConfirm: boolean;
  advancedSearch: boolean;
  exportOptions: boolean;
}

interface DrawerState {
  search: boolean;
  filters: boolean;
}

interface UIContextType {
  // 模态框状态
  modals: ModalState;
  openModal: (modalName: keyof ModalState) => void;
  closeModal: (modalName: keyof ModalState) => void;
  toggleModal: (modalName: keyof ModalState) => void;
  
  // 抽屉状态
  drawers: DrawerState;
  openDrawer: (drawerName: keyof DrawerState) => void;
  closeDrawer: (drawerName: keyof DrawerState) => void;
  toggleDrawer: (drawerName: keyof DrawerState) => void;
  
  // 全局加载状态
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // 选中的发票
  selectedInvoiceId: string | null;
  setSelectedInvoiceId: (id: string | null) => void;
  
  // 批量选择
  selectedInvoiceIds: string[];
  toggleInvoiceSelection: (id: string) => void;
  selectAllInvoices: (ids: string[]) => void;
  clearInvoiceSelection: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 模态框状态
  const [modals, setModals] = useState<ModalState>({
    invoiceDetail: false,
    invoiceEdit: false,
    deleteConfirm: false,
    advancedSearch: false,
    exportOptions: false,
  });

  // 抽屉状态
  const [drawers, setDrawers] = useState<DrawerState>({
    search: false,
    filters: false,
  });

  // 全局加载状态
  const [isLoading, setLoading] = useState(false);

  // 选中的发票
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  // 模态框操作
  const openModal = useCallback((modalName: keyof ModalState) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
  }, []);

  const closeModal = useCallback((modalName: keyof ModalState) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
  }, []);

  const toggleModal = useCallback((modalName: keyof ModalState) => {
    setModals(prev => ({ ...prev, [modalName]: !prev[modalName] }));
  }, []);

  // 抽屉操作
  const openDrawer = useCallback((drawerName: keyof DrawerState) => {
    setDrawers(prev => ({ ...prev, [drawerName]: true }));
  }, []);

  const closeDrawer = useCallback((drawerName: keyof DrawerState) => {
    setDrawers(prev => ({ ...prev, [drawerName]: false }));
  }, []);

  const toggleDrawer = useCallback((drawerName: keyof DrawerState) => {
    setDrawers(prev => ({ ...prev, [drawerName]: !prev[drawerName] }));
  }, []);

  // 批量选择操作
  const toggleInvoiceSelection = useCallback((id: string) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(id) 
        ? prev.filter(invoiceId => invoiceId !== id)
        : [...prev, id]
    );
  }, []);

  const selectAllInvoices = useCallback((ids: string[]) => {
    setSelectedInvoiceIds(ids);
  }, []);

  const clearInvoiceSelection = useCallback(() => {
    setSelectedInvoiceIds([]);
  }, []);

  const value = {
    modals,
    openModal,
    closeModal,
    toggleModal,
    drawers,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    isLoading,
    setLoading,
    selectedInvoiceId,
    setSelectedInvoiceId,
    selectedInvoiceIds,
    toggleInvoiceSelection,
    selectAllInvoices,
    clearInvoiceSelection,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

// 自定义 Hook
export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

// 便捷 Hooks
export const useModal = (modalName: keyof ModalState) => {
  const { modals, openModal, closeModal, toggleModal } = useUI();
  
  return {
    isOpen: modals[modalName],
    open: () => openModal(modalName),
    close: () => closeModal(modalName),
    toggle: () => toggleModal(modalName),
  };
};

export const useDrawer = (drawerName: keyof DrawerState) => {
  const { drawers, openDrawer, closeDrawer, toggleDrawer } = useUI();
  
  return {
    isOpen: drawers[drawerName],
    open: () => openDrawer(drawerName),
    close: () => closeDrawer(drawerName),
    toggle: () => toggleDrawer(drawerName),
  };
};
```

### InvoiceContext (发票业务上下文)

```tsx
// contexts/InvoiceContext.tsx
import React, { createContext, useContext, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import { Invoice, InvoiceFilters, PaginationState } from '../types';
import { notify } from '../utils/notifications';

interface InvoiceStats {
  total: number;
  totalAmount: number;
  pendingCount: number;
  completedCount: number;
}

interface InvoiceContextType {
  // 状态
  invoices: Invoice[];
  loading: boolean;
  error: Error | null;
  stats: InvoiceStats | null;
  
  // 筛选和分页
  filters: InvoiceFilters;
  setFilters: (filters: Partial<InvoiceFilters>) => void;
  clearFilters: () => void;
  
  pagination: PaginationState;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  
  // 操作
  createInvoice: (data: FormData) => Promise<void>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  deleteInvoices: (ids: string[]) => Promise<void>;
  refreshInvoices: () => void;
}

const defaultFilters: InvoiceFilters = {
  search: '',
  status: [],
  source: [],
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
};

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const InvoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  
  // 筛选和分页状态
  const [filters, setFiltersState] = useState<InvoiceFilters>(defaultFilters);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 20,
    total: 0,
  });

  // 构建查询参数
  const queryParams = useMemo(() => {
    const params: any = {
      page: pagination.page,
      page_size: pagination.pageSize,
    };

    if (filters.search) {
      params.search = filters.search;
    }
    if (filters.status?.length) {
      params.status = filters.status;
    }
    if (filters.source?.length) {
      params.source = filters.source;
    }
    if (filters.dateFrom) {
      params.date_from = filters.dateFrom;
    }
    if (filters.dateTo) {
      params.date_to = filters.dateTo;
    }
    if (filters.amountMin !== null) {
      params.amount_min = filters.amountMin;
    }
    if (filters.amountMax !== null) {
      params.amount_max = filters.amountMax;
    }

    return params;
  }, [filters, pagination.page, pagination.pageSize]);

  // 获取发票列表
  const { 
    data: invoicesData, 
    isLoading: loading, 
    error,
    refetch: refreshInvoices 
  } = useQuery({
    queryKey: ['invoices', queryParams],
    queryFn: async () => {
      const response = await api.invoices.list(queryParams);
      return response.data;
    },
    onSuccess: (data) => {
      setPagination(prev => ({
        ...prev,
        total: data.total,
      }));
    },
  });

  // 获取统计数据
  const { data: stats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: async () => {
      const response = await api.invoices.stats();
      return response.data;
    },
  });

  // 创建发票
  const createInvoiceMutation = useMutation({
    mutationFn: api.invoices.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['invoice-stats']);
      notify.success('发票创建成功');
    },
    onError: (error: any) => {
      notify.error(error.message || '发票创建失败');
    },
  });

  // 更新发票
  const updateInvoiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Invoice> }) =>
      api.invoices.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['invoice-stats']);
      notify.success('发票更新成功');
    },
    onError: (error: any) => {
      notify.error(error.message || '发票更新失败');
    },
  });

  // 删除发票
  const deleteInvoiceMutation = useMutation({
    mutationFn: api.invoices.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['invoice-stats']);
      notify.success('发票删除成功');
    },
    onError: (error: any) => {
      notify.error(error.message || '发票删除失败');
    },
  });

  // 批量删除发票
  const deleteInvoicesMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => api.invoices.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['invoice-stats']);
      notify.success('批量删除成功');
    },
    onError: (error: any) => {
      notify.error(error.message || '批量删除失败');
    },
  });

  // 设置筛选条件
  const setFilters = (newFilters: Partial<InvoiceFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // 重置到第一页
  };

  // 清除筛选条件
  const clearFilters = () => {
    setFiltersState(defaultFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // 设置页码
  const setPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // 设置每页数量
  const setPageSize = (pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }));
  };

  const value = {
    invoices: invoicesData?.items || [],
    loading,
    error: error as Error | null,
    stats,
    filters,
    setFilters,
    clearFilters,
    pagination,
    setPage,
    setPageSize,
    createInvoice: createInvoiceMutation.mutateAsync,
    updateInvoice: (id: string, data: Partial<Invoice>) => 
      updateInvoiceMutation.mutateAsync({ id, data }),
    deleteInvoice: deleteInvoiceMutation.mutateAsync,
    deleteInvoices: deleteInvoicesMutation.mutateAsync,
    refreshInvoices,
  };

  return <InvoiceContext.Provider value={value}>{children}</InvoiceContext.Provider>;
};

// 自定义 Hook
export const useInvoiceContext = () => {
  const context = useContext(InvoiceContext);
  if (context === undefined) {
    throw new Error('useInvoiceContext must be used within an InvoiceProvider');
  }
  return context;
};
```

### ThemeContext (主题上下文)

```tsx
// contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'cupcake' | 'bumblebee' | 'emerald' | 'corporate' | 'synthwave' | 'retro';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'invoice-theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const availableThemes: Theme[] = [
    'light', 'dark', 'cupcake', 'bumblebee', 
    'emerald', 'corporate', 'synthwave', 'retro'
  ];

  const [theme, setThemeState] = useState<Theme>(() => {
    // 从本地存储读取主题
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    return (savedTheme as Theme) || 'light';
  });

  // 应用主题
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // 如果用户没有手动设置过主题，则跟随系统
      const savedTheme = localStorage.getItem(STORAGE_KEY);
      if (!savedTheme) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const value = {
    theme,
    setTheme,
    availableThemes,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// 自定义 Hook
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

## 自定义 Hooks

### useLocalStorage Hook

```tsx
// hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // 获取初始值
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // 更新值
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
```

### useDebounce Hook

```tsx
// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### useMediaQuery Hook

```tsx
// hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// 预定义的媒体查询
export const useIsMobile = () => useMediaQuery('(max-width: 640px)');
export const useIsTablet = () => useMediaQuery('(max-width: 1024px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
```

## 状态管理模式

### 1. 状态分层

```
┌─────────────────────────────────┐
│       Server State              │ ← React Query
├─────────────────────────────────┤
│       Global State              │ ← Context API
├─────────────────────────────────┤
│       Local State               │ ← useState/useReducer
└─────────────────────────────────┘
```

### 2. 状态同步策略

```tsx
// 示例：发票编辑时的状态同步
const InvoiceEditModal = ({ invoiceId }) => {
  const { invoices, updateInvoice } = useInvoiceContext();
  const { closeModal } = useUI();
  
  // 服务端状态
  const { data: serverInvoice } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => api.invoices.get(invoiceId),
  });
  
  // 本地编辑状态
  const [editData, setEditData] = useState(serverInvoice);
  
  // 同步服务端状态到本地
  useEffect(() => {
    if (serverInvoice) {
      setEditData(serverInvoice);
    }
  }, [serverInvoice]);
  
  // 保存时同步到服务端
  const handleSave = async () => {
    await updateInvoice(invoiceId, editData);
    closeModal('invoiceEdit');
  };
};
```

### 3. 乐观更新模式

```tsx
// 使用 React Query 的乐观更新
const useOptimisticUpdate = () => {
  const queryClient = useQueryClient();
  
  const updateInvoice = useMutation({
    mutationFn: ({ id, data }) => api.invoices.update(id, data),
    
    // 乐观更新
    onMutate: async ({ id, data }) => {
      // 取消相关查询
      await queryClient.cancelQueries(['invoices']);
      
      // 保存之前的数据
      const previousInvoices = queryClient.getQueryData(['invoices']);
      
      // 乐观更新
      queryClient.setQueryData(['invoices'], (old) => {
        return {
          ...old,
          items: old.items.map(invoice =>
            invoice.id === id ? { ...invoice, ...data } : invoice
          ),
        };
      });
      
      return { previousInvoices };
    },
    
    // 错误时回滚
    onError: (err, variables, context) => {
      queryClient.setQueryData(['invoices'], context.previousInvoices);
      notify.error('更新失败');
    },
    
    // 成功后重新获取
    onSettled: () => {
      queryClient.invalidateQueries(['invoices']);
    },
  });
  
  return updateInvoice;
};
```

## 性能优化策略

### 1. Context 拆分

```tsx
// ❌ 错误：大而全的 Context
const AppContext = createContext({
  user: null,
  theme: 'light',
  invoices: [],
  modals: {},
  // ... 所有状态
});

// ✅ 正确：按职责拆分
const AuthContext = createContext({ user: null });
const ThemeContext = createContext({ theme: 'light' });
const InvoiceContext = createContext({ invoices: [] });
const UIContext = createContext({ modals: {} });
```

### 2. Memo 优化

```tsx
// 使用 memo 避免不必要的重渲染
const InvoiceList = memo(({ invoices, onSelect }) => {
  return (
    <div>
      {invoices.map(invoice => (
        <InvoiceItem 
          key={invoice.id} 
          invoice={invoice} 
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数
  return (
    prevProps.invoices.length === nextProps.invoices.length &&
    prevProps.invoices.every((invoice, index) => 
      invoice.id === nextProps.invoices[index].id
    )
  );
});
```

### 3. useMemo 和 useCallback

```tsx
const InvoiceProvider = ({ children }) => {
  const [filters, setFilters] = useState(defaultFilters);
  const [invoices, setInvoices] = useState([]);
  
  // 缓存计算结果
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!invoice.invoice_number.toLowerCase().includes(searchLower) &&
            !invoice.seller_name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      // ... 更多筛选逻辑
      return true;
    });
  }, [invoices, filters]);
  
  // 缓存函数引用
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const value = useMemo(() => ({
    invoices: filteredInvoices,
    filters,
    updateFilter,
  }), [filteredInvoices, filters, updateFilter]);
  
  return (
    <InvoiceContext.Provider value={value}>
      {children}
    </InvoiceContext.Provider>
  );
};
```

### 4. 懒加载 Context

```tsx
// 懒加载非关键 Context
const ThemeProvider = lazy(() => import('./contexts/ThemeContext'));
const InvoiceProvider = lazy(() => import('./contexts/InvoiceContext'));

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<Loading />}>
        <ThemeProvider>
          <InvoiceProvider>
            <Routes />
          </InvoiceProvider>
        </ThemeProvider>
      </Suspense>
    </AuthProvider>
  );
}
```

## 测试策略

### 1. Context 测试工具

```tsx
// test-utils/context-wrapper.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import { UIProvider } from '../contexts/UIContext';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UIProvider>
          {children}
        </UIProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### 2. Hook 测试

```tsx
// hooks/__tests__/useAuth.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { wrapper } from './test-utils';

describe('useAuth', () => {
  it('should handle sign in', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.user).toBeNull();
    
    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });
    
    expect(result.current.user).toBeDefined();
    expect(result.current.user.email).toBe('test@example.com');
  });
});
```

### 3. Context 集成测试

```tsx
// __tests__/invoice-context.test.tsx
import { render, screen, waitFor } from '../test-utils';
import { InvoiceProvider } from '../contexts/InvoiceContext';
import InvoiceList from '../components/InvoiceList';

describe('InvoiceContext', () => {
  it('should fetch and display invoices', async () => {
    render(
      <InvoiceProvider>
        <InvoiceList />
      </InvoiceProvider>
    );
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('发票列表')).toBeInTheDocument();
    });
    
    // 验证发票显示
    expect(screen.getByText('INV-001')).toBeInTheDocument();
  });
});
```

## 最佳实践

### 1. Context 使用原则

```tsx
// ✅ 适合放在 Context 的状态
- 用户认证信息
- 主题设置
- 语言偏好
- 全局 UI 状态（模态框、通知）

// ❌ 不适合放在 Context 的状态
- 表单输入值
- 组件内部的 UI 状态
- 频繁变化的数据
- 服务端数据（使用 React Query）
```

### 2. 避免过度使用 Context

```tsx
// ❌ 错误：为每个功能创建 Context
const FormContext = createContext();
const ValidationContext = createContext();
const SubmitContext = createContext();

// ✅ 正确：使用组件组合
const Form = ({ children, onSubmit }) => {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  
  return (
    <form onSubmit={handleSubmit}>
      {React.Children.map(children, child =>
        React.cloneElement(child, { values, errors, onChange })
      )}
    </form>
  );
};
```

### 3. 性能监控

```tsx
// 使用 React DevTools Profiler
import { Profiler } from 'react';

const onRenderCallback = (
  id, // 组件名
  phase, // "mount" | "update"
  actualDuration, // 渲染耗时
  baseDuration, // 预估耗时
  startTime, // 开始时间
  commitTime, // 提交时间
  interactions // 交互集合
) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
};

<Profiler id="InvoiceList" onRender={onRenderCallback}>
  <InvoiceList />
</Profiler>
```

### 4. 错误边界

```tsx
// contexts/ErrorBoundary.tsx
class ContextErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Context error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="alert alert-error">
          <h2>应用程序出错</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            刷新页面
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// 使用错误边界包裹 Providers
<ContextErrorBoundary>
  <AuthProvider>
    <App />
  </AuthProvider>
</ContextErrorBoundary>
```

## 总结

本 Context 架构设计遵循以下核心原则：

1. **职责分离**：每个 Context 负责单一领域
2. **性能优先**：通过拆分、缓存和懒加载优化性能
3. **类型安全**：使用 TypeScript 确保类型安全
4. **易于测试**：提供测试工具和模式
5. **开发体验**：提供便捷的 Hooks 和工具函数

通过这种架构设计，可以构建出高性能、易维护的 React 应用。