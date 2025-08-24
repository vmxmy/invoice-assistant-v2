import React, { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Calendar, 
  Hash, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  Info,
  Eye,
  EyeOff,
  Mic,
  QrCode,
  Phone,
  Mail,
  Globe,
  Lock,
  User
} from 'lucide-react';
import { useKeyboardAdjustment } from '../../hooks/useKeyboardAdjustment';
import { useDeviceDetection } from '../../hooks/useMediaQuery';
import { useDebounce } from '../../hooks/useDebounce';

// 输入类型
type InputType = 'text' | 'password' | 'email' | 'tel' | 'url' | 'search' | 'number' | 'date' | 'datetime-local' | 'time' | 'month' | 'week' | 'currency' | 'percentage';

// 验证状态
type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

// 自动完成建议
interface AutocompleteSuggestion {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

// 输入模式映射
const INPUT_MODE_MAP: Record<InputType, string> = {
  text: 'text',
  password: 'text',
  email: 'email',
  tel: 'tel',
  url: 'url',
  search: 'search',
  number: 'numeric',
  date: 'text',
  'datetime-local': 'text',
  time: 'text',
  month: 'text',
  week: 'text',
  currency: 'decimal',
  percentage: 'decimal'
};

// Enter键提示映射
const ENTER_KEY_HINT_MAP: Record<InputType, string> = {
  search: 'search',
  email: 'next',
  tel: 'done',
  url: 'go',
  text: 'done',
  password: 'done',
  number: 'done',
  date: 'done',
  'datetime-local': 'done',
  time: 'done',
  month: 'done',
  week: 'done',
  currency: 'done',
  percentage: 'done'
};

// 图标映射
const ICON_MAP: Record<InputType, React.ReactNode> = {
  search: <Search className="w-5 h-5" />,
  email: <Mail className="w-5 h-5" />,
  tel: <Phone className="w-5 h-5" />,
  url: <Globe className="w-5 h-5" />,
  password: <Lock className="w-5 h-5" />,
  text: <User className="w-5 h-5" />,
  number: <Hash className="w-5 h-5" />,
  date: <Calendar className="w-5 h-5" />,
  'datetime-local': <Calendar className="w-5 h-5" />,
  time: <Calendar className="w-5 h-5" />,
  month: <Calendar className="w-5 h-5" />,
  week: <Calendar className="w-5 h-5" />,
  currency: <DollarSign className="w-5 h-5" />,
  percentage: <Hash className="w-5 h-5" />
};

interface MobileInputV2Props {
  // 基础属性
  type?: InputType;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  
  // 焦点和行为事件
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  onEnterPress?: () => void;
  onSearch?: () => void; // 仅对搜索类型有效
  onVoiceInput?: () => void;
  onQRScan?: () => void;
  
  // 样式和显示
  icon?: React.ReactNode;
  floatingLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showClearButton?: boolean;
  showPasswordToggle?: boolean; // 密码输入时显示可见性切换
  
  // 输入限制和验证
  maxLength?: number;
  minLength?: number;
  min?: number; // 数字类型的最小值
  max?: number; // 数字类型的最大值
  step?: number; // 数字类型的步进值
  pattern?: string; // 正则表达式验证
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  
  // 验证和反馈
  error?: string;
  helperText?: string;
  validationState?: ValidationState;
  validator?: (value: string) => Promise<string | null> | string | null;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceValidation?: number;
  
  // 自动补全
  autoComplete?: string;
  autocompleteSuggestions?: AutocompleteSuggestion[];
  showSuggestions?: boolean;
  maxSuggestions?: number;
  
  // 增强功能
  enableVoiceInput?: boolean;
  enableQRScan?: boolean;
  preventZoom?: boolean; // 防止iOS缩放
  
  // 键盘和输入行为
  inputMode?: string; // 覆盖默认inputMode
  keyboardType?: string; // 移动端键盘类型
  enterKeyHint?: string; // 覆盖默认enterKeyHint
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  spellCheck?: boolean;
  
