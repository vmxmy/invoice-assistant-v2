import React from 'react';
import { AlertCircle, X, Eye, EyeOff, Calendar } from 'lucide-react';
import type { Invoice } from '../../../types';
import { 
  getInvoiceConfig, 
  getFieldValue, 
  validateField,
  type FieldConfig,
  type FieldGroup
} from '../../../config/invoiceFieldsConfig';
import { CategorySelector } from '../CategorySelector';
import { MobileInput, MobileTagInput } from '../../ui/MobileOptimizedForm';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';

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
  const device = useDeviceDetection();
  
  // 所有Hooks必须在顶部定义，不能在条件语句中
  const [tagInput, setTagInput] = React.useState('');
  
  // 格式化显示值
  const formatDisplayValue = (val: any): string => {
    if (val === undefined || val === null || val === '') return '-';
    
    switch (field.type) {
      case 'currency': {
        const numVal = parseFloat(val);
        return isNaN(numVal) ? '-' : `¥${numVal.toFixed(2)}`;
      }
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

  // 标签字段 - 使用移动端优化的标签组件
  if (field.type === 'tags') {
    const tags = Array.isArray(value) ? value : [];

    return (
      <MobileTagInput
        label={field.label}
        tags={tags}
        onAddTag={(tag) => onAddTag?.(tag)}
        onRemoveTag={(tag) => onRemoveTag?.(tag)}
        placeholder={field.placeholder || '输入标签后按回车添加'}
        required={field.required}
        error={error}
      />
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

  // 文本区域 - 使用移动端优化的输入组件
  if (field.type === 'textarea') {
    return (
      <MobileInput
        type="textarea"
        label={field.label}
        value={inputValue}
        onChange={onChange || (() => {})}
        placeholder={field.placeholder}
        required={field.required}
        error={error}
        icon={<IconComponent className="w-4 h-4" />}
        rows={4}
      />
    );
  }

  // 普通输入字段 - 使用移动端优化的输入组件
  const getInputType = (): 'text' | 'email' | 'number' | 'tel' | 'url' | 'date' => {
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

  const getInputMode = () => {
    switch (field.type) {
      case 'number':
      case 'currency':
        return 'numeric' as const;
      case 'tel':
        return 'tel' as const;
      case 'email':
        return 'email' as const;
      case 'url':
        return 'url' as const;
      default:
        return 'text' as const;
    }
  };

  return (
    <MobileInput
      type={getInputType()}
      label={field.label}
      value={inputValue}
      onChange={onChange || (() => {})}
      placeholder={field.placeholder}
      required={field.required}
      error={error}
      description={field.description}
      icon={<IconComponent className="w-4 h-4" />}
      min={field.validation?.min}
      max={field.validation?.max}
      step={field.type === 'number' || field.type === 'currency' ? 0.01 : undefined}
      inputMode={getInputMode()}
    />
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
  const device = useDeviceDetection();

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

  // 响应式网格布局
  const getGridClasses = () => {
    if (device.isMobile) {
      return 'grid grid-cols-1 gap-4';
    }
    
    // 桌面端根据模式调整
    if (mode === 'edit') {
      return 'grid grid-cols-1 md:grid-cols-2 gap-4';
    }
    
    return 'grid grid-cols-1 md:grid-cols-2 gap-4';
  };

  return (
    <div className={`card bg-base-100 shadow-sm ${device.isMobile ? 'mobile-field-group' : ''}`}>
      <div className="card-body">
        <h3 className="card-title text-base flex items-center gap-2">
          <GroupIcon className="w-5 h-5 text-primary" />
          {group.title}
        </h3>
        
        <div className={`${getGridClasses()} mt-3`}>
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

            // 计算字段跨列
            const getFieldSpanClass = () => {
              // 移动端始终单列
              if (device.isMobile) return '';
              
              // 桌面端某些字段跨列
              if (field.type === 'textarea' || field.key === 'invoice_details') {
                return 'md:col-span-2';
              }
              
              return '';
            };

            return (
              <div 
                key={field.key} 
                className={getFieldSpanClass()}
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
      
      {/* 移动端样式 */}
      <style jsx>{`
        .mobile-field-group .card-body {
          padding: 1rem;
        }
        
        .mobile-field-group .card-title {
          font-size: 1rem;
          margin-bottom: 0.75rem;
        }
        
        /* 触控设备优化 */
        @media (hover: none) and (pointer: coarse) {
          .mobile-field-group {
            border-radius: 12px;
            margin-bottom: 1rem;
          }
          
          .mobile-field-group .card-body {
            padding: 1.25rem;
          }
        }
      `}</style>
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