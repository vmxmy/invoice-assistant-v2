/**
 * 发票管理系统 TypeScript 接口定义
 * 
 * 与后端 Python 模型完全匹配
 * 自动生成，请勿手动修改
 * 
 * 生成时间: 2025-01-17
 * 后端版本: v2.0
 */

// ===== 枚举类型 =====

/**
 * 发票类型枚举
 * 对应后端 InvoiceType
 */
export enum InvoiceType {
  VAT_INVOICE = "增值税发票",
  TRAIN_TICKET = "火车票", 
  FLIGHT_TICKET = "机票",
  TAXI_TICKET = "出租车票",
  BUS_TICKET = "客运车票",
  HOTEL_INVOICE = "酒店发票",
  GENERAL_INVOICE = "通用发票",
  UNKNOWN = "未知类型"
}

/**
 * 验证状态枚举
 * 对应后端 ValidationStatus
 */
export enum ValidationStatus {
  PENDING = "pending",    // 待验证
  VALID = "valid",        // 验证通过
  INVALID = "invalid",    // 验证失败
  WARNING = "warning"     // 有警告
}

/**
 * 置信度等级枚举
 * 对应后端 ConfidenceLevel
 */
export enum ConfidenceLevel {
  LOW = "low",           // 低置信度 < 0.7
  MEDIUM = "medium",     // 中等置信度 0.7-0.9
  HIGH = "high"          // 高置信度 > 0.9
}

/**
 * 字段数据类型枚举
 * 对应后端 FieldType
 */
export enum FieldType {
  TEXT = "text",
  NUMBER = "number",
  DECIMAL = "decimal",
  DATE = "date",
  DATETIME = "datetime",
  EMAIL = "email",
  PHONE = "phone",
  ID_NUMBER = "id_number",
  TAX_NUMBER = "tax_number",
  INVOICE_NUMBER = "invoice_number",
  AMOUNT = "amount",
  PERCENTAGE = "percentage",
  BOOLEAN = "boolean",
  JSON = "json",
  LIST = "list"
}

/**
 * 字段分类枚举
 * 对应后端 FieldCategory
 */
export enum FieldCategory {
  BASIC = "basic",           // 基础信息
  BUYER = "buyer",           // 购买方信息
  SELLER = "seller",         // 销售方信息
  AMOUNT = "amount",         // 金额信息
  TAX = "tax",              // 税务信息
  DETAILS = "details",       // 明细信息
  TRANSPORT = "transport",   // 交通信息
  PASSENGER = "passenger",   // 乘客信息
  ADDITIONAL = "additional", // 附加信息
  METADATA = "metadata"      // 元数据
}

// ===== 基础接口 =====

/**
 * 处理元数据接口
 * 对应后端 ProcessingMetadata
 */
export interface ProcessingMetadata {
  ocr_request_id?: string;
  ocr_model?: string;
  processing_time?: number;
  processing_timestamp?: string; // ISO 8601 格式
  user_id?: string;
}

/**
 * 验证问题接口
 * 对应后端 ValidationIssue
 */
export interface ValidationIssue {
  field_name: string;
  severity: string; // "error" | "warning" | "info"
  message: string;
  expected_value?: string;
  actual_value?: string;
}

/**
 * 验证规则接口
 * 对应后端 ValidationRule
 */
export interface ValidationRule {
  rule_type: string;
  parameters: Record<string, any>;
  error_message: string;
  severity: string; // "error" | "warning" | "info"
}

/**
 * 字段定义接口
 * 对应后端 FieldDefinition
 */
export interface FieldDefinition {
  // 基础属性
  key: string;
  name: string;
  field_type: FieldType;
  category: FieldCategory;
  
  // 属性标识
  is_required: boolean;
  is_core: boolean;
  is_readonly: boolean;
  is_calculated: boolean;
  
  // 默认值和约束
  default_value?: any;
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  pattern?: string;
  
  // 验证规则
  validation_rules: ValidationRule[];
  
  // 处理配置
  extraction_aliases: string[];
  transformation_rules: string[];
  
  // 显示配置
  display_order: number;
  description: string;
  help_text: string;
  placeholder: string;
  
  // 元数据
  tags: string[];
  confidence_threshold: number;
}

/**
 * 发票区域信息接口
 * 对应后端 InvoiceRegionInfo
 */
export interface InvoiceRegionInfo {
  region_code: string;        // 地区代码，如3100、5100等
  region_name: string;        // 地区名称，如"上海市"、"四川省"
  province_name: string;      // 省份名称
  region_type?: string;       // 地区类型：province、municipality、autonomous_region、special_city
  level?: number;             // 级别：1-省级，2-市级
}

/**
 * 基础发票模型接口
 * 对应后端 BaseInvoice
 */
export interface BaseInvoice {
  // 核心标准字段
  invoice_type: InvoiceType;
  invoice_number: string;
  invoice_date?: string; // ISO 8601 日期格式
  total_amount?: number;
  seller_name: string;
  buyer_name: string;
  
  // 地区信息 - 新增
  region_code?: string;       // 地区代码
  region_name?: string;       // 地区名称
  province_name?: string;     // 省份名称
  region_info?: InvoiceRegionInfo; // 完整地区信息
  
  // 扩展字段存储
  extended_fields: Record<string, any>;
  field_confidences: Record<string, number>;
  
  // 原始OCR数据
  raw_ocr_fields: Array<Record<string, any>>;
  ocr_metadata?: ProcessingMetadata;
  
  // 验证状态
  validation_status: ValidationStatus;
  validation_score?: number;
  validation_issues: ValidationIssue[];
  
  // 处理元数据
  created_at?: string; // ISO 8601 格式
  updated_at?: string; // ISO 8601 格式
}

// ===== API 响应接口 =====

/**
 * 解析后的字段信息（兼容旧版本）
 * 对应后端 ParsedField
 */
export interface ParsedField {
  name: string;
  value: string;
  confidence: number;
  original_key?: string;
}

/**
 * 解析后的发票信息（兼容旧版本）
 * 对应后端 ParsedInvoice
 */
export interface ParsedInvoice {
  invoice_type: string;
  fields: ParsedField[];
  metadata: Record<string, any>;
  parse_status: string;
  parse_errors: string[];
}

/**
 * OCR 解析请求接口
 * 对应后端 ParseRequest
 */
export interface ParseRequest {
  ocr_data: Record<string, any>;
  parse_options?: Record<string, any>;
  output_format: string; // "legacy" | "enhanced" | "frontend"
}

/**
 * 解析响应接口（兼容版本）
 * 对应后端 ParseResponse
 */
export interface ParseResponse {
  success: boolean;
  message: string;
  data?: ParsedInvoice | BaseInvoice | Record<string, any>;
  parse_time: string;
}

/**
 * 增强解析响应接口
 * 对应后端 EnhancedParseResponse
 */
export interface EnhancedParseResponse {
  success: boolean;
  message: string;
  data: BaseInvoice;
  validation_result: Record<string, any>;
  parse_time: string;
  metadata: Record<string, any>;
}

/**
 * 字段验证结果接口
 * 对应后端 FieldValidationResult
 */
export interface FieldValidationResult {
  field_name: string;
  field_key: string;
  is_valid: boolean;
  value: any;
  confidence: number;
  issues: string[];
  suggestions: string[];
}

/**
 * 验证摘要接口
 * 对应后端 ValidationSummary
 */
export interface ValidationSummary {
  total_fields: number;
  valid_fields: number;
  invalid_fields: number;
  missing_required: number;
  low_confidence: number;
  overall_score: number;
  confidence_score: number;
}

/**
 * 验证请求接口
 * 对应后端 ValidationRequest
 */
export interface ValidationRequest {
  invoice_type: string;
  data: Record<string, any> | BaseInvoice;
  confidences?: Record<string, number>;
  validation_options?: Record<string, any>;
  strict_mode: boolean;
}

/**
 * 验证响应接口
 * 对应后端 ValidationResponse
 */
export interface ValidationResponse {
  success: boolean;
  message: string;
  is_valid: boolean;
  validation_status: ValidationStatus;
  summary: ValidationSummary;
  field_results: FieldValidationResult[];
  issues: Array<Record<string, any>>;
  recommendations: string[];
  validation_time: string;
}

// ===== 发票摘要接口 =====

/**
 * 发票摘要信息接口
 * 对应后端 BaseInvoice.summary() 返回值
 */
export interface InvoiceSummary {
  invoice_type: InvoiceType;
  invoice_number: string;
  invoice_date?: string;
  total_amount?: number;
  seller_name: string;
  buyer_name: string;
  validation_status: ValidationStatus;
  confidence_level: ConfidenceLevel;
  field_count: number;
  issues_count: number;
  is_complete: boolean;
}

// ===== 辅助类型 =====

/**
 * 发票类型支持信息
 */
export interface InvoiceTypeInfo {
  supported_types: string[];
  count: number;
  descriptions: Record<string, string>;
}

/**
 * 字段定义架构
 */
export interface InvoiceFieldSchema {
  invoice_type: string;
  field_count: number;
  field_groups: Record<string, string[]>;
  fields: Record<string, {
    name: string;
    type: FieldType;
    category: FieldCategory;
    required: boolean;
    core: boolean;
    description: string;
  }>;
}

/**
 * 批量操作响应
 */
export interface BatchOperationResponse {
  total: number;
  success: number;
  failed: number;
  results: Array<{
    index: number;
    success: boolean;
    data?: any;
    error?: string;
  }>;
}

// ===== 类型守卫函数 =====

/**
 * 检查是否为 BaseInvoice 类型
 */
export function isBaseInvoice(obj: any): obj is BaseInvoice {
  return obj && 
    typeof obj.invoice_type === 'string' &&
    typeof obj.invoice_number === 'string' &&
    typeof obj.seller_name === 'string' &&
    typeof obj.buyer_name === 'string' &&
    typeof obj.extended_fields === 'object' &&
    typeof obj.field_confidences === 'object' &&
    Array.isArray(obj.validation_issues);
}

/**
 * 检查是否为 ParsedInvoice 类型
 */
export function isParsedInvoice(obj: any): obj is ParsedInvoice {
  return obj &&
    typeof obj.invoice_type === 'string' &&
    Array.isArray(obj.fields) &&
    typeof obj.metadata === 'object' &&
    typeof obj.parse_status === 'string';
}

// ===== 工具类型 =====

/**
 * 创建发票请求
 */
export type CreateInvoiceRequest = Omit<BaseInvoice, 'created_at' | 'updated_at' | 'validation_issues'>;

/**
 * 更新发票请求
 */
export type UpdateInvoiceRequest = Partial<Pick<BaseInvoice, 
  'invoice_number' | 'invoice_date' | 'total_amount' | 'seller_name' | 'buyer_name' | 'extended_fields'
>>;

/**
 * 发票查询筛选条件
 */
export interface InvoiceFilters {
  invoice_type?: InvoiceType;
  validation_status?: ValidationStatus;
  confidence_level?: ConfidenceLevel;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  seller_name?: string;
  buyer_name?: string;
  region_code?: string;        // 地区代码筛选
  province_name?: string;      // 省份名称筛选
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * API 错误响应
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: Record<string, any>;
  status_code?: number;
}

/**
 * API 成功响应
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * 通用 API 响应
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;