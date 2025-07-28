/**
 * 仪表板相关的类型定义
 */

export interface DashboardStats {
  user_id: string
  profile_id: string
  display_name: string | null
  
  // 发票统计
  total_invoices: number
  total_amount: number
  monthly_invoices: number
  monthly_amount: number
  verified_invoices: number
  last_invoice_date: string | null
  
  // 邮箱统计
  total_email_accounts: number
  active_email_accounts: number
  
  // 扫描统计
  total_scan_jobs: number
  completed_scan_jobs: number
  monthly_processed: number
  last_scan_at: string | null
  
  // 活动统计
  weekly_invoices: number
  daily_invoices: number
  
  // 增长率
  invoice_growth_rate: number
  amount_growth_rate: number
  
  // 用户状态
  is_active: boolean
  is_premium: boolean
  premium_expires_at: string | null
  
  // 时间戳
  updated_at: string
}

export interface StatCard {
  title: string
  value: string | number
  icon: string
  change?: {
    value: number
    trend: 'up' | 'down' | 'neutral'
    period: string
  }
  description?: string
  color?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
}

export interface DashboardStatsResponse {
  data: DashboardStats | null
  error: Error | null
  loading: boolean
}

export interface RealtimeStatsPayload {
  user_id: string
  table: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  timestamp: number
}