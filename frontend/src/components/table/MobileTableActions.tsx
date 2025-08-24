/**
 * MobileTableActions 组件
 * 移动端表格操作工具栏和快捷操作
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Row } from '@tanstack/react-table';
import { useDeviceDetection } from '../../hooks/useMediaQuery';
import { BulkAction, TableAction } from '../../types/table';

interface MobileTableActionsProps<T> {
  /** 选中的行 */
  selectedRows: Row<T>[];
  /** 所有行数据 */
  allRows: Row<T>[];
  /** 批量操作配置 */
  bulkActions?: BulkAction[];
  /** 快捷操作配置 */
  quickActions?: BulkAction[];
  /** 是否显示 */
  visible: boolean;
  /** 是否紧凑模式 */
  compact?: boolean;
  /** 操作回调 */
  onAction?: (action: TableAction, rowIds: string[]) => void;
  /** 清空选择回调 */
  onClearSelection?: () => void;
  /** 全选回调 */
  onSelectAll?: () => void;
  /** 自定义操作渲染 */
  renderCustomAction?: (action: BulkAction, selectedCount: number) => React.ReactNode;
}

export const MobileTableActions = <T,>({
  selectedRows,
  allRows,
  bulkActions = [],
  quickActions = [],
  visible,
  compact = false,
  onAction,
  onClearSelection,
  onSelectAll,
  renderCustomAction
}: MobileTableActionsProps<T>) => {
  const device = useDeviceDetection();
  const [showMoreActions, setShowMoreActions] = useState(false);
  const selectedCount = selectedRows.length;
  const totalCount = allRows.length;
  const isAllSelected = selectedCount === totalCount && totalCount > 0;

  // 默认批量操作
  const defaultBulkActions: BulkAction[] = useMemo(() => [
    {
      id: 'export',
      label: '导出',
      icon: '📥',
      type: 'export',
      confirmRequired: false,
      destructive: false
    },
    {
      id: 'delete',
      label: '删除',
      icon: '🗑️',
      type: 'delete',
      confirmRequired: true,
      destructive: true
    }
  ], []);

  // 合并操作
  const allBulkActions = useMemo(() => 
    [...defaultBulkActions, ...bulkActions], 
    [defaultBulkActions, bulkActions]
  );

  // 处理操作点击
  const handleAction = useCallback((action: BulkAction) => {
    if (action.disabled) return;

    const selectedIds = selectedRows.map(row => row.id);
    
    if (action.confirmRequired) {
      // 显示确认对话框
      const confirmed = window.confirm(
        `确定要${action.label}选中的 ${selectedCount} 项吗？${
          action.destructive ? '\n此操作不可撤销。' : ''
        }`
      );
      
      if (!confirmed) return;
    }

    onAction?.(action.type, selectedIds);
    
    // 对于非持久性操作，清空选择
    if (!['view', 'edit'].includes(action.type)) {
      onClearSelection?.();
    }
  }, [selectedRows, selectedCount, onAction, onClearSelection]);

  // 处理快捷操作
  const handleQuickAction = useCallback((action: BulkAction) => {
    if (action.type === 'select-all') {
      onSelectAll?.();
    } else {
      handleAction(action);
    }
  }, [onSelectAll, handleAction]);

  if (!visible) {
    return null;
  }

  return (
    <div 
      className={`
        mobile-table-actions
        ${device.isMobile ? 'mobile-fixed-bottom' : 'mobile-floating'}
        ${compact ? 'compact' : ''}
        transition-all duration-300 ease-in-out
        transform ${visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
      `}
    >
      {/* 移动端固定底部工具栏 */}
      {device.isMobile && (
        <div className="
          fixed bottom-0 left-0 right-0 z-50
          bg-base-100 border-t border-base-300
          safe-area-bottom
          backdrop-blur-lg bg-opacity-95
          shadow-lg
        ">
          {/* 选择状态栏 */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-base-200">
            <div className="flex items-center gap-3">
              <button
                onClick={onClearSelection}
                className="btn btn-ghost btn-xs text-base-content/60"
                aria-label="清空选择"
              >
                ✕
              </button>
              <span className="text-sm font-medium">
                已选择 {selectedCount} / {totalCount} 项
              </span>
            </div>
            
            <button
              onClick={() => onSelectAll?.()}
              className="btn btn-ghost btn-xs text-primary"
              disabled={isAllSelected}
            >
              {isAllSelected ? '已全选' : '全选'}
            </button>
          </div>

          {/* 操作按钮区 */}
          <div className="p-3">
            <div className="flex gap-2 overflow-x-auto">
              {/* 主要操作 */}
              {allBulkActions.slice(0, 3).map(action => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action)}
                  disabled={action.disabled}
                  className={`
                    btn btn-sm flex-shrink-0 min-w-fit
                    ${action.destructive ? 'btn-error' : 'btn-primary'}
                    ${action.disabled ? 'btn-disabled' : ''}
                  `}
                  aria-label={`${action.label} ${selectedCount} 项`}
                >
                  <span className="mr-1">{action.icon}</span>
                  {action.label}
                  {selectedCount > 1 && (
                    <span className="ml-1 opacity-70">({selectedCount})</span>
                  )}
                </button>
              ))}

              {/* 更多操作 */}
              {allBulkActions.length > 3 && (
                <div className="dropdown dropdown-top dropdown-end">
                  <label 
                    tabIndex={0} 
                    className="btn btn-sm btn-outline"
                  >
                    更多
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </label>
                  <ul 
                    tabIndex={0} 
                    className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300"
                  >
                    {allBulkActions.slice(3).map(action => (
                      <li key={action.id}>
                        <button
                          onClick={() => handleAction(action)}
                          disabled={action.disabled}
                          className={`
                            ${action.destructive ? 'text-error' : ''}
                            ${action.disabled ? 'text-base-content/30' : ''}
                          `}
                        >
                          <span>{action.icon}</span>
                          {action.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 桌面端浮动工具栏 */}
      {!device.isMobile && (
        <div className="
          fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50
          bg-base-100 rounded-xl shadow-xl border border-base-300
          px-4 py-3
          backdrop-blur-lg bg-opacity-95
          flex items-center gap-4
        ">
          {/* 选择状态 */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClearSelection}
              className="btn btn-ghost btn-xs"
              aria-label="清空选择"
            >
              ✕
            </button>
            <span className="text-sm">
              已选择 <strong>{selectedCount}</strong> 项
            </span>
          </div>

          <div className="divider divider-horizontal mx-0"></div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            {allBulkActions.map(action => {
              if (renderCustomAction) {
                const customComponent = renderCustomAction(action, selectedCount);
                if (customComponent) {
                  return <div key={action.id}>{customComponent}</div>;
                }
              }

              return (
                <button
                  key={action.id}
                  onClick={() => handleAction(action)}
                  disabled={action.disabled}
                  className={`
                    btn btn-sm
                    ${action.destructive ? 'btn-error' : action.id === 'export' ? 'btn-primary' : 'btn-outline'}
                    ${action.disabled ? 'btn-disabled' : ''}
                  `}
                  title={`${action.label} ${selectedCount} 项`}
                >
                  <span>{action.icon}</span>
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 快捷操作悬浮按钮 */}
      {quickActions.length > 0 && device.isMobile && selectedCount === 0 && (
        <div className="fixed bottom-20 right-4 z-40">
          <div className="flex flex-col gap-2">
            {quickActions.map((action, index) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className={`
                  btn btn-circle btn-lg shadow-lg
                  ${action.destructive ? 'btn-error' : 'btn-primary'}
                  transform transition-all duration-200
                  ${showMoreActions ? 'translate-y-0 opacity-100' : `translate-y-${(index + 1) * 4} opacity-0`}
                `}
                style={{
                  transitionDelay: showMoreActions ? `${index * 50}ms` : '0ms'
                }}
                title={action.label}
              >
                <span className="text-xl">{action.icon}</span>
              </button>
            ))}
          </div>

          {/* 主按钮 */}
          <button
            onClick={() => setShowMoreActions(!showMoreActions)}
            className="btn btn-circle btn-lg btn-primary shadow-xl mt-2"
            title="快捷操作"
          >
            <svg 
              className={`w-6 h-6 transition-transform duration-200 ${
                showMoreActions ? 'rotate-45' : 'rotate-0'
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * 行内快捷操作组件
 */
export const RowQuickActions = <T,>({
  row,
  actions = [],
  onAction,
  compact = true
}: {
  row: Row<T>;
  actions?: BulkAction[];
  onAction?: (action: TableAction, rowIds: string[]) => void;
  compact?: boolean;
}) => {
  const device = useDeviceDetection();

  const handleAction = useCallback((action: BulkAction) => {
    if (action.disabled) return;

    if (action.confirmRequired) {
      const confirmed = window.confirm(`确定要${action.label}这项吗？`);
      if (!confirmed) return;
    }

    onAction?.(action.type, [row.id]);
  }, [row.id, onAction]);

  // 默认行操作
  const defaultActions: BulkAction[] = [
    {
      id: 'view',
      label: '查看',
      icon: '👁️',
      type: 'view',
      confirmRequired: false,
      destructive: false
    },
    {
      id: 'edit',
      label: '编辑',
      icon: '✏️',
      type: 'edit',
      confirmRequired: false,
      destructive: false
    },
    {
      id: 'export',
      label: '导出',
      icon: '📥',
      type: 'export',
      confirmRequired: false,
      destructive: false
    },
    {
      id: 'delete',
      label: '删除',
      icon: '🗑️',
      type: 'delete',
      confirmRequired: true,
      destructive: true
    }
  ];

  const allActions = [...defaultActions, ...actions];

  if (device.isMobile && compact) {
    // 移动端显示最重要的2-3个操作
    const primaryActions = allActions.slice(0, 3);
    
    return (
      <div className="flex gap-1">
        {primaryActions.map(action => (
          <button
            key={action.id}
            onClick={() => handleAction(action)}
            disabled={action.disabled}
            className={`
              btn btn-ghost btn-xs
              ${action.destructive ? 'text-error hover:text-error' : ''}
              ${action.disabled ? 'opacity-30' : ''}
              min-h-8 h-8 w-8 p-0
            `}
            title={action.label}
          >
            <span className="text-sm">{action.icon}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      {allActions.map(action => (
        <button
          key={action.id}
          onClick={() => handleAction(action)}
          disabled={action.disabled}
          className={`
            btn btn-ghost btn-xs
            ${action.destructive ? 'text-error hover:text-error' : ''}
            ${action.disabled ? 'opacity-30' : ''}
          `}
          title={action.label}
        >
          <span className="mr-1">{action.icon}</span>
          {!compact && action.label}
        </button>
      ))}
    </div>
  );
};

export default MobileTableActions;