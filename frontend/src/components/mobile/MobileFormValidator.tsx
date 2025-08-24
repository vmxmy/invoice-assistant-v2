import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useRef, 
  useEffect,
  ReactNode 
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

// 验证规则类型
interface ValidationRule {
  validate: (value: any, formData?: Record<string, any>) => Promise<string | null> | string | null;
  message?: string;
  when?: (formData: Record<string, any>) => boolean; // 条件验证
}

// 字段验证配置
export interface FieldValidation {
  name: string;
  label: string;
  rules: ValidationRule[];
  validateOn?: 'change' | 'blur' | 'submit' | 'manual';
  debounce?: number;
  dependencies?: string[]; // 依赖的其他字段
  transform?: (value: any) => any; // 值转换
}

// 验证结果
interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  validFields: string[];
  pendingFields: string[];
}

// 字段状态
interface FieldStatus {
  isValidating: boolean;
  isValid: boolean;
  error: string | null;
  warning: string | null;
  touched: boolean;
}

// 验证上下文
interface ValidationContextType {
  formData: Record<string, any>;
  fieldStatuses: Record<string, FieldStatus>;
  validationResult: ValidationResult;
  validateField: (fieldName: string, value?: any) => Promise<void>;
  validateForm: () => Promise<ValidationResult>;
  resetValidation: (fieldName?: string) => void;
  setFieldTouched: (fieldName: string, touched: boolean) => void;
  registerField: (config: FieldValidation) => void;
  unregisterField: (fieldName: string) => void;
}

const ValidationContext = createContext<ValidationContextType | null>(null);

export const useFormValidation = () => {
  const context = useContext(ValidationContext);
  if (!context) {
    throw new Error('useFormValidation must be used within MobileFormValidator');
  }
  return context;
};

// 内置验证规则
export class MobileValidator {
  static presets = {
    required: (message = '此字段为必填项'): ValidationRule => ({
      validate: (value) => {
        if (value === null || value === undefined || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
          return message;
        }
        return null;
      }
    }),

    email: (message = '请输入有效的邮箱地址'): ValidationRule => ({
      validate: (value) => {
        if (!value) return null;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? null : message;
      }
    }),

    phone: (message = '请输入有效的手机号码'): ValidationRule => ({
      validate: (value) => {
        if (!value) return null;
        const phoneRegex = /^1[3-9]\d{9}$/;
        return phoneRegex.test(value) ? null : message;
      }
    }),

    url: (message = '请输入有效的网址'): ValidationRule => ({
      validate: (value) => {
        if (!value) return null;
        try {
          new URL(value);
          return null;
        } catch {
          return message;
        }
      }
    }),

    minLength: (min: number, message?: string): ValidationRule => ({
      validate: (value) => {
        if (!value) return null;
        const length = typeof value === 'string' ? value.length : String(value).length;
        return length >= min ? null : (message || `至少需要 ${min} 个字符`);
      }
    }),

    maxLength: (max: number, message?: string): ValidationRule => ({
      validate: (value) => {
        if (!value) return null;
        const length = typeof value === 'string' ? value.length : String(value).length;
        return length <= max ? null : (message || `不能超过 ${max} 个字符`);
      }
    }),

    min: (min: number, message?: string): ValidationRule => ({
      validate: (value) => {
        if (value === null || value === undefined || value === '') return null;
        const num = Number(value);
        return isNaN(num) || num >= min ? null : (message || `值不能小于 ${min}`);
      }
    }),

    max: (max: number, message?: string): ValidationRule => ({
      validate: (value) => {
        if (value === null || value === undefined || value === '') return null;
        const num = Number(value);
        return isNaN(num) || num <= max ? null : (message || `值不能大于 ${max}`);
      }
    }),

    pattern: (regex: RegExp, message = '格式不正确'): ValidationRule => ({
      validate: (value) => {
        if (!value) return null;
        return regex.test(value) ? null : message;
      }
    }),

    custom: (validator: (value: any, formData?: Record<string, any>) => Promise<string | null> | string | null): ValidationRule => ({
      validate: validator
    }),

    match: (targetField: string, message?: string): ValidationRule => ({
      validate: (value, formData) => {
        if (!value || !formData) return null;
        const targetValue = formData[targetField];
        return value === targetValue ? null : (message || '两次输入不一致');
      }
    }),

    oneOf: (options: any[], message?: string): ValidationRule => ({
      validate: (value) => {
        if (!value) return null;
        return options.includes(value) ? null : (message || '请选择有效选项');
      }
    }),

    numeric: (message = '请输入有效数字'): ValidationRule => ({
      validate: (value) => {
        if (!value) return null;
        return !isNaN(Number(value)) ? null : message;
      }
    })
  };
}

interface MobileFormValidatorProps {
  children: ReactNode;
  validations: FieldValidation[];
  formData: Record<string, any>;
  onValidationChange?: (result: ValidationResult) => void;
  showSummary?: boolean;
  summaryPosition?: 'top' | 'bottom';
  autoValidate?: boolean; // 自动验证（根据字段配置）
  className?: string;
}

export const MobileFormValidator: React.FC<MobileFormValidatorProps> = ({
  children,
  validations,
  formData,
  onValidationChange,
  showSummary = false,
  summaryPosition = 'top',
  autoValidate = true,
  className = ''
}) => {
  const [fieldStatuses, setFieldStatuses] = useState<Record<string, FieldStatus>>({});
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: {},
    warnings: {},
    validFields: [],
    pendingFields: []
  });

  const validationConfigsRef = useRef<Record<string, FieldValidation>>({});
  const debounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // 注册验证配置
  useEffect(() => {
    validations.forEach(config => {
      validationConfigsRef.current[config.name] = config;
    });

    // 初始化字段状态
    const initialStatuses: Record<string, FieldStatus> = {};
    validations.forEach(config => {
      if (!fieldStatuses[config.name]) {
        initialStatuses[config.name] = {
          isValidating: false,
          isValid: true,
          error: null,
          warning: null,
          touched: false
        };
      }
    });

    setFieldStatuses(prev => ({ ...prev, ...initialStatuses }));
  }, [validations]);

  // 验证单个字段
  const validateField = useCallback(async (fieldName: string, value?: any) => {
    const config = validationConfigsRef.current[fieldName];
    if (!config) return;

    const fieldValue = value !== undefined ? value : formData[fieldName];
    
    // 值转换
    const transformedValue = config.transform ? config.transform(fieldValue) : fieldValue;

    // 设置验证中状态
    setFieldStatuses(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        isValidating: true
      }
    }));

    try {
      let error: string | null = null;
      
      // 条件验证检查
      if (config.when && !config.when(formData)) {
        // 不需要验证，重置状态
        setFieldStatuses(prev => ({
          ...prev,
          [fieldName]: {
            ...prev[fieldName],
            isValidating: false,
            isValid: true,
            error: null
          }
        }));
        return;
      }

      // 执行验证规则
      for (const rule of config.rules) {
        const result = await rule.validate(transformedValue, formData);
        if (result) {
          error = result;
          break;
        }
      }

      // 更新字段状态
      setFieldStatuses(prev => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          isValidating: false,
          isValid: !error,
          error,
          touched: true
        }
      }));

    } catch (err) {
      // 验证异常处理
      setFieldStatuses(prev => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          isValidating: false,
          isValid: false,
          error: '验证失败'
        }
      }));
    }
  }, [formData]);

  // 验证整个表单
  const validateForm = useCallback(async (): Promise<ValidationResult> => {
    const promises = Object.keys(validationConfigsRef.current).map(fieldName => 
      validateField(fieldName)
    );

    await Promise.all(promises);

    // 等待状态更新后计算结果
    return new Promise((resolve) => {
      setTimeout(() => {
        const errors: Record<string, string> = {};
        const warnings: Record<string, string> = {};
        const validFields: string[] = [];
        const pendingFields: string[] = [];

        Object.entries(fieldStatuses).forEach(([fieldName, status]) => {
          if (status.isValidating) {
            pendingFields.push(fieldName);
          } else if (status.error) {
            errors[fieldName] = status.error;
          } else if (status.isValid) {
            validFields.push(fieldName);
          }

          if (status.warning) {
            warnings[fieldName] = status.warning;
          }
        });

        const result: ValidationResult = {
          isValid: Object.keys(errors).length === 0 && pendingFields.length === 0,
          errors,
          warnings,
          validFields,
          pendingFields
        };

        setValidationResult(result);
        onValidationChange?.(result);
        resolve(result);
      }, 0);
    });
  }, [fieldStatuses, validateField, onValidationChange]);

  // 重置验证状态
  const resetValidation = useCallback((fieldName?: string) => {
    if (fieldName) {
      setFieldStatuses(prev => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          isValidating: false,
          isValid: true,
          error: null,
          warning: null,
          touched: false
        }
      }));
    } else {
      const resetStatuses: Record<string, FieldStatus> = {};
      Object.keys(validationConfigsRef.current).forEach(name => {
        resetStatuses[name] = {
          isValidating: false,
          isValid: true,
          error: null,
          warning: null,
          touched: false
        };
      });
      setFieldStatuses(resetStatuses);
    }
  }, []);

  // 设置字段触摸状态
  const setFieldTouched = useCallback((fieldName: string, touched: boolean) => {
    setFieldStatuses(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        touched
      }
    }));
  }, []);

  // 注册字段
  const registerField = useCallback((config: FieldValidation) => {
    validationConfigsRef.current[config.name] = config;
    
    if (!fieldStatuses[config.name]) {
      setFieldStatuses(prev => ({
        ...prev,
        [config.name]: {
          isValidating: false,
          isValid: true,
          error: null,
          warning: null,
          touched: false
        }
      }));
    }
  }, [fieldStatuses]);

  // 注销字段
  const unregisterField = useCallback((fieldName: string) => {
    delete validationConfigsRef.current[fieldName];
    
    setFieldStatuses(prev => {
      const { [fieldName]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // 监听表单数据变化进行自动验证
  useEffect(() => {
    if (!autoValidate) return;

    Object.entries(validationConfigsRef.current).forEach(([fieldName, config]) => {
      if (config.validateOn === 'change' || (config.validateOn === undefined && config.debounce)) {
        const debounceTime = config.debounce || 300;
        
        // 清除之前的定时器
        if (debounceTimersRef.current[fieldName]) {
          clearTimeout(debounceTimersRef.current[fieldName]);
        }

        // 设置新的防抖验证
        debounceTimersRef.current[fieldName] = setTimeout(() => {
          if (fieldStatuses[fieldName]?.touched) {
            validateField(fieldName);
          }
        }, debounceTime);
      }
    });

    return () => {
      Object.values(debounceTimersRef.current).forEach(timer => {
        clearTimeout(timer);
      });
    };
  }, [formData, autoValidate, validateField, fieldStatuses]);

  // 计算验证结果
  useEffect(() => {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};
    const validFields: string[] = [];
    const pendingFields: string[] = [];

    Object.entries(fieldStatuses).forEach(([fieldName, status]) => {
      if (status.isValidating) {
        pendingFields.push(fieldName);
      } else if (status.error) {
        errors[fieldName] = status.error;
      } else if (status.isValid) {
        validFields.push(fieldName);
      }

      if (status.warning) {
        warnings[fieldName] = status.warning;
      }
    });

    const result: ValidationResult = {
      isValid: Object.keys(errors).length === 0 && pendingFields.length === 0,
      errors,
      warnings,
      validFields,
      pendingFields
    };

    setValidationResult(result);
    onValidationChange?.(result);
  }, [fieldStatuses, onValidationChange]);

  // 验证摘要组件
  const ValidationSummary: React.FC = () => {
    const { errors, warnings, pendingFields } = validationResult;
    const errorCount = Object.keys(errors).length;
    const warningCount = Object.keys(warnings).length;
    const pendingCount = pendingFields.length;

    if (!showSummary || (errorCount === 0 && warningCount === 0 && pendingCount === 0)) {
      return null;
    }

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-4 p-4 rounded-lg border"
        >
          {errorCount > 0 && (
            <div className="flex items-center gap-2 text-error mb-2">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">{errorCount} 个错误需要修正</span>
            </div>
          )}
          
          {warningCount > 0 && (
            <div className="flex items-center gap-2 text-warning mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">{warningCount} 个警告</span>
            </div>
          )}
          
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 text-info">
              <div className="loading loading-spinner loading-xs" />
              <span className="font-medium">{pendingCount} 个字段正在验证中</span>
            </div>
          )}

          {/* 详细错误列表 */}
          {errorCount > 0 && (
            <div className="mt-3 space-y-1">
              {Object.entries(errors).map(([fieldName, error]) => {
                const config = validationConfigsRef.current[fieldName];
                const label = config?.label || fieldName;
                return (
                  <div key={fieldName} className="text-sm text-error flex items-start gap-1">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>{label}:</strong> {error}</span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  const contextValue: ValidationContextType = {
    formData,
    fieldStatuses,
    validationResult,
    validateField,
    validateForm,
    resetValidation,
    setFieldTouched,
    registerField,
    unregisterField
  };

  return (
    <ValidationContext.Provider value={contextValue}>
      <div className={`mobile-form-validator ${className}`}>
        {showSummary && summaryPosition === 'top' && <ValidationSummary />}
        {children}
        {showSummary && summaryPosition === 'bottom' && <ValidationSummary />}
      </div>
    </ValidationContext.Provider>
  );
};

export default MobileFormValidator;