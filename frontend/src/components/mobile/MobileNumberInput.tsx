import React, { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Minus, 
  X,
  AlertCircle,
  CheckCircle,
  Info,
  Calculator,
  Hash,
  Percent
} from 'lucide-react';
import { useKeyboardAdjustment } from '../../hooks/useKeyboardAdjustment';
import { useDeviceDetection } from '../../hooks/useMediaQuery';
import { useDebounce } from '../../hooks/useDebounce';

// 数字类型
type NumberType = 'integer' | 'decimal' | 'currency' | 'percentage';

// 验证状态
type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

// 数字格式化选项
interface NumberFormatOptions {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}

interface MobileNumberInputProps {
  // 基础属性
  label?: string;
  placeholder?: string;
  value: number | string;
  onChange: (value: number | string) => void;
  
  // 数字类型和格式
  numberType?: NumberType;
  formatOptions?: NumberFormatOptions;
  
  // 数值范围
  min?: number;
  max?: number;
  step?: number;
  precision?: number; // 小数位数
  
  // 焦点事件
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  onIncrement?: (value: number) => void;
  onDecrement?: (value: number) => void;
  
  // 样式和行为
  floatingLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showSteppers?: boolean; // 显示加减按钮
  showCalculator?: boolean; // 显示计算器按钮
  allowNegative?: boolean;
  allowEmpty?: boolean; // 允许空值
  
  // 输入限制
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  
  // 验证和反馈
  error?: string;
  helperText?: string;
  validationState?: ValidationState;
  validator?: (value: number | string) => Promise<string | null> | string | null;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceValidation?: number;
  
  // 显示相关
  showClearButton?: boolean;
  prefix?: string;
  suffix?: string;
  
  // 无障碍
  ariaLabel?: string;
  ariaDescribedBy?: string;
  
  // 键盘适配
  enableKeyboardAdjustment?: boolean;
  scrollOffset?: number;
  
  // 样式类名
  className?: string;
  inputClassName?: string;
  
  // 其他HTML属性
  autoFocus?: boolean;
  tabIndex?: number;
  form?: string;
  name?: string;
  
  // 自定义按钮渲染
  renderSteppers?: (onIncrement: () => void, onDecrement: () => void, disabled: boolean) => React.ReactNode;
  
  // 数值转换
  parseValue?: (value: string) => number | string;
  formatValue?: (value: number | string) => string;
}

