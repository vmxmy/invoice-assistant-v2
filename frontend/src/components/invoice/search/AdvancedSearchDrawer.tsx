import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Search, Filter, Calendar, DollarSign, Tag, FileText, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { fieldMetadataService, type FieldMetadata } from '../../../services/fieldMetadata.service';

// 通用搜索过滤器接口 - 与后端数据结构对齐
export interface SearchFilters {
  // 基础字段（使用数据库字段名）
  invoice_number?: string;
  seller_name?: string;
  buyer_name?: string;
  invoice_type?: string;
  invoice_code?: string;
  
  // 财务字段
  total_amount_min?: number;
  total_amount_max?: number;
  amount_without_tax_min?: number;
  amount_without_tax_max?: number;
  tax_amount_min?: number;
  tax_amount_max?: number;
  currency?: string;
  
  // 时间字段
  invoice_date_from?: string;
  invoice_date_to?: string;
  consumption_date_from?: string;
  consumption_date_to?: string;
  created_at_from?: string;
  created_at_to?: string;
  
  // 分类和状态字段
  expense_category?: string;
  primary_category_name?: string;
  secondary_category_name?: string;
  status?: string[];
  processing_status?: string[];
  source?: string[];
  
  // 布尔字段
  is_verified?: boolean;
  
  // 文本搜索字段
  notes?: string;
  remarks?: string;
  tags?: string;
  
  // 兼容旧字段名（保持向后兼容）
  invoiceNumber?: string;
  sellerName?: string;
  buyerName?: string;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
  
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    financial: false,
    temporal: false,
    metadata: false
  });

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

  // 验证筛选条件
  const validateFilters = useCallback((filtersToValidate: SearchFilters): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    // 验证数值范围 - 支持新旧字段名
    const amountMin = filtersToValidate.total_amount_min || filtersToValidate.amountMin;
    const amountMax = filtersToValidate.total_amount_max || filtersToValidate.amountMax;
    if (amountMin !== undefined && amountMax !== undefined) {
      if (amountMin > amountMax) {
        errors.total_amount_min = '最小金额不能大于最大金额';
        errors.amountMin = '最小金额不能大于最大金额';
      }
    }
    
    // 验证日期范围 - 支持新旧字段名
    const dateFrom = filtersToValidate.invoice_date_from || filtersToValidate.dateFrom;
    const dateTo = filtersToValidate.invoice_date_to || filtersToValidate.dateTo;
    if (dateFrom && dateTo) {
      if (new Date(dateFrom) > new Date(dateTo)) {
        errors.invoice_date_from = '开始日期不能晚于结束日期';
        errors.dateFrom = '开始日期不能晚于结束日期';
      }
    }
    
    // 验证动态字段的数值范围
    Object.entries(filtersToValidate).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && 'min' in value && 'max' in value) {
        if (value.min !== undefined && value.max !== undefined && value.min > value.max) {
          errors[key] = '最小值不能大于最大值';
        }
      }
      if (typeof value === 'object' && value !== null && 'from' in value && 'to' in value) {
        if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
          errors[key] = '开始日期不能晚于结束日期';
        }
      }
    });
    
    return errors;
  }, []);

  const handleInputChange = useCallback((field: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 清除该字段的验证错误
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [validationErrors]);

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

  // 字段名映射：前端界面名 -> 数据库字段名
  const mapFieldNames = useCallback((frontendFilters: SearchFilters): SearchFilters => {
    const mappedFilters = { ...frontendFilters };
    
    // 映射兼容字段名
    const fieldMapping: Record<string, string> = {
      invoiceNumber: 'invoice_number',
      sellerName: 'seller_name',
      buyerName: 'buyer_name',
      amountMin: 'total_amount_min',
      amountMax: 'total_amount_max',
      dateFrom: 'invoice_date_from',
      dateTo: 'invoice_date_to'
    };
    
    Object.entries(fieldMapping).forEach(([oldKey, newKey]) => {
      if (mappedFilters[oldKey] !== undefined) {
        mappedFilters[newKey] = mappedFilters[oldKey];
        delete mappedFilters[oldKey];
      }
    });
    
    return mappedFilters;
  }, []);

  const handleSearch = useCallback(() => {
    // 清理空值
    const cleanedFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== '' && 
          !(Array.isArray(value) && value.length === 0) &&
          !(typeof value === 'object' && value !== null && 
            Object.values(value).every(v => v === undefined || v === ''))) {
        acc[key as keyof SearchFilters] = value;
      }
      return acc;
    }, {} as SearchFilters);
    
    // 验证筛选条件
    const errors = validateFilters(cleanedFilters);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // 映射字段名
    const mappedFilters = mapFieldNames(cleanedFilters);
    
    onSearch(mappedFilters);
    onClose();
  }, [filters, validateFilters, mapFieldNames, onSearch, onClose]);

  const handleClear = useCallback(() => {
    setFilters({});
    setValidationErrors({});
  }, []);

  // 切换分类展开状态
  const toggleSection = useCallback((category: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }, []);

  // 渲染验证错误
  const renderValidationError = useCallback((fieldName: string) => {
    const error = validationErrors[fieldName];
    if (!error) return null;
    
    return (
      <div className="flex items-center gap-1 mt-1 text-error text-xs">
        <AlertCircle className="w-3 h-3" />
        <span>{error}</span>
      </div>
    );
  }, [validationErrors]);

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
      invoice_date_from: dateFrom,
      invoice_date_to: dateTo
    }));
  }, []);

  const hasActiveFilters = useMemo(() => 
    Object.values(filters).some(value => 
      value !== undefined && value !== '' && 
      !(Array.isArray(value) && value.length === 0) &&
      !(typeof value === 'object' && value !== null && 
        Object.values(value).every(v => v === undefined || v === ''))
    )
  , [filters]);
  
  const hasValidationErrors = useMemo(() => 
    Object.keys(validationErrors).length > 0
  , [validationErrors]);
  
  const activeFilterCount = useMemo(() => 
    Object.values(filters).filter(value => 
      value !== undefined && value !== '' && 
      !(Array.isArray(value) && value.length === 0) &&
      !(typeof value === 'object' && value !== null && 
        Object.values(value).every(v => v === undefined || v === ''))
    ).length
  , [filters]);

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