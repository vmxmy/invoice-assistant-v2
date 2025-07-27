// 邮箱账户相关类型定义
export interface EmailAccount {
  id: string  // UUID
  user_id: string
  email_address: string
  display_name?: string
  imap_host: string
  imap_port: number
  imap_use_ssl: boolean
  smtp_host?: string
  smtp_port?: number
  smtp_use_tls?: boolean
  is_active: boolean
  is_verified: boolean
  last_scan_time?: string
  last_error?: string
  scan_config?: {
    auto_scan: boolean
    scan_interval: number
    folders: string[]
    keywords: string[]
  }
  sync_state?: {
    sync_mode: 'never_synced' | 'full_sync_needed' | 'full_sync_in_progress' | 'incremental' | 'full_sync_completed'
    last_full_sync_time?: string
    last_incremental_sync_time?: string
    total_emails_indexed: number
    is_synced: boolean
  }
  created_at: string
  updated_at: string
}

export interface EmailAccountCreate {
  email_address: string
  password: string
  display_name?: string
  imap_host?: string
  imap_port?: number
  imap_use_ssl?: boolean
  smtp_host?: string
  smtp_port?: number
  smtp_use_tls?: boolean
  scan_config?: {
    auto_scan?: boolean
    scan_interval?: number
    folders?: string[]
    keywords?: string[]
  }
}

export interface EmailAccountUpdate {
  display_name?: string
  password?: string
  imap_host?: string
  imap_port?: number
  imap_use_ssl?: boolean
  smtp_host?: string
  smtp_port?: number
  smtp_use_tls?: boolean
  is_active?: boolean
  scan_config?: {
    auto_scan?: boolean
    scan_interval?: number
    folders?: string[]
    keywords?: string[]
  }
}

export interface EmailAccountTestResult {
  success: boolean
  message: string
  connection_details?: {
    imap_status: boolean
    smtp_status?: boolean
    folders?: string[]
    total_emails?: number
  }
  error_details?: {
    error_type: string
    error_message: string
  }
}

export interface ImapConfig {
  imap_host: string
  imap_port: number
  imap_use_ssl: boolean
  smtp_host?: string
  smtp_port?: number
  smtp_use_tls?: boolean
  provider_name?: string
  supports_oauth?: boolean
}

// 邮箱扫描相关类型
export interface EmailScanJob {
  id: string  // UUID
  job_id: string
  user_id: string
  email_account_id: string  // UUID
  job_type: 'manual' | 'scheduled' | 'incremental'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  description?: string
  progress?: number
  current_step?: string
  total_emails?: number
  scanned_emails?: number
  matched_emails?: number
  downloaded_attachments?: number
  processed_invoices?: number
  created_at: string
  started_at?: string
  completed_at?: string
  scan_results?: any
  error_message?: string
}

export interface EmailScanParams {
  folders: string[]
  date_from?: string
  date_to?: string
  subject_keywords: string[]
  exclude_keywords: string[]
  sender_filters: string[]
  max_emails?: number
  download_attachments: boolean
  attachment_types: string[]
  max_attachment_size: number
}

export interface EmailScanJobCreate {
  email_account_id: string  // UUID
  job_type?: 'manual' | 'scheduled' | 'incremental'
  scan_params: EmailScanParams
  description?: string
}

export interface SmartScanRequest {
  email_account_id: string
  keywords?: string[]
  exclude_keywords?: string[]
  description?: string
}

export interface EmailScanProgress {
  job_id: string
  status: string
  progress: number
  current_step?: string
  total_emails: number
  scanned_emails: number
  matched_emails: number
  downloaded_attachments: number
  processed_invoices: number
  error_message?: string
  started_at?: string
  completed_at?: string
}