import React from 'react';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import type { Table } from '@tanstack/react-table';

interface ColumnVisibilityManagerProps {
  table: Table<any>;
  isOpen: boolean;
  onClose: () => void;
}

const ColumnVisibilityManager: React.FC<ColumnVisibilityManagerProps> = ({
  table,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const allColumns = table.getAllLeafColumns();
  const visibleColumns = allColumns.filter(column => column.getIsVisible());
  
  // 必须显示的列
  const requiredColumns = ['select', 'invoice_number', 'actions'];
  
  // 列名映射
  const columnNameMap: Record<string, string> = {
    'select': '选择',
    'invoice_number': '发票信息',
    'seller_name': '销售方',
    'consumption_date': '消费日期',
    'total_amount': '金额',
    'status': '状态',
    'source': '来源',
    'created_at': '创建时间',
    'actions': '操作',
  };

  const handleToggleColumn = (columnId: string) => {
    const column = table.getColumn(columnId);
    if (!column) return;
    
    // 检查是否是必需列
    if (requiredColumns.includes(columnId)) {
      return;
    }
    
    // 确保至少有一个非必需列可见
    if (column.getIsVisible() && visibleColumns.length <= requiredColumns.length + 1) {
      return;
    }
    
    column.toggleVisibility();
  };

  const handleResetColumns = () => {
    allColumns.forEach(column => {
      column.toggleVisibility(true);
    });
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* 管理面板 */}
      <div className="fixed right-4 top-20 w-72 bg-base-100 rounded-lg shadow-xl z-50 border border-base-300">
        <div className="p-4 border-b border-base-300">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">列显示设置</h3>
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-4 max-h-96 overflow-y-auto">
          <div className="space-y-2">
            {allColumns
              .filter(column => column.id !== 'select' && column.id !== 'actions')
              .map(column => {
                const isRequired = requiredColumns.includes(column.id);
                const isVisible = column.getIsVisible();
                const canToggle = !isRequired && (
                  !isVisible || visibleColumns.length > requiredColumns.length + 1
                );
                
                return (
                  <label
                    key={column.id}
                    className={`
                      flex items-center gap-3 p-2 rounded cursor-pointer
                      ${canToggle ? 'hover:bg-base-200' : 'opacity-50 cursor-not-allowed'}
                    `}
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={isVisible}
                      onChange={() => handleToggleColumn(column.id)}
                      disabled={!canToggle}
                    />
                    <span className="flex-1 text-sm">
                      {columnNameMap[column.id] || column.id}
                    </span>
                    {isVisible ? (
                      <Eye className="w-4 h-4 text-primary" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-base-content/40" />
                    )}
                  </label>
                );
              })}
          </div>
        </div>
        
        <div className="p-4 border-t border-base-300">
          <button
            className="btn btn-sm btn-ghost w-full"
            onClick={handleResetColumns}
          >
            <RotateCcw className="w-4 h-4" />
            重置为默认
          </button>
        </div>
      </div>
    </>
  );
};

export default ColumnVisibilityManager;