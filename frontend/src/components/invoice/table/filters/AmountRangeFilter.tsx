import React, { useState, useEffect } from 'react';
import { Column } from '@tanstack/react-table';
import { DollarSign } from 'lucide-react';
import ColumnFilter from './ColumnFilter';
import type { AmountRange } from '../../../../types/table';

interface AmountRangeFilterProps {
  column: Column<any, unknown>;
}

const AmountRangeFilter: React.FC<AmountRangeFilterProps> = ({ column }) => {
  const filterValue = column.getFilterValue() as AmountRange | undefined;
  const [minAmount, setMinAmount] = useState(filterValue?.min?.toString() || '');
  const [maxAmount, setMaxAmount] = useState(filterValue?.max?.toString() || '');

  useEffect(() => {
    const value = column.getFilterValue() as AmountRange | undefined;
    setMinAmount(value?.min?.toString() || '');
    setMaxAmount(value?.max?.toString() || '');
  }, [column.getFilterValue()]);

  const handleApply = () => {
    const min = minAmount ? parseFloat(minAmount) : undefined;
    const max = maxAmount ? parseFloat(maxAmount) : undefined;
    
    if (min !== undefined || max !== undefined) {
      column.setFilterValue({ min, max });
    } else {
      column.setFilterValue(undefined);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  // 快捷选项
  const quickOptions = [
    { label: '< ¥100', min: 0, max: 100 },
    { label: '¥100 - ¥500', min: 100, max: 500 },
    { label: '¥500 - ¥1000', min: 500, max: 1000 },
    { label: '¥1000 - ¥5000', min: 1000, max: 5000 },
    { label: '¥5000 - ¥10000', min: 5000, max: 10000 },
    { label: '> ¥10000', min: 10000, max: undefined }
  ];

  const handleQuickOption = (option: typeof quickOptions[0]) => {
    setMinAmount(option.min.toString());
    setMaxAmount(option.max?.toString() || '');
    column.setFilterValue({ min: option.min, max: option.max });
  };

  // 验证输入是否为有效数字
  const handleAmountChange = (value: string, setter: (value: string) => void) => {
    // 允许空值、数字和小数点
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  // 获取当前筛选的文本描述
  const getFilterDescription = () => {
    if (!filterValue) return '';
    
    if (filterValue.min !== undefined && filterValue.max !== undefined) {
      return `¥${filterValue.min} - ¥${filterValue.max}`;
    } else if (filterValue.min !== undefined) {
      return `≥ ¥${filterValue.min}`;
    } else if (filterValue.max !== undefined) {
      return `≤ ¥${filterValue.max}`;
    }
    return '';
  };

  const currentDescription = getFilterDescription();

  return (
    <ColumnFilter column={column}>
      <div className="space-y-4">
        {/* 当前筛选 */}
        {currentDescription && (
          <div className="text-xs text-base-content/60">
            当前筛选: {currentDescription}
          </div>
        )}

        {/* 快捷选项 */}
        <div className="grid grid-cols-2 gap-2">
          {quickOptions.map((option, index) => (
            <button
              key={index}
              className="btn btn-sm btn-ghost text-xs"
              onClick={() => handleQuickOption(option)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="divider my-2"></div>

        {/* 自定义金额范围 */}
        <div className="space-y-3">
          <div>
            <label className="label label-text text-xs">最小金额</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60">
                ¥
              </span>
              <input
                type="text"
                className="input input-bordered input-sm w-full pl-8"
                placeholder="0.00"
                value={minAmount}
                onChange={(e) => handleAmountChange(e.target.value, setMinAmount)}
                onKeyPress={handleKeyPress}
              />
            </div>
          </div>
          
          <div>
            <label className="label label-text text-xs">最大金额</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60">
                ¥
              </span>
              <input
                type="text"
                className="input input-bordered input-sm w-full pl-8"
                placeholder="不限"
                value={maxAmount}
                onChange={(e) => handleAmountChange(e.target.value, setMaxAmount)}
                onKeyPress={handleKeyPress}
              />
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm w-full"
          onClick={handleApply}
        >
          应用筛选
        </button>
      </div>
    </ColumnFilter>
  );
};

export default AmountRangeFilter;