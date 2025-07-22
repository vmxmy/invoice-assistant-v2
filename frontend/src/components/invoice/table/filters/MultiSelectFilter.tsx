import React, { useState, useEffect } from 'react';
import { Column } from '@tanstack/react-table';
import { Check } from 'lucide-react';
import ColumnFilter from './ColumnFilter';

interface MultiSelectFilterProps {
  column: Column<any, unknown>;
  options: { value: string; label: string; className?: string }[];
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({ column, options }) => {
  const filterValue = column.getFilterValue() as string[] | undefined;
  const [selectedValues, setSelectedValues] = useState<Set<string>>(
    new Set(filterValue || [])
  );

  useEffect(() => {
    const value = column.getFilterValue() as string[] | undefined;
    setSelectedValues(new Set(value || []));
  }, [column.getFilterValue()]);

  const handleToggle = (value: string) => {
    const newSelected = new Set(selectedValues);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    setSelectedValues(newSelected);
    
    // 立即应用筛选
    const selectedArray = Array.from(newSelected);
    column.setFilterValue(selectedArray.length > 0 ? selectedArray : undefined);
  };

  const handleSelectAll = () => {
    const allValues = new Set(options.map(opt => opt.value));
    setSelectedValues(allValues);
    column.setFilterValue(Array.from(allValues));
  };

  const handleClearAll = () => {
    setSelectedValues(new Set());
    column.setFilterValue(undefined);
  };

  return (
    <ColumnFilter column={column}>
      <div className="space-y-3">
        {/* 快捷操作 */}
        <div className="flex gap-2">
          <button
            className="btn btn-ghost btn-xs flex-1"
            onClick={handleSelectAll}
          >
            全选
          </button>
          <button
            className="btn btn-ghost btn-xs flex-1"
            onClick={handleClearAll}
          >
            清空
          </button>
        </div>

        <div className="divider my-2"></div>

        {/* 选项列表 */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {options.map(option => (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer hover:bg-base-200 p-2 rounded"
            >
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={selectedValues.has(option.value)}
                onChange={() => handleToggle(option.value)}
              />
              <span className={`text-sm ${option.className || ''}`}>
                {option.label}
              </span>
            </label>
          ))}
        </div>

        {/* 已选中数量提示 */}
        {selectedValues.size > 0 && (
          <div className="text-xs text-base-content/60 text-center">
            已选择 {selectedValues.size} 项
          </div>
        )}
      </div>
    </ColumnFilter>
  );
};

export default MultiSelectFilter;