import React, { useState, useEffect } from 'react';
import { Column } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import ColumnFilter from './ColumnFilter';
import { useDebounce } from '../../../../hooks/useDebounce';

interface TextFilterProps {
  column: Column<any, unknown>;
  placeholder?: string;
}

const TextFilter: React.FC<TextFilterProps> = ({ column, placeholder = '搜索...' }) => {
  const filterValue = column.getFilterValue() as string | undefined;
  const [value, setValue] = useState(filterValue || '');
  const debouncedValue = useDebounce(value, 300);

  useEffect(() => {
    const currentValue = column.getFilterValue() as string | undefined;
    setValue(currentValue || '');
  }, [column.getFilterValue()]);

  useEffect(() => {
    column.setFilterValue(debouncedValue || undefined);
  }, [debouncedValue, column]);

  const handleClear = () => {
    setValue('');
    column.setFilterValue(undefined);
  };

  return (
    <ColumnFilter column={column}>
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            className="input input-bordered input-sm w-full pr-8"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" />
        </div>

        {value && (
          <button
            className="btn btn-ghost btn-sm w-full"
            onClick={handleClear}
          >
            清除筛选
          </button>
        )}
      </div>
    </ColumnFilter>
  );
};

export default TextFilter;