import React, { useState } from 'react';
import { Column } from '@tanstack/react-table';
import { Filter, X } from 'lucide-react';

interface ColumnFilterProps {
  column: Column<any, unknown>;
  children: React.ReactNode;
}

const ColumnFilter: React.FC<ColumnFilterProps> = ({ column, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClear = () => {
    column.setFilterValue(undefined);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        className={`btn btn-ghost btn-xs ${column.getIsFiltered() ? 'text-primary' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Filter className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          {/* 点击外部关闭 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* 筛选器弹出框 */}
          <div className="absolute top-full mt-2 z-50 bg-base-100 border border-base-300 rounded-lg shadow-lg p-4 min-w-[240px] right-0 sm:right-auto sm:left-0 max-w-[90vw] sm:max-w-none">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">筛选</h4>
              {column.getIsFiltered() && (
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={handleClear}
                >
                  <X className="w-3 h-3" />
                  清除
                </button>
              )}
            </div>
            
            {children}
          </div>
        </>
      )}
    </div>
  );
};

export default ColumnFilter;