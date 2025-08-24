import React, { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  ChevronDown, 
  X,
  Search,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useKeyboardAdjustment } from '../../hooks/useKeyboardAdjustment';
import { useDeviceDetection } from '../../hooks/useMediaQuery';
import { useDebounce } from '../../hooks/useDebounce';

// 选项类型
interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  group?: string;
}

// 验证状态
type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

interface MobileSelectProps {
  // 基础属性
  label?: string;
  placeholder?: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: SelectOption[];
  
  // 选择行为
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  closeOnSelect?: boolean;
  
  // 焦点事件
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  onSearch?: (query: string) => void;
  
  // 样式和显示
  floatingLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  maxHeight?: number;
  showSelectAll?: boolean; // 多选时显示全选
  
  // 输入限制
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  maxSelections?: number; // 多选最大数量
  
  // 验证和反馈
  error?: string;
  helperText?: string;
  validationState?: ValidationState;
  validator?: (value: string | string[]) => Promise<string | null> | string | null;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  
  // 搜索相关
  searchPlaceholder?: string;
  noOptionsText?: string;
  noSearchResultsText?: string;
  
  // 无障碍
  ariaLabel?: string;
  ariaDescribedBy?: string;
  
  // 键盘适配
  enableKeyboardAdjustment?: boolean;
  
  // 样式类名
  className?: string;
  selectClassName?: string;
  optionClassName?: string;
  
  // 其他HTML属性
  autoFocus?: boolean;
  tabIndex?: number;
  form?: string;
  name?: string;
  
  // 自定义渲染
  renderOption?: (option: SelectOption, isSelected: boolean) => React.ReactNode;
  renderSelectedValue?: (value: string | string[], options: SelectOption[]) => React.ReactNode;
}

