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

  const handleClear = () => {
    setFilters({});
  };

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
              <span className="label-text">{field.display_name}</span>
            </label>
            <input
              type="text"
              placeholder={`搜索${field.display_name}...`}
              className="input input-bordered input-sm sm:input-md"
              value={fieldValue || ''}
              onChange={(e) => handleInputChange(field.column_name, e.target.value)}
            />
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
              <span className="label-text">{field.display_name}</span>
            </label>
            <input
              type="text"
              placeholder={`选择${field.display_name}...`}
              className="input input-bordered input-sm sm:input-md"
              value={fieldValue || ''}
              onChange={(e) => handleInputChange(field.column_name, e.target.value)}
            />
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
              <span className="label-text">{field.display_name}</span>
            </label>
            <input
              type="text"
              placeholder={`搜索${field.display_name}...`}
              className="input input-bordered input-sm sm:input-md"
              value={fieldValue || ''}
              onChange={(e) => handleInputChange(field.column_name, e.target.value)}
            />
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

                {/* 传统的状态筛选（保持向后兼容） */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    快捷筛选
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