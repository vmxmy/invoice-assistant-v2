import React, { useState, useEffect } from 'react';
import { X, Search, Filter, Calendar, DollarSign, Tag, FileText } from 'lucide-react';

export interface SearchFilters {
  invoiceNumber?: string;
  sellerName?: string;
  buyerName?: string;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  source?: string[];
}

interface AdvancedSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filters: SearchFilters) => void;
  currentFilters: SearchFilters;
}

export const AdvancedSearchDrawer: React.FC<AdvancedSearchDrawerProps> = ({
  isOpen,
  onClose,
  onSearch,
  currentFilters
}) => {
  const [filters, setFilters] = useState<SearchFilters>(currentFilters);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  const handleInputChange = (field: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStatusToggle = (status: string) => {
    setFilters(prev => {
      const currentStatus = prev.status || [];
      const newStatus = currentStatus.includes(status)
        ? currentStatus.filter(s => s !== status)
        : [...currentStatus, status];
      return {
        ...prev,
        status: newStatus.length > 0 ? newStatus : undefined
      };
    });
  };

  const handleSourceToggle = (source: string) => {
    setFilters(prev => {
      const currentSource = prev.source || [];
      const newSource = currentSource.includes(source)
        ? currentSource.filter(s => s !== source)
        : [...currentSource, source];
      return {
        ...prev,
        source: newSource.length > 0 ? newSource : undefined
      };
    });
  };

  const handleSearch = () => {
    // 清理空值
    const cleanedFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== '' && 
          !(Array.isArray(value) && value.length === 0)) {
        acc[key as keyof SearchFilters] = value;
      }
      return acc;
    }, {} as SearchFilters);
    
    onSearch(cleanedFilters);
    onClose();
  };

  const handleClear = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && 
    !(Array.isArray(value) && value.length === 0)
  );

  return (
    <>
      {/* 遮罩层 */}
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div className={`fixed right-0 top-0 h-full w-full sm:w-96 max-w-md bg-base-100 shadow-xl transform transition-transform z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b border-base-300">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Filter className="w-5 h-5" />
              高级搜索
            </h3>
            <button 
              onClick={onClose}
              className="btn btn-sm btn-circle btn-ghost"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 搜索表单 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 sm:space-y-6">
            {/* 文本搜索 */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                文本搜索
              </h4>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">发票号码</span>
                </label>
                <input
                  type="text"
                  placeholder="精确匹配发票号"
                  className="input input-bordered input-sm sm:input-md"
                  value={filters.invoiceNumber || ''}
                  onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">销售方名称</span>
                </label>
                <input
                  type="text"
                  placeholder="模糊匹配销售方"
                  className="input input-bordered input-sm sm:input-md"
                  value={filters.sellerName || ''}
                  onChange={(e) => handleInputChange('sellerName', e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">购买方名称</span>
                </label>
                <input
                  type="text"
                  placeholder="模糊匹配购买方"
                  className="input input-bordered input-sm sm:input-md"
                  value={filters.buyerName || ''}
                  onChange={(e) => handleInputChange('buyerName', e.target.value)}
                />
              </div>
            </div>

            {/* 范围搜索 */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                范围搜索
              </h4>

              {/* 金额范围 */}
              <div className="space-y-2">
                <label className="label">
                  <span className="label-text">金额范围</span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="最小金额"
                    className="input input-bordered input-sm sm:input-md flex-1"
                    value={filters.amountMin || ''}
                    onChange={(e) => handleInputChange('amountMin', e.target.value ? Number(e.target.value) : undefined)}
                    min="0"
                    step="0.01"
                  />
                  <span className="text-sm">-</span>
                  <input
                    type="number"
                    placeholder="最大金额"
                    className="input input-bordered input-sm sm:input-md flex-1"
                    value={filters.amountMax || ''}
                    onChange={(e) => handleInputChange('amountMax', e.target.value ? Number(e.target.value) : undefined)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* 消费日期范围 */}
              <div className="space-y-2">
                <label className="label">
                  <span className="label-text flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    消费日期范围
                  </span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    className="input input-bordered input-sm sm:input-md flex-1"
                    value={filters.dateFrom || ''}
                    onChange={(e) => handleInputChange('dateFrom', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <span className="text-sm">-</span>
                  <input
                    type="date"
                    className="input input-bordered input-sm sm:input-md flex-1"
                    value={filters.dateTo || ''}
                    onChange={(e) => handleInputChange('dateTo', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>

            {/* 状态筛选 */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Tag className="w-4 h-4" />
                状态筛选
              </h4>

              {/* 处理状态 */}
              <div className="space-y-2">
                <label className="label">
                  <span className="label-text">处理状态</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'processing', 'completed', 'failed'].map(status => (
                    <button
                      key={status}
                      className={`btn btn-xs sm:btn-sm ${
                        filters.status?.includes(status) ? 'btn-primary' : 'btn-ghost'
                      }`}
                      onClick={() => handleStatusToggle(status)}
                    >
                      {status === 'pending' && '待处理'}
                      {status === 'processing' && '处理中'}
                      {status === 'completed' && '已完成'}
                      {status === 'failed' && '失败'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 来源类型 */}
              <div className="space-y-2">
                <label className="label">
                  <span className="label-text">来源类型</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['email', 'upload', 'api'].map(source => (
                    <button
                      key={source}
                      className={`btn btn-xs sm:btn-sm ${
                        filters.source?.includes(source) ? 'btn-primary' : 'btn-ghost'
                      }`}
                      onClick={() => handleSourceToggle(source)}
                    >
                      {source === 'email' && '邮件'}
                      {source === 'upload' && '上传'}
                      {source === 'api' && 'API'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="p-3 sm:p-4 border-t border-base-300 space-y-2">
            <div className="flex gap-2">
              <button 
                className="btn btn-primary btn-sm sm:btn-md flex-1"
                onClick={handleSearch}
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">应用搜索</span>
                <span className="sm:hidden">搜索</span>
              </button>
              <button 
                className="btn btn-ghost btn-sm sm:btn-md flex-1"
                onClick={handleClear}
                disabled={!hasActiveFilters}
              >
                <span className="hidden sm:inline">清除条件</span>
                <span className="sm:hidden">清除</span>
              </button>
            </div>
            <div className="text-xs sm:text-sm text-base-content/60 text-center">
              {hasActiveFilters && (
                <span>已设置 {Object.values(filters).filter(v => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)).length} 个筛选条件</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdvancedSearchDrawer;