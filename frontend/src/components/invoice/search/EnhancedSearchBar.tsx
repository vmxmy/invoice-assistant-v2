import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar,
  DollarSign,
  Tag,
  Building,
  X,
  ChevronDown,
  Clock,
  Zap
} from 'lucide-react';

// 搜索建议类型
interface SearchSuggestion {
  id: string;
  type: 'recent' | 'category' | 'seller' | 'amount_range' | 'date_range';
  text: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

// 快速筛选选项
interface QuickFilter {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  filter: Record<string, any>;
  count?: number;
  description?: string;
}

interface EnhancedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string, filters?: Record<string, any>) => void;
  onAdvancedSearch?: () => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  recentSearches?: string[];
  className?: string;
}

const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  value,
  onChange,
  onSearch,
  onAdvancedSearch,
  placeholder = "搜索发票号、商家名称、金额...",
  suggestions = [],
  recentSearches = [],
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 快速筛选选项
  const quickFilters: QuickFilter[] = [
    {
      id: 'today',
      label: '今天',
      icon: Clock,
      description: '今日开具的发票',
      filter: { 
        dateFrom: new Date().toISOString().split('T')[0],
        dateTo: new Date().toISOString().split('T')[0]
      },
    },
    {
      id: 'this_week',
      label: '本周',
      icon: Calendar,
      description: '本周的发票',
      filter: { 
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
    },
    {
      id: 'this_month',
      label: '本月',
      icon: Calendar,
      description: '本月开具的发票',
      filter: { 
        dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      },
    },
    {
      id: 'large_amount',
      label: '大额发票',
      icon: DollarSign,
      description: '金额 ≥ ¥1000',
      filter: { amountMin: 1000 },
    },
    {
      id: 'small_amount',
      label: '小额发票',
      icon: DollarSign,
      description: '金额 < ¥100',
      filter: { amountMax: 100 },
    },
    {
      id: 'pending_status',
      label: '待处理',
      icon: Tag,
      description: '需要处理的发票',
      filter: { status: ['pending', 'draft'] },
    }
  ];

  // 智能搜索建议
  const smartSuggestions: SearchSuggestion[] = [
    // 最近搜索（优先显示）
    ...recentSearches.slice(0, 3).map(search => ({
      id: `recent_${search}`,
      type: 'recent' as const,
      text: search,
      icon: Clock
    })),
    // 热门搜索建议
    {
      id: 'amount_ranges',
      type: 'amount_range',
      text: '金额范围搜索',
      icon: DollarSign
    },
    {
      id: 'popular_sellers',
      type: 'seller',
      text: '热门商家',
      icon: Building
    },
    {
      id: 'invoice_types',
      type: 'category',
      text: '按类型筛选',
      icon: Tag
    },
    // 传入的建议
    ...suggestions
  ];

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 处理搜索
  const handleSearch = (searchValue: string = value, filters: Record<string, any> = {}) => {
    onSearch(searchValue, { ...activeFilters, ...filters });
    setShowSuggestions(false);
  };

  // 处理快速筛选
  const handleQuickFilter = (filter: QuickFilter) => {
    const newFilters = { ...activeFilters, ...filter.filter };
    setActiveFilters(newFilters);
    handleSearch(value, filter.filter);
  };

  // 移除筛选条件
  const removeFilter = (filterId: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[filterId];
    setActiveFilters(newFilters);
    handleSearch(value, newFilters);
  };

  // 处理建议点击
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'recent') {
      onChange(suggestion.text);
      handleSearch(suggestion.text);
    } else {
      // 根据建议类型处理不同的操作
      switch (suggestion.type) {
        case 'category':
          // 打开分类筛选
          if (onAdvancedSearch) onAdvancedSearch();
          break;
        case 'seller':
          // 打开商家筛选
          if (onAdvancedSearch) onAdvancedSearch();
          break;
        case 'amount_range':
          // 打开金额范围筛选
          if (onAdvancedSearch) onAdvancedSearch();
          break;
        case 'date_range':
          // 打开日期范围筛选
          if (onAdvancedSearch) onAdvancedSearch();
          break;
        default:
          // 默认作为文本搜索
          onChange(suggestion.text);
          handleSearch(suggestion.text);
      }
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* 主搜索框 */}
      <div className={`form-control w-full transition-all duration-200 ${isExpanded ? 'transform scale-105' : ''}`}>
        <div className="input-group">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              className="input input-bordered w-full pr-12 focus:ring-2 focus:ring-primary/20"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => {
                setShowSuggestions(true);
                setIsExpanded(true);
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            
            {/* 搜索状态指示器 */}
            <div className="absolute right-12 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {value && (
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    onChange('');
                    inputRef.current?.focus();
                  }}
                  title="清除搜索"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* 搜索按钮 */}
          <button 
            className="btn btn-primary"
            onClick={() => handleSearch()}
          >
            <Search className="w-4 h-4" />
          </button>
          
          {/* 高级搜索按钮 */}
          {onAdvancedSearch && (
            <button 
              className="btn btn-outline"
              onClick={onAdvancedSearch}
            >
              <Filter className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 活跃筛选条件显示 */}
      {Object.keys(activeFilters).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(activeFilters).map(([key, value]) => (
            <div key={key} className="badge badge-primary gap-2">
              <span className="text-xs">{`${key}: ${value}`}</span>
              <button 
                className="btn btn-ghost btn-xs"
                onClick={() => removeFilter(key)}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button 
            className="btn btn-ghost btn-xs"
            onClick={() => {
              setActiveFilters({});
              handleSearch(value, {});
            }}
          >
            清除全部
          </button>
        </div>
      )}

      {/* 搜索建议和快速筛选 */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-base-100 border border-base-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* 快速筛选 */}
          <div className="p-4 border-b border-base-200">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">快速筛选</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {quickFilters.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.id}
                    className="btn btn-sm btn-outline gap-2 hover:btn-primary transition-all duration-200 text-left justify-start"
                    onClick={() => handleQuickFilter(filter)}
                    title={filter.description}
                  >
                    <Icon className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{filter.label}</span>
                    {filter.count && (
                      <span className="badge badge-xs ml-auto">{filter.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 搜索建议 */}
          {smartSuggestions.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs font-medium text-base-content/60 uppercase tracking-wider">
                建议搜索
              </div>
              {smartSuggestions.map((suggestion) => {
                const Icon = suggestion.icon || Search;
                const isRecent = suggestion.type === 'recent';
                return (
                  <button
                    key={suggestion.id}
                    className={`w-full flex items-center justify-between px-3 py-2 hover:bg-base-200 rounded transition-colors text-left ${
                      isRecent ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${
                        isRecent ? 'text-primary' : 'text-base-content/60'
                      }`} />
                      <div className="flex flex-col items-start">
                        <span className="text-sm">{suggestion.text}</span>
                        {isRecent && (
                          <span className="text-xs text-base-content/40">最近搜索</span>
                        )}
                      </div>
                    </div>
                    {suggestion.count && (
                      <span className="badge badge-sm badge-ghost">{suggestion.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* 搜索提示 */}
          {value.length === 0 && smartSuggestions.length === 0 && (
            <div className="p-6 text-center text-base-content/60">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <h3 className="font-medium mb-2">开始搜索发票</h3>
              <p className="text-sm mb-3">支持搜索发票号、商家名称、金额等</p>
              <div className="text-xs text-base-content/40">
                <p>• 输入发票号快速查找</p>
                <p>• 输入商家名称查看所有相关发票</p>
                <p>• 输入金额范围如：>1000 或 100-500</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedSearchBar;