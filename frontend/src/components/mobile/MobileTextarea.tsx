import React, { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  AlertCircle,
  CheckCircle,
  Info,
  Mic,
  Type,
  CornerDownLeft,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useKeyboardAdjustment } from '../../hooks/useKeyboardAdjustment';
import { useDeviceDetection } from '../../hooks/useMediaQuery';
import { useDebounce } from '../../hooks/useDebounce';

// 验证状态
type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

// 调整模式
type ResizeMode = 'none' | 'vertical' | 'both';

// 自动大小调整
type AutoResize = boolean | { minRows?: number; maxRows?: number };

interface MobileTextareaProps {
  // 基础属性
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  
  // 焦点事件
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  onVoiceInput?: () => void;
  
  // 样式和行为
  floatingLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  rows?: number;
  minRows?: number;
  maxRows?: number;
  autoResize?: AutoResize;
  resize?: ResizeMode;
  
  // 输入限制
  maxLength?: number;
  minLength?: number;
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
  
  // 增强功能
  enableVoiceInput?: boolean;
  showCharCount?: boolean;
  showClearButton?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  spellCheck?: boolean;
  
  // 全屏模式
  enableFullscreen?: boolean;
  
  // 无障碍
  ariaLabel?: string;
  ariaDescribedBy?: string;
  
  // 键盘适配
  enableKeyboardAdjustment?: boolean;
  scrollOffset?: number;
  
  // 样式类名
  className?: string;
  textareaClassName?: string;
  
  // 其他HTML属性
  autoFocus?: boolean;
  tabIndex?: number;
  form?: string;
  name?: string;
  wrap?: 'soft' | 'hard' | 'off';
}

