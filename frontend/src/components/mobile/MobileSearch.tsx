import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Filter, SortDesc } from 'lucide-react';
import MobileInput from './MobileInput';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'history' | 'suggestion' | 'category';
  metadata?: Record<string, any>;
}

interface MobileSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  showSuggestions?: boolean;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  onFilterClick?: () => void;
  onSortClick?: () => void;
  showFilters?: boolean;
  activeFiltersCount?: number;
  debounceMs?: number;
}

const MobileSearch: React.FC<MobileSearchProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = '搜索发票...',
  suggestions = [],
  showSuggestions = true,
  onSuggestionSelect,
  onFilterClick,
  onSortClick,
  showFilters = true,
  activeFiltersCount = 0,
  debounceMs = 300,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 加载搜索历史
  useEffect(() => {
    const saved = localStorage.getItem('invoice-search-history');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    }
  }, []);

  // 保存搜索历史
  const saveSearchHistory = (query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(item => item !== query)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('invoice-search-history', JSON.stringify(updated));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // 防抖搜索
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (newValue.trim()) {
        onSearch?.(newValue.trim());
      }
    }, debounceMs);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setShowDropdown(true);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    // 延迟隐藏下拉框，以便点击建议项
    setTimeout(() => setShowDropdown(false), 150);
  };

  const handleSearch = (query?: string) => {
    const searchQuery = query || value;
    if (searchQuery.trim()) {
      saveSearchHistory(searchQuery.trim());
      onSearch?.(searchQuery.trim());
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text);
    saveSearchHistory(suggestion.text);
    onSuggestionSelect?.(suggestion);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleRecentSearchClick = (query: string) => {
    onChange(query);
    onSearch?.(query);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('invoice-search-history');
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'history':
        return '🕒';
      case 'category':
        return '🏷️';
      default:
        return '🔍';
    }
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="flex gap-2">
        {/* 搜索输入框 */}
        <div className="flex-1 relative">
          <MobileInput
            ref={inputRef}
            type="search"
            value={value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            placeholder={placeholder}
            leftIcon={<Search className="w-5 h-5" />}
            showClearButton
            onClear={() => onChange('')}
            className="pr-20"
          />
          
          {/* 搜索按钮 */}
          <button
            onClick={() => handleSearch()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 btn btn-primary btn-sm"
            disabled={!value.trim()}
          >
            搜索
          </button>
        </div>

        {/* 筛选和排序按钮 */}
        {showFilters && (
          <div className="flex gap-1">
            <button
              onClick={onFilterClick}
              className={`
                btn btn-outline btn-square
                ${activeFiltersCount > 0 ? 'btn-primary' : ''}
              `}
              title="筛选"
            >
              <div className="relative">
                <Filter className="w-5 h-5" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-content text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={onSortClick}
              className="btn btn-outline btn-square"
              title="排序"
            >
              <SortDesc className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* 搜索建议下拉框 */}
      <AnimatePresence>
        {showDropdown && showSuggestions && (isFocused || suggestions.length > 0 || recentSearches.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            {/* 搜索建议 */}
            {suggestions.length > 0 && (
              <div className="p-2 border-b border-base-200">
                <div className="text-xs text-base-content/60 px-2 py-1 font-medium">搜索建议</div>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-base-200 rounded-lg text-left transition-colors"
                  >
                    <span className="text-base flex-shrink-0">
                      {getSuggestionIcon(suggestion.type)}
                    </span>
                    <span className="flex-1 text-sm truncate">{suggestion.text}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 搜索历史 */}
            {recentSearches.length > 0 && (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs text-base-content/60 font-medium">最近搜索</span>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-base-content/40 hover:text-base-content/60"
                  >
                    清除
                  </button>
                </div>
                {recentSearches.map((search, index) => (
                  <button
                    key={`recent-${index}`}
                    onClick={() => handleRecentSearchClick(search)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-base-200 rounded-lg text-left transition-colors"
                  >
                    <span className="text-base flex-shrink-0">🕒</span>
                    <span className="flex-1 text-sm truncate">{search}</span>
                    <X
                      className="w-4 h-4 text-base-content/40 hover:text-base-content/60"
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = recentSearches.filter((_, i) => i !== index);
                        setRecentSearches(updated);
                        localStorage.setItem('invoice-search-history', JSON.stringify(updated));
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* 空状态 */}
            {suggestions.length === 0 && recentSearches.length === 0 && (
              <div className="p-4 text-center text-base-content/60 text-sm">
                暂无搜索建议
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileSearch;