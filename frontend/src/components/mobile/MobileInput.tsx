import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Calendar, Hash, DollarSign } from 'lucide-react';

interface MobileInputProps {
  type?: 'text' | 'search' | 'number' | 'date' | 'amount';
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  onSearch?: () => void;
  icon?: React.ReactNode;
  showClearButton?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'search' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url';
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
  maxLength?: number;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  floatingLabel?: boolean;
}

export const MobileInput: React.FC<MobileInputProps> = ({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  onFocus,
  onBlur,
  onClear,
  onSearch,
  icon,
  showClearButton = true,
  autoComplete = 'off',
  inputMode,
  enterKeyHint,
  maxLength,
  disabled = false,
  error,
  helperText,
  floatingLabel = true,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasValue(!!value);
  }, [value]);

  // 根据类型自动设置输入模式
  const getInputMode = () => {
    if (inputMode) return inputMode;
    switch (type) {
      case 'search':
        return 'search';
      case 'number':
        return 'numeric';
      case 'amount':
        return 'decimal';
      default:
        return 'text';
    }
  };

  // 根据类型自动设置键盘提示
  const getEnterKeyHint = () => {
    if (enterKeyHint) return enterKeyHint;
    switch (type) {
      case 'search':
        return 'search';
      default:
        return 'done';
    }
  };

  // 获取图标
  const getIcon = () => {
    if (icon) return icon;
    switch (type) {
      case 'search':
        return <Search className="w-5 h-5" />;
      case 'date':
        return <Calendar className="w-5 h-5" />;
      case 'number':
        return <Hash className="w-5 h-5" />;
      case 'amount':
        return <DollarSign className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
    
    // 移动端优化：滚动到输入框
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 300);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type === 'search') {
      e.preventDefault();
      onSearch?.();
    }
  };

  const inputIcon = getIcon();

  return (
    <div className="relative">
      {/* 浮动标签 */}
      {floatingLabel && label && (
        <motion.label
          className={`
            absolute left-3 pointer-events-none
            transition-all duration-200 ease-out
            ${inputIcon ? 'left-10' : 'left-3'}
            ${isFocused || hasValue
              ? 'top-0 text-xs -translate-y-1/2 bg-base-100 px-1'
              : 'top-1/2 text-base -translate-y-1/2'
            }
            ${isFocused ? 'text-primary' : 'text-base-content/60'}
            ${error ? 'text-error' : ''}
          `}
          htmlFor={`input-${label}`}
        >
          {label}
        </motion.label>
      )}

      {/* 非浮动标签 */}
      {!floatingLabel && label && (
        <label className="label">
          <span className="label-text">{label}</span>
        </label>
      )}

      <div className="relative">
        {/* 输入框图标 */}
        {inputIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/60">
            {inputIcon}
          </div>
        )}

        {/* 输入框 */}
        <input
          ref={inputRef}
          id={`input-${label}`}
          type={type === 'amount' ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={!floatingLabel || isFocused ? placeholder : ''}
          disabled={disabled}
          autoComplete={autoComplete}
          inputMode={getInputMode()}
          enterKeyHint={getEnterKeyHint()}
          maxLength={maxLength}
          className={`
            input input-bordered w-full
            ${inputIcon ? 'pl-10' : ''}
            ${showClearButton && value ? 'pr-10' : ''}
            ${error ? 'input-error' : ''}
            ${isFocused ? 'input-primary' : ''}
            ${disabled ? 'input-disabled' : ''}
            min-h-[48px] text-base
            transition-all duration-200
          `}
          style={{
            // 防止iOS缩放
            fontSize: '16px',
          }}
        />

        {/* 清除按钮 */}
        <AnimatePresence>
          {showClearButton && value && !disabled && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-circle btn-xs"
              aria-label="清除"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* 帮助文本或错误信息 */}
      {(error || helperText) && (
        <label className="label">
          <span className={`label-text-alt ${error ? 'text-error' : ''}`}>
            {error || helperText}
          </span>
        </label>
      )}
    </div>
  );
};

// 搜索输入框（预设组件）
export const MobileSearchInput: React.FC<Omit<MobileInputProps, 'type'>> = (props) => (
  <MobileInput {...props} type="search" />
);

// 金额输入框（预设组件）
export const MobileAmountInput: React.FC<Omit<MobileInputProps, 'type'>> = (props) => (
  <MobileInput {...props} type="amount" />
);

// 日期输入框（预设组件）
export const MobileDateInput: React.FC<Omit<MobileInputProps, 'type'>> = (props) => (
  <MobileInput {...props} type="date" />
);

export default MobileInput;