/**
 * 发票配置管理器
 * 
 * 加载和管理共享配置文件，确保前后端配置同步
 */

import invoiceConfigData from '../../shared/invoice-config.json';
import { InvoiceType, FieldType, FieldCategory } from '../types/invoice';

// ===== 配置接口定义 =====

interface InvoiceTypeConfig {
  code: string;
  name: string;
  description: string;
  icon: string;
  field_count: number;
  supports: string[];
}

interface FieldCategoryConfig {
  name: string;
  description: string;
  order: number;
  color: string;
}

interface FieldTypeConfig {
  name: string;
  validation: string;
  input_type: string;
  step?: string;
  min?: number;
  max?: number;
}

interface ValidationRuleConfig {
  message: string;
  severity: string;
}

interface ValidationPresetConfig {
  name: string;
  description: string;
  require_all_mandatory: boolean;
  min_confidence: number;
  allow_low_confidence: boolean;
}

interface UISettings {
  pagination: {
    default_page_size: number;
    available_sizes: number[];
  };
  date_format: string;
  datetime_format: string;
  currency_format: string;
  decimal_places: number;
  table_settings: {
    default_sort: string;
    default_direction: string;
    sticky_header: boolean;
    row_selection: boolean;
  };
  form_settings: {
    auto_save: boolean;
    auto_save_interval: number;
    validation_on_blur: boolean;
    show_field_errors: boolean;
  };
}

interface PerformanceSettings {
  ocr_timeout: number;
  parse_timeout: number;
  validation_timeout: number;
  batch_size: number;
  cache_ttl: number;
  debounce_delay: number;
}

interface InvoiceConfig {
  version: string;
  generated_at: string;
  description: string;
  invoice_types: Record<string, InvoiceTypeConfig>;
  field_categories: Record<string, FieldCategoryConfig>;
  field_types: Record<string, FieldTypeConfig>;
  validation_rules: Record<string, ValidationRuleConfig>;
  confidence_thresholds: Record<string, number>;
  validation_presets: Record<string, ValidationPresetConfig>;
  ocr_providers: Record<string, any>;
  api_endpoints: {
    base_url: string;
    ocr: Record<string, string>;
    parser: Record<string, string>;
    validator: Record<string, string>;
  };
  ui_settings: UISettings;
  feature_flags: Record<string, boolean>;
  performance_settings: PerformanceSettings;
  error_codes: Record<string, string>;
  localization: {
    default_language: string;
    supported_languages: string[];
    messages: Record<string, Record<string, string>>;
  };
}

// ===== 配置管理器类 =====

class InvoiceConfigManager {
  private config: InvoiceConfig;
  private currentLanguage: string;

  constructor() {
    this.config = invoiceConfigData as InvoiceConfig;
    // 确保 localization 存在
    if (!this.config.localization) {
      this.config.localization = {
        default_language: 'zh-CN',
        supported_languages: ['zh-CN'],
        messages: {
          'zh-CN': {}
        }
      };
    }
    this.currentLanguage = this.config.localization.default_language || 'zh-CN';
  }

  // ===== 基础配置获取 =====

  /**
   * 获取完整配置
   */
  getConfig(): InvoiceConfig {
    return this.config;
  }

  /**
   * 获取配置版本
   */
  getVersion(): string {
    return this.config.version;
  }

  /**
   * 获取生成时间
   */
  getGeneratedAt(): string {
    return this.config.generated_at;
  }

  // ===== 发票类型配置 =====

  /**
   * 获取所有发票类型配置
   */
  getInvoiceTypes(): Record<string, InvoiceTypeConfig> {
    return this.config.invoice_types;
  }

  /**
   * 获取指定发票类型配置
   */
  getInvoiceTypeConfig(type: string): InvoiceTypeConfig | null {
    return this.config.invoice_types[type] || null;
  }

  /**
   * 获取发票类型列表
   */
  getInvoiceTypeList(): Array<{ code: string; name: string; icon: string }> {
    return Object.entries(this.config.invoice_types).map(([key, config]) => ({
      code: config.code,
      name: config.name,
      icon: config.icon
    }));
  }

