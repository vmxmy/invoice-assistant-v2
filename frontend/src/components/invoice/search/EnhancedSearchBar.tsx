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
      {/* 主搜索框 - 现代化设计 */}
      <div className={`relative w-full transition-all duration-300 ease-out ${
        isExpanded ? 'transform scale-[1.02] shadow-lg' : 'shadow-sm'
      }`}>
        <div className="relative bg-base-100 rounded-xl border border-base-300 hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200">
          {/* 搜索图标 */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
            <Search className="w-5 h-5 text-base-content/40" />
          </div>
          
          {/* 输入框 */}
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className="w-full pl-12 pr-24 py-4 bg-transparent border-0 text-base placeholder:text-base-content/50 focus:outline-none rounded-xl"
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
          
          {/* 右侧操作区 */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {/* 清除按钮 */}
            {value && (
              <button
                className="btn btn-ghost btn-sm btn-circle hover:bg-base-200 transition-colors"
                onClick={() => {
                  onChange('');
                  inputRef.current?.focus();
                }}
                title="清除搜索"
              >
                <X className="w-4 h-4 text-base-content/60" />
              </button>
            )}
            
            {/* 高级搜索按钮 - 移动端优化 */}
            {onAdvancedSearch && (
              <button 
                className="btn btn-ghost btn-sm btn-circle hover:bg-primary/10 hover:text-primary transition-colors lg:btn-sm lg:px-3 lg:rounded-lg"
                onClick={onAdvancedSearch}
                title="高级搜索"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden lg:inline ml-1 text-xs">筛选</span>
              </button>
            )}
            
            {/* 搜索按钮 - 响应式设计 */}
            <button 
              className="btn btn-primary btn-sm px-4 rounded-lg hover:shadow-md transition-all duration-200"
              onClick={() => handleSearch()}
            >
              <span className="hidden sm:inline mr-1 text-sm">搜索</span>
              <Search className="w-4 h-4 sm:hidden" />
            </button>
          </div>
        </div>
      </div>

      {/* 活跃筛选条件显示 - 优化移动端 */}
      {Object.keys(activeFilters).length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {Object.entries(activeFilters).map(([key, value]) => (
              <div key={key} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm border border-primary/20">
                <span className="font-medium">{key}:</span>
                <span className="truncate max-w-24">{String(value)}</span>
                <button 
                  className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                  onClick={() => removeFilter(key)}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button 
              className="inline-flex items-center gap-1 px-3 py-1 text-xs text-base-content/60 hover:text-base-content hover:bg-base-200 rounded-full transition-colors"
              onClick={() => {
                setActiveFilters({});
                handleSearch(value, {});
              }}
            >
              <X className="w-3 h-3" />
              清除全部
            </button>
          </div>
        </div>
      )}

      {/* 搜索建议和快速筛选 - 现代化设计 */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-base-100 border border-base-200 rounded-2xl shadow-xl z-50 max-h-96 overflow-hidden">
          {/* 快速筛选 */}
          <div className="p-4 sm:p-6 border-b border-base-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                <Zap className="w-3 h-3 text-primary" />
              </div>
              <span className="font-semibold text-base text-base-content">快速筛选</span>
            </div>
            
            {/* 移动端优化的筛选按钮 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              {quickFilters.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.id}
                    className="group relative flex flex-col items-center gap-2 p-3 sm:p-4 bg-base-50 hover:bg-primary/5 border border-base-200 hover:border-primary/30 rounded-xl transition-all duration-200 hover:shadow-md text-center"
                    onClick={() => handleQuickFilter(filter)}
                    title={filter.description}
                  >
                    <div className="w-8 h-8 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-base-content group-hover:text-primary transition-colors">
                      {filter.label}
                    </span>
                    {filter.count && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-content text-xs rounded-full flex items-center justify-center">
                        {filter.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 搜索建议 - 优雅设计 */}
          {smartSuggestions.length > 0 && (
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Clock className="w-3 h-3 text-secondary" />
                </div>
                <span className="font-semibold text-base text-base-content">搜索建议</span>
              </div>
              
              <div className="space-y-1">
                {smartSuggestions.map((suggestion) => {
                  const Icon = suggestion.icon || Search;
                  const isRecent = suggestion.type === 'recent';
                  return (
                    <button
                      key={suggestion.id}
                      className={`w-full flex items-center justify-between px-3 py-3 hover:bg-base-100 rounded-xl transition-all duration-200 text-left group ${
                        isRecent ? 'bg-primary/5 border border-primary/10' : 'hover:shadow-sm'
                      }`}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isRecent ? 'bg-primary/10' : 'bg-base-200 group-hover:bg-base-300'
                        } transition-colors`}>
                          <Icon className={`w-4 h-4 ${
                            isRecent ? 'text-primary' : 'text-base-content/60 group-hover:text-base-content'
                          }`} />
                        </div>
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span className="text-sm font-medium text-base-content truncate">{suggestion.text}</span>
                          {isRecent && (
                            <span className="text-xs text-primary/60">最近搜索</span>
                          )}
                        </div>
                      </div>
                      {suggestion.count && (
                        <span className="badge badge-sm bg-base-200 text-base-content/70 border-0">{suggestion.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 搜索提示 - 精美设计 */}
          {value.length === 0 && smartSuggestions.length === 0 && (
            <div className="p-6 sm:p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="font-semibold text-lg text-base-content mb-2">开始搜索发票</h3>
              <p className="text-base-content/60 mb-4">支持搜索发票号、商家名称、金额等信息</p>
              
              <div className="bg-base-100 rounded-xl p-4 space-y-2 text-left max-w-sm mx-auto">
                <div className="flex items-center gap-2 text-sm text-base-content/70">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  <span>输入发票号快速查找</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-base-content/70">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  <span>输入商家名称查看相关发票</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-base-content/70">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  <span>输入金额范围如：&gt;1000 或 100-500</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 移动端遮罩层 */}
      {showSuggestions && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 sm:hidden"
          onClick={() => {
            setShowSuggestions(false);
            setIsExpanded(false);
          }}
        />
      )}
    </div>
  );
};

export default EnhancedSearchBar;