import React, { useState, useEffect } from 'react';
import { X, Search, Filter, Calendar, DollarSign, Tag, FileText } from 'lucide-react';
import { fieldMetadataService, type FieldMetadata } from '../../../services/fieldMetadata.service';

// 通用搜索过滤器接口 - 支持所有字段
export interface SearchFilters {
  // 传统支持的字段（保持向后兼容）
  invoiceNumber?: string;
  sellerName?: string;
  buyerName?: string;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  source?: string[];
  
  // 动态字段搜索 - 键为字段名，值为搜索条件
  [fieldName: string]: any;
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
  const [searchableFields, setSearchableFields] = useState<FieldMetadata[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);

  // 加载可搜索字段
  useEffect(() => {
    const loadSearchableFields = async () => {
      setIsLoadingFields(true);
      try {
        const fields = await fieldMetadataService.getSearchableFields();
        // 按分类和显示顺序排序
        const sortedFields = fields.sort((a, b) => {
          const categoryOrder = { basic: 1, financial: 2, temporal: 3, metadata: 4, system: 5 };
          const aCategoryOrder = categoryOrder[a.category || 'basic'] || 999;
          const bCategoryOrder = categoryOrder[b.category || 'basic'] || 999;
          
          if (aCategoryOrder !== bCategoryOrder) {
            return aCategoryOrder - bCategoryOrder;
          }
          
          return (a.display_order || 999) - (b.display_order || 999);
        });
        setSearchableFields(sortedFields);
      } catch (error) {
        console.error('Failed to load searchable fields:', error);
      } finally {
        setIsLoadingFields(false);
      }
    };
    
    if (isOpen) {
      loadSearchableFields();
    }
  }, [isOpen]);

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

  const handleClear = useCallback(() => {
    setFilters({});
    setValidationErrors({});
  }, []);