export const MobileSelect = forwardRef<HTMLDivElement, MobileSelectProps>(({
  label,
  placeholder = '请选择',
  value,
  onChange,
  options,
  multiple = false,
  searchable = false,
  clearable = true,
  closeOnSelect = !multiple,
  onFocus,
  onBlur,
  onClear,
  onSearch,
  floatingLabel = true,
  size = 'md',
  maxHeight = 300,
  showSelectAll = false,
  disabled = false,
  readOnly = false,
  required = false,
  maxSelections,
  error,
  helperText,
  validationState = 'idle',
  validator,
  validateOnChange = false,
  validateOnBlur = true,
  searchPlaceholder = '搜索选项...',
  noOptionsText = '暂无选项',
  noSearchResultsText = '未找到匹配项',
  ariaLabel,
  ariaDescribedBy,
  enableKeyboardAdjustment = true,
  className = '',
  selectClassName = '',
  optionClassName = '',
  autoFocus = false,
  tabIndex,
  form,
  name,
  renderOption,
  renderSelectedValue
}, ref) => {
  const device = useDeviceDetection();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalValidationState, setInternalValidationState] = useState<ValidationState>('idle');
  const [internalError, setInternalError] = useState<string>('');
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout>();

  // 防抖搜索
  const debouncedSearchQuery = useDebounce(searchQuery, 200);

  // 键盘适配
  const keyboard = useKeyboardAdjustment({
    autoScroll: enableKeyboardAdjustment,
    scrollOffset: 20,
    adjustViewport: true,
    enableSafeArea: true
  });

  // 将 ref 转发
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(containerRef.current);
      } else {
        ref.current = containerRef.current;
      }
    }
  }, [ref]);

  // 处理搜索
  useEffect(() => {
    if (debouncedSearchQuery !== searchQuery) return;
    onSearch?.(debouncedSearchQuery);
  }, [debouncedSearchQuery, onSearch]);

  // 验证逻辑
  const performValidation = useCallback(async (val: string | string[]) => {
    if (!validator) return;

    setInternalValidationState('validating');
    
    try {
      const result = await validator(val);
      if (result) {
        setInternalValidationState('invalid');
        setInternalError(result);
      } else {
        setInternalValidationState('valid');
        setInternalError('');
      }
    } catch (err) {
      setInternalValidationState('invalid');
      setInternalError('验证失败');
    }
  }, [validator]);

  // 过滤选项
  const filteredOptions = React.useMemo(() => {
    if (!debouncedSearchQuery) return options;
    
    return options.filter(option => 
      option.label.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      option.value.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      option.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [options, debouncedSearchQuery]);

  // 分组选项
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, SelectOption[]> = {};
    const ungrouped: SelectOption[] = [];

    filteredOptions.forEach(option => {
      if (option.group) {
        if (!groups[option.group]) {
          groups[option.group] = [];
        }
        groups[option.group].push(option);
      } else {
        ungrouped.push(option);
      }
    });

    return { groups, ungrouped };
  }, [filteredOptions]);

  // 获取最终验证状态和错误信息
  const finalValidationState = validationState !== 'idle' ? validationState : internalValidationState;
  const finalError = error || internalError;

  // 获取选中的选项
  const selectedOptions = React.useMemo(() => {
    const values = Array.isArray(value) ? value : [value];
    return options.filter(option => values.includes(option.value));
  }, [value, options]);

  // 获取显示文本
  const getDisplayText = () => {
    if (renderSelectedValue) {
      return renderSelectedValue(value, selectedOptions);
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return placeholder;
      if (value.length === 1) {
        const option = options.find(o => o.value === value[0]);
        return option?.label || value[0];
      }
      return `已选择 ${value.length} 项`;
    } else {
      if (!value) return placeholder;
      const option = options.find(o => o.value === value);
      return option?.label || value;
    }
  };

  // 获取尺寸相关类名
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'min-h-[40px] text-sm',
          option: 'px-3 py-2 text-sm',
          search: 'px-3 py-2 text-sm'
        };
      case 'lg':
        return {
          container: 'min-h-[56px] text-lg',
          option: 'px-4 py-3 text-base',
          search: 'px-4 py-3 text-base'
        };
      default:
        return {
          container: 'min-h-[48px] text-base',
          option: 'px-4 py-3 text-base',
          search: 'px-4 py-3 text-base'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const handleFocus = () => {
    onFocus?.();
  };

  const handleBlur = () => {
    onBlur?.();
    
    // 失焦验证
    if (validateOnBlur && validator) {
      performValidation(value);
    }
  };

  const handleToggle = () => {
    if (disabled || readOnly) return;
    
    setIsOpen(!isOpen);
    if (!isOpen) {
      handleFocus();
      setFocusedOptionIndex(-1);
      if (searchable) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
    } else {
      handleBlur();
    }
  };

  const handleOptionSelect = (option: SelectOption) => {
    if (option.disabled) return;

    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const isSelected = currentValues.includes(option.value);
      
      let newValues: string[];
      if (isSelected) {
        newValues = currentValues.filter(v => v !== option.value);
      } else {
        if (maxSelections && currentValues.length >= maxSelections) {
          return; // 超过最大选择数量
        }
        newValues = [...currentValues, option.value];
      }
      
      onChange(newValues);
      
      // 重置验证状态
      if (internalValidationState !== 'idle') {
        setInternalValidationState('idle');
        setInternalError('');
      }
      
      if (validateOnChange && validator) {
        performValidation(newValues);
      }
    } else {
      onChange(option.value);
      
      // 重置验证状态
      if (internalValidationState !== 'idle') {
        setInternalValidationState('idle');
        setInternalError('');
      }
      
      if (validateOnChange && validator) {
        performValidation(option.value);
      }
    }

    if (closeOnSelect) {
      setIsOpen(false);
      handleBlur();
    }
  };

  const handleSelectAll = () => {
    if (!multiple || !showSelectAll) return;
    
    const currentValues = Array.isArray(value) ? value : [];
    const availableOptions = filteredOptions.filter(o => !o.disabled);
    const allSelected = availableOptions.every(o => currentValues.includes(o.value));
    
    if (allSelected) {
      // 取消全选
      const newValues = currentValues.filter(v => 
        !availableOptions.some(o => o.value === v)
      );
      onChange(newValues);
    } else {
      // 全选
      const newValues = Array.from(new Set([
        ...currentValues,
        ...availableOptions.map(o => o.value)
      ]));
      
      // 检查最大选择数量
      if (maxSelections && newValues.length > maxSelections) {
        return;
      }
      
      onChange(newValues);
    }
  };

  const handleClear = () => {
    onChange(multiple ? [] : '');
    onClear?.();
    setInternalValidationState('idle');
    setInternalError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          handleToggle();
        } else if (focusedOptionIndex >= 0) {
          const option = filteredOptions[focusedOptionIndex];
          if (option) {
            handleOptionSelect(option);
          }
        }
        break;
      case 'Escape':
        if (isOpen) {
          setIsOpen(false);
          handleBlur();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          handleToggle();
        } else {
          setFocusedOptionIndex(prev => 
            Math.min(prev + 1, filteredOptions.length - 1)
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedOptionIndex(prev => Math.max(prev - 1, 0));
        }
        break;
    }
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        handleBlur();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // 获取验证状态图标
  const getValidationIcon = () => {
    switch (finalValidationState) {
      case 'validating':
        return <div className="loading loading-spinner loading-xs" />;
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'invalid':
        return <AlertCircle className="w-4 h-4 text-error" />;
      default:
        return null;
    }
  };

  const hasValue = multiple ? 
    (Array.isArray(value) && value.length > 0) : 
    (value !== '' && value != null);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 浮动标签 */}
      {floatingLabel && label && (
        <motion.label
          className={`
            absolute left-3 pointer-events-none z-10
            transition-all duration-200 ease-out
            ${isOpen || hasValue
              ? 'top-0 text-xs -translate-y-1/2 bg-base-100 px-1'
              : 'top-1/2 text-sm -translate-y-1/2'
            }
            ${isOpen ? 'text-primary' : 'text-base-content/60'}
            ${finalError ? 'text-error' : ''}
            ${disabled ? 'text-base-content/30' : ''}
          `}
          htmlFor={name || `select-${label}`}
          initial={false}
          animate={{
            fontSize: isOpen || hasValue ? '0.75rem' : '0.875rem',
            y: isOpen || hasValue ? '-50%' : '-50%'
          }}
        >
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </motion.label>
      )}

      {/* 非浮动标签 */}
      {!floatingLabel && label && (
        <label className="label" htmlFor={name || `select-${label}`}>
          <span className="label-text flex items-center gap-1">
            {label}
            {required && <span className="text-error">*</span>}
          </span>
        </label>
      )}

      {/* 选择器容器 */}
      <div className="relative">
        <button
          type="button"
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          tabIndex={tabIndex}
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={`
            btn btn-outline w-full justify-start
            ${sizeClasses.container}
            ${finalError ? 'btn-error' : ''}
            ${isOpen ? 'btn-primary' : ''}
            ${disabled ? 'btn-disabled' : ''}
            ${readOnly ? 'bg-base-200' : ''}
            transition-all duration-200
            ${selectClassName}
          `}
          style={{
            fontSize: device.isMobile ? '16px' : undefined, // 防止iOS缩放
          }}
        >
          <span className="flex-1 text-left truncate">
            {getDisplayText()}
          </span>
          
          <div className="flex items-center gap-1">
            {getValidationIcon()}
            
            {clearable && hasValue && !disabled && !readOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content"
                aria-label="清除"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            <ChevronDown 
              className={`w-5 h-5 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </button>

        {/* 选项面板 */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 z-50 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg overflow-hidden"
              style={{ maxHeight }}
            >
              {/* 搜索框 */}
              {searchable && (
                <div className="p-2 border-b border-base-300">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/60" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={searchPlaceholder}
                      className={`
                        input input-bordered w-full pl-10
                        ${sizeClasses.search}
                      `}
                      style={{
                        fontSize: device.isMobile ? '16px' : undefined,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 全选选项 */}
              {multiple && showSelectAll && filteredOptions.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={`
                    w-full flex items-center gap-3 hover:bg-base-200
                    ${sizeClasses.option} border-b border-base-300
                  `}
                >
                  <div className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={filteredOptions.filter(o => !o.disabled).every(o => 
                        Array.isArray(value) && value.includes(o.value)
                      )}
                      onChange={() => {}}
                      className="checkbox checkbox-sm"
                    />
                  </div>
                  <span className="font-medium">全选</span>
                </button>
              )}

              {/* 选项列表 */}
              <div 
                ref={optionsListRef}
                className="overflow-y-auto"
                style={{ maxHeight: maxHeight - (searchable ? 60 : 0) - (multiple && showSelectAll ? 48 : 0) }}
                role="listbox"
                aria-multiselectable={multiple}
              >
                {filteredOptions.length === 0 ? (
                  <div className={`${sizeClasses.option} text-base-content/60 text-center`}>
                    {debouncedSearchQuery ? noSearchResultsText : noOptionsText}
                  </div>
                ) : (
                  <>
                    {/* 未分组选项 */}
                    {groupedOptions.ungrouped.map((option, index) => {
                      const isSelected = multiple ? 
                        (Array.isArray(value) && value.includes(option.value)) :
                        value === option.value;
                      const isFocused = index === focusedOptionIndex;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleOptionSelect(option)}
                          disabled={option.disabled}
                          role="option"
                          aria-selected={isSelected}
                          className={`
                            w-full flex items-center gap-3 text-left
                            hover:bg-base-200 disabled:opacity-50 disabled:cursor-not-allowed
                            ${sizeClasses.option}
                            ${isSelected ? 'bg-primary/10 text-primary' : ''}
                            ${isFocused ? 'bg-base-200' : ''}
                            ${optionClassName}
                          `}
                        >
                          {multiple && (
                            <div className="checkbox-wrapper">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="checkbox checkbox-sm"
                              />
                            </div>
                          )}

                          {option.icon && (
                            <div className="text-base-content/60">
                              {option.icon}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            {renderOption ? renderOption(option, isSelected) : (
                              <>
                                <div className="font-medium truncate">
                                  {option.label}
                                </div>
                                {option.description && (
                                  <div className="text-sm text-base-content/60 truncate">
                                    {option.description}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {!multiple && isSelected && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      );
                    })}

                    {/* 分组选项 */}
                    {Object.entries(groupedOptions.groups).map(([groupName, groupOptions]) => (
                      <div key={groupName}>
                        <div className={`${sizeClasses.option} font-semibold text-base-content/80 bg-base-200`}>
                          {groupName}
                        </div>
                        {groupOptions.map((option, groupIndex) => {
                          const globalIndex = groupedOptions.ungrouped.length + groupIndex;
                          const isSelected = multiple ? 
                            (Array.isArray(value) && value.includes(option.value)) :
                            value === option.value;
                          const isFocused = globalIndex === focusedOptionIndex;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleOptionSelect(option)}
                              disabled={option.disabled}
                              role="option"
                              aria-selected={isSelected}
                              className={`
                                w-full flex items-center gap-3 text-left pl-8
                                hover:bg-base-200 disabled:opacity-50 disabled:cursor-not-allowed
                                ${sizeClasses.option}
                                ${isSelected ? 'bg-primary/10 text-primary' : ''}
                                ${isFocused ? 'bg-base-200' : ''}
                                ${optionClassName}
                              `}
                            >
                              {multiple && (
                                <div className="checkbox-wrapper">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="checkbox checkbox-sm"
                                  />
                                </div>
                              )}

                              {option.icon && (
                                <div className="text-base-content/60">
                                  {option.icon}
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                {renderOption ? renderOption(option, isSelected) : (
                                  <>
                                    <div className="font-medium truncate">
                                      {option.label}
                                    </div>
                                    {option.description && (
                                      <div className="text-sm text-base-content/60 truncate">
                                        {option.description}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              {!multiple && isSelected && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 帮助文本或错误信息 */}
      {(finalError || helperText) && (
        <label className="label">
          <span className={`label-text-alt flex items-center gap-1 ${finalError ? 'text-error' : 'text-base-content/60'}`}>
            {finalError ? (
              <>
                <AlertCircle className="w-3 h-3" />
                {finalError}
              </>
            ) : helperText ? (
              <>
                <Info className="w-3 h-3" />
                {helperText}
              </>
            ) : null}
          </span>
        </label>
      )}
    </div>
  );
});

MobileSelect.displayName = 'MobileSelect';

export default MobileSelect;