  // 无障碍
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  
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
  list?: string; // datalist 关联
}

export const MobileInputV2 = forwardRef<HTMLInputElement, MobileInputV2Props>(({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  onFocus,
  onBlur,
  onClear,
  onEnterPress,
  onSearch,
  onVoiceInput,
  onQRScan,
  icon,
  floatingLabel = true,
  size = 'md',
  showClearButton = true,
  showPasswordToggle = true,
  maxLength,
  minLength,
  min,
  max,
  step,
  pattern,
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
  autoComplete = 'off',
  autocompleteSuggestions = [],
  showSuggestions = true,
  maxSuggestions = 5,
  enableVoiceInput = false,
  enableQRScan = false,
  preventZoom = true,
  inputMode,
  keyboardType,
  enterKeyHint,
  autoCapitalize = 'none',
  autoCorrect = false,
  spellCheck = false,
  ariaLabel,
  ariaDescribedBy,
  ariaInvalid,
  enableKeyboardAdjustment = true,
  scrollOffset = 20,
  className = '',
  inputClassName = '',
  autoFocus = false,
  tabIndex,
  form,
  name,
  list
}, ref) => {
  const device = useDeviceDetection();
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [internalValidationState, setInternalValidationState] = useState<ValidationState>('idle');
  const [internalError, setInternalError] = useState<string>('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout>();

  // 防抖验证值
  const debouncedValue = useDebounce(value, validateOnChange ? debounceValidation : 0);

  // 键盘适配
  const keyboard = useKeyboardAdjustment({
    autoScroll: enableKeyboardAdjustment,
    scrollOffset,
    adjustViewport: true,
    enableSafeArea: true
  });

  // 转发ref
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(inputRef.current);
      } else {
        ref.current = inputRef.current;
      }
    }
  }, [ref]);

  useEffect(() => {
    setHasValue(!!value);
  }, [value]);

  // 验证逻辑
  const performValidation = useCallback(async (val: string) => {
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

  // 防抖验证触发
  useEffect(() => {
    if (!validateOnChange || !debouncedValue) return;
    
    clearTimeout(validationTimeoutRef.current);
    validationTimeoutRef.current = setTimeout(() => {
      performValidation(debouncedValue);
    }, 50);
    
    return () => clearTimeout(validationTimeoutRef.current);
  }, [debouncedValue, validateOnChange, performValidation]);

  // 过滤自动补全建议
  const filteredSuggestions = React.useMemo(() => {
    if (!value || !autocompleteSuggestions.length || !showSuggestions) return [];
    
    const filtered = autocompleteSuggestions.filter(suggestion =>
      suggestion.label.toLowerCase().includes(value.toLowerCase()) ||
      suggestion.value.toLowerCase().includes(value.toLowerCase())
    );
    
    return filtered.slice(0, maxSuggestions);
  }, [value, autocompleteSuggestions, showSuggestions, maxSuggestions]);

  // 获取输入属性
  const getInputType = () => {
    if (type === 'password' && showPassword) return 'text';
    if (type === 'currency' || type === 'percentage') return 'text';
    return type;
  };

  const getInputMode = () => {
    if (inputMode) return inputMode;
    return INPUT_MODE_MAP[type] || 'text';
  };

  const getEnterKeyHint = () => {
    if (enterKeyHint) return enterKeyHint;
    return ENTER_KEY_HINT_MAP[type] || 'done';
  };

  const getIcon = () => {
    if (icon) return icon;
    return ICON_MAP[type] || null;
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          input: 'min-h-[40px] text-sm px-3',
          button: 'btn-sm'
        };
      case 'lg':
        return {
          input: 'min-h-[56px] text-lg px-4',
          button: 'btn-lg'
        };
      default:
        return {
          input: 'min-h-[48px] text-base px-3',
          button: 'btn-md'
        };
    }
  };

  // 获取最终验证状态和错误信息
  const finalValidationState = validationState !== 'idle' ? validationState : internalValidationState;
  const finalError = error || internalError;

  const sizeClasses = getSizeClasses();
  const inputIcon = getIcon();

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
    
    // 显示建议
    if (filteredSuggestions.length > 0) {
      setShowSuggestionsPanel(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();

    // 延迟隐藏建议面板，以便处理点击选择
    setTimeout(() => {
      setShowSuggestionsPanel(false);
      setSelectedSuggestionIndex(-1);
    }, 200);

    // 失焦验证
    if (validateOnBlur && validator) {
      performValidation(value);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // 数字类型处理
    if (type === 'currency' || type === 'percentage') {
      // 允许数字、小数点和负号
      newValue = newValue.replace(/[^\d.-]/g, '');
    }

    onChange(newValue);

    // 重置验证状态
    if (internalValidationState !== 'idle') {
      setInternalValidationState('idle');
      setInternalError('');
    }

    // 显示建议
    if (autocompleteSuggestions.length > 0 && showSuggestions) {
      setShowSuggestionsPanel(true);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
    setInternalValidationState('idle');
    setInternalError('');
    setShowSuggestionsPanel(false);
  };

  const handlePasswordToggle = () => {
    setShowPassword(!showPassword);
    // 保持焦点
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleSuggestionSelect = (suggestion: AutocompleteSuggestion) => {
    onChange(suggestion.value);
    setShowSuggestionsPanel(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter键处理
    if (e.key === 'Enter') {
      if (showSuggestionsPanel && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        handleSuggestionSelect(filteredSuggestions[selectedSuggestionIndex]);
      } else if (type === 'search') {
        e.preventDefault();
        onSearch?.();
      } else {
        onEnterPress?.();
      }
    }

    // 建议面板导航
    if (showSuggestionsPanel && filteredSuggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            Math.min(prev + 1, filteredSuggestions.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => Math.max(prev - 1, -1));
          break;
        case 'Escape':
          setShowSuggestionsPanel(false);
          setSelectedSuggestionIndex(-1);
          break;
      }
    }
  };

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
            ${inputIcon ? 'left-10' : 'left-3'}
            ${isFocused || hasValue
              ? 'top-0 text-xs -translate-y-1/2 bg-base-100 px-1'
              : 'top-1/2 text-sm -translate-y-1/2'
            }
            ${isFocused ? 'text-primary' : 'text-base-content/60'}
            ${finalError ? 'text-error' : ''}
            ${disabled ? 'text-base-content/30' : ''}
          `}
          htmlFor={name || `input-${label}`}
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
        <label className="label" htmlFor={name || `input-${label}`}>
          <span className="label-text flex items-center gap-1">
            {label}
            {required && <span className="text-error">*</span>}
          </span>
        </label>
      )}

      <div className="relative">
        {/* 输入框图标 */}
        {inputIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/60 z-10">
            {inputIcon}
          </div>
        )}

        {/* 输入框 */}
        <input
          ref={inputRef}
          id={name || `input-${label}`}
          name={name}
          form={form}
          type={getInputType()}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={!floatingLabel || isFocused || !label ? placeholder : ''}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          spellCheck={spellCheck}
          tabIndex={tabIndex}
          maxLength={maxLength}
          minLength={minLength}
          min={min}
          max={max}
          step={step}
          pattern={pattern}
          inputMode={getInputMode()}
          enterKeyHint={getEnterKeyHint()}
          list={list}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid || !!finalError}
          className={`
            input input-bordered w-full
            ${sizeClasses.input}
            ${inputIcon ? 'pl-10' : ''}
            ${(showClearButton && value) || 
              (type === 'password' && showPasswordToggle) || 
              enableVoiceInput || 
              enableQRScan ? 'pr-12' : ''}
            ${finalError ? 'input-error' : ''}
            ${isFocused ? 'input-primary' : ''}
            ${disabled ? 'input-disabled' : ''}
            ${readOnly ? 'bg-base-200' : ''}
            transition-all duration-200
            ${inputClassName}
          `}
          style={{
            fontSize: preventZoom && device.isMobile ? '16px' : undefined,
          }}
        />

        {/* 右侧按钮区域 */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* 验证状态图标 */}
          {getValidationIcon()}
          
          {/* 语音输入按钮 */}
          {enableVoiceInput && !disabled && !readOnly && (
            <button
              type="button"
              onClick={onVoiceInput}
              className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content"
              aria-label="语音输入"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
          
          {/* 二维码扫描按钮 */}
          {enableQRScan && !disabled && !readOnly && (
            <button
              type="button"
              onClick={onQRScan}
              className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content"
              aria-label="扫描二维码"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}
          
          {/* 密码可见性切换 */}
          {type === 'password' && showPasswordToggle && value && !disabled && (
            <button
              type="button"
              onClick={handlePasswordToggle}
              className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content"
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          
          {/* 清除按钮 */}
          <AnimatePresence>
            {showClearButton && value && !disabled && !readOnly && (
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

        {/* 自动补全建议面板 */}
        <AnimatePresence>
          {showSuggestionsPanel && filteredSuggestions.length > 0 && (
            <motion.div
              ref={suggestionsRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 z-50 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg overflow-hidden"
            >
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion.value}
                  type="button"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={`
                    w-full px-4 py-3 text-left hover:bg-base-200 flex items-center gap-3
                    ${index === selectedSuggestionIndex ? 'bg-primary/10 text-primary' : ''}
                    ${index === filteredSuggestions.length - 1 ? '' : 'border-b border-base-300'}
                  `}
                >
                  {suggestion.icon && (
                    <div className="text-base-content/60">
                      {suggestion.icon}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{suggestion.label}</div>
                    {suggestion.description && (
                      <div className="text-sm text-base-content/60 truncate">
                        {suggestion.description}
                      </div>
                    )}
                  </div>
                </button>
              ))}
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

MobileInputV2.displayName = 'MobileInputV2';

export default MobileInputV2;