export const MobileTextarea = forwardRef<HTMLTextAreaElement, MobileTextareaProps>(({
  label,
  placeholder,
  value,
  onChange,
  onFocus,
  onBlur,
  onClear,
  onVoiceInput,
  floatingLabel = true,
  size = 'md',
  rows = 4,
  minRows = 2,
  maxRows = 10,
  autoResize = false,
  resize = 'vertical',
  maxLength,
  minLength,
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
  enableVoiceInput = false,
  showCharCount = false,
  showClearButton = true,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  spellCheck = true,
  enableFullscreen = false,
  ariaLabel,
  ariaDescribedBy,
  enableKeyboardAdjustment = true,
  scrollOffset = 20,
  className = '',
  textareaClassName = '',
  autoFocus = false,
  tabIndex,
  form,
  name,
  wrap = 'soft'
}, ref) => {
  const device = useDeviceDetection();
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);
  const [internalValidationState, setInternalValidationState] = useState<ValidationState>('idle');
  const [internalError, setInternalError] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState<number | undefined>();
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // 将 ref 转发给内部的 textarea
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(textareaRef.current);
      } else {
        ref.current = textareaRef.current;
      }
    }
  }, [ref]);

  useEffect(() => {
    setHasValue(!!value);
  }, [value]);

  // 自动调整高度
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !autoResize) return;

    // 重置高度以获得准确的 scrollHeight
    textarea.style.height = 'auto';
    
    const computedStyle = window.getComputedStyle(textarea);
    const paddingTop = parseInt(computedStyle.paddingTop);
    const paddingBottom = parseInt(computedStyle.paddingBottom);
    const borderTop = parseInt(computedStyle.borderTopWidth);
    const borderBottom = parseInt(computedStyle.borderBottomWidth);
    const lineHeight = parseInt(computedStyle.lineHeight);
    
    const minHeight = (typeof autoResize === 'object' && autoResize.minRows ? autoResize.minRows : minRows) * lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
    const maxHeight = (typeof autoResize === 'object' && autoResize.maxRows ? autoResize.maxRows : maxRows) * lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
    
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    
    setTextareaHeight(newHeight);
    textarea.style.height = `${newHeight}px`;
  }, [autoResize, minRows, maxRows]);

  // 内容变化时调整高度
  useEffect(() => {
    if (autoResize) {
      adjustHeight();
    }
  }, [value, autoResize, adjustHeight]);

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

  // 获取最终验证状态和错误信息
  const finalValidationState = validationState !== 'idle' ? validationState : internalValidationState;
  const finalError = error || internalError;

  // 获取尺寸相关类名
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          textarea: 'text-sm p-3 min-h-[80px]',
          button: 'btn-sm'
        };
      case 'lg':
        return {
          textarea: 'text-lg p-4 min-h-[120px]',
          button: 'btn-lg'
        };
      default: // md
        return {
          textarea: 'text-base p-3 min-h-[100px]',
          button: 'btn-md'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();

    // 失焦验证
    if (validateOnBlur && validator) {
      performValidation(value);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // 重置验证状态
    if (internalValidationState !== 'idle') {
      setInternalValidationState('idle');
      setInternalError('');
    }
  };

  const handleClear = () => {
    onChange('');
    onClear?.();
    textareaRef.current?.focus();
    setInternalValidationState('idle');
    setInternalError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter 提交表单
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      const form = textareaRef.current?.form;
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }
    
    // Escape 失焦
    if (e.key === 'Escape') {
      textareaRef.current?.blur();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
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

  // 计算字符数信息
  const charCount = value.length;
  const charCountInfo = showCharCount ? (
    <span className={`text-xs ${charCount > (maxLength || Infinity) * 0.8 ? 'text-warning' : 'text-base-content/60'}`}>
      {charCount}
      {maxLength && ` / ${maxLength}`}
    </span>
  ) : null;

  return (
    <>
      <div className={`relative ${className}`}>
        {/* 浮动标签 */}
        {floatingLabel && label && (
          <motion.label
            className={`
              absolute left-3 top-3 pointer-events-none z-10
              transition-all duration-200 ease-out
              ${isFocused || hasValue
                ? 'top-0 text-xs -translate-y-1/2 bg-base-100 px-1'
                : 'text-sm translate-y-0'
              }
              ${isFocused ? 'text-primary' : 'text-base-content/60'}
              ${finalError ? 'text-error' : ''}
              ${disabled ? 'text-base-content/30' : ''}
            `}
            htmlFor={name || `textarea-${label}`}
            initial={false}
            animate={{
              fontSize: isFocused || hasValue ? '0.75rem' : '0.875rem',
              y: isFocused || hasValue ? '-50%' : '0%'
            }}
          >
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </motion.label>
        )}

        {/* 非浮动标签 */}
        {!floatingLabel && label && (
          <label className="label" htmlFor={name || `textarea-${label}`}>
            <span className="label-text flex items-center gap-1">
              {label}
              {required && <span className="text-error">*</span>}
            </span>
            {charCountInfo && (
              <span className="label-text-alt">
                {charCountInfo}
              </span>
            )}
          </label>
        )}

        <div className="relative">
          {/* 文本区域 */}
          <textarea
            ref={textareaRef}
            id={name || `textarea-${label}`}
            name={name}
            form={form}
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
            tabIndex={tabIndex}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            spellCheck={spellCheck}
            maxLength={maxLength}
            minLength={minLength}
            rows={autoResize ? undefined : rows}
            wrap={wrap}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            className={`
              textarea textarea-bordered w-full resize-${resize}
              ${sizeClasses.textarea}
              ${floatingLabel && label ? 'pt-6' : ''}
              ${finalError ? 'textarea-error' : ''}
              ${isFocused ? 'textarea-primary' : ''}
              ${disabled ? 'textarea-disabled' : ''}
              ${readOnly ? 'bg-base-200' : ''}
              transition-all duration-200
              ${textareaClassName}
            `}
            style={{
              height: autoResize ? textareaHeight : undefined,
              fontSize: device.isMobile ? '16px' : undefined, // 防止iOS缩放
            }}
          />

          {/* 右上角按钮区域 */}
          <div className="absolute top-3 right-3 flex items-center gap-1">
            {/* 验证状态图标 */}
            {getValidationIcon()}
            
            {/* 语音输入按钮 */}
            {enableVoiceInput && (
              <button
                type="button"
                onClick={onVoiceInput}
                disabled={disabled || readOnly}
                className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content"
                aria-label="语音输入"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
            
            {/* 全屏按钮 */}
            {enableFullscreen && device.isMobile && (
              <button
                type="button"
                onClick={toggleFullscreen}
                disabled={disabled}
                className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content"
                aria-label={isFullscreen ? '退出全屏' : '全屏模式'}
              >
                {isFullscreen ? 
                  <Minimize2 className="w-4 h-4" /> : 
                  <Maximize2 className="w-4 h-4" />
                }
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

          {/* 右下角信息区域 */}
          {(showCharCount || device.isMobile) && (
            <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs text-base-content/60">
              {showCharCount && floatingLabel && charCountInfo}
              {device.isMobile && (
                <div className="flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" />
                  <span>Cmd+Enter</span>
                </div>
              )}
            </div>
          )}
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
            {showCharCount && !floatingLabel && charCountInfo && (
              <span className="label-text-alt">
                {charCountInfo}
              </span>
            )}
          </label>
        )}
      </div>

      {/* 全屏模式模态框 */}
      <AnimatePresence>
        {isFullscreen && device.isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-base-100"
          >
            {/* 全屏头部 */}
            <div className="flex items-center justify-between p-4 border-b border-base-300">
              <div className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                <h2 className="font-medium">{label || '编辑文本'}</h2>
              </div>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="btn btn-ghost btn-circle btn-sm"
                aria-label="退出全屏"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 全屏文本区域 */}
            <div className="flex-1 p-4">
              <textarea
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                disabled={disabled}
                readOnly={readOnly}
                maxLength={maxLength}
                className="textarea w-full h-full resize-none text-base"
                style={{ minHeight: 'calc(100vh - 120px)' }}
              />
            </div>

            {/* 全屏底部 */}
            {(showCharCount || finalError) && (
              <div className="flex items-center justify-between p-4 border-t border-base-300">
                <div className="flex items-center gap-2 text-sm text-base-content/60">
                  {finalError && (
                    <span className="text-error flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {finalError}
                    </span>
                  )}
                </div>
                {showCharCount && (
                  <div className="text-sm text-base-content/60">
                    {charCountInfo}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

MobileTextarea.displayName = 'MobileTextarea';

export default MobileTextarea;