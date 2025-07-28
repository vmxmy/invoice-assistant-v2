import React, { useState, useCallback, useMemo } from 'react';
import type { Table } from '@tanstack/react-table';
import { useTableColumns, type TableColumn } from '../../../hooks/useTableColumns';

interface FieldSelectorProps {
  table?: Table<any>;
  columns?: any[];
  onVisibilityChange?: (visibility: Record<string, boolean>) => void;
  onReset?: () => void;
  className?: string;
}

interface ColumnConfig {
  field: string;
  visible: boolean;
  order: number;
  label: string;
  category?: string;
  required?: boolean;
}

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  table,
  columns,
  onVisibilityChange,
  onReset,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 使用 useTableColumns Hook 获取字段信息
  const { allColumns, loading, categories, totalFields } = useTableColumns({ 
    tableName: 'invoices', 
    enabled: true 
  });

  // 必须显示的列
  const requiredColumns = ['select', 'invoice_number', 'actions'];

  // 获取表格所有列（添加安全检查）
  const tableColumns = table?.getAllLeafColumns() || [];
  const existingColumnIds = tableColumns.map(col => col.id);

  // 按表格列顺序排序的字段列表
  const orderedFields = useMemo(() => {
    // 根据表格当前的列顺序来排序字段
    const orderedList: typeof allColumns = []
    
    // 首先按表格列的顺序添加字段
    tableColumns.forEach(column => {
      const field = allColumns.find(f => f.field === column.id)
      if (field) {
        orderedList.push(field)
      }
    })
    
    // 然后添加不在表格中但存在于allColumns中的字段
    allColumns.forEach(field => {
      if (!orderedList.find(f => f.field === field.field)) {
        orderedList.push(field)
      }
    })
    
    return orderedList
  }, [allColumns, tableColumns])

  // 过滤字段 - 只显示实际存在的列，并按表格顺序排序
  const filteredFields = useMemo(() => {
    const existingFields = orderedFields.filter(field => existingColumnIds.includes(field.field))
    
    if (!searchTerm.trim()) return existingFields
    
    const term = searchTerm.toLowerCase()
    return existingFields.filter(field => 
      field.label?.toLowerCase().includes(term) ||
      field.field.toLowerCase().includes(term)
    )
  }, [orderedFields, searchTerm, existingColumnIds])

  // 创建列配置
  const columnConfigs = useMemo(() => {
    const configs: ColumnConfig[] = [];
    
    tableColumns.forEach((column, index) => {
      const field = allColumns.find(f => f.field === column.id);
      configs.push({
        field: column.id,
        visible: column.getIsVisible(),
        order: index,
        label: field?.label || column.id,
        category: field?.type || 'text',
        required: requiredColumns.includes(column.id)
      });
    });

    return configs.sort((a, b) => {
      // 先按可见性排序，再按顺序排序
      if (a.visible !== b.visible) {
        return a.visible ? -1 : 1;
      }
      return a.order - b.order;
    });
  }, [tableColumns, allColumns, requiredColumns]);

  // 切换字段可见性
  const toggleFieldVisibility = useCallback((fieldName: string) => {
    if (!table) return;
    const column = table.getColumn(fieldName);
    if (!column) return;

    const isRequired = requiredColumns.includes(fieldName);
    if (isRequired) return; // 必需字段不能隐藏

    const newVisibility = !column.getIsVisible();
    column.toggleVisibility(newVisibility);
  }, [table, requiredColumns]);

  // 移动字段位置
  const moveField = useCallback((fieldName: string, direction: 'up' | 'down') => {
    // 获取当前表格列的顺序
    const currentColumnOrder = table.getAllLeafColumns().map(col => col.id)
    const currentIndex = currentColumnOrder.findIndex(id => id === fieldName)
    
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= currentColumnOrder.length) return

    // 创建新的列顺序数组
    const newColumnOrder = [...currentColumnOrder]
    // 交换位置
    [newColumnOrder[currentIndex], newColumnOrder[newIndex]] = [newColumnOrder[newIndex], newColumnOrder[currentIndex]]

    // 更新表格列顺序
    table.setColumnOrder(newColumnOrder)
  }, [table])

  // 统计信息
  const visibleCount = columnConfigs.filter(col => col.visible).length;
  const totalCount = columnConfigs.length;

  // 根据类型获取图标
  const getTypeIcon = (type?: string) => {
    const icons: Record<string, string> = {
      'text': '📄',
      'number': '🔢',
      'date': '📅',
      'datetime': '⏰',
      'boolean': '✓',
      'select': '📋',
      'array': '📝'
    };
    return icons[type || 'text'] || '📄';
  };

  return (
    <div className={`relative ${className}`}>
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost btn-sm"
        title="字段设置"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="ml-1 hidden sm:inline">
          字段 ({visibleCount}/{totalFields || totalCount})
        </span>
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* 面板内容 */}
          <div className="absolute right-0 mt-2 w-96 bg-base-100 shadow-xl rounded-lg border border-base-300 z-50">
            <div className="p-4">
              {/* 头部 */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-lg text-base-content">字段设置</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onReset}
                    className="btn btn-ghost btn-xs"
                    title="重置为默认"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="btn btn-ghost btn-xs"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 搜索框 */}
              <div className="mb-4">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="搜索字段..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input input-bordered input-sm w-full pl-9"
                  />
                </div>
              </div>

              {/* 统计信息 */}
              <div className="mb-4 text-sm text-base-content/70">
                已显示 {visibleCount} 个字段，共 {totalFields || totalCount} 个字段
                {loading && <span className="ml-2 loading loading-spinner loading-xs"></span>}
              </div>

              {/* 字段列表 */}
              <div className="max-h-96 overflow-y-auto space-y-1 pr-1">
                {filteredFields.map((field, fieldIndex) => {
                  const config = columnConfigs.find(col => col.field === field.field);
                  if (!config) return null;

                  // 基于当前表格列顺序判断是否可以移动
                  const currentColumnOrder = table.getAllLeafColumns().map(col => col.id)
                  const currentTableIndex = currentColumnOrder.findIndex(id => id === field.field)
                  const canMoveUp = currentTableIndex > 0 && config.visible && !config.required;
                  const canMoveDown = currentTableIndex < currentColumnOrder.length - 1 && config.visible && !config.required;

                  return (
                    <div
                      key={field.field}
                      className={`
                        flex items-center gap-2 p-2 rounded-lg transition-colors
                        ${config.visible ? 'bg-primary/5 border border-primary/20' : 'hover:bg-base-200'}
                        ${config.required ? 'opacity-75' : ''}
                      `}
                    >
                      {/* 可见性切换 */}
                      <button
                        type="button"
                        onClick={() => toggleFieldVisibility(field.field)}
                        disabled={config.required}
                        className={`
                          btn btn-ghost btn-xs p-1 min-h-0 h-6 w-6
                          ${config.visible ? 'text-primary' : 'text-base-content/50'}
                          ${config.required ? 'cursor-not-allowed' : ''}
                        `}
                        title={config.required ? '必需字段' : (config.visible ? '隐藏字段' : '显示字段')}
                      >
                        {config.visible ? 
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg> : 
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        }
                      </button>

                      {/* 分类图标 */}
                      <span className="text-sm" title={field.type}>
                        {getTypeIcon(field.type)}
                      </span>

                      {/* 字段信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`
                            text-sm font-medium truncate
                            ${config.visible ? 'text-base-content' : 'text-base-content/60'}
                          `}>
                            {field.label}
                          </span>
                          {config.required && (
                            <span className="badge badge-xs badge-primary">必需</span>
                          )}
                        </div>
                        <div className="text-xs text-base-content/60 truncate">
                          {field.field} ({field.type})
                        </div>
                      </div>

                      {/* 排序按钮 */}
                      {config.visible && !config.required && (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => moveField(field.field, 'up')}
                            disabled={!canMoveUp}
                            className={`
                              btn btn-ghost btn-xs p-0 min-h-0 h-4 w-4
                              ${!canMoveUp ? 'opacity-30 cursor-not-allowed' : ''}
                            `}
                            title="上移"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveField(field.field, 'down')}
                            disabled={!canMoveDown}
                            className={`
                              btn btn-ghost btn-xs p-0 min-h-0 h-4 w-4
                              ${!canMoveDown ? 'opacity-30 cursor-not-allowed' : ''}
                            `}
                            title="下移"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 底部信息 */}
              {filteredFields.length === 0 && searchTerm && (
                <div className="text-center text-sm text-base-content/60 py-4">
                  未找到匹配的字段
                </div>
              )}

              {/* 提示信息 */}
              <div className="mt-4 pt-4 border-t border-base-300">
                <p className="text-xs text-base-content/60">
                  <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  点击眼睛图标显示/隐藏字段
                </p>
                <p className="text-xs text-base-content/60 mt-1">
                  <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  使用箭头调整字段顺序
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FieldSelector;