  // 快捷操作
  const handleQuickPreset = useCallback((preset: 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastWeek') => {
    const now = new Date();
    let dateFrom: string, dateTo: string;
    
    switch (preset) {
      case 'thisMonth':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'lastMonth':
        dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        dateTo = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'thisYear':
        dateFrom = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        dateTo = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
        break;
      case 'lastWeek':
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFrom = new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate()).toISOString().split('T')[0];
        dateTo = now.toISOString().split('T')[0];
        break;
      default:
        return;
    }
    
    setFilters(prev => ({
      ...prev,
      dateFrom,
      dateTo
    }));
  }, []);

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && 
    !(Array.isArray(value) && value.length === 0)
  );

  // 获取字段分类
  const getFieldsByCategory = (category: string) => {
    return searchableFields.filter(field => field.category === category);
  };

  // 渲染字段输入组件
  const renderFieldInput = (field: FieldMetadata) => {
    const fieldValue = filters[field.column_name];

    switch (field.filter_type) {
      case 'text':
        return (
          <div key={field.column_name} className="form-control">
            <label className="label">
              <span className="label-text font-medium">{field.display_name}</span>
              {field.description && (
                <span className="label-text-alt text-base-content/60">
                  <Info className="w-3 h-3 inline mr-1" />
                  {field.description}
                </span>
              )}
            </label>
            <input
              type="text"
              placeholder={`搜索${field.display_name}...`}
              className={`input input-bordered input-sm sm:input-md transition-colors ${
                hasError ? 'input-error' : 'focus:input-primary'
              }`}
              value={fieldValue || ''}
              onChange={(e) => handleInputChange(field.column_name, e.target.value)}
            />
            {renderValidationError(field.column_name)}
          </div>
        );

      case 'number_range':
        return (
          <div key={field.column_name} className="form-control">
            <label className="label">
              <span className="label-text">{field.display_name}范围</span>
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="最小值"
                className="input input-bordered input-sm sm:input-md flex-1"
                value={fieldValue?.min || ''}
                onChange={(e) => handleInputChange(field.column_name, {
                  ...fieldValue,
                  min: e.target.value ? Number(e.target.value) : undefined
                })}
                step={field.format_type === 'currency' ? '0.01' : '1'}
              />
              <span className="text-sm">-</span>
              <input
                type="number"
                placeholder="最大值"
                className="input input-bordered input-sm sm:input-md flex-1"
                value={fieldValue?.max || ''}
                onChange={(e) => handleInputChange(field.column_name, {
                  ...fieldValue,
                  max: e.target.value ? Number(e.target.value) : undefined
                })}
                step={field.format_type === 'currency' ? '0.01' : '1'}
              />
            </div>
          </div>
        );

      case 'date_range':
        return (
          <div key={field.column_name} className="form-control">
            <label className="label">
              <span className="label-text">{field.display_name}范围</span>
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                className="input input-bordered input-sm sm:input-md flex-1"
                value={fieldValue?.from || ''}
                onChange={(e) => handleInputChange(field.column_name, {
                  ...fieldValue,
                  from: e.target.value
                })}
                max={new Date().toISOString().split('T')[0]}
              />
              <span className="text-sm">-</span>
              <input
                type="date"
                className="input input-bordered input-sm sm:input-md flex-1"
                value={fieldValue?.to || ''}
                onChange={(e) => handleInputChange(field.column_name, {
                  ...fieldValue,
                  to: e.target.value
                })}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        );

      case 'select':
        // 这里可以扩展为动态获取选项，目前使用简单文本输入
        return (
          <div key={field.column_name} className="form-control">
            <label className="label">
              <span className="label-text font-medium">{field.display_name}</span>
            </label>
            <input
              type="text"
              placeholder={`选择${field.display_name}...`}
              className={`input input-bordered input-sm sm:input-md transition-colors ${
                hasError ? 'input-error' : 'focus:input-primary'
              }`}
              value={fieldValue || ''}
              onChange={(e) => handleInputChange(field.column_name, e.target.value)}
            />
            {renderValidationError(field.column_name)}
          </div>
        );

      case 'boolean':
        return (
          <div key={field.column_name} className="form-control">
            <label className="label">
              <span className="label-text">{field.display_name}</span>
            </label>
            <select
              className="select select-bordered select-sm sm:select-md"
              value={fieldValue !== undefined ? String(fieldValue) : ''}
              onChange={(e) => {
                const value = e.target.value;
                handleInputChange(field.column_name, 
                  value === '' ? undefined : value === 'true'
                );
              }}
            >
              <option value="">全部</option>
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </div>
        );

      default:
        return (
          <div key={field.column_name} className="form-control">
            <label className="label">
              <span className="label-text font-medium">{field.display_name}</span>
            </label>
            <input
              type="text"
              placeholder={`搜索${field.display_name}...`}
              className={`input input-bordered input-sm sm:input-md transition-colors ${
                hasError ? 'input-error' : 'focus:input-primary'
              }`}
              value={fieldValue || ''}
              onChange={(e) => handleInputChange(field.column_name, e.target.value)}
            />
            {renderValidationError(field.column_name)}
          </div>
        );
    }
  };

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
            {isLoadingFields ? (
              <div className="flex items-center justify-center py-8">
                <span className="loading loading-spinner loading-sm"></span>
                <span className="ml-2 text-sm text-base-content/60">正在加载搜索字段...</span>
              </div>
            ) : (
              <>
                {/* 基础信息字段 */}
                {getFieldsByCategory('basic').length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      基础信息
                    </h4>
                    {getFieldsByCategory('basic').map(field => renderFieldInput(field))}
                  </div>
                )}

                {/* 财务信息字段 */}
                {getFieldsByCategory('financial').length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      财务信息
                    </h4>
                    {getFieldsByCategory('financial').map(field => renderFieldInput(field))}
                  </div>
                )}

                {/* 时间信息字段 */}
                {getFieldsByCategory('temporal').length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      时间信息
                    </h4>
                    {getFieldsByCategory('temporal').map(field => renderFieldInput(field))}
                  </div>
                )}

                {/* 分类和元数据字段 */}
                {getFieldsByCategory('metadata').length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      分类和标签
                    </h4>
                    {getFieldsByCategory('metadata').map(field => renderFieldInput(field))}
                  </div>
                )}

                {/* 快捷日期选择 */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-secondary" />
                    快捷日期
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'thisMonth', label: '本月', variant: 'btn-primary' },
                      { key: 'lastMonth', label: '上月', variant: 'btn-secondary' },
                      { key: 'thisYear', label: '今年', variant: 'btn-accent' },
                      { key: 'lastWeek', label: '近七天', variant: 'btn-info' }
                    ].map(preset => (
                      <button
                        key={preset.key}
                        className={`btn btn-xs sm:btn-sm ${preset.variant} btn-outline hover:shadow-sm transition-all`}
                        onClick={() => handleQuickPreset(preset.key as any)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 传统的状态筛选（保持向后兼容） */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Tag className="w-4 h-4 text-warning" />
                    快捷筛选
                  </h4>

                  {/* 处理状态 */}
                  <div className="space-y-2">
                    <label className="label">
                      <span className="label-text font-medium">处理状态</span>
                      <span className="label-text-alt text-base-content/60">可多选</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'pending', label: '待处理', color: 'warning' },
                        { value: 'processing', label: '处理中', color: 'info' },
                        { value: 'completed', label: '已完成', color: 'success' },
                        { value: 'failed', label: '失败', color: 'error' }
                      ].map(status => {
                        const isSelected = filters.status?.includes(status.value);
                        return (
                          <button
                            key={status.value}
                            className={`btn btn-xs sm:btn-sm transition-all ${
                              isSelected 
                                ? `btn-${status.color} shadow-sm` 
                                : 'btn-ghost hover:bg-base-200'
                            }`}
                            onClick={() => handleStatusToggle(status.value)}
                          >
                            {status.label}
                            {isSelected && <CheckCircle2 className="w-3 h-3 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 来源类型 */}
                  <div className="space-y-2">
                    <label className="label">
                      <span className="label-text font-medium">来源类型</span>
                      <span className="label-text-alt text-base-content/60">可多选</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'email', label: '邮件', icon: '📧' },
                        { value: 'upload', label: '上传', icon: '📎' },
                        { value: 'api', label: 'API', icon: '🔗' }
                      ].map(source => {
                        const isSelected = filters.source?.includes(source.value);
                        return (
                          <button
                            key={source.value}
                            className={`btn btn-xs sm:btn-sm transition-all ${
                              isSelected 
                                ? 'btn-primary shadow-sm' 
                                : 'btn-ghost hover:bg-base-200'
                            }`}
                            onClick={() => handleSourceToggle(source.value)}
                          >
                            <span className="mr-1">{source.icon}</span>
                            {source.label}
                            {isSelected && <CheckCircle2 className="w-3 h-3 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
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