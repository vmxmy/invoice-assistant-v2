import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import type { Invoice } from '../../../types';
import { 
  getInvoiceConfig, 
  getFieldValue, 
  validateField,
  type FieldConfig,
  type FieldGroup
} from '../../../config/invoiceFieldsConfig';
import { CategorySelector } from '../CategorySelector';

interface AdaptiveInvoiceFieldsProps {
  invoice: Invoice;
  mode: 'view' | 'edit';
  editData?: Record<string, any>;
  onFieldChange?: (key: string, value: any) => void;
  errors?: Record<string, string>;
  onRemoveTag?: (key: string, tag: string) => void;
  onAddTag?: (key: string, tag: string) => void;
}

// 单个字段渲染组件
const FieldRenderer: React.FC<{
  field: FieldConfig;
  value: any;
  mode: 'view' | 'edit';
  error?: string;
  onChange?: (value: any) => void;
  onRemoveTag?: (tag: string) => void;
  onAddTag?: (tag: string) => void;
}> = ({ field, value, mode, error, onChange, onRemoveTag, onAddTag }) => {
  const IconComponent = field.icon;
  
  // 格式化显示值
  const formatDisplayValue = (val: any): string => {
    if (val === undefined || val === null || val === '') return '-';
    
    switch (field.type) {
      case 'currency':
        const numVal = parseFloat(val);
        return isNaN(numVal) ? '-' : `¥${numVal.toFixed(2)}`;
      case 'date':
        if (val.includes('T')) {
          return val.split('T')[0];
        }
        return val;
      case 'readonly':
        if (field.key === 'invoice_details' && Array.isArray(val)) {
          return `${val.length}项明细`;
        }
        return val.toString();
      default:
        return val.toString();
    }
  };

  // 查看模式
  if (mode === 'view') {
    // 特殊处理发票明细
    if (field.key === 'invoice_details') {
      console.log('🔍 [AdaptiveInvoiceFields - view] invoice_details 字段调试:', {
        fieldKey: field.key,
        fieldLabel: field.label,
        value,
        valueType: typeof value,
        isArray: Array.isArray(value),
        valueLength: Array.isArray(value) ? value.length : 'N/A',
        firstItem: Array.isArray(value) && value.length > 0 ? value[0] : 'N/A'
      });
      
      if (Array.isArray(value) && value.length > 0) {
        console.log('✅ [AdaptiveInvoiceFields - view] 显示发票明细表格');
        return (
          <div>
            <div className="flex items-start gap-3 mb-3">
              <IconComponent className="w-4 h-4 text-base-content/60 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-base-content/60">{field.label}</p>
                <p className="font-medium">{value.length}项明细</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm table-zebra">
                <thead>
                  <tr>
                    <th>项目名称</th>
                    <th>规格型号</th>
                    <th>单位</th>
                    <th>数量</th>
                    <th>单价</th>
                    <th>金额</th>
                    <th>税率</th>
                    <th>税额</th>
                  </tr>
                </thead>
                <tbody>
                  {value.map((item: any, index: number) => {
                    console.log(`🔍 [AdaptiveInvoiceFields - view] 明细项 ${index}:`, item);
                    return (
                      <tr key={index}>
                        <td>{item.itemName || item.item_name || '-'}</td>
                        <td>{item.specification || item.spec || '-'}</td>
                        <td>{item.unit || '-'}</td>
                        <td>{item.quantity || '-'}</td>
                        <td>{item.unitPrice || item.unit_price || '-'}</td>
                        <td>¥{item.amount || '0.00'}</td>
                        <td>{item.taxRate || item.tax_rate || '-'}</td>
                        <td>¥{item.tax || item.tax_amount || '0.00'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      } else {
        console.log('❌ [AdaptiveInvoiceFields - view] 发票明细数据无效，不显示表格');
        return (
          <div className="flex items-start gap-3">
            <IconComponent className="w-4 h-4 text-base-content/60 mt-1" />
            <div className="flex-1">
              <p className="text-sm text-base-content/60">{field.label}</p>
              <p className="font-medium text-base-content/40">无明细信息</p>
            </div>
          </div>
        );
      }
    }

    // 分类字段的查看模式
    if (field.type === 'category') {
      return (
        <div className="flex items-start gap-3">
          <IconComponent className="w-4 h-4 text-base-content/60 mt-1" />
          <div className="flex-1">
            <p className="text-sm text-base-content/60">{field.label}</p>
            <CategorySelector
              value={value || ''}
              onChange={() => {}} // 查看模式不需要onChange
              disabled={true}
              size="sm"
            />
            {field.description && (
              <p className="text-xs text-base-content/40 mt-1">{field.description}</p>
            )}
          </div>
        </div>
      );
    }

    // 普通字段查看模式
    return (
      <div className="flex items-start gap-3">
        <IconComponent className="w-4 h-4 text-base-content/60 mt-1" />
        <div className="flex-1">
          <p className="text-sm text-base-content/60">{field.label}</p>
          <p className="font-medium">{formatDisplayValue(value)}</p>
          {field.description && (
            <p className="text-xs text-base-content/40 mt-1">{field.description}</p>
          )}
        </div>
      </div>
    );
  }

  // 编辑模式
  const inputValue = value === undefined || value === null ? '' : value;

  // 只读字段在编辑模式下也显示为查看模式
  if (field.type === 'readonly') {
    // 特殊处理发票明细在编辑模式下的显示
    if (field.key === 'invoice_details') {
      console.log('🔍 [AdaptiveInvoiceFields - edit] invoice_details 字段调试:', {
        fieldKey: field.key,
        fieldLabel: field.label,
        fieldType: field.type,
        value,
        valueType: typeof value,
        isArray: Array.isArray(value),
        valueLength: Array.isArray(value) ? value.length : 'N/A',
        firstItem: Array.isArray(value) && value.length > 0 ? value[0] : 'N/A'
      });
      
      if (Array.isArray(value) && value.length > 0) {
        console.log('✅ [AdaptiveInvoiceFields - edit] 显示发票明细表格');
        return (
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                <IconComponent className="w-4 h-4" />
                {field.label}
              </span>
            </label>
            <div className="bg-base-200 rounded-lg p-3">
              <div className="text-sm text-base-content/60 mb-2">{value.length}项明细</div>
              <div className="overflow-x-auto">
                <table className="table table-sm table-zebra">
                  <thead>
                    <tr>
                      <th>项目名称</th>
                      <th>规格型号</th>
                      <th>单位</th>
                      <th>数量</th>
                      <th>单价</th>
                      <th>金额</th>
                      <th>税率</th>
                      <th>税额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {value.map((item: any, index: number) => {
                      console.log(`🔍 [AdaptiveInvoiceFields - edit] 明细项 ${index}:`, item);
                      return (
                        <tr key={index}>
                          <td>{item.itemName || item.item_name || '-'}</td>
                          <td>{item.specification || item.spec || '-'}</td>
                          <td>{item.unit || '-'}</td>
                          <td>{item.quantity || '-'}</td>
                          <td>{item.unitPrice || item.unit_price || '-'}</td>
                          <td>¥{item.amount || '0.00'}</td>
                          <td>{item.taxRate || item.tax_rate || '-'}</td>
                          <td>¥{item.tax || item.tax_amount || '0.00'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {field.description && (
              <label className="label">
                <span className="label-text-alt text-base-content/60">{field.description}</span>
              </label>
            )}
          </div>
        );
      } else {
        console.log('❌ [AdaptiveInvoiceFields - edit] 发票明细数据无效，显示占位符');
        return (
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                <IconComponent className="w-4 h-4" />
                {field.label}
              </span>
            </label>
            <div className="input input-bordered bg-base-200 flex items-center text-base-content/40">
              无明细信息
            </div>
            {field.description && (
              <label className="label">
                <span className="label-text-alt text-base-content/60">{field.description}</span>
              </label>
            )}
          </div>
        );
      }
    }

    // 普通只读字段显示
    return (
      <div className="form-control">
        <label className="label">
          <span className="label-text flex items-center gap-2">
            <IconComponent className="w-4 h-4" />
            {field.label}
          </span>
        </label>
        <div className="input input-bordered bg-base-200 flex items-center">
          {formatDisplayValue(value)}
        </div>
        {field.description && (
          <label className="label">
            <span className="label-text-alt text-base-content/60">{field.description}</span>
          </label>
        )}
      </div>
    );
  }

  // 标签字段
  if (field.type === 'tags') {
    const tags = Array.isArray(value) ? value : [];
    const [tagInput, setTagInput] = React.useState('');

    const handleAddTag = () => {
      const tag = tagInput.trim();
      if (tag && !tags.includes(tag) && onAddTag) {
        onAddTag(tag);
        setTagInput('');
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      }
    };

    return (
      <div className="form-control">
        <label className="label">
          <span className="label-text flex items-center gap-2">
            <IconComponent className="w-4 h-4" />
            {field.label}
            {field.required && <span className="text-error">*</span>}
          </span>
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="input input-bordered flex-1"
            placeholder={field.placeholder || '输入标签后按回车添加'}
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="btn btn-outline btn-primary"
          >
            添加
          </button>
        </div>
        <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 bg-base-200 rounded-lg">
          {tags.length === 0 ? (
            <span className="text-base-content/50 text-sm">暂无标签</span>
          ) : (
            tags.map((tag: string, index: number) => (
              <div key={index} className="badge badge-primary gap-1">
                {tag}
                {onRemoveTag && (
                  <button
                    type="button"
                    onClick={() => onRemoveTag(tag)}
                    className="btn btn-ghost btn-xs p-0 h-4 w-4"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        {error && (
          <label className="label">
            <span className="label-text-alt text-error flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </span>
          </label>
        )}
      </div>
    );
  }

  // 分类选择字段
  if (field.type === 'category') {
    return (
      <div className="form-control">
        <label className="label">
          <span className="label-text flex items-center gap-2">
            <IconComponent className="w-4 h-4" />
            {field.label}
            {field.required && <span className="text-error">*</span>}
          </span>
        </label>
        <CategorySelector
          value={value || ''}
          onChange={(newValue) => onChange?.(newValue)}
          disabled={mode === 'view'}
          size="md"
        />
        {error && (
          <label className="label">
            <span className="label-text-alt text-error flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </span>
          </label>
        )}
        {field.description && !error && (
          <label className="label">
            <span className="label-text-alt text-base-content/60">{field.description}</span>
          </label>
        )}
      </div>
    );
  }

  // 文本区域
  if (field.type === 'textarea') {
    return (
      <div className="form-control">
        <label className="label">
          <span className="label-text flex items-center gap-2">
            <IconComponent className="w-4 h-4" />
            {field.label}
            {field.required && <span className="text-error">*</span>}
          </span>
        </label>
        <textarea
          value={inputValue}
          onChange={(e) => onChange?.(e.target.value)}
          className={`textarea textarea-bordered h-24 ${error ? 'textarea-error' : ''}`}
          placeholder={field.placeholder}
        />
        {error && (
          <label className="label">
            <span className="label-text-alt text-error flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </span>
          </label>
        )}
      </div>
    );
  }

  // 普通输入字段
  const getInputType = () => {
    switch (field.type) {
      case 'number':
      case 'currency':
        return 'number';
      case 'date':
        return 'date';
      default:
        return 'text';
    }
  };

  const getInputProps = () => {
    const props: any = {
      type: getInputType(),
      value: inputValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value),
      className: `input input-bordered ${error ? 'input-error' : ''}`,
      placeholder: field.placeholder
    };

    if (field.type === 'number' || field.type === 'currency') {
      props.step = '0.01';
      if (field.validation?.min !== undefined) props.min = field.validation.min;
      if (field.validation?.max !== undefined) props.max = field.validation.max;
    }

    if (field.type === 'date') {
      props.max = new Date().toISOString().split('T')[0]; // 限制最大日期为今天
    }

    return props;
  };

  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text flex items-center gap-2">
          <IconComponent className="w-4 h-4" />
          {field.label}
          {field.required && <span className="text-error">*</span>}
        </span>
      </label>
      <input {...getInputProps()} />
      {error && (
        <label className="label">
          <span className="label-text-alt text-error flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </span>
        </label>
      )}
      {field.description && !error && (
        <label className="label">
          <span className="label-text-alt text-base-content/60">{field.description}</span>
        </label>
      )}
    </div>
  );
};

// 字段分组渲染组件
const FieldGroupRenderer: React.FC<{
  group: FieldGroup;
  invoice: Invoice;
  mode: 'view' | 'edit';
  editData?: Record<string, any>;
  onFieldChange?: (key: string, value: any) => void;
  errors?: Record<string, string>;
  onRemoveTag?: (key: string, tag: string) => void;
  onAddTag?: (key: string, tag: string) => void;
}> = ({ group, invoice, mode, editData, onFieldChange, errors, onRemoveTag, onAddTag }) => {
  const GroupIcon = group.icon;

  // 检查分组是否应该显示
  if (group.showWhen && !group.showWhen(invoice)) {
    return null;
  }

  // 过滤需要显示的字段
  const visibleFields = group.fields.filter(field => 
    !field.showWhen || field.showWhen(invoice)
  );

  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h3 className="card-title text-base flex items-center gap-2">
          <GroupIcon className="w-5 h-5 text-primary" />
          {group.title}
        </h3>
        
        <div className={`grid grid-cols-1 ${mode === 'edit' ? 'md:grid-cols-2' : 'md:grid-cols-2'} gap-4 mt-3`}>
          {visibleFields.map((field) => {
            const value = mode === 'edit' && editData 
              ? editData[field.key] 
              : getFieldValue(invoice, field);
            
            // 调试发票明细字段
            if (field.key === 'invoice_details') {
              console.log('🔍 [FieldGroupRenderer] 发票明细字段处理:', {
                fieldKey: field.key,
                fieldLabel: field.label,
                fieldType: field.type,
                mode,
                value,
                valueFromEditData: editData?.[field.key],
                valueFromGetFieldValue: getFieldValue(invoice, field),
                invoice_type: invoice.invoice_type,
                groupTitle: group.title
              });
            }

            // 调试日志
            if (field.key === 'consumption_date' || field.key === 'departure_time') {
              console.log(`🔍 [AdaptiveInvoiceFields] 字段 ${field.key}:`, {
                mode,
                editData: editData?.[field.key],
                fieldValue: getFieldValue(invoice, field),
                value,
                invoice_type: invoice.invoice_type
              });
            }

            return (
              <div 
                key={field.key} 
                className={field.type === 'textarea' || field.key === 'invoice_details' ? 'md:col-span-2' : ''}
              >
                <FieldRenderer
                  field={field}
                  value={value}
                  mode={mode}
                  error={errors?.[field.key]}
                  onChange={(newValue) => onFieldChange?.(field.key, newValue)}
                  onRemoveTag={(tag) => onRemoveTag?.(field.key, tag)}
                  onAddTag={(tag) => onAddTag?.(field.key, tag)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 主组件
export const AdaptiveInvoiceFields: React.FC<AdaptiveInvoiceFieldsProps> = ({
  invoice,
  mode,
  editData,
  onFieldChange,
  errors,
  onRemoveTag,
  onAddTag
}) => {
  // 获取发票类型配置
  const config = getInvoiceConfig(invoice);

  return (
    <div className="space-y-4">
      {/* 发票类型标识 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="badge badge-primary text-sm px-3 py-2">
          {config.displayName}
        </div>
        {invoice.extracted_data?.title && (
          <div className="badge badge-outline text-xs">
            {invoice.extracted_data.title}
          </div>
        )}
      </div>

      {/* 渲染字段分组 */}
      {config.groups.map((group) => (
        <FieldGroupRenderer
          key={group.key}
          group={group}
          invoice={invoice}
          mode={mode}
          editData={editData}
          onFieldChange={onFieldChange}
          errors={errors}
          onRemoveTag={onRemoveTag}
          onAddTag={onAddTag}
        />
      ))}
    </div>
  );
};

export default AdaptiveInvoiceFields;