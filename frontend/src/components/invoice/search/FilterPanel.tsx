import React from 'react';
import { X } from 'lucide-react';
import type { SearchFilters } from './AdvancedSearchDrawer';
import { formatCurrency, formatDate } from '../../../utils/format';

interface FilterPanelProps {
  filters: SearchFilters;
  onRemoveFilter: (filterKey: keyof SearchFilters) => void;
  onClearAll: () => void;
}

interface FilterTag {
  key: keyof SearchFilters;
  label: string;
  value: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onRemoveFilter,
  onClearAll
}) => {
  // 将筛选条件转换为可视化标签
  const getFilterTags = (): FilterTag[] => {
    const tags: FilterTag[] = [];

    // 发票号码
    if (filters.invoiceNumber) {
      tags.push({
        key: 'invoiceNumber',
        label: '发票号码',
        value: filters.invoiceNumber
      });
    }

    // 销售方名称
    if (filters.sellerName) {
      tags.push({
        key: 'sellerName',
        label: '销售方',
        value: filters.sellerName
      });
    }

    // 购买方名称
    if (filters.buyerName) {
      tags.push({
        key: 'buyerName',
        label: '购买方',
        value: filters.buyerName
      });
    }

    // 金额范围
    if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
      let value = '';
      if (filters.amountMin !== undefined && filters.amountMax !== undefined) {
        value = `${formatCurrency(filters.amountMin)} - ${formatCurrency(filters.amountMax)}`;
      } else if (filters.amountMin !== undefined) {
        value = `≥ ${formatCurrency(filters.amountMin)}`;
      } else if (filters.amountMax !== undefined) {
        value = `≤ ${formatCurrency(filters.amountMax)}`;
      }
      
      // 金额最小值
      if (filters.amountMin !== undefined) {
        tags.push({
          key: 'amountMin',
          label: '最小金额',
          value: formatCurrency(filters.amountMin)
        });
      }
      
      // 金额最大值
      if (filters.amountMax !== undefined) {
        tags.push({
          key: 'amountMax',
          label: '最大金额',
          value: formatCurrency(filters.amountMax)
        });
      }
    }

    // 日期范围
    if (filters.dateFrom || filters.dateTo) {
      // 开始日期
      if (filters.dateFrom) {
        tags.push({
          key: 'dateFrom',
          label: '开始日期',
          value: formatDate(filters.dateFrom)
        });
      }
      
      // 结束日期
      if (filters.dateTo) {
        tags.push({
          key: 'dateTo',
          label: '结束日期',
          value: formatDate(filters.dateTo)
        });
      }
    }

    // 处理状态
    if (filters.status && filters.status.length > 0) {
      const statusMap: Record<string, string> = {
        'pending': '待处理',
        'processing': '处理中',
        'completed': '已完成',
        'failed': '失败'
      };
      
      filters.status.forEach(status => {
        tags.push({
          key: 'status',
          label: '状态',
          value: statusMap[status] || status
        });
      });
    }

    // 来源类型
    if (filters.source && filters.source.length > 0) {
      const sourceMap: Record<string, string> = {
        'email': '邮件',
        'upload': '上传',
        'api': 'API'
      };
      
      filters.source.forEach(source => {
        tags.push({
          key: 'source',
          label: '来源',
          value: sourceMap[source] || source
        });
      });
    }

    return tags;
  };

  const filterTags = getFilterTags();

  // 如果没有筛选条件，不显示
  if (filterTags.length === 0) {
    return null;
  }

  // 处理移除单个筛选条件
  const handleRemoveTag = (tag: FilterTag) => {
    // 对于数组类型的筛选（状态、来源），需要特殊处理
    if (tag.key === 'status' || tag.key === 'source') {
      // 这里需要父组件处理数组的移除逻辑
      // 暂时直接清除整个字段
      onRemoveFilter(tag.key);
    } else {
      onRemoveFilter(tag.key);
    }
  };

  return (
    <div className="card bg-base-100 shadow-sm mb-4">
      <div className="card-body p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">当前筛选条件</h3>
          <button 
            className="btn btn-xs btn-ghost"
            onClick={onClearAll}
          >
            清除全部
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {filterTags.map((tag, index) => (
            <div 
              key={`${tag.key}-${index}`}
              className="badge badge-primary gap-2"
            >
              <span className="text-xs">{tag.label}:</span>
              <span className="font-medium">{tag.value}</span>
              <button 
                className="btn btn-xs btn-circle btn-ghost ml-1"
                onClick={() => handleRemoveTag(tag)}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;