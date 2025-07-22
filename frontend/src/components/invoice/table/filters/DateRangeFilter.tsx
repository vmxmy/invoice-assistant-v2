import React, { useState, useEffect } from 'react';
import { Column } from '@tanstack/react-table';
import { Calendar } from 'lucide-react';
import ColumnFilter from './ColumnFilter';
import type { DateRange } from '../../../../types/table';

interface DateRangeFilterProps {
  column: Column<any, unknown>;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ column }) => {
  const filterValue = column.getFilterValue() as DateRange | undefined;
  const [dateFrom, setDateFrom] = useState(filterValue?.from || '');
  const [dateTo, setDateTo] = useState(filterValue?.to || '');

  useEffect(() => {
    const value = column.getFilterValue() as DateRange | undefined;
    setDateFrom(value?.from || '');
    setDateTo(value?.to || '');
  }, [column.getFilterValue()]);

  const handleApply = () => {
    if (dateFrom || dateTo) {
      column.setFilterValue({ from: dateFrom, to: dateTo });
    } else {
      column.setFilterValue(undefined);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  // 获取今天的日期字符串
  const today = new Date().toISOString().split('T')[0];

  // 快捷选项
  const quickOptions = [
    {
      label: '今天',
      action: () => {
        setDateFrom(today);
        setDateTo(today);
        column.setFilterValue({ from: today, to: today });
      }
    },
    {
      label: '昨天',
      action: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        setDateFrom(yesterdayStr);
        setDateTo(yesterdayStr);
        column.setFilterValue({ from: yesterdayStr, to: yesterdayStr });
      }
    },
    {
      label: '最近7天',
      action: () => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        setDateFrom(weekAgoStr);
        setDateTo(today);
        column.setFilterValue({ from: weekAgoStr, to: today });
      }
    },
    {
      label: '最近30天',
      action: () => {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        const monthAgoStr = monthAgo.toISOString().split('T')[0];
        setDateFrom(monthAgoStr);
        setDateTo(today);
        column.setFilterValue({ from: monthAgoStr, to: today });
      }
    },
    {
      label: '本月',
      action: () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const firstDayStr = firstDay.toISOString().split('T')[0];
        const lastDayStr = lastDay.toISOString().split('T')[0];
        setDateFrom(firstDayStr);
        setDateTo(lastDayStr);
        column.setFilterValue({ from: firstDayStr, to: lastDayStr });
      }
    },
    {
      label: '上月',
      action: () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        const firstDayStr = firstDay.toISOString().split('T')[0];
        const lastDayStr = lastDay.toISOString().split('T')[0];
        setDateFrom(firstDayStr);
        setDateTo(lastDayStr);
        column.setFilterValue({ from: firstDayStr, to: lastDayStr });
      }
    }
  ];

  return (
    <ColumnFilter column={column}>
      <div className="space-y-4">
        {/* 快捷选项 */}
        <div className="grid grid-cols-2 gap-2">
          {quickOptions.map(option => (
            <button
              key={option.label}
              className="btn btn-sm btn-ghost text-xs"
              onClick={option.action}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="divider my-2"></div>

        {/* 自定义日期范围 */}
        <div className="space-y-3">
          <div>
            <label className="label label-text text-xs">开始日期</label>
            <div className="relative">
              <input
                type="date"
                className="input input-bordered input-sm w-full pr-8"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                onKeyPress={handleKeyPress}
                max={dateTo || undefined}
              />
              <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" />
            </div>
          </div>
          
          <div>
            <label className="label label-text text-xs">结束日期</label>
            <div className="relative">
              <input
                type="date"
                className="input input-bordered input-sm w-full pr-8"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                onKeyPress={handleKeyPress}
                min={dateFrom || undefined}
              />
              <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" />
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

export default DateRangeFilter;