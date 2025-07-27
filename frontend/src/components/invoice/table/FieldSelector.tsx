import React, { useState, useCallback, useMemo } from 'react';
import { 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  Settings, 
  RotateCcw,
  Search,
  X
} from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import type { FieldMetadata } from '../../../services/fieldMetadata.service';
import { saveColumnVisibility, saveColumnOrder } from '../../../utils/tableHelpers';

interface FieldSelectorProps {
  table: Table<any>;
  fields: FieldMetadata[];
  onReset: () => void;
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
  fields,
  onReset,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 必须显示的列
  const requiredColumns = ['select', 'invoice_number', 'actions'];

  // 获取表格所有列
  const allColumns = table.getAllLeafColumns();
  const existingColumnIds = allColumns.map(col => col.id);

  // 过滤字段 - 只显示实际存在的列
  const filteredFields = useMemo(() => {
    const existingFields = fields.filter(field => existingColumnIds.includes(field.column_name));
    
    if (!searchTerm.trim()) return existingFields;
    
    const term = searchTerm.toLowerCase();
    return existingFields.filter(field => 
      field.display_name?.toLowerCase().includes(term) ||
      field.column_name.toLowerCase().includes(term) ||
      field.description?.toLowerCase().includes(term) ||
      field.category?.toLowerCase().includes(term)
    );
  }, [fields, searchTerm, existingColumnIds]);

  // 创建列配置
  const columnConfigs = useMemo(() => {
    const configs: ColumnConfig[] = [];
    
    allColumns.forEach((column, index) => {
      const field = fields.find(f => f.column_name === column.id);
      configs.push({
        field: column.id,
        visible: column.getIsVisible(),
        order: field?.display_order || index,
        label: field?.display_name || column.id,
        category: field?.category,
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
  }, [allColumns, fields, requiredColumns]);

  // 切换字段可见性
  const toggleFieldVisibility = useCallback((fieldName: string) => {
    const column = table.getColumn(fieldName);
    if (!column) return;

    const isRequired = requiredColumns.includes(fieldName);
    if (isRequired) return; // 必需字段不能隐藏

    const newVisibility = !column.getIsVisible();
    column.toggleVisibility(newVisibility);

    // 保存可见性设置
    const visibility = table.getState().columnVisibility;
    saveColumnVisibility(visibility);
  }, [table, requiredColumns]);

  // 移动字段位置
  const moveField = useCallback((fieldName: string, direction: 'up' | 'down') => {
    const currentIndex = columnConfigs.findIndex(col => col.field === fieldName);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= columnConfigs.length) return;

    // 交换顺序
    const newConfigs = [...columnConfigs];
    const temp = newConfigs[currentIndex];
    newConfigs[currentIndex] = newConfigs[newIndex];
    newConfigs[newIndex] = temp;

    // 更新列顺序
    const newOrder = newConfigs.reduce((acc, config, index) => {
      acc[config.field] = index;
      return acc;
    }, {} as Record<string, number>);

    // 保存顺序设置
    saveColumnOrder(newOrder);
    
    // 触发表格更新
    table.setColumnOrder(Object.keys(newOrder).sort((a, b) => newOrder[a] - newOrder[b]));
  }, [columnConfigs, table]);

  // 统计信息
  const visibleCount = columnConfigs.filter(col => col.visible).length;
  const totalCount = columnConfigs.length;

  // 根据分类获取图标
  const getCategoryIcon = (category?: string) => {
    const icons: Record<string, string> = {
      'basic': '📄',
      'financial': '💰',
      'temporal': '📅',
      'metadata': '🏷️',
      'system': '⚙️'
    };
    return icons[category || ''] || '📄';
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
        <Settings className="w-4 h-4" />
        <span className="ml-1 hidden sm:inline">
          字段 ({visibleCount}/{totalCount})
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
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="btn btn-ghost btn-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* 搜索框 */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
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
                已显示 {visibleCount} 个字段，共 {totalCount} 个字段
              </div>

              {/* 字段列表 */}
              <div className="max-h-96 overflow-y-auto space-y-1 pr-1">
                {filteredFields.map((field) => {
                  const config = columnConfigs.find(col => col.field === field.column_name);
                  if (!config) return null;

                  const currentIndex = columnConfigs.findIndex(col => col.field === field.column_name);
                  const canMoveUp = currentIndex > 0 && config.visible && !config.required;
                  const canMoveDown = currentIndex < columnConfigs.length - 1 && config.visible && !config.required;

                  return (
                    <div
                      key={field.column_name}
                      className={`
                        flex items-center gap-2 p-2 rounded-lg transition-colors
                        ${config.visible ? 'bg-primary/5 border border-primary/20' : 'hover:bg-base-200'}
                        ${config.required ? 'opacity-75' : ''}
                      `}
                    >
                      {/* 可见性切换 */}
                      <button
                        type="button"
                        onClick={() => toggleFieldVisibility(field.column_name)}
                        disabled={config.required}
                        className={`
                          btn btn-ghost btn-xs p-1 min-h-0 h-6 w-6
                          ${config.visible ? 'text-primary' : 'text-base-content/50'}
                          ${config.required ? 'cursor-not-allowed' : ''}
                        `}
                        title={config.required ? '必需字段' : (config.visible ? '隐藏字段' : '显示字段')}
                      >
                        {config.visible ? 
                          <Eye className="w-3 h-3" /> : 
                          <EyeOff className="w-3 h-3" />
                        }
                      </button>

                      {/* 分类图标 */}
                      <span className="text-sm" title={field.category}>
                        {getCategoryIcon(field.category)}
                      </span>

                      {/* 字段信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`
                            text-sm font-medium truncate
                            ${config.visible ? 'text-base-content' : 'text-base-content/60'}
                          `}>
                            {field.display_name}
                          </span>
                          {config.required && (
                            <span className="badge badge-xs badge-primary">必需</span>
                          )}
                        </div>
                        {field.description && (
                          <div className="text-xs text-base-content/60 truncate">
                            {field.description}
                          </div>
                        )}
                      </div>

                      {/* 排序按钮 */}
                      {config.visible && !config.required && (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => moveField(field.column_name, 'up')}
                            disabled={!canMoveUp}
                            className={`
                              btn btn-ghost btn-xs p-0 min-h-0 h-4 w-4
                              ${!canMoveUp ? 'opacity-30 cursor-not-allowed' : ''}
                            `}
                            title="上移"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveField(field.column_name, 'down')}
                            disabled={!canMoveDown}
                            className={`
                              btn btn-ghost btn-xs p-0 min-h-0 h-4 w-4
                              ${!canMoveDown ? 'opacity-30 cursor-not-allowed' : ''}
                            `}
                            title="下移"
                          >
                            <ArrowDown className="w-3 h-3" />
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
                  <Eye className="w-3 h-3 inline mr-1" />
                  点击眼睛图标显示/隐藏字段
                </p>
                <p className="text-xs text-base-content/60 mt-1">
                  <ArrowUp className="w-3 h-3 inline mr-1" />
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