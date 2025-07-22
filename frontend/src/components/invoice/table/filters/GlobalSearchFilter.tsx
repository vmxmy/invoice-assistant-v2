import React from 'react';
import { Search, X } from 'lucide-react';

interface GlobalSearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const GlobalSearchFilter: React.FC<GlobalSearchFilterProps> = ({
  value,
  onChange,
  placeholder = '搜索发票号、销售方、买方...',
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          className="input input-bordered input-sm w-full pr-20 pl-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
        
        {value && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => onChange('')}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearchFilter;