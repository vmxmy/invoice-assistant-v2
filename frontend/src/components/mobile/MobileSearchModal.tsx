import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, Filter, Calendar, DollarSign, Tag, Building2 } from 'lucide-react';
import { useDeviceDetection } from '../../hooks/useMediaQuery';

interface SearchFilters {
  seller_name?: string;
  invoice_number?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  status?: string[];
  source?: string[];
  overdue?: boolean;
  urgent?: boolean;
}

interface MobileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: SearchFilters;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
}

export const MobileSearchModal: React.FC<MobileSearchModalProps> = ({
  isOpen,
  onClose,
  onSearch,
  initialFilters = {},
  globalFilter = '',
  onGlobalFilterChange
}) => {
  const device = useDeviceDetection();
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // 搜索状态
  const [searchQuery, setSearchQuery] = useState(globalFilter);
  const [activeTab, setActiveTab] = useState<'search' | 'filters'>('search');
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  
  // 抽屉状态管理
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // 快速筛选预设
  const quickFilters = [
    { label: '未报销', key: 'unreimbursed', value: { status: ['unreimbursed'] } },
    { label: '已报销', key: 'reimbursed', value: { status: ['reimbursed'] } },
    { label: '逾期发票', key: 'overdue', value: { overdue: true } },
    { label: '紧急处理', key: 'urgent', value: { urgent: true } },
    { label: '本月发票', key: 'thisMonth', value: { 
      date_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      date_to: new Date().toISOString().split('T')[0]
    }},
    { label: '大额发票', key: 'highAmount', value: { amount_min: 1000 } },
  ];
  
  // 状态选项
  const statusOptions = [
    { value: 'unreimbursed', label: '未报销', color: 'badge-warning' },
    { value: 'reimbursed', label: '已报销', color: 'badge-success' },
    { value: 'voided', label: '作废', color: 'badge-error' },
    { value: 'processing', label: '处理中', color: 'badge-info' },
  ];
  
  // 来源选项
  const sourceOptions = [
    { value: 'upload', label: '上传文件', icon: '📁' },
    { value: 'email', label: '邮件导入', icon: '📧' },
    { value: 'api', label: 'API接入', icon: '🔗' },
    { value: 'manual', label: '手动录入', icon: '✏️' },
  ];
  
  // 同步外部状态
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(globalFilter);
      setFilters(initialFilters);
      setIsDrawerOpen(true);
      
      // 自动聚焦搜索框
      setTimeout(() => {
        if (searchInputRef.current && device.isMobile) {
          searchInputRef.current.focus();
        }
      }, 300);
    } else {
      setIsDrawerOpen(false);
    }
  }, [isOpen, globalFilter, initialFilters, device.isMobile]);
  
  // 处理搜索查询变化
  const handleSearchQueryChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (onGlobalFilterChange) {
      onGlobalFilterChange(value);
    }
  }, [onGlobalFilterChange]);
  
  // 处理快速筛选
  const handleQuickFilter = useCallback((filterValue: Partial<SearchFilters>) => {
    const newFilters = { ...filters, ...filterValue };
    setFilters(newFilters);
    setActiveTab('filters'); // 切换到筛选标签页显示结果
  }, [filters]);
  
  // 清空所有筛选条件
  const handleClearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
    if (onGlobalFilterChange) {
      onGlobalFilterChange('');
    }
  }, [onGlobalFilterChange]);
  
  // 应用搜索和筛选
  const handleApplySearch = useCallback(() => {
    onSearch(filters);
    if (searchQuery !== globalFilter && onGlobalFilterChange) {
      onGlobalFilterChange(searchQuery);
    }
    onClose();
  }, [filters, searchQuery, globalFilter, onGlobalFilterChange, onSearch, onClose]);
  
  // 计算活跃筛选条件数量
  const activeFiltersCount = Object.values(filters).filter(value =>
    value !== undefined && value !== '' &&
    !(Array.isArray(value) && value.length === 0)
  ).length;
  
  // 阻止背景滚动
  useEffect(() => {
    if (isOpen && device.isMobile) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, device.isMobile]);
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* 遮罩层 */}
      <div 
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-40 
          transition-opacity duration-300 ease-in-out
          ${isDrawerOpen ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
      />
      
      {/* 移动端全屏模态框 */}
      <div 
        ref={modalRef}
        className={`
          fixed inset-0 bg-base-100 z-50
          transform transition-transform duration-300 ease-out
          ${isDrawerOpen ? 'translate-y-0' : 'translate-y-full'}
          flex flex-col
          safe-area-inset-top safe-area-inset-bottom
        `}
      >
        {/* 顶部导航栏 */}
        <div className="flex items-center justify-between p-4 border-b border-base-300 bg-base-100/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Search className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold">智能搜索</h2>
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <div className="badge badge-primary badge-sm">
                {activeFiltersCount} 项筛选
              </div>
            )}
            <button
              className="btn btn-ghost btn-circle btn-sm"
              onClick={onClose}
              aria-label="关闭搜索"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Tab导航 */}
        <div className="tabs tabs-boxed m-4 bg-base-200/50">
          <button 
            className={`tab flex-1 ${activeTab === 'search' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search className="w-4 h-4 mr-2" />
            搜索
          </button>
          <button 
            className={`tab flex-1 ${activeTab === 'filters' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('filters')}
          >
            <Filter className="w-4 h-4 mr-2" />
            筛选
            {activeFiltersCount > 0 && (
              <span className="badge badge-primary badge-xs ml-1">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
        
        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto pb-safe">
          {activeTab === 'search' ? (
            <div className="p-4 space-y-6">
              {/* 全局搜索框 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">全局搜索</span>
                </label>
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="搜索发票号、销售方、购买方或金额..."
                    className="input input-bordered w-full pr-10 text-base"
                    style={{ fontSize: '16px' }} // 防iOS缩放
                    value={searchQuery}
                    onChange={(e) => handleSearchQueryChange(e.target.value)}
                    autoComplete="off"
                    inputMode="search"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/40" />
                </div>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    支持发票号、公司名称、金额等多字段搜索
                  </span>
                </label>
              </div>
              
              {/* 快速筛选卡片 */}
              <div>
                <h3 className="font-medium text-base-content mb-3">快速筛选</h3>
                <div className="grid grid-cols-2 gap-3">
                  {quickFilters.map((filter) => (
                    <button
                      key={filter.key}
                      className="btn btn-outline btn-sm justify-start h-auto py-3"
                      onClick={() => handleQuickFilter(filter.value)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{filter.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 搜索历史 */}
              <div>
                <h3 className="font-medium text-base-content mb-3">最近搜索</h3>
                <div className="flex flex-wrap gap-2">
                  {['华为技术', '差旅费用', '餐饮发票'].map((term) => (
                    <button
                      key={term}
                      className="badge badge-outline badge-lg"
                      onClick={() => handleSearchQueryChange(term)}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* 发票号筛选 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">发票号码</span>
                </label>
                <input
                  type="text"
                  placeholder="输入发票号码"
                  className="input input-bordered text-base"
                  value={filters.invoice_number || ''}
                  onChange={(e) => setFilters({ ...filters, invoice_number: e.target.value })}
                />
              </div>
              
              {/* 销售方筛选 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">销售方</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="输入销售方名称"
                    className="input input-bordered w-full pr-10 text-base"
                    value={filters.seller_name || ''}
                    onChange={(e) => setFilters({ ...filters, seller_name: e.target.value })}
                  />
                  <Building2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/40" />
                </div>
              </div>
              
              {/* 日期范围筛选 */}
              <div className="space-y-4">
                <label className="label">
                  <span className="label-text font-medium">消费日期范围</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text-alt">开始日期</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered input-sm text-base"
                      value={filters.date_from || ''}
                      onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text-alt">结束日期</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered input-sm text-base"
                      value={filters.date_to || ''}
                      onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              {/* 金额范围筛选 */}
              <div className="space-y-4">
                <label className="label">
                  <span className="label-text font-medium">金额范围</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text-alt">最小金额</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0"
                        className="input input-bordered input-sm w-full pl-8 text-base"
                        value={filters.amount_min || ''}
                        onChange={(e) => setFilters({ ...filters, amount_min: Number(e.target.value) || undefined })}
                      />
                      <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
                    </div>
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text-alt">最大金额</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="无限制"
                        className="input input-bordered input-sm w-full pl-8 text-base"
                        value={filters.amount_max || ''}
                        onChange={(e) => setFilters({ ...filters, amount_max: Number(e.target.value) || undefined })}
                      />
                      <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 状态筛选 */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">报销状态</span>
                </label>
                <div className="space-y-2">
                  {statusOptions.map((option) => (
                    <label key={option.value} className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={(filters.status || []).includes(option.value)}
                        onChange={(e) => {
                          const currentStatus = filters.status || [];
                          if (e.target.checked) {
                            setFilters({ 
                              ...filters, 
                              status: [...currentStatus, option.value] 
                            });
                          } else {
                            setFilters({ 
                              ...filters, 
                              status: currentStatus.filter(s => s !== option.value) 
                            });
                          }
                        }}
                      />
                      <span className={`badge ${option.color} badge-sm`}>
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* 来源筛选 */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">发票来源</span>
                </label>
                <div className="space-y-2">
                  {sourceOptions.map((option) => (
                    <label key={option.value} className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={(filters.source || []).includes(option.value)}
                        onChange={(e) => {
                          const currentSource = filters.source || [];
                          if (e.target.checked) {
                            setFilters({ 
                              ...filters, 
                              source: [...currentSource, option.value] 
                            });
                          } else {
                            setFilters({ 
                              ...filters, 
                              source: currentSource.filter(s => s !== option.value) 
                            });
                          }
                        }}
                      />
                      <span className="flex items-center gap-2">
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* 特殊条件筛选 */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">特殊条件</span>
                </label>
                <div className="space-y-2">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={filters.overdue || false}
                      onChange={(e) => setFilters({ ...filters, overdue: e.target.checked })}
                    />
                    <span className="flex items-center gap-2">
                      <span>⚠️</span>
                      <span>显示逾期发票</span>
                    </span>
                  </label>
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={filters.urgent || false}
                      onChange={(e) => setFilters({ ...filters, urgent: e.target.checked })}
                    />
                    <span className="flex items-center gap-2">
                      <span>🔥</span>
                      <span>紧急处理</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 底部操作栏 */}
        <div className="p-4 border-t border-base-300 bg-base-100/95 backdrop-blur-sm">
          <div className="flex gap-3">
            <button
              className="btn btn-outline flex-1"
              onClick={handleClearFilters}
              disabled={activeFiltersCount === 0 && !searchQuery}
            >
              清空条件
            </button>
            <button
              className="btn btn-primary flex-2"
              onClick={handleApplySearch}
            >
              应用搜索
              {(activeFiltersCount > 0 || searchQuery) && (
                <span className="badge badge-primary-content badge-sm ml-2">
                  {activeFiltersCount + (searchQuery ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* 安全区域占位 */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </>
  );
};

export default MobileSearchModal;