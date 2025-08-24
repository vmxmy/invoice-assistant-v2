import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, Eye, EyeOff, X, Plus, Calendar, Search } from 'lucide-react';
import { useDeviceDetection } from '../../hooks/useMediaQuery';

interface MobileOptimizedFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export const MobileOptimizedForm: React.FC<MobileOptimizedFormProps> = ({
  children,
  onSubmit,
  className = ''
}) => {
  const device = useDeviceDetection();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={`mobile-optimized-form ${className}`}
      noValidate
    >
      {children}
      
      <style jsx>{`
        .mobile-optimized-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
      `}</style>
    </form>
  );
};

// 移动端优化的输入字段组件
interface MobileInputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'textarea';
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  description?: string;
  icon?: React.ReactNode;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  maxLength?: number;
  pattern?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search';
}

export const MobileInput: React.FC<MobileInputProps> = ({
  type = 'text',
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  description,
  icon,
  min,
  max,
  step,
  rows = 3,
  maxLength,
  pattern,
  autoComplete,
  inputMode
}) => {
  const device = useDeviceDetection();
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // 获取输入类型（处理密码显示切换）
  const getInputType = () => {
    if (type === 'password') {
      return showPassword ? 'text' : 'password';
    }
    return type;
  };

  // 获取输入模式（移动端键盘优化）
  const getInputMode = () => {
    if (inputMode) return inputMode;
    
    switch (type) {
      case 'number':
        return 'numeric';
      case 'tel':
        return 'tel';
      case 'email':
        return 'email';
      case 'url':
        return 'url';
      default:
        return 'text';
    }
  };

  // 处理值变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    onChange(newValue);
  };

  // 处理焦点
  const handleFocus = () => {
    setFocused(true);
    
    // 移动端滚动到视图中
    if (device.isMobile && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 300);
    }
  };

  const handleBlur = () => {
    setFocused(false);
  };

  // 基础输入属性
  const baseInputProps = {
    ref: inputRef,
    value: value || '',
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    placeholder,
    disabled,
    required,
    maxLength,
    pattern,
    autoComplete,
    inputMode: getInputMode(),
    className: `mobile-input ${error ? 'mobile-input-error' : ''} ${focused ? 'mobile-input-focused' : ''}`,
    style: {
      fontSize: device.isMobile ? '16px' : '14px' // 防止iOS缩放
    }
  };

  // 数字输入特定属性
  const numberInputProps = type === 'number' ? { min, max, step: step || 'any' } : {};

  return (
    <div className="mobile-form-control">
      {/* 标签 */}
      <label className="mobile-label">
        <span className="mobile-label-text">
          {icon && <span className="mobile-label-icon">{icon}</span>}
          {label}
          {required && <span className="mobile-required">*</span>}
        </span>
      </label>

      {/* 输入区域 */}
      <div className="mobile-input-wrapper">
        {type === 'textarea' ? (
          <textarea
            {...baseInputProps}
            rows={rows}
          />
        ) : type === 'date' ? (
          <div className="mobile-date-wrapper">
            <input
              {...baseInputProps}
              {...numberInputProps}
              type="date"
            />
            <Calendar className="mobile-date-icon" />
          </div>
        ) : (
          <input
            {...baseInputProps}
            {...numberInputProps}
            type={getInputType()}
          />
        )}

        {/* 密码显示切换按钮 */}
        {type === 'password' && (
          <button
            type="button"
            className="mobile-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="mobile-error">
          <AlertCircle className="mobile-error-icon" />
          <span className="mobile-error-text">{error}</span>
        </div>
      )}

      {/* 描述信息 */}
      {description && !error && (
        <div className="mobile-description">
          {description}
        </div>
      )}

      <style jsx>{`
        .mobile-form-control {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mobile-label {
          display: flex;
          align-items: center;
        }

        .mobile-label-text {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: rgba(var(--fallback-bc));
        }

        .mobile-label-icon {
          display: flex;
          align-items: center;
          color: rgba(var(--fallback-bc) / 0.6);
        }

        .mobile-required {
          color: rgba(var(--fallback-er));
          margin-left: 2px;
        }

        .mobile-input-wrapper {
          position: relative;
        }

        .mobile-input {
          width: 100%;
          min-height: ${device.isMobile ? '48px' : '40px'};
          padding: 12px 16px;
          border: 2px solid rgba(var(--fallback-bc) / 0.2);
          border-radius: 12px;
          background: rgba(var(--fallback-b1));
          color: rgba(var(--fallback-bc));
          font-size: ${device.isMobile ? '16px' : '14px'};
          transition: all 0.2s ease-out;
          -webkit-appearance: none;
          appearance: none;
          outline: none;
        }

        .mobile-input:focus {
          border-color: rgba(var(--fallback-p));
          box-shadow: 0 0 0 4px rgba(var(--fallback-p) / 0.1);
        }

        .mobile-input-error {
          border-color: rgba(var(--fallback-er));
        }

        .mobile-input-error:focus {
          border-color: rgba(var(--fallback-er));
          box-shadow: 0 0 0 4px rgba(var(--fallback-er) / 0.1);
        }

        .mobile-input::placeholder {
          color: rgba(var(--fallback-bc) / 0.5);
        }

        .mobile-input:disabled {
          background: rgba(var(--fallback-bc) / 0.05);
          color: rgba(var(--fallback-bc) / 0.5);
          cursor: not-allowed;
        }

        textarea.mobile-input {
          resize: vertical;
          min-height: 80px;
          line-height: 1.5;
        }

        .mobile-date-wrapper {
          position: relative;
        }

        .mobile-date-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: rgba(var(--fallback-bc) / 0.5);
          pointer-events: none;
        }

        .mobile-password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          padding: 4px;
          border: none;
          background: none;
          color: rgba(var(--fallback-bc) / 0.5);
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s ease-out;
        }

        .mobile-password-toggle:hover {
          color: rgba(var(--fallback-bc) / 0.7);
          background: rgba(var(--fallback-bc) / 0.05);
        }

        .mobile-error {
          display: flex;
          align-items: center;
          gap: 6px;
          color: rgba(var(--fallback-er));
          font-size: 0.75rem;
        }

        .mobile-error-icon {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }

        .mobile-error-text {
          flex: 1;
        }

        .mobile-description {
          font-size: 0.75rem;
          color: rgba(var(--fallback-bc) / 0.6);
          line-height: 1.4;
        }

        /* 触控设备优化 */
        @media (hover: none) and (pointer: coarse) {
          .mobile-input {
            min-height: 48px;
            font-size: 16px;
            padding: 14px 16px;
          }

          .mobile-password-toggle {
            padding: 8px;
            min-width: 44px;
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
};

// 移动端优化的标签输入组件
interface MobileTagInputProps {
  label: string;
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  maxTags?: number;
  suggestions?: string[];
}

export const MobileTagInput: React.FC<MobileTagInputProps> = ({
  label,
  tags,
  onAddTag,
  onRemoveTag,
  placeholder = '输入标签后按回车或点击添加',
  required = false,
  error,
  maxTags,
  suggestions = []
}) => {
  const device = useDeviceDetection();
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddTag = () => {
    const tag = inputValue.trim();
    if (tag && !tags.includes(tag) && (!maxTags || tags.length < maxTags)) {
      onAddTag(tag);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (!tags.includes(suggestion) && (!maxTags || tags.length < maxTags)) {
      onAddTag(suggestion);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
  );

  return (
    <div className="mobile-tag-input">
      <label className="mobile-label">
        <span className="mobile-label-text">
          {label}
          {required && <span className="mobile-required">*</span>}
          {maxTags && (
            <span className="mobile-tag-count">
              ({tags.length}/{maxTags})
            </span>
          )}
        </span>
      </label>

      {/* 输入区域 */}
      <div className="mobile-tag-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={maxTags ? tags.length >= maxTags : false}
          className="mobile-input"
          style={{ fontSize: device.isMobile ? '16px' : '14px' }}
        />
        
        <button
          type="button"
          onClick={handleAddTag}
          disabled={!inputValue.trim() || (maxTags ? tags.length >= maxTags : false)}
          className="mobile-tag-add-btn"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 建议列表 */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="mobile-suggestions">
          {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="mobile-suggestion-item"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <Search className="w-4 h-4" />
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* 标签列表 */}
      <div className="mobile-tags-container">
        {tags.length === 0 ? (
          <div className="mobile-no-tags">暂无标签</div>
        ) : (
          tags.map((tag, index) => (
            <div key={index} className="mobile-tag">
              <span className="mobile-tag-text">{tag}</span>
              <button
                type="button"
                className="mobile-tag-remove"
                onClick={() => onRemoveTag(tag)}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="mobile-error">
          <AlertCircle className="mobile-error-icon" />
          <span className="mobile-error-text">{error}</span>
        </div>
      )}

      <style jsx>{`
        .mobile-tag-input {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mobile-tag-input-wrapper {
          position: relative;
          display: flex;
          gap: 8px;
        }

        .mobile-tag-input-wrapper .mobile-input {
          flex: 1;
        }

        .mobile-tag-add-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 48px;
          height: 48px;
          padding: 0;
          border: 2px solid rgba(var(--fallback-p));
          border-radius: 12px;
          background: rgba(var(--fallback-p));
          color: rgba(var(--fallback-pc));
          cursor: pointer;
          transition: all 0.2s ease-out;
        }

        .mobile-tag-add-btn:hover {
          background: rgba(var(--fallback-p) / 0.9);
        }

        .mobile-tag-add-btn:disabled {
          background: rgba(var(--fallback-bc) / 0.1);
          border-color: rgba(var(--fallback-bc) / 0.2);
          color: rgba(var(--fallback-bc) / 0.5);
          cursor: not-allowed;
        }

        .mobile-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 60px;
          background: rgba(var(--fallback-b1));
          border: 2px solid rgba(var(--fallback-bc) / 0.2);
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(var(--fallback-bc) / 0.1);
          z-index: 10;
          max-height: 200px;
          overflow-y: auto;
        }

        .mobile-suggestion-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 12px 16px;
          border: none;
          background: none;
          color: rgba(var(--fallback-bc));
          font-size: 14px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease-out;
        }

        .mobile-suggestion-item:hover {
          background: rgba(var(--fallback-p) / 0.1);
        }

        .mobile-tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-height: 40px;
          padding: 12px;
          border: 2px solid rgba(var(--fallback-bc) / 0.2);
          border-radius: 12px;
          background: rgba(var(--fallback-b2) / 0.5);
        }

        .mobile-no-tags {
          display: flex;
          align-items: center;
          color: rgba(var(--fallback-bc) / 0.5);
          font-size: 0.875rem;
        }

        .mobile-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(var(--fallback-p));
          color: rgba(var(--fallback-pc));
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .mobile-tag-text {
          line-height: 1;
        }

        .mobile-tag-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          padding: 0;
          border: none;
          background: rgba(var(--fallback-pc) / 0.2);
          color: rgba(var(--fallback-pc));
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease-out;
        }

        .mobile-tag-remove:hover {
          background: rgba(var(--fallback-pc) / 0.3);
        }

        .mobile-tag-count {
          font-size: 0.75rem;
          color: rgba(var(--fallback-bc) / 0.6);
          margin-left: 8px;
        }
      `}</style>
    </div>
  );
};

export { MobileOptimizedForm as default };