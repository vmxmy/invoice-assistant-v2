/**
 * 收件箱功能的TypeScript类型定义
 */

// 邮件记录接口（列表页面使用）
export interface EmailRecord {
  id: string
  trigger_event_id: string
  workflow_execution_id: string
  email_subject: string | null
  from_email: string | null
  from_name: string | null
  to_email: string | null
  email_date: string | null
  email_category: string
  classification_reason: string | null
  execution_path: string
  overall_status: string
  has_attachments: boolean
  attachment_count: number
  user_mapping_status: string | null
  created_at: string
  total_count?: number // 用于分页总数
}

// 邮件详情接口（详情页面使用）
export interface EmailDetail extends EmailRecord {
  email_body_text: string | null
  email_body_html: string | null
  email_body_preview: string | null
  attachment_names: string[] | null
  should_process: boolean | null
  matched_keywords: string[] | null
  extracted_subject: string | null
  keyword_stats: any
  node3_executed: boolean
  node3_status: string | null
  verification_links: any
  primary_verification_link: string | null
  target_user_email: string | null
  link_quality: string | null
  extraction_completeness: string | null
  node4_executed: boolean
  node4_status: string | null
  total_attachments: number | null
  pdf_attachments: number | null
  successful_processing: number | null
  failed_processing: number | null
  processing_results: any
  mapped_user_id: string | null
  mapping_method: string | null
  mapping_error: string | null
  error_summary: string | null
  total_processing_time: number | null
  node2_raw_output: any
  node3_raw_output: any
  node4_raw_output: any
  trigger_raw_data: any
  recommendations?: string[]
}

// 邮件过滤器接口
export interface EmailFilters {
  category?: string
  status?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

// 收件箱统计信息接口
export interface InboxStats {
  total_emails: number
  unread_emails: number
  verification_emails: number
  invoice_emails: number
  successful_processing: number
  failed_processing: number
  emails_with_attachments: number
  emails_with_body: number
  recent_emails_today: number
  recent_emails_week: number
}

// API响应接口
export interface EmailListResponse {
  success: boolean
  emails: EmailRecord[]
  totalCount: number
  error?: string
}

export interface EmailDetailResponse {
  success: boolean
  email: EmailDetail | null
  error?: string
}

export interface InboxStatsResponse {
  success: boolean
  stats: InboxStats
  error?: string
}

// Hook参数接口
export interface UseInboxEmailsParams {
  userId: string
  page: number
  pageSize: number
  filters: EmailFilters
}

export interface UseEmailDetailParams {
  emailId: string
  userId: string
}

// 邮件状态配置
export const EMAIL_STATUS_CONFIG = {
  success: {
    label: '成功',
    bgColor: 'badge-success',
    icon: '✓'
  },
  partial_success: {
    label: '部分成功',
    bgColor: 'badge-warning',
    icon: '⚠'
  },
  failed: {
    label: '失败',
    bgColor: 'badge-error',
    icon: '✗'
  },
  not_processed: {
    label: '未处理',
    bgColor: 'badge-neutral',
    icon: '○'
  },
  classification_only: {
    label: '仅分类',
    bgColor: 'badge-info',
    icon: '◐'
  }
} as const

// 邮件类别配置
export const EMAIL_CATEGORY_CONFIG = {
  verification: {
    label: '验证邮件',
    bgColor: 'bg-blue-100 text-blue-800',
    icon: '🔐'
  },
  invoice: {
    label: '发票邮件',
    bgColor: 'bg-green-100 text-green-800',
    icon: '📄'
  },
  other: {
    label: '其他',
    bgColor: 'bg-gray-100 text-gray-800',
    icon: '📧'
  },
  unknown: {
    label: '未知',
    bgColor: 'bg-gray-100 text-gray-500',
    icon: '❓'
  }
} as const

// 执行路径配置
export const EXECUTION_PATH_CONFIG = {
  verification_path: {
    label: '验证路径',
    description: '处理验证类邮件',
    color: 'text-blue-600'
  },
  invoice_path: {
    label: '发票路径',
    description: '处理发票类邮件',
    color: 'text-green-600'
  },
  no_processing: {
    label: '无处理',
    description: '邮件未进入处理流程',
    color: 'text-gray-600'
  }
} as const

// 用户映射状态配置
export const USER_MAPPING_STATUS_CONFIG = {
  found: {
    label: '已找到用户',
    bgColor: 'bg-green-100 text-green-800',
    icon: '👤'
  },
  created: {
    label: '已创建用户',
    bgColor: 'bg-blue-100 text-blue-800',
    icon: '👤+'
  },
  not_found: {
    label: '未找到用户',
    bgColor: 'bg-yellow-100 text-yellow-800',
    icon: '❓'
  },
  error: {
    label: '映射错误',
    bgColor: 'bg-red-100 text-red-800',
    icon: '⚠'
  },
  disabled: {
    label: '映射已禁用',
    bgColor: 'bg-gray-100 text-gray-600',
    icon: '○'
  }
} as const

export type EmailStatus = keyof typeof EMAIL_STATUS_CONFIG
export type EmailCategory = keyof typeof EMAIL_CATEGORY_CONFIG
export type ExecutionPath = keyof typeof EXECUTION_PATH_CONFIG
export type UserMappingStatus = keyof typeof USER_MAPPING_STATUS_CONFIG