export const MobileNumberInput = forwardRef<HTMLInputElement, MobileNumberInputProps>(({
  label,
  placeholder,
  value,
  onChange,
  numberType = 'decimal',
  formatOptions = {},
  min,
  max,
  step = 1,
  precision = 2,
  onFocus,
  onBlur,
  onClear,
  onIncrement,
  onDecrement,
  floatingLabel = true,
  size = 'md',
  showSteppers = false,
  showCalculator = false,
  allowNegative = true,
  allowEmpty = false,
  disabled = false,
  readOnly = false,
  required = false,
  error,
  helperText,
  validationState = 'idle',
  validator,
  validateOnChange = false,
  validateOnBlur = true,
  debounceValidation = 300,
  showClearButton = true,
  prefix,
  suffix,
  ariaLabel,
  ariaDescribedBy,
  enableKeyboardAdjustment = true,
  scrollOffset = 20,
  className = '',
  inputClassName = '',
  autoFocus = false,
  tabIndex,
  form,
  name,
  renderSteppers,
  parseValue,
  formatValue
}, ref) => {
  const device = useDeviceDetection();
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [internalValidationState, setInternalValidationState] = useState<ValidationState>('idle');
  const [internalError, setInternalError] = useState<string>('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout>();

  // 键盘适配
  const keyboard = useKeyboardAdjustment({
    autoScroll: enableKeyboardAdjustment,
    scrollOffset,
    adjustViewport: true,
    enableSafeArea: true
  });

  // 防抖验证
  const debouncedValue = useDebounce(value, validateOnChange ? debounceValidation : 0);

  // 将 ref 转发给内部的 input
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(inputRef.current);
      } else {
        ref.current = inputRef.current;
      }
    }
  }, [ref]);

  // 数值解析和格式化
  const parseNumber = useCallback((val: string): number | string => {
    if (parseValue) return parseValue(val);
    
    if (!val || val === '') {
      return allowEmpty ? '' : 0;
    }

    // 移除格式化字符
    let cleanValue = val.replace(/[^\d.-]/g, '');
    
    if (!allowNegative && cleanValue.startsWith('-')) {
      cleanValue = cleanValue.substring(1);
    }

    const num = parseFloat(cleanValue);
    
    if (isNaN(num)) {
      return allowEmpty ? '' : 0;
    }

    // 应用精度
    if (numberType === 'integer') {
      return Math.round(num);
    } else if (precision !== undefined) {
      return Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision);
    }

    return num;
  }, [parseValue, allowEmpty, allowNegative, numberType, precision]);

  const formatNumber = useCallback((val: number | string): string => {
    if (formatValue) return formatValue(val);
    
    if (val === '' || val == null) return '';

    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '';

    const defaultOptions: NumberFormatOptions = {
      locale: 'zh-CN',
      useGrouping: false,
      minimumFractionDigits: numberType === 'integer' ? 0 : 0,
      maximumFractionDigits: numberType === 'integer' ? 0 : precision,
      ...formatOptions
    };

    try {
      switch (numberType) {
        case 'currency':
          return new Intl.NumberFormat(defaultOptions.locale, {
            style: 'currency',
            currency: defaultOptions.currency || 'CNY',
            minimumFractionDigits: defaultOptions.minimumFractionDigits,
            maximumFractionDigits: defaultOptions.maximumFractionDigits,
            useGrouping: defaultOptions.useGrouping
          }).format(num);
        
        case 'percentage':
          return new Intl.NumberFormat(defaultOptions.locale, {
            style: 'percent',
            minimumFractionDigits: defaultOptions.minimumFractionDigits,
            maximumFractionDigits: defaultOptions.maximumFractionDigits,
            useGrouping: defaultOptions.useGrouping
          }).format(num / 100);
        
        default:
          return new Intl.NumberFormat(defaultOptions.locale, {
            minimumFractionDigits: defaultOptions.minimumFractionDigits,
            maximumFractionDigits: defaultOptions.maximumFractionDigits,
            useGrouping: defaultOptions.useGrouping
          }).format(num);
      }
    } catch {
      return num.toString();
    }
  }, [formatValue, numberType, precision, formatOptions]);

  // 更新显示值
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatNumber(value));
    }
  }, [value, isFocused, formatNumber]);

  // 初始化显示值
  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, []);

  // 验证逻辑
  const performValidation = useCallback(async (val: number | string) => {
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

  // 范围验证
  const validateRange = useCallback((val: number): string | null => {
    if (isNaN(val)) return null;
    
    if (min !== undefined && val < min) {
      return `值不能小于 ${min}`;
    }
    
    if (max !== undefined && val > max) {
      return `值不能大于 ${max}`;
    }
    
    return null;
  }, [min, max]);

  // 防抖验证触发
  useEffect(() => {
    if (!validateOnChange) return;
    
    clearTimeout(validationTimeoutRef.current);
    validationTimeoutRef.current = setTimeout(() => {
      performValidation(debouncedValue);
    }, 50);
    
    return () => clearTimeout(validationTimeoutRef.current);
  }, [debouncedValue, validateOnChange, performValidation]);

  // 获取最终验证状态和错误信息
  const finalValidationState = validationState !== 'idle' ? validationState : internalValidationState;
  const finalError = error || internalError;

  // 获取图标
  const getIcon = () => {
    switch (numberType) {
      case 'currency':
        return null; // 货币符号在格式化中处理
      case 'percentage':
        return <Percent className="w-5 h-5" />;
      case 'integer':
        return <Hash className="w-5 h-5" />;
      default:
        return <Calculator className="w-5 h-5" />;
    }
  };

  // 获取尺寸相关类名
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          input: 'min-h-[40px] text-sm px-3 py-2',
          icon: 'w-4 h-4',
          button: 'btn-sm'
        };
      case 'lg':
        return {
          input: 'min-h-[56px] text-lg px-4 py-3',
          icon: 'w-6 h-6',
          button: 'btn-lg'
        };
      default: // md
        return {
          input: 'min-h-[48px] text-base px-4 py-3',
          icon: 'w-5 h-5',
          button: 'btn-md'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
    
    // 聚焦时显示原始数值
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    setDisplayValue(numValue.toString());
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
    
    // 失焦时格式化显示
    setDisplayValue(formatNumber(value));

    // 失焦验证
    if (validateOnBlur && validator) {
      performValidation(value);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    const parsedValue = parseNumber(inputValue);
    
    // 范围验证
    if (typeof parsedValue === 'number') {
      const rangeError = validateRange(parsedValue);
      if (rangeError) {
        setInternalValidationState('invalid');
        setInternalError(rangeError);
        return;
      }
    }
    
    onChange(parsedValue);
    
    // 重置验证状态
    if (internalValidationState !== 'idle') {
      setInternalValidationState('idle');
      setInternalError('');
    }
  };

  const handleClear = () => {
    const clearValue = allowEmpty ? '' : 0;
    onChange(clearValue);
    setDisplayValue('');
    onClear?.();
    inputRef.current?.focus();
    setInternalValidationState('idle');
    setInternalError('');
  };

  const handleIncrement = () => {
    if (disabled || readOnly) return;
    
    const currentValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
    const newValue = currentValue + step;
    
    if (max !== undefined && newValue > max) return;
    
    onChange(newValue);
    onIncrement?.(newValue);
  };

  const handleDecrement = () => {
    if (disabled || readOnly) return;
    
    const currentValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
    const newValue = currentValue - step;
    
    if (min !== undefined && newValue < min) return;
    if (!allowNegative && newValue < 0) return;
    
    onChange(newValue);
    onDecrement?.(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        handleIncrement();
        break;
      case 'ArrowDown':
        e.preventDefault();
        handleDecrement();
        break;
      case 'Enter':
        inputRef.current?.blur();
        break;
    }
  };

  const inputIcon = getIcon();
  const hasValue = value !== '' && value != null && value !== 0;
  const hasLeftIcon = inputIcon || prefix;
  const hasRightButtons = showClearButton || showSteppers || showCalculator || suffix;

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

  return (
    <div className={`relative ${className}`}>
      {/* 浮动标签 */}
      {floatingLabel && label && (
        <motion.label
          className={`
            absolute left-3 pointer-events-none z-10
            transition-all duration-200 ease-out
            ${hasLeftIcon ? 'left-11' : 'left-3'}
            ${isFocused || hasValue
              ? 'top-0 text-xs -translate-y-1/2 bg-base-100 px-1'
              : 'top-1/2 text-sm -translate-y-1/2'
            }
            ${isFocused ? 'text-primary' : 'text-base-content/60'}
            ${finalError ? 'text-error' : ''}
            ${disabled ? 'text-base-content/30' : ''}
          `}
          htmlFor={name || `number-${label}`}
          initial={false}
          animate={{
            fontSize: isFocused || hasValue ? '0.75rem' : '0.875rem',
            y: isFocused || hasValue ? '-50%' : '-50%'
          }}
        >
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </motion.label>
      )}

      {/* 非浮动标签 */}
      {!floatingLabel && label && (
        <label className="label" htmlFor={name || `number-${label}`}>
          <span className="label-text flex items-center gap-1">
            {label}
            {required && <span className="text-error">*</span>}
          </span>
        </label>
      )}

      <div className="relative">
        {/* 左侧图标和前缀区域 */}
        {hasLeftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
            {prefix && (
              <span className="text-base-content/60 text-sm">
                {prefix}
              </span>
            )}
            {inputIcon && (
              <div className={`text-base-content/60 ${sizeClasses.icon}`}>
                {inputIcon}
              </div>
            )}
          </div>
        )}

        {/* 输入框 */}
        <input
          ref={inputRef}
          id={name || `number-${label}`}
          name={name}
          form={form}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={!floatingLabel || isFocused || !label ? placeholder : ''}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          autoFocus={autoFocus}
          tabIndex={tabIndex}
          inputMode="decimal"
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          className={`
            input input-bordered w-full
            ${sizeClasses.input}
            ${hasLeftIcon ? 'pl-11' : ''}
            ${hasRightButtons ? 'pr-20' : ''}
            ${finalError ? 'input-error' : ''}
            ${isFocused ? 'input-primary' : ''}
            ${disabled ? 'input-disabled' : ''}
            ${readOnly ? 'bg-base-200' : ''}
            transition-all duration-200
            ${inputClassName}
          `}
          style={{
            fontSize: device.isMobile ? '16px' : undefined, // 防止iOS缩放
          }}
        />

        {/* 右侧按钮区域 */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* 后缀 */}
          {suffix && (
            <span className="text-base-content/60 text-sm">
              {suffix}
            </span>
          )}
          
          {/* 验证状态图标 */}
          {getValidationIcon()}
          
          {/* 自定义步进器或默认步进器 */}
          {showSteppers && (
            renderSteppers ? 
              renderSteppers(handleIncrement, handleDecrement, disabled || readOnly) :
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={disabled || readOnly || (max !== undefined && (typeof value === 'number' ? value : parseFloat(value as string) || 0) >= max)}
                  className="btn btn-ghost btn-circle btn-xs p-0 h-4 min-h-4 text-base-content/60 hover:text-base-content"
                  aria-label="增加"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={disabled || readOnly || (min !== undefined && (typeof value === 'number' ? value : parseFloat(value as string) || 0) <= min) || (!allowNegative && (typeof value === 'number' ? value : parseFloat(value as string) || 0) <= 0)}
                  className="btn btn-ghost btn-circle btn-xs p-0 h-4 min-h-4 text-base-content/60 hover:text-base-content"
                  aria-label="减少"
                >
                  <Minus className="w-3 h-3" />
                </button>
              </div>
          )}
          
          {/* 计算器按钮 */}
          {showCalculator && (
            <button
              type="button"
              onClick={() => {
                // 这里可以触发计算器模态框
                console.log('Open calculator');
              }}
              disabled={disabled || readOnly}
              className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content"
              aria-label="计算器"
            >
              <Calculator className="w-4 h-4" />
            </button>
          )}
          
          {/* 清除按钮 */}
          <AnimatePresence>
            {showClearButton && hasValue && !disabled && !readOnly && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                type="button"
                onClick={handleClear}
                className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content"
                aria-label="清除"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 范围提示 */}
      {(min !== undefined || max !== undefined) && !finalError && !helperText && (
        <label className="label">
          <span className="label-text-alt text-base-content/60 flex items-center gap-1">
            <Info className="w-3 h-3" />
            范围: {min !== undefined ? min : '-∞'} ~ {max !== undefined ? max : '+∞'}
          </span>
        </label>
      )}

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

MobileNumberInput.displayName = 'MobileNumberInput';

export default MobileNumberInput;