  /**
   * 检查发票类型是否支持特定功能
   */
  supportsFeature(type: string, feature: string): boolean {
    const config = this.getInvoiceTypeConfig(type);
    return config?.supports.includes(feature) || false;
  }

  // ===== 字段配置 =====

  /**
   * 获取字段分类配置
   */
  getFieldCategories(): Record<string, FieldCategoryConfig> {
    return this.config.field_categories;
  }

  /**
   * 获取排序后的字段分类列表
   */
  getFieldCategoriesSorted(): Array<{ key: string; config: FieldCategoryConfig }> {
    return Object.entries(this.config.field_categories)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([key, config]) => ({ key, config }));
  }

  /**
   * 获取字段类型配置
   */
  getFieldTypes(): Record<string, FieldTypeConfig> {
    return this.config.field_types;
  }

  /**
   * 获取指定字段类型配置
   */
  getFieldTypeConfig(type: string): FieldTypeConfig | null {
    return this.config.field_types[type] || null;
  }

  // ===== 验证配置 =====

  /**
   * 获取验证规则配置
   */
  getValidationRules(): Record<string, ValidationRuleConfig> {
    return this.config.validation_rules;
  }

  /**
   * 获取置信度阈值
   */
  getConfidenceThresholds(): Record<string, number> {
    return this.config.confidence_thresholds;
  }

  /**
   * 根据置信度值获取等级
   */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' | 'unacceptable' {
    const thresholds = this.config.confidence_thresholds;
    
    if (confidence >= thresholds.high) return 'high';
    if (confidence >= thresholds.medium) return 'medium';
    if (confidence >= thresholds.low) return 'low';
    return 'unacceptable';
  }

  /**
   * 获取验证预设配置
   */
  getValidationPresets(): Record<string, ValidationPresetConfig> {
    return this.config.validation_presets;
  }

  /**
   * 获取指定验证预设
   */
  getValidationPreset(preset: string): ValidationPresetConfig | null {
    return this.config.validation_presets[preset] || null;
  }

  // ===== API 配置 =====

  /**
   * 获取 API 基础 URL
   */
  getApiBaseUrl(): string {
    return this.config.api_endpoints.base_url;
  }

  /**
   * 获取 OCR API 端点
   */
  getOcrEndpoints(): Record<string, string> {
    return this.config.api_endpoints.ocr;
  }

  /**
   * 获取解析器 API 端点
   */
  getParserEndpoints(): Record<string, string> {
    return this.config.api_endpoints.parser;
  }

  /**
   * 获取验证器 API 端点
   */
  getValidatorEndpoints(): Record<string, string> {
    return this.config.api_endpoints.validator;
  }

  /**
   * 构建完整的 API URL
   */
  buildApiUrl(category: 'ocr' | 'parser' | 'validator', endpoint: string, params?: Record<string, string>): string {
    const baseUrl = this.getApiBaseUrl();
    let endpointPath = this.config.api_endpoints[category][endpoint];
    
    // 替换路径参数
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        endpointPath = endpointPath.replace(`{${key}}`, value);
      });
    }
    
    return `${baseUrl}${endpointPath}`;
  }

  // ===== UI 配置 =====

  /**
   * 获取 UI 设置
   */
  getUISettings(): UISettings {
    return this.config.ui_settings;
  }

  /**
   * 获取分页配置
   */
  getPaginationConfig() {
    return this.config.ui_settings.pagination;
  }

  /**
   * 获取表格设置
   */
  getTableSettings() {
    return this.config.ui_settings.table_settings;
  }

  /**
   * 获取表单设置
   */
  getFormSettings() {
    return this.config.ui_settings.form_settings;
  }

  /**
   * 格式化日期
   */
  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const format = this.config.ui_settings.date_format;
    
    // 简单的日期格式化
    return dateObj.toISOString().split('T')[0];
  }

  /**
   * 格式化日期时间
   */
  formatDateTime(dateTime: Date | string): string {
    const dateObj = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    return dateObj.toLocaleString('zh-CN');
  }

  /**
   * 格式化金额
   */
  formatCurrency(amount: number): string {
    const format = this.config.ui_settings.currency_format;
    const decimalPlaces = this.config.ui_settings.decimal_places;
    
    return format.replace('{amount}', amount.toFixed(decimalPlaces));
  }

  // ===== 功能开关 =====

  /**
   * 获取功能开关配置
   */
  getFeatureFlags(): Record<string, boolean> {
    return this.config.feature_flags;
  }

  /**
   * 检查功能是否启用
   */
  isFeatureEnabled(feature: string): boolean {
    return this.config.feature_flags[feature] || false;
  }

  // ===== 性能配置 =====

  /**
   * 获取性能设置
   */
  getPerformanceSettings(): PerformanceSettings {
    return this.config.performance_settings;
  }

  /**
   * 获取超时配置
   */
  getTimeouts() {
    const settings = this.config.performance_settings;
    return {
      ocr: settings.ocr_timeout,
      parse: settings.parse_timeout,
      validation: settings.validation_timeout
    };
  }

  /**
   * 获取批处理大小
   */
  getBatchSize(): number {
    return this.config.performance_settings.batch_size;
  }

  /**
   * 获取防抖延迟
   */
  getDebounceDelay(): number {
    return this.config.performance_settings.debounce_delay;
  }

  // ===== 错误处理 =====

  /**
   * 获取错误代码配置
   */
  getErrorCodes(): Record<string, string> {
    return this.config.error_codes;
  }

  /**
   * 获取错误信息
   */
  getErrorMessage(code: string): string {
    return this.config.error_codes[code] || `未知错误: ${code}`;
  }

  // ===== 国际化 =====

  /**
   * 设置当前语言
   */
  setLanguage(language: string): void {
    if (this.config.localization.supported_languages.includes(language)) {
      this.currentLanguage = language;
    }
  }

  /**
   * 获取当前语言
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * 获取本地化消息
   */
  getMessage(key: string, language?: string): string {
    const lang = language || this.currentLanguage;
    // 确保 messages 和对应语言存在
    if (!this.config.localization?.messages) {
      return key;
    }
    if (!this.config.localization.messages[lang]) {
      return key;
    }
    return this.config.localization.messages[lang][key] || key;
  }

  /**
   * 获取所有本地化消息
   */
  getMessages(language?: string): Record<string, string> {
    const lang = language || this.currentLanguage;
    // 确保 messages 和对应语言存在
    if (!this.config.localization?.messages) {
      return {};
    }
    return this.config.localization.messages[lang] || {};
  }

  // ===== 实用工具 =====

  /**
   * 深度合并配置
   */
  mergeConfig(customConfig: Partial<InvoiceConfig>): void {
    this.config = this.deepMerge(this.config, customConfig);
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * 验证配置完整性
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // 检查必要的配置项
    if (!this.config.version) {
      errors.push('缺少版本信息');
    }
    
    if (!this.config.invoice_types || Object.keys(this.config.invoice_types).length === 0) {
      errors.push('缺少发票类型配置');
    }
    
    if (!this.config.api_endpoints || !this.config.api_endpoints.base_url) {
      errors.push('缺少API端点配置');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// ===== 单例实例 =====

export const invoiceConfig = new InvoiceConfigManager();

// ===== 便捷函数导出 =====

export const {
  getInvoiceTypes,
  getInvoiceTypeConfig,
  getFieldCategories,
  getFieldTypes,
  getValidationRules,
  getConfidenceThresholds,
  getApiBaseUrl,
  buildApiUrl,
  getUISettings,
  getFeatureFlags,
  isFeatureEnabled,
  getPerformanceSettings,
  getErrorMessage,
  getMessage,
  formatDate,
  formatDateTime,
  formatCurrency
} = invoiceConfig;

export default invoiceConfig;