/**
 * useTableState Hook
 * 管理表格状态的持久化（列可见性、列顺序、分页等）
 */

import { useState, useEffect, useCallback } from 'react'
import type { VisibilityState, SortingState, ColumnFiltersState, PaginationState } from '@tanstack/react-table'

export interface TableState {
  columnVisibility: VisibilityState
  columnOrder: string[]
  sorting: SortingState
  columnFilters: ColumnFiltersState
  pagination: PaginationState
  globalFilter: string
}

interface UseTableStateOptions {
  tableId: string // 表格标识符，用于区分不同表格的状态
  userId?: string // 用户ID，用于用户级别的状态隔离
}

// 默认状态
const DEFAULT_STATE: TableState = {
  columnVisibility: {},
  columnOrder: [], // 空数组表示使用默认列顺序
  sorting: [],
  columnFilters: [],
  pagination: {
    pageIndex: 0,
    pageSize: 20,
  },
  globalFilter: '',
}

export const useTableState = ({ tableId, userId }: UseTableStateOptions) => {
  const [tableState, setTableState] = useState<TableState>(DEFAULT_STATE)
  const [isLoaded, setIsLoaded] = useState(false)

  // 生成存储键
  const getStorageKey = useCallback(() => {
    const base = `table_state_${tableId}`
    return userId ? `${base}_${userId}` : base
  }, [tableId, userId])

  // 验证分页状态
  const validatePaginationState = (pagination: any): PaginationState => {
    if (!pagination || typeof pagination !== 'object') {
      return DEFAULT_STATE.pagination
    }
    
    const pageIndex = typeof pagination.pageIndex === 'number' && pagination.pageIndex >= 0 ? pagination.pageIndex : 0
    const pageSize = typeof pagination.pageSize === 'number' && pagination.pageSize > 0 && pagination.pageSize <= 100 ? pagination.pageSize : 20
    
    return { pageIndex, pageSize }
  }

  // 从localStorage加载状态
  const loadState = useCallback(() => {
    try {
      const stored = localStorage.getItem(getStorageKey())
      if (stored) {
        const parsedState = JSON.parse(stored) as Partial<TableState>
        
        // 验证和修复分页状态
        const validatedState = {
          ...DEFAULT_STATE,
          ...parsedState,
          pagination: validatePaginationState(parsedState.pagination)
        }
        
        setTableState(validatedState)
        console.log('✅ 表格状态已从localStorage加载并验证:', validatedState)
      } else {
        console.log('📝 未找到保存的表格状态，使用默认配置')
      }
    } catch (error) {
      console.error('❌ 加载表格状态失败:', error)
      setTableState(DEFAULT_STATE)
    } finally {
      setIsLoaded(true)
    }
  }, [getStorageKey])

  // 保存状态到localStorage
  const saveState = useCallback((newState: Partial<TableState>) => {
    try {
      const updatedState = { ...tableState, ...newState }
      setTableState(updatedState)
      localStorage.setItem(getStorageKey(), JSON.stringify(updatedState))
      console.log('💾 表格状态已保存:', newState)
    } catch (error) {
      console.error('❌ 保存表格状态失败:', error)
    }
  }, [tableState, getStorageKey])

  // 更新特定状态
  const updateColumnVisibility = useCallback((visibility: VisibilityState) => {
    saveState({ columnVisibility: visibility })
  }, [saveState])

  const updateColumnOrder = useCallback((order: string[]) => {
    saveState({ columnOrder: order })
  }, [saveState])

  const updateSorting = useCallback((sorting: SortingState) => {
    saveState({ sorting })
  }, [saveState])

  const updateColumnFilters = useCallback((filters: ColumnFiltersState) => {
    saveState({ columnFilters: filters })
  }, [saveState])

  const updatePagination = useCallback((pagination: PaginationState) => {
    saveState({ pagination })
  }, [saveState])

  const updateGlobalFilter = useCallback((filter: string) => {
    saveState({ globalFilter: filter })
  }, [saveState])

  // 重置为默认状态
  const resetState = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey())
      setTableState(DEFAULT_STATE)
      console.log('🔄 表格状态已重置为默认')
    } catch (error) {
      console.error('❌ 重置表格状态失败:', error)
    }
  }, [getStorageKey])

  // 批量更新状态
  const batchUpdateState = useCallback((updates: Partial<TableState>) => {
    saveState(updates)
  }, [saveState])

  // 组件挂载时加载状态
  useEffect(() => {
    loadState()
  }, [loadState])

  return {
    // 状态
    tableState,
    isLoaded,
    
    // 更新方法
    updateColumnVisibility,
    updateColumnOrder,
    updateSorting,
    updateColumnFilters,
    updatePagination,
    updateGlobalFilter,
    batchUpdateState,
    
    // 工具方法
    resetState,
    saveState,
    loadState,
  }
}

// 工具函数：清理特定用户的所有表格状态
export const clearUserTableStates = (userId: string) => {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('table_state_') && key.endsWith(`_${userId}`)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log(`🧹 已清理用户 ${userId} 的 ${keysToRemove.length} 个表格状态`)
  } catch (error) {
    console.error('❌ 清理用户表格状态失败:', error)
  }
}

// 工具函数：获取所有保存的表格状态键
export const getAllTableStateKeys = (): string[] => {
  const keys: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('table_state_')) {
        keys.push(key)
      }
    }
  } catch (error) {
    console.error('❌ 获取表格状态键失败:', error)
  }
  